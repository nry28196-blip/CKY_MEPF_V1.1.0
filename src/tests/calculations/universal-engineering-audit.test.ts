import { describe, it, expect } from 'vitest';
import { 
  EngineeringAuditService, 
  CalculationAuditRecord, 
  InputProvenanceRecord 
} from '../../calculations/audit/EngineeringAuditContract';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621SimplifiedSystemService } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621AlternativeSystemService } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { SourceType, ACTIVE_62_1_2022_SCOPE, Ashrae621SpaceType } from '../../data/ventilation/ashrae621/types';

describe('PROMPT 5 — Universal Engineering Audit & Provenance Contract', () => {
  const spaceTypes2022 = StandardDataProvider.get621SpaceTypes('2022');
  const ezValues2022 = StandardDataProvider.get621EzValues('2022');
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');

  // =========================================================================
  // 1. PASS HAS VERIFIED BASIS
  // =========================================================================
  describe('1. PASS Has Verified Basis', () => {
    it('generates fully verified audit record for Single-Zone ventilation with complete equation and provenance tracking', () => {
      const office = spaceTypes2022.find(s => s.id === 'office_space' || s.id === 'office')!;
      const ezCooling = ezValues2022.find(e => e.id === 'ez-1')!;

      // 100 m², 5 people
      const zoneResult = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCooling
      });

      expect(zoneResult.status).toBe('PASS');

      const audit: CalculationAuditRecord = EngineeringAuditService.fromZoneCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        },
        zoneResult
      );

      // 1. Standard basis & active production basis
      expect(audit.system).toBe('Ventilation');
      expect(audit.standard).toBe('ASHRAE 62.1');
      expect(audit.edition).toBe('2022');
      expect(audit.revisionBasis).toBe(ACTIVE_62_1_2022_SCOPE);
      expect(audit.revisionBasis).toContain('Addendum j');

      // 2. Exact calculation path
      expect(audit.calculationPath.id).toBe('single_zone');
      expect(audit.calculationPath.name).toBe('Single-Zone Ventilation');
      expect(audit.calculationPath.section).toContain('Section 6.2.1 & 6.2.2');

      // 3. Input provenance (source, unit, verification status, engineering status)
      expect(audit.provenance['spaceType'].verificationStatus).toBe('VERIFIED');
      expect(audit.provenance['spaceType'].source).toBe(SourceType.ASHRAE_PUBLISHED);
      expect(audit.provenance['spaceType'].engineeringStatus).toBe('ENGINEERING_STANDARD');

      expect(audit.provenance['rp'].value).toBe(office.rpMetric);
      expect(audit.provenance['rp'].unit).toBe('L/s-person');
      expect(audit.provenance['rp'].verificationStatus).toBe('VERIFIED');

      expect(audit.provenance['ra'].value).toBe(office.raMetric);
      expect(audit.provenance['ra'].unit).toBe('L/s-m²');
      expect(audit.provenance['ra'].verificationStatus).toBe('VERIFIED');

      expect(audit.provenance['area'].value).toBe(100);
      expect(audit.provenance['area'].unit).toBe('m²');
      expect(audit.provenance['area'].engineeringStatus).toBe('USER_SUPPLIED');

      expect(audit.provenance['ez'].value).toBe(1.0);
      expect(audit.provenance['ez'].verificationStatus).toBe('VERIFIED');
      expect(audit.provenance['ez'].engineeringStatus).toBe('ENGINEERING_STANDARD');

      // 4. Formulas
      expect(audit.equations.length).toBeGreaterThanOrEqual(2);
      expect(audit.equations.some(eq => eq.equation.includes('Vbz = Rp × Pz + Ra × Az'))).toBe(true);
      expect(audit.equations.some(eq => eq.equation.includes('Voz = (Vbz / Ez) × Eρ'))).toBe(true);

      // 5. Intermediate values
      expect(audit.intermediateResults.some(ir => ir.symbol === 'Pz' && ir.value === 5)).toBe(true);
      expect(audit.intermediateResults.some(ir => ir.symbol === 'Vbp' && ir.value === 12.5)).toBe(true);
      expect(audit.intermediateResults.some(ir => ir.symbol === 'Vba' && ir.value === 30)).toBe(true);
      expect(audit.intermediateResults.some(ir => ir.symbol === 'Vbz' && ir.value === 42.5)).toBe(true);
      expect(audit.intermediateResults.some(ir => ir.symbol === 'Ez' && ir.value === 1.0)).toBe(true);

      // 6. Final status & approval
      expect(audit.validationStatus).toBe('PASS');
      expect(audit.isApprovedForEngineeringUse).toBe(true);
      expect(audit.finalResult.isAuthoritative).toBe(true);
      expect(audit.finalResult.value).toBe(42.5);
      expect(audit.finalResult.complianceSummary).toContain('COMPLIANT');
    });
  });

  // =========================================================================
  // 2. CRITICAL RULE: BLOCKED HAS NO AUTHORITATIVE FINAL NUMERIC RESULT
  // =========================================================================
  describe('2. CRITICAL RULE: BLOCKED Has No Authoritative Final Numeric Result', () => {
    it('withholds authoritative numeric output and sets isApprovedForEngineeringUse = false when calculation is BLOCKED', () => {
      // Create an audit record for an unverified/tampered space
      const unverifiedSpace: Ashrae621SpaceType = {
        ...spaceTypes2022[0],
        verificationStatus: 'NOT_VERIFIED' as any
      };

      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: unverifiedSpace,
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: ezValues2022[0]
      });

      expect(zoneRes.status).toBe('BLOCKED');
      expect(zoneRes.voz).toBeNull();

      const audit = EngineeringAuditService.fromZoneCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: unverifiedSpace,
          area: 100,
          designOccupancy: 10,
          useDefaultOccupancy: false,
          ezConfig: ezValues2022[0]
        },
        zoneRes
      );

      // Verify the CRITICAL RULE:
      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
      expect(audit.finalResult.complianceSummary).toContain('NON-COMPLIANT');
      expect(audit.finalResult.complianceSummary.toLowerCase()).toContain('not approved for engineering use');
    });

    it('suppresses authoritative numeric result even if caller provides a positive number for BLOCKED record', () => {
      // Forcefully pass a numeric value into createAuditRecord with status BLOCKED
      const audit = EngineeringAuditService.createAuditRecord({
        system: 'HVAC',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        revisionBasis: ACTIVE_62_1_2022_SCOPE,
        calculationPath: {
          id: 'test_blocked_path',
          name: 'Blocked Test Path'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        inputs: { test: 123 },
        provenance: {
          test: {
            key: 'test',
            name: 'Test Input',
            value: 123,
            unit: 'L/s',
            source: SourceType.PROJECT_SPECIFICATION,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'USER_SUPPLIED'
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Q',
          name: 'Airflow',
          value: 9999.0, // Large numeric value that must NOT be accepted as authoritative
          unit: 'L/s'
        },
        validationStatus: 'BLOCKED'
      });

      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull(); // Numeric output stripped to prevent false approval
      expect(audit.finalResult.complianceSummary).toContain('NON-COMPLIANT');
    });
  });

  // =========================================================================
  // 3. NOT_VERIFIED IS NOT CONVERTED TO PASS
  // =========================================================================
  describe('3. NOT_VERIFIED Is Not Converted to PASS', () => {
    it('downgrades status to BLOCKED and denies engineering approval if any critical input is NOT_VERIFIED', () => {
      // Caller erroneously attempts to claim validationStatus = 'PASS' while having a NOT_VERIFIED input
      const audit = EngineeringAuditService.createAuditRecord({
        system: 'Ventilation',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        revisionBasis: ACTIVE_62_1_2022_SCOPE,
        calculationPath: {
          id: 'single_zone',
          name: 'Single-Zone Ventilation'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        inputs: { rp: 2.5, area: 100 },
        provenance: {
          rp: {
            key: 'rp',
            name: 'People Outdoor Air Rate',
            value: 2.5,
            unit: 'L/s-person',
            source: SourceType.UNKNOWN,
            verificationStatus: 'NOT_VERIFIED', // Unverified critical input!
            engineeringStatus: 'ENGINEERING_STANDARD'
          },
          area: {
            key: 'area',
            name: 'Floor Area',
            value: 100,
            unit: 'm²',
            source: SourceType.PROJECT_SPECIFICATION,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'USER_SUPPLIED'
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Voz',
          name: 'Zone Outdoor Airflow',
          value: 50.0,
          unit: 'L/s'
        },
        validationStatus: 'PASS' // Caller attempts false pass!
      });

      // Audit service must refuse to permit PASS
      expect(audit.validationStatus).not.toBe('PASS');
      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
      expect(audit.warnings.some(w => w.includes('Status converted from PASS to BLOCKED'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. MANUAL / USER OVERRIDE REMAINS CLEARLY IDENTIFIED
  // =========================================================================
  describe('4. Manual/User Override Remains Clearly Identified', () => {
    it('preserves manual Ez override flag, source = USER_OVERRIDE, and justification', () => {
      const office = spaceTypes2022[0];
      const customEz = {
        ...ezValues2022[0],
        id: 'ez-custom-override',
        name: 'Custom Underfloor Displacement Override',
        ez: 0.65,
        isManualOverride: true,
        manualOverrideBasis: 'Project CFD Study 2026-B',
        manualJustification: 'CFD simulation verified local stratified stagnant boundary'
      };

      const zoneResult = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: customEz
      });

      // Non-standard manual override cannot claim PASS under active standard basis; it is BLOCKED / unverified
      expect(zoneResult.status).toBe('BLOCKED');

      const audit = EngineeringAuditService.fromZoneCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: customEz
        },
        zoneResult
      );

      // Verify override is tracked and cannot be approved as verified standard calculation
      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);

      const ezProv = audit.provenance['ez'];
      expect(ezProv).toBeDefined();
      expect(ezProv.engineeringStatus).toBe('USER_OVERRIDE');
      expect(ezProv.isOverride).toBe(true);
      expect(ezProv.source).toBe(SourceType.USER_OVERRIDE);
      expect(ezProv.overrideJustification).toBe('CFD simulation verified local stratified stagnant boundary');
      expect(ezProv.reference).toBe('Project CFD Study 2026-B');
    });

    it('warns when a manual override lacks documented engineering justification', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        system: 'Plumbing',
        standard: 'IPC',
        edition: '2021',
        revisionBasis: 'International Plumbing Code 2021',
        calculationPath: {
          id: 'pipe_sizing',
          name: 'Water Supply Fixture Unit Sizing'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        inputs: { wsfu: 15 },
        provenance: {
          wsfu: {
            key: 'wsfu',
            name: 'Fixture Units',
            value: 15,
            unit: 'WSFU',
            source: SourceType.USER_OVERRIDE,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'USER_OVERRIDE',
            isOverride: true,
            overrideJustification: undefined // Missing justification!
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Q',
          name: 'Required Flow Rate',
          value: 20,
          unit: 'gpm'
        },
        validationStatus: 'PASS'
      });

      expect(audit.warnings.some(w => w.includes('lacks documented engineering justification'))).toBe(true);
    });
  });

  // =========================================================================
  // 5. AUDIT RECORD IDENTIFIES ACTIVE PRODUCTION BASIS
  // =========================================================================
  describe('5. Audit Record Identifies Active Production Basis', () => {
    it('identifies exact active production basis for Multi-Zone and Exhaust systems', () => {
      // 1. Multi-Zone Simplified
      const simpRes = Ashrae621SimplifiedSystemService.calculate({
        zones: [
          { id: 'Z1', pz: 10, rp: 2.5, ra: 0.3, az: 100, voz: 55, vpz: 250, vpzMinDesign: 120, dMode: 'VAV' }
        ],
        ps: 10,
        airDistributionType: 'VAV'
      });
      const simpAudit = EngineeringAuditService.fromSimplifiedSystem(
        { zones: [{ id: 'Z1' }], ps: 10 },
        simpRes
      );
      expect(simpAudit.revisionBasis).toBe('ANSI/ASHRAE Standard 62.1-2022');
      expect(simpAudit.calculationPath.id).toBe('multi_zone_simplified');
      expect(simpAudit.calculationPath.section).toContain('Section 6.2.4.2');

      // 2. Exhaust System
      const exhaustRes = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: exhaustRates2022.find(e => e.id === 'toilet_public')!,
        qty: 4,
        designExhaust: 120
      });
      const exhaustAudit = EngineeringAuditService.fromExhaustCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          exhaustType: exhaustRates2022.find(e => e.id === 'toilet_public')!,
          qty: 4,
          designExhaust: 120
        },
        exhaustRes
      );
      expect(exhaustAudit.revisionBasis).toBe('ANSI/ASHRAE Standard 62.1-2022 + Addendum x');
      expect(exhaustAudit.calculationPath.id).toBe('prescriptive_exhaust_6_5_1');
      expect(exhaustAudit.finalResult.value).toBe(100);
      expect(exhaustAudit.isApprovedForEngineeringUse).toBe(true);
    });
  });

  // =========================================================================
  // 6. UNIVERSAL REUSABILITY FOR OTHER MEP DISCIPLINES (HVAC, Plumbing, Electrical, Fire Protection)
  // =========================================================================
  describe('6. Universal MEP Systems Reusability Contract', () => {
    it('creates compliant audit record for Plumbing System calculation (IPC Table E103.3)', () => {
      const plumbingAudit = EngineeringAuditService.fromGenericMepCalculation({
        system: 'Plumbing',
        standard: 'IPC',
        edition: '2021',
        revisionBasis: 'International Plumbing Code 2021, Appendix E',
        calculationPath: {
          id: 'domestic_water_pipe_sizing',
          name: 'Domestic Water Pipe Sizing (Hunter Curve)',
          section: 'Appendix E, Section E103'
        },
        inputs: {
          totalWsfu: 35,
          meterLossPsi: 5.0,
          pressureAvailablePsi: 60.0
        },
        provenance: {
          totalWsfu: {
            key: 'totalWsfu',
            name: 'Total Water Supply Fixture Units',
            value: 35,
            unit: 'WSFU',
            source: SourceType.PROJECT_SPECIFICATION,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'USER_SUPPLIED'
          },
          flushDevice: {
            key: 'flushDevice',
            name: 'Primary System Flush Device Type',
            value: 'flush_tank',
            unit: 'type',
            source: SourceType.ADOPTED_CODE,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'CODE_DEFAULT',
            reference: 'IPC Table E103.3(1)'
          }
        },
        equations: [
          {
            symbol: 'Q_gpm',
            name: 'Hunter Peak Flow Curve',
            equation: 'Q = f(WSFU, FlushDeviceType)',
            reference: 'IPC Appendix E, Chart E103.3(1)'
          }
        ],
        intermediateResults: [
          { symbol: 'WSFU', name: 'Total Fixture Count', value: 35, unit: 'units' },
          { symbol: 'HeadLoss', name: 'Frictional Friction Gradient', value: 3.2, unit: 'psi/100ft' }
        ],
        finalResult: {
          symbol: 'PeakFlow',
          name: 'Design Peak Flow Rate',
          value: 22.5,
          unit: 'gpm'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        validationStatus: 'PASS'
      });

      expect(plumbingAudit.system).toBe('Plumbing');
      expect(plumbingAudit.standard).toBe('IPC');
      expect(plumbingAudit.validationStatus).toBe('PASS');
      expect(plumbingAudit.isApprovedForEngineeringUse).toBe(true);
      expect(plumbingAudit.finalResult.value).toBe(22.5);
    });

    it('creates compliant audit record for Electrical System calculation (NEC Article 220)', () => {
      const elecAudit = EngineeringAuditService.fromGenericMepCalculation({
        system: 'Electrical',
        standard: 'NFPA 70 (NEC)',
        edition: '2023',
        revisionBasis: 'National Electrical Code 2023 Edition',
        calculationPath: {
          id: 'feeder_demand_calc',
          name: 'Feeder and Service Demand Load',
          section: 'NEC Article 220 Part III'
        },
        inputs: {
          connectedLoadVa: 50000,
          occupancyType: 'dwelling_unit'
        },
        provenance: {
          first3000VaDemand: {
            key: 'first3000VaDemand',
            name: 'First 3000 VA Demand Factor',
            value: 1.0,
            unit: 'fraction',
            source: SourceType.ADOPTED_CODE,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'ENGINEERING_STANDARD',
            reference: 'NEC Table 220.42'
          },
          remainderDemand: {
            key: 'remainderDemand',
            name: 'Remainder Demand Factor (3001 to 120000 VA)',
            value: 0.35,
            unit: 'fraction',
            source: SourceType.ADOPTED_CODE,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'ENGINEERING_STANDARD',
            reference: 'NEC Table 220.42'
          }
        },
        equations: [
          {
            symbol: 'DemandLoad',
            name: 'General Lighting Feeder Demand',
            equation: 'Load = (3000 × 1.0) + ((Connected - 3000) × 0.35)',
            reference: 'NEC Section 220.42'
          }
        ],
        intermediateResults: [
          { symbol: 'BaseLoad', name: 'Base Demand Tier', value: 3000, unit: 'VA' },
          { symbol: 'RemainingDemand', name: 'Remainder Tier (35%)', value: 16450, unit: 'VA' }
        ],
        finalResult: {
          symbol: 'DemandVa',
          name: 'Calculated Net Feeder Demand',
          value: 19450,
          unit: 'VA'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        validationStatus: 'PASS'
      });

      expect(elecAudit.system).toBe('Electrical');
      expect(elecAudit.standard).toBe('NFPA 70 (NEC)');
      expect(elecAudit.validationStatus).toBe('PASS');
      expect(elecAudit.finalResult.value).toBe(19450);
    });

    it('creates compliant audit record for Fire Protection calculation (NFPA 13 Density/Area)', () => {
      const fireAudit = EngineeringAuditService.fromGenericMepCalculation({
        system: 'Fire Protection',
        standard: 'NFPA 13',
        edition: '2022',
        revisionBasis: 'NFPA 13 Standard for the Installation of Sprinkler Systems (2022)',
        calculationPath: {
          id: 'density_area_hydraulic',
          name: 'Sprinkler Density / Area Hydraulic Method',
          section: 'Chapter 19, Section 19.3'
        },
        inputs: {
          hazardClassification: 'Ordinary Hazard Group 1',
          designAreaSqFt: 1500
        },
        provenance: {
          designDensity: {
            key: 'designDensity',
            name: 'Discharge Density',
            value: 0.15,
            unit: 'gpm/ft²',
            source: SourceType.ADOPTED_CODE,
            verificationStatus: 'VERIFIED',
            engineeringStatus: 'ENGINEERING_STANDARD',
            reference: 'NFPA 13 Figure 19.3.3.1.1'
          }
        },
        equations: [
          {
            symbol: 'Q_sprinkler',
            name: 'System Water Demand',
            equation: 'Q = DesignDensity × DesignArea × OverdischargeFactor',
            reference: 'NFPA 13 Section 19.3.3'
          }
        ],
        intermediateResults: [
          { symbol: 'Density', name: 'Prescribed Density', value: 0.15, unit: 'gpm/ft²' },
          { symbol: 'Area', name: 'Remote Design Area', value: 1500, unit: 'ft²' }
        ],
        finalResult: {
          symbol: 'Q_req',
          name: 'Minimum Sprinkler Water Flow Required',
          value: 225.0,
          unit: 'gpm'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        validationStatus: 'PASS'
      });

      expect(fireAudit.system).toBe('Fire Protection');
      expect(fireAudit.standard).toBe('NFPA 13');
      expect(fireAudit.validationStatus).toBe('PASS');
      expect(fireAudit.finalResult.value).toBe(225.0);
    });
  });

  // =========================================================================
  // 7. EXPLICIT AUTHORITY POLICY SAFETY CONTRACT
  // =========================================================================
  describe('7. Explicit Authority Policy Safety Contract', () => {
    const baseParams = {
      system: 'HVAC',
      standard: 'ASHRAE 62.1',
      edition: '2022',
      revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
      calculationPath: {
        id: 'test_path',
        name: 'Test Path'
      },
      inputs: { x: 10 },
      provenance: {
        x: {
          key: 'x',
          name: 'Test Input',
          value: 10,
          unit: 'L/s',
          source: SourceType.PROJECT_SPECIFICATION,
          verificationStatus: 'VERIFIED' as const,
          engineeringStatus: 'USER_SUPPLIED' as const
        }
      },
      equations: [],
      intermediateResults: [],
      finalResult: {
        symbol: 'V',
        name: 'Volume Flow',
        value: 100,
        unit: 'L/s'
      }
    };

    it('1. PASS + explicit authoritative production -> authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'PASS',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(true);
      expect(audit.finalResult.isAuthoritative).toBe(true);
      expect(audit.finalResult.value).toBe(100);
    });

    it('2. PASS + diagnostic -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'PASS',
        authorityPolicy: 'DIAGNOSTIC'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBe(100); // Retained as non-authoritative diagnostic
      expect(audit.finalResult.complianceSummary).toContain('DIAGNOSTIC');
    });

    it('3. PASS + authority policy omitted -> not authoritative (fail-safe default)', () => {
      const audit = (EngineeringAuditService.createAuditRecord as any)({
        ...baseParams,
        validationStatus: 'PASS'
        // authorityPolicy omitted!
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('4. FAIL + production -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'FAIL',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('5. WARNING + production -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'WARNING',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('6. INCOMPLETE + production -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'INCOMPLETE',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('7. BLOCKED + production -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'BLOCKED',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('8. NOT_VERIFIED + production -> not authoritative', () => {
      const audit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        validationStatus: 'NOT_VERIFIED',
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION'
      });
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('ensures diagnostic calculations cannot be upgraded by outer calculations', () => {
      const diagAudit = EngineeringAuditService.createAuditRecord({
        ...baseParams,
        calculationPath: {
          id: 'test_diagnostic',
          name: 'Diagnostic Sub-Calculation'
        },
        validationStatus: 'PASS',
        authorityPolicy: 'DIAGNOSTIC'
      });
      expect(diagAudit.isApprovedForEngineeringUse).toBe(false);
      expect(diagAudit.finalResult.isAuthoritative).toBe(false);
    });
  });
});
