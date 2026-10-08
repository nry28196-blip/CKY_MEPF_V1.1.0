import { describe, it, expect } from 'vitest';
import { 
  ProductionScopeService, 
  VENTILATION_PRODUCTION_SCOPE,
  ProductionCalculationScope
} from '../../calculations/scope/ProductionCalculationScope';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ASHRAE_62_1_PRODUCTION_BASIS } from '../../data/ventilation/ashrae621/types';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';

describe('PROMPT 2 — Production-Scope Architecture & Operational Contract', () => {
  const scope = ProductionScopeService.getVentilationScope();
  const office = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
  const ezCooling = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;

  describe('1. Active Production Basis: Exactly 2022 + Addendum j (Main) and Addendum x (Exhaust)', () => {
    it('freezes main ventilation basis to ANSI/ASHRAE Standard 62.1-2022 + Addendum j', () => {
      expect(scope.standard).toBe('ASHRAE 62.1');
      expect(scope.edition).toBe('2022');
      expect(scope.mainBasis).toBe('ANSI/ASHRAE Standard 62.1-2022 + Addendum j');
      expect(scope.allowedAddenda).toContain('Addendum j');
      expect(scope.publishedAddendaApplied).toContain('Addendum j');
      expect(scope.productionStatus).toBe('ACTIVE_PRODUCTION');
    });

    it('freezes prescriptive exhaust basis to ANSI/ASHRAE Standard 62.1-2022 + Addendum x', () => {
      expect(scope.exhaustBasis).toBe('ANSI/ASHRAE Standard 62.1-2022 + Addendum x');
      expect(scope.allowedAddenda).toContain('Addendum x');
      expect(scope.publishedAddendaApplied).toContain('Addendum x');
    });

    it('contains exactly [Addendum j, Addendum x] as approved active addenda', () => {
      expect(scope.allowedAddenda).toEqual(['Addendum j', 'Addendum x']);
      expect(scope.publishedAddendaApplied).toEqual(['Addendum j', 'Addendum x']);
    });

    it('strengthens ASHRAE_62_1_PRODUCTION_BASIS to conform to the scope contract', () => {
      expect(ASHRAE_62_1_PRODUCTION_BASIS.standard).toBe('ASHRAE 62.1');
      expect(ASHRAE_62_1_PRODUCTION_BASIS.edition).toBe('2022');
      expect(ASHRAE_62_1_PRODUCTION_BASIS.mainBasis).toBe(scope.mainBasis);
      expect(ASHRAE_62_1_PRODUCTION_BASIS.exhaustBasis).toBe(scope.exhaustBasis);
      expect(ASHRAE_62_1_PRODUCTION_BASIS.supportedPaths.length).toBeGreaterThanOrEqual(6);
      expect(ASHRAE_62_1_PRODUCTION_BASIS.blockedPaths.length).toBeGreaterThanOrEqual(6);
    });

    it('StandardDataProvider.getProductionBasis() and getProductionScope() return the operational scope', () => {
      const basis = StandardDataProvider.getProductionBasis();
      const scopeFromProvider = StandardDataProvider.getProductionScope();
      expect(basis.standard).toBe('ASHRAE 62.1');
      expect(basis.edition).toBe('2022');
      expect(scopeFromProvider.mainBasis).toContain('Addendum j');
      expect(scopeFromProvider.exhaustBasis).toContain('Addendum x');
    });
  });

  describe('2. Distinction: Controlled Project Basis vs. Current Published Standard Universe', () => {
    it('documents distinction between controlled project basis and published standard universe', () => {
      expect(scope.controlledProjectBasisDescription).toContain('Controlled Project Baseline');
      expect(scope.controlledProjectBasisDescription).toContain('Addendum j');
      expect(scope.controlledProjectBasisDescription).toContain('Addendum x');
      expect(scope.publishedStandardUniverseDistinction).toContain('broader published standard universe');
      expect(scope.publishedStandardUniverseDistinction).toContain('does NOT imply');
    });

    it('rejects later 62.1-2022 addenda from being silently treated as active', () => {
      const laterAddenda = ['Addendum a', 'Addendum b', 'Addendum k', 'Addendum l', 'Addendum m', 'Addendum z'];
      for (const addendum of laterAddenda) {
        expect(ProductionScopeService.isAddendumAllowed(addendum)).toBe(false);
        const valResult = ProductionScopeService.validateAddendum(addendum);
        expect(valResult.allowed).toBe(false);
        expect(valResult.status).toBe('BLOCKED');
        expect(valResult.reasons[0]).toContain('not part of the active production project basis');
      }
    });

    it('approves only officially frozen addenda (j and x)', () => {
      expect(ProductionScopeService.isAddendumAllowed('Addendum j')).toBe(true);
      expect(ProductionScopeService.isAddendumAllowed('Addendum x')).toBe(true);
      expect(ProductionScopeService.validateAddendum('Addendum j').status).toBe('PASS');
      expect(ProductionScopeService.validateAddendum('Addendum x').status).toBe('PASS');
    });
  });

  describe('3. Blocked Standards and Editions', () => {
    it('blocks ASHRAE 62.1-2019 in scope and runtime calculation engine', () => {
      expect(scope.blockedEditions).toContain('2019');
      const val = ProductionScopeService.validateStandardAndEdition('ASHRAE 62.1', '2019');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');
      expect(val.reasons[0]).toContain('2019');

      // Runtime engine blocks 2019 without fabricating results
      const singleZone = VentilationEngine.runSingleZone({
        edition: '2019',
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2019',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        },
        density: { elevation: 0, temperature: 20 }
      });
      expect(singleZone.status).toBe('BLOCKED');
      expect(singleZone.voz).toBeNull();
      expect(singleZone.finalDesignOutdoorAir).toBeNull();

      // Multi-zone engine blocks 2019
      const multiZone = VentilationEngine.runMultiZone({
        edition: '2019',
        method: 'Simplified',
        systemType: 'single_supply',
        systemPopulation: 5,
        zones: [{
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2019',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        }],
        density: { elevation: 0, temperature: 20 }
      });
      expect(multiZone.status).toBe('BLOCKED');
      expect(multiZone.finalDesignOutdoorAir).toBeNull();
    });

    it('blocks ASHRAE 62.1-2025 in scope and runtime calculation engine', () => {
      expect(scope.blockedEditions).toContain('2025');
      const val = ProductionScopeService.validateStandardAndEdition('ASHRAE 62.1', '2025');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');
      expect(val.reasons[0]).toContain('2025');

      // Runtime engine blocks 2025 without fabricating results
      const singleZone = VentilationEngine.runSingleZone({
        edition: '2025',
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2025',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        },
        density: { elevation: 0, temperature: 20 }
      });
      expect(singleZone.status).toBe('BLOCKED');
      expect(singleZone.voz).toBeNull();
      expect(singleZone.finalDesignOutdoorAir).toBeNull();

      // Multi-zone engine blocks 2025
      const multiZone = VentilationEngine.runMultiZone({
        edition: '2025',
        method: 'Simplified',
        systemType: 'single_supply',
        systemPopulation: 5,
        zones: [{
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2025',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        }],
        density: { elevation: 0, temperature: 20 }
      });
      expect(multiZone.status).toBe('BLOCKED');
      expect(multiZone.finalDesignOutdoorAir).toBeNull();
    });

    it('blocks ASHRAE 62.2 from the commercial 62.1 calculation path', () => {
      expect(scope.blockedStandards).toContain('ASHRAE 62.2');
      const val = ProductionScopeService.validateStandardAndEdition('ASHRAE 62.2', '2022');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');
      expect(val.reasons[0]).toContain('outside the commercial ASHRAE 62.1 production calculation path');

      // Runtime engine blocks 62.2 in commercial engine
      const singleZone = VentilationEngine.runSingleZone({
        standard: 'ASHRAE 62.2',
        zone: {
          expectedStandard: 'ASHRAE 62.2',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling
        },
        density: { elevation: 0, temperature: 20 }
      } as any);
      expect(singleZone.status).toBe('BLOCKED');
      expect(singleZone.zone.reason).toContain('ASHRAE 62.2 is outside the scope of ASHRAE 62.1 commercial calculations');
      expect(singleZone.finalDesignOutdoorAir).toBeNull();
    });
  });

  describe('4. Active Supported Calculation Paths', () => {
    it('explicitly lists and documents all 6 minimum required active calculation paths', () => {
      const pathIds = scope.supportedPaths.map(p => p.id);
      expect(pathIds).toContain('single_zone');
      expect(pathIds).toContain('multi_zone_simplified');
      expect(pathIds).toContain('multi_zone_alternative');
      expect(pathIds).toContain('prescriptive_exhaust_table_6_2');
      expect(pathIds).toContain('table_6_3_air_class');
      expect(pathIds).toContain('air_density_correction');
    });

    it('validates supported paths through ProductionScopeService', () => {
      expect(ProductionScopeService.isPathSupported('single_zone')).toBe(true);
      expect(ProductionScopeService.isPathSupported('multi_zone_simplified')).toBe(true);
      expect(ProductionScopeService.isPathSupported('multi_zone_alternative')).toBe(true);
      expect(ProductionScopeService.isPathSupported('prescriptive_exhaust_table_6_2')).toBe(true);
      expect(ProductionScopeService.isPathSupported('table_6_3_air_class')).toBe(true);
      expect(ProductionScopeService.isPathSupported('air_density_correction')).toBe(true);

      expect(ProductionScopeService.validateCalculationPath('single_zone').status).toBe('PASS');
      expect(ProductionScopeService.validateCalculationPath('multi_zone_simplified').status).toBe('PASS');
      expect(ProductionScopeService.validateCalculationPath('multi_zone_alternative').status).toBe('PASS');
      expect(ProductionScopeService.validateCalculationPath('prescriptive_exhaust_table_6_2').status).toBe('PASS');
    });
  });

  describe('5. Unsupported Calculation Paths Cannot Return PASS', () => {
    it('explicitly defines blocked paths in contract with BLOCKED status', () => {
      const blockedIds = scope.blockedPaths.map(p => p.id);
      expect(blockedIds).toContain('ashrae_62_1_2019');
      expect(blockedIds).toContain('ashrae_62_1_2025');
      expect(blockedIds).toContain('ashrae_62_2_in_commercial_engine');
      expect(blockedIds).toContain('unverified_table_6_4_ez');
      expect(blockedIds).toContain('manual_ez_override_as_standard');
      expect(blockedIds).toContain('performance_exhaust_path_6_5_2');
      expect(blockedIds).toContain('unapproved_2022_addenda');

      for (const p of scope.blockedPaths) {
        expect(p.blockedStatus).toBe('BLOCKED');
        expect(p.reason.length).toBeGreaterThan(10);
      }
    });

    it('blocks Performance Exhaust Path 6.5.2 and returns no fabricated numeric result', () => {
      const val = ProductionScopeService.validateCalculationPath('performance_exhaust_path_6_5_2');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');

      // Test via Ashrae621ExhaustService with calculationProcedure: 'performance'
      const exhaustRes = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: StandardDataProvider.get621ExhaustRates('2022')[0],
        qty: 100,
        designExhaust: 500,
        calculationProcedure: 'performance'
      });
      expect(exhaustRes.status).toBe('BLOCKED');
      expect(exhaustRes.requiredExhaust).toBeNull();
      expect(exhaustRes.requiredExhaustMetric).toBeNull();
      expect(exhaustRes.complianceNotes[0]).toContain('Performance Exhaust Path 6.5.2');
    });

    it('blocks unverified/unimplemented Table 6-4 configurations (ez-unidirectional-flow)', () => {
      const val = ProductionScopeService.validateCalculationPath('unverified_table_6_4_ez');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');

      const unverifiedEz = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-unidirectional-flow')!;
      expect(unverifiedEz).toBeDefined();

      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: unverifiedEz
      });
      expect(zoneRes.status).toBe('BLOCKED');
      expect(zoneRes.voz).toBeNull();
      expect(zoneRes.vbz).toBeNull();
    });

    it('blocks manual Ez override as a certified standard result', () => {
      const val = ProductionScopeService.validateCalculationPath('manual_ez_override_as_standard');
      expect(val.allowed).toBe(false);
      expect(val.status).toBe('BLOCKED');

      const override = EzSelectionService.createManualOverride(1.15, 'CFD Analysis Report #2026-A');
      expect(override.verificationStatus).toBe('NOT_VERIFIED');

      // In resolution
      const res = EzSelectionService.validateEzConfiguration(override);
      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');

      // In production zone service
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: override
      });
      // Manual overrides carry NOT_VERIFIED provenance and are blocked from standard certification
      expect(zoneRes.status).toBe('BLOCKED');
      expect(zoneRes.status).not.toBe('PASS');
    });

    it('rejects unknown or arbitrary calculation paths', () => {
      const unknownVal = ProductionScopeService.validateCalculationPath('nonexistent_experimental_path');
      expect(unknownVal.allowed).toBe(false);
      expect(unknownVal.status).toBe('BLOCKED');
      expect(unknownVal.reasons[0]).toContain('not supported in the active production scope');
    });
  });

  describe('6. MEP Reusability Contract', () => {
    it('allows other MEP disciplines to implement the exact same ProductionCalculationScope contract', () => {
      // Example: Demonstrating that a Plumbing or Hydronics system uses the exact same contract pattern
      const plumbingScope: ProductionCalculationScope = {
        discipline: 'plumbing',
        standard: 'IPC',
        edition: '2024',
        mainBasis: 'International Plumbing Code 2024 (Table 709.1 / Table 710.1(2))',
        revisionBasis: 'IPC-2024 (Hunter Drainage Fixture Unit Method)',
        allowedAddenda: [],
        publishedAddendaApplied: [],
        blockedEditions: ['2015', '2018'],
        blockedStandards: ['UPC-2015'],
        supportedPaths: [
          {
            id: 'hunter_dfu_sizing',
            name: 'Hunter Modified DFU Sizing',
            section: 'Chapter 7',
            description: 'Drainage fixture unit hydraulic loading and minimum stack/drain sizing',
            governingBasis: 'IPC 2024 Table 710.1(1)'
          }
        ],
        blockedPaths: [
          {
            id: 'unverified_custom_fixture',
            name: 'Unverified Custom Fixture Units',
            reason: 'Non-standard fixture loading without code authority approval',
            blockedStatus: 'BLOCKED'
          }
        ],
        unsupportedCalculationPaths: [],
        productionStatus: 'ACTIVE_PRODUCTION',
        sourceStatus: 'VERIFIED',
        revisionDate: '2026-09-28',
        sourceReferences: ['International Plumbing Code 2024, ICC'],
        controlledProjectBasisDescription: 'Controlled Project Baseline: strictly IPC-2024 with approved state amendments.',
        publishedStandardUniverseDistinction: 'Distinguishes local adopted code from future model code updates.'
      };

      expect(plumbingScope.discipline).toBe('plumbing');
      expect(plumbingScope.standard).toBe('IPC');
      expect(plumbingScope.edition).toBe('2024');
      expect(plumbingScope.supportedPaths[0].id).toBe('hunter_dfu_sizing');
      expect(plumbingScope.blockedEditions).toContain('2018');
    });
  });
});
