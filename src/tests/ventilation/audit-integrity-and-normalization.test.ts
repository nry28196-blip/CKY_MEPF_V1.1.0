import { describe, it, expect, vi } from 'vitest';
import { VentilationEngine, SingleZoneInput, MultiZoneInput } from '../../lib/VentilationEngine';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { ProductionScopeService, normalizeAddendumIdentifier } from '../../calculations/scope/ProductionCalculationScope';
import { EngineeringAuditService, CalculationAuditRecord } from '../../calculations/audit/EngineeringAuditContract';
import { Ashrae622Service } from '../../calculations/ventilation/Ashrae622Service';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('Audit Integrity Fail-Closed & Addendum Normalization Verification', () => {
  const spaceTypes2022 = StandardDataProvider.get621SpaceTypes('2022');
  const ezValues2022 = StandardDataProvider.get621EzValues('2022');
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');

  const officeSpace = spaceTypes2022.find(s => s.id === 'office_space' || s.id === 'office')!;
  const ezCooling = ezValues2022.find(e => e.id === 'ez-1')!;
  const copyExhaust = exhaustRates2022.find(e => e.id === 'copy_room')!;

  // =========================================================================
  // 1. FAIL-CLOSED AUDIT GENERATION REGRESSION TESTS
  // =========================================================================
  describe('1. Fail-Closed Audit Generation', () => {
    it('forces audit generation to throw in single-zone and verifies result is FAIL, authoritative output is null, isAuthoritative=false, isApprovedForEngineeringUse=false', () => {
      const spy = vi.spyOn(EngineeringAuditService, 'fromZoneCalculation').mockImplementation(() => {
        throw new Error('Simulated intentional audit generation corruption');
      });

      try {
        const input: SingleZoneInput = {
          edition: '2022',
          density: { elevation: 0, temperature: 20 },
          zone: {
            expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2022',
            spaceType: officeSpace,
            area: 100,
            designOccupancy: 5,
            useDefaultOccupancy: false,
            ezConfig: ezCooling
          }
        };

        const result = VentilationEngine.runSingleZone(input);

        // FAIL-CLOSED VERIFICATION:
        expect(result.status).toBe('FAIL');
        expect(result.voz).toBeNull();
        expect(result.vot).toBeNull();
        expect(result.finalDesignOutdoorAir).toBeNull();
        expect(result.isAuthoritative).toBe(false);
        expect(result.isApprovedForEngineeringUse).toBe(false);
        expect(result.zone.status).toBe('FAIL');
        expect(result.auditRecord).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
    });

    it('forces audit generation to throw in multi-zone simplified procedure and verifies fail-closed behavior', () => {
      const spy = vi.spyOn(EngineeringAuditService, 'fromSimplifiedSystem').mockImplementation(() => {
        throw new Error('Simulated multi-zone audit generation breakdown');
      });

      try {
        const input: MultiZoneInput = {
          method: 'Simplified',
          edition: '2022',
          systemType: 'single_supply',
          airDistributionType: 'CV',
          density: { elevation: 0, temperature: 20 },
          zones: [
            {
              id: 'z1',
              expectedStandard: 'ASHRAE 62.1',
              expectedEdition: '2022',
              spaceType: officeSpace,
              area: 100,
              designOccupancy: 5,
              useDefaultOccupancy: false,
              ezConfig: ezCooling
            },
            {
              id: 'z2',
              expectedStandard: 'ASHRAE 62.1',
              expectedEdition: '2022',
              spaceType: officeSpace,
              area: 200,
              designOccupancy: 10,
              useDefaultOccupancy: false,
              ezConfig: ezCooling
            }
          ],
          systemPopulation: 15
        };

        const result = VentilationEngine.runMultiZone(input);

        // FAIL-CLOSED VERIFICATION:
        expect(result.status).toBe('FAIL');
        expect(result.vot).toBeNull();
        expect(result.vou).toBeNull();
        expect(result.finalDesignOutdoorAir).toBeNull();
        expect(result.isAuthoritative).toBe(false);
        expect(result.isApprovedForEngineeringUse).toBe(false);
        expect(result.auditRecord).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
    });

    it('forces audit generation to throw in multi-zone alternative procedure and verifies fail-closed behavior', () => {
      const spy = vi.spyOn(EngineeringAuditService, 'fromAlternativeSystem').mockImplementation(() => {
        throw new Error('Simulated alternative procedure audit failure');
      });

      try {
        const input: MultiZoneInput = {
          method: 'Alternative',
          edition: '2022',
          systemType: 'single_supply',
          airDistributionType: 'CV',
          vps: 1500,
          density: { elevation: 0, temperature: 20 },
          zones: [
            {
              id: 'z1',
              expectedStandard: 'ASHRAE 62.1',
              expectedEdition: '2022',
              spaceType: officeSpace,
              area: 100,
              designOccupancy: 5,
              useDefaultOccupancy: false,
              ezConfig: ezCooling,
              vpz: 500
            },
            {
              id: 'z2',
              expectedStandard: 'ASHRAE 62.1',
              expectedEdition: '2022',
              spaceType: officeSpace,
              area: 200,
              designOccupancy: 10,
              useDefaultOccupancy: false,
              ezConfig: ezCooling,
              vpz: 1000
            }
          ],
          systemPopulation: 15
        };

        const result = VentilationEngine.runMultiZone(input);

        // FAIL-CLOSED VERIFICATION:
        expect(result.status).toBe('FAIL');
        expect(result.vot).toBeNull();
        expect(result.vou).toBeNull();
        expect(result.finalDesignOutdoorAir).toBeNull();
        expect(result.isAuthoritative).toBe(false);
        expect(result.isApprovedForEngineeringUse).toBe(false);
        expect(result.auditRecord).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
    });

    it('produces authoritative PASS when audit generation succeeds normally', () => {
      const input: SingleZoneInput = {
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: officeSpace,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        }
      };

      const result = VentilationEngine.runSingleZone(input);

      expect(result.status).toBe('PASS');
      expect(result.finalDesignOutdoorAir).toBeGreaterThan(0);
      expect(result.isAuthoritative).toBe(true);
      expect(result.isApprovedForEngineeringUse).toBe(true);
      expect(result.auditRecord).toBeDefined();
      expect(result.auditRecord?.finalResult.isAuthoritative).toBe(true);
      expect(result.auditRecord?.isApprovedForEngineeringUse).toBe(true);
    });
  });

  // =========================================================================
  // 2. ADDENDUM IDENTIFIER NORMALIZATION TESTS
  // =========================================================================
  describe('2. Addendum Identifier Normalization Helper', () => {
    it('normalizes various casing and prefix formats of Addendum j to "j"', () => {
      expect(normalizeAddendumIdentifier('j')).toBe('j');
      expect(normalizeAddendumIdentifier('J')).toBe('j');
      expect(normalizeAddendumIdentifier('Addendum j')).toBe('j');
      expect(normalizeAddendumIdentifier('addendum j')).toBe('j');
      expect(normalizeAddendumIdentifier(' addendum J ')).toBe('j');
      expect(normalizeAddendumIdentifier('ADDENDUM J')).toBe('j');
      expect(normalizeAddendumIdentifier('addendum-j')).toBe('j');
      expect(normalizeAddendumIdentifier('Addenda j')).toBe('j');
    });

    it('normalizes various casing and prefix formats of Addendum x to "x"', () => {
      expect(normalizeAddendumIdentifier('x')).toBe('x');
      expect(normalizeAddendumIdentifier('X')).toBe('x');
      expect(normalizeAddendumIdentifier('Addendum x')).toBe('x');
      expect(normalizeAddendumIdentifier('addendum x')).toBe('x');
      expect(normalizeAddendumIdentifier(' addendum X ')).toBe('x');
      expect(normalizeAddendumIdentifier('ADDENDUM X')).toBe('x');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(normalizeAddendumIdentifier('')).toBe('');
      expect(normalizeAddendumIdentifier(null)).toBe('');
      expect(normalizeAddendumIdentifier(undefined)).toBe('');
    });
  });

  // =========================================================================
  // 3. PRODUCTION ADDENDUM VALIDATION
  // =========================================================================
  describe('3. Production Addendum Validation in Scope and Services', () => {
    it('ProductionScopeService accepts equivalent representations of Addendum j and Addendum x', () => {
      expect(ProductionScopeService.isAddendumAllowed('j')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('J')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('Addendum j')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('addendum j')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('ADDENDUM J')).toBe(true);

      expect(ProductionScopeService.isAddendumAllowed('x')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('X')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('Addendum x')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('addendum x')).toBe(true);

      expect(ProductionScopeService.validateAddendum('Addendum j').allowed).toBe(true);
      expect(ProductionScopeService.validateAddendum('j').allowed).toBe(true);
      expect(ProductionScopeService.validateAddendum('X').allowed).toBe(true);
    });

    it('ProductionScopeService rejects unapproved addenda safely', () => {
      expect(ProductionScopeService.isAddendumAllowed('a')).toBe(false);
      expect(ProductionScopeService.isAddendumAllowed('Addendum c')).toBe(false);
      expect(ProductionScopeService.isAddendumAllowed('Addendum 2025')).toBe(false);

      const unapprovedVal = ProductionScopeService.validateAddendum('Addendum a');
      expect(unapprovedVal.allowed).toBe(false);
      expect(unapprovedVal.status).toBe('BLOCKED');
    });

    it('Ashrae621ZoneService accepts all valid representations of Addendum j', () => {
      const representations = ['j', 'J', 'Addendum j', 'addendum j', 'ADDENDUM J'];

      for (const rep of representations) {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          expectedAddenda: [rep],
          spaceType: officeSpace,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        });

        expect(result.status).toBe('PASS');
        expect(result.voz).toBeGreaterThan(0);
      }
    });

    it('Ashrae621ZoneService blocks unapproved addenda', () => {
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['Addendum a'],
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCooling
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
      expect(result.reason).toContain('Unapproved addenda requested');
    });

    it('Ashrae621ExhaustService accepts all valid representations of Addendum x', () => {
      const representations = ['x', 'X', 'Addendum x', 'addendum x', 'ADDENDUM X'];

      for (const rep of representations) {
        const result = Ashrae621ExhaustService.calculate({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          expectedAddenda: [rep],
          exhaustType: copyExhaust,
          qty: 50,
          designExhaust: 200
        });

        expect(result.status).toBe('PASS');
        expect(result.requiredExhaust).toBe(125);
      }
    });

    it('Ashrae621ExhaustService blocks unapproved addenda', () => {
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['Addendum b'],
        exhaustType: copyExhaust,
        qty: 50,
        designExhaust: 100
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.requiredExhaust).toBeNull();
      expect(result.complianceNotes?.some(n => n.includes('Unapproved exhaust addenda'))).toBe(true);
    });

    it('rejects wrong-path addenda: zone service rejects Addendum x, exhaust service rejects Addendum j', () => {
      // Zone service path must only accept Addendum j
      const zoneWrongPath = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['Addendum x'],
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCooling
      });
      expect(zoneWrongPath.status).toBe('BLOCKED');
      expect(zoneWrongPath.voz).toBeNull();
      expect(zoneWrongPath.reason).toContain('Unapproved addenda requested');

      // Exhaust service path must only accept Addendum x
      const exhaustWrongPath = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['Addendum j'],
        exhaustType: copyExhaust,
        qty: 50,
        designExhaust: 100
      });
      expect(exhaustWrongPath.status).toBe('BLOCKED');
      expect(exhaustWrongPath.requiredExhaust).toBeNull();
      expect(exhaustWrongPath.complianceNotes?.some(n => n.includes('Unapproved exhaust addenda'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. AUDIT COMPLETENESS & AUTHORITATIVE INTEGRITY
  // =========================================================================
  describe('4. Audit Completeness & Authoritative Integrity', () => {
    it('withholds authoritative status and numeric result if auditRecord indicates non-authoritative', () => {
      const mockAuditRecord: CalculationAuditRecord = {
        system: 'Ventilation',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
        calculationPath: { id: 'single_zone', name: 'Single-Zone Ventilation' },
        authorityPolicy: 'DIAGNOSTIC',
        inputs: {},
        provenance: {},
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Voz',
          name: 'Zone Outdoor Airflow',
          value: null,
          unit: 'L/s',
          isAuthoritative: false,
          complianceSummary: 'Non-authoritative'
        },
        validationStatus: 'PASS',
        isApprovedForEngineeringUse: false,
        warnings: [],
        unsupportedItems: [],
        timestamp: new Date().toISOString()
      };

      const spy = vi.spyOn(EngineeringAuditService, 'fromZoneCalculation').mockReturnValue(mockAuditRecord);

      try {
        const input: SingleZoneInput = {
          edition: '2022',
          density: { elevation: 0, temperature: 20 },
          zone: {
            expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2022',
            spaceType: officeSpace,
            area: 100,
            designOccupancy: 5,
            useDefaultOccupancy: false,
            ezConfig: ezCooling
          }
        };

        const result = VentilationEngine.runSingleZone(input);

        // Numeric output is withheld because audit record is not approved / not authoritative
        expect(result.isAuthoritative).toBe(false);
        expect(result.isApprovedForEngineeringUse).toBe(false);
        expect(result.voz).toBeNull();
        expect(result.vot).toBeNull();
        expect(result.finalDesignOutdoorAir).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });

    it('ensures nested diagnostic sub-calculations cannot elevate to authoritative in outer calculations', () => {
      const diagSubAudit = EngineeringAuditService.createAuditRecord({
        system: 'Ventilation',
        standard: 'Non-Standard Diagnostic Utility',
        edition: 'Diagnostic',
        revisionBasis: 'Air Balance Continuity Diagnostic',
        calculationPath: {
          id: 'room_air_balance_diagnostic',
          name: 'Room Air Balance Diagnostic Utility'
        },
        inputs: { flow: 50 },
        provenance: {
          flow: {
            key: 'flow',
            name: 'Flow',
            value: 50,
            unit: 'L/s',
            source: 'PROJECT_SPECIFICATION',
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'USER_SUPPLIED'
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Q_net',
          name: 'Net Flow',
          value: 50,
          unit: 'L/s'
        },
        validationStatus: 'PASS',
        authorityPolicy: 'DIAGNOSTIC'
      });

      expect(diagSubAudit.authorityPolicy).toBe('DIAGNOSTIC');
      expect(diagSubAudit.isApprovedForEngineeringUse).toBe(false);
      expect(diagSubAudit.finalResult.isAuthoritative).toBe(false);

      // Now create outer calculation referencing the diagnostic sub-result
      const outerAudit = EngineeringAuditService.createAuditRecord({
        system: 'Ventilation',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
        calculationPath: {
          id: 'multi_zone_system',
          name: 'Multi-Zone System'
        },
        inputs: { subFlow: diagSubAudit.finalResult.value },
        provenance: {
          subFlow: {
            key: 'subFlow',
            name: 'Diagnostic Sub-Flow',
            value: diagSubAudit.finalResult.value,
            unit: 'L/s',
            source: 'DIAGNOSTIC_UTILITY',
            verificationStatus: 'NOT_VERIFIED', // Correctly demoted: diagnostic cannot become VERIFIED standard input
            engineeringStatus: 'DERIVED'
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Vot',
          name: 'System Flow',
          value: 100,
          unit: 'L/s'
        },
        validationStatus: 'PASS',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });

      // Because sub-input is NOT_VERIFIED, outer validation converts to BLOCKED and non-authoritative
      expect(outerAudit.validationStatus).toBe('BLOCKED');
      expect(outerAudit.isApprovedForEngineeringUse).toBe(false);
      expect(outerAudit.finalResult.isAuthoritative).toBe(false);
      expect(outerAudit.finalResult.value).toBeNull();
    });
  });

  // =========================================================================
  // 5. ASHRAE 62.2 SEPARATION & NON-AUTHORITATIVE INVARIANTS
  // =========================================================================
  describe('5. ASHRAE 62.2 Separation & Non-Authoritative Invariants', () => {
    it('blocks ASHRAE 62.2 from entering the commercial 62.1 VentilationEngine', () => {
      const input: any = {
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.2',
          expectedEdition: '2022',
          spaceType: officeSpace,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        }
      };

      const result = VentilationEngine.runSingleZone(input);

      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
      expect(result.vot).toBeNull();
      expect(result.finalDesignOutdoorAir).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });

    it('verifies ASHRAE 62.2 WARNING status is non-authoritative', () => {
      const result = Ashrae622Service.calculateWholeDwelling({
        floorArea: 100,
        bedrooms: 3,
        infiltrationCredit: 10,
        infiltrationVerified: false, // Unverified infiltration produces WARNING
        localExhaust: null,
        coefficients: StandardDataProvider.get622Coefficients('2022')
      });

      expect(result.status).toBe('WARNING');
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });

    it('verifies ASHRAE 62.2 INCOMPLETE status is non-authoritative with null fan flow', () => {
      const result = Ashrae622Service.calculateWholeDwelling({
        floorArea: 100,
        bedrooms: 3,
        infiltrationCredit: 0,
        infiltrationVerified: false,
        localExhaust: {
          kitchenRequired: null, // Incomplete local exhaust
          kitchenInstalled: 20,
          bathRequired: 25,
          bathInstalled: 25
        },
        coefficients: StandardDataProvider.get622Coefficients('2022')
      });

      expect(result.status).toBe('INCOMPLETE');
      expect(result.qFan).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });
  });
});
