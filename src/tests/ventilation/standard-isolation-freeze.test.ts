import { describe, it, expect } from 'vitest';
import { 
  VENTILATION_STANDARDS, 
  ACTIVE_PRODUCTION_STANDARDS, 
  FUTURE_STANDARDS, 
  DEFAULT_COMMERCIAL_STANDARD, 
  DEFAULT_RESIDENTIAL_STANDARD,
  PRODUCTION_EDITION,
  isStandardActive,
  assertProductionEdition
} from '../../calculations/ventilation/VentilationStandardModel';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae622Service } from '../../calculations/ventilation/Ashrae622Service';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';

describe('ASHRAE Ventilation Standard Isolation and 2022 Production Freeze', () => {
  describe('1. Standard Model & Status Verification', () => {
    it('defines ASHRAE 62.1-2022 as ACTIVE_PRODUCTION', () => {
      expect(VENTILATION_STANDARDS['ASHRAE 62.1-2022'].status).toBe('ACTIVE_PRODUCTION');
      expect(isStandardActive('ASHRAE 62.1-2022')).toBe(true);
      expect(ACTIVE_PRODUCTION_STANDARDS).toContain('ASHRAE 62.1-2022');
      expect(DEFAULT_COMMERCIAL_STANDARD).toBe('ASHRAE 62.1-2022');
    });

    it('defines ASHRAE 62.2-2022 as ACTIVE_PRODUCTION', () => {
      expect(VENTILATION_STANDARDS['ASHRAE 62.2-2022'].status).toBe('ACTIVE_PRODUCTION');
      expect(isStandardActive('ASHRAE 62.2-2022')).toBe(true);
      expect(ACTIVE_PRODUCTION_STANDARDS).toContain('ASHRAE 62.2-2022');
      expect(DEFAULT_RESIDENTIAL_STANDARD).toBe('ASHRAE 62.2-2022');
    });

    it('isolates ASHRAE 62.1-2025 as DISABLED_FUTURE', () => {
      expect(VENTILATION_STANDARDS['ASHRAE 62.1-2025'].status).toBe('DISABLED_FUTURE');
      expect(isStandardActive('ASHRAE 62.1-2025')).toBe(false);
      expect(FUTURE_STANDARDS).toContain('ASHRAE 62.1-2025');
      expect(VENTILATION_STANDARDS['ASHRAE 62.1-2025'].uiLabel).toContain('[DISABLED / FUTURE]');
    });

    it('isolates ASHRAE 62.2-2025 as DISABLED_FUTURE', () => {
      expect(VENTILATION_STANDARDS['ASHRAE 62.2-2025'].status).toBe('DISABLED_FUTURE');
      expect(isStandardActive('ASHRAE 62.2-2025')).toBe(false);
      expect(FUTURE_STANDARDS).toContain('ASHRAE 62.2-2025');
      expect(VENTILATION_STANDARDS['ASHRAE 62.2-2025'].uiLabel).toContain('[DISABLED / FUTURE]');
    });

    it('assertProductionEdition throws when 2025 is passed', () => {
      expect(() => assertProductionEdition('2025')).toThrow(/PRODUCTION_BASELINE_VIOLATION/);
      expect(() => assertProductionEdition('2022')).not.toThrow();
    });
  });

  describe('2. StandardDataProvider Baseline Freeze (Defaults strictly to 2022)', () => {
    it('get621SpaceTypes defaults to 2022 edition', () => {
      const defaultTypes = StandardDataProvider.get621SpaceTypes();
      const types2022 = StandardDataProvider.get621SpaceTypes('2022');
      expect(defaultTypes.length).toBe(types2022.length);
      expect(defaultTypes[0].edition).toBe('2022');
    });

    it('get621EzValues defaults to 2022 edition', () => {
      const defaultEz = StandardDataProvider.get621EzValues();
      const ez2022 = StandardDataProvider.get621EzValues('2022');
      expect(defaultEz.length).toBe(ez2022.length);
      expect(defaultEz[0].edition).toBe('2022');
    });

    it('get621ExhaustRates defaults to 2022 edition', () => {
      const defaultExhaust = StandardDataProvider.get621ExhaustRates();
      const exhaust2022 = StandardDataProvider.get621ExhaustRates('2022');
      expect(defaultExhaust.length).toBe(exhaust2022.length);
      expect(defaultExhaust[0].edition).toBe('2022');
    });

    it('get622Coefficients defaults to 2022 edition', () => {
      const defaultCoeffs = StandardDataProvider.get622Coefficients();
      const coeffs2022 = StandardDataProvider.get622Coefficients('2022');
      expect(defaultCoeffs).toEqual(coeffs2022);
      expect(defaultCoeffs.edition).toBe('2022');
    });

    it('production getters always return 2022 datasets', () => {
      expect(StandardDataProvider.getProduction621SpaceTypes()[0].edition).toBe('2022');
      expect(StandardDataProvider.getProduction621EzValues()[0].edition).toBe('2022');
      expect(StandardDataProvider.getProduction621ExhaustRates()[0].edition).toBe('2022');
      expect(StandardDataProvider.getProduction622Coefficients().edition).toBe('2022');
    });
  });

  describe('3. ASHRAE 62.2 Standard-Basis Runtime Validation', () => {
    it('blocks calculation when expectedEdition is 2025', () => {
      const coeffs = StandardDataProvider.getProduction622Coefficients();
      const result = Ashrae622Service.calculateWholeDwelling({
        floorArea: 100,
        bedrooms: 3,
        infiltrationCredit: 0,
        infiltrationVerified: false,
        localExhaust: null,
        coefficients: coeffs,
        expectedStandard: 'ASHRAE 62.2',
        expectedEdition: '2025'
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.message).toContain('ASHRAE 62.2-2025 is deferred');
      expect(result.qTot).toBeNull();
      expect(result.qFan).toBeNull();
    });

    it('succeeds when expectedEdition is 2022', () => {
      const coeffs = StandardDataProvider.getProduction622Coefficients();
      const result = Ashrae622Service.calculateWholeDwelling({
        floorArea: 100,
        bedrooms: 3,
        infiltrationCredit: 0,
        infiltrationVerified: false,
        localExhaust: null,
        coefficients: coeffs,
        expectedStandard: 'ASHRAE 62.2',
        expectedEdition: '2022'
      });

      expect(result.status).toBe('PASS');
      expect(result.qTot).toBe(29);
      expect(result.qFan).toBe(29);
    });
  });

  describe('4. 2025 Data Status Isolation', () => {
    it('2025 62.1 space types are marked NOT_VERIFIED and blocked for production', () => {
      const spaceTypes2025 = StandardDataProvider.get621SpaceTypes('2025');
      const unverifiedCount = spaceTypes2025.filter(s => s.verificationStatus === 'NOT_VERIFIED').length;
      expect(unverifiedCount).toBe(spaceTypes2025.length);

      const office2025 = spaceTypes2025.find(s => s.id === 'office')!;
      const ez2025 = StandardDataProvider.get621EzValues('2025').find(e => e.id === 'ez-1')!;

      const calcResult = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2025',
        spaceType: office2025,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez2025
      });

      // 2025 unverified data must safely block calculation in production
      expect(calcResult.status).toBe('BLOCKED');
    });

    it('2022 62.1 production space types are VERIFIED and PASS calculation', () => {
      const spaceTypes2022 = StandardDataProvider.getProduction621SpaceTypes();
      const office2022 = spaceTypes2022.find(s => s.id === 'office')!;
      const ez2022 = StandardDataProvider.getProduction621EzValues().find(e => e.id === 'ez-1')!;

      expect(office2022.verificationStatus).toBe('VERIFIED');
      expect(ez2022.verificationStatus).toBe('VERIFIED');

      const calcResult = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office2022,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez2022
      });

      expect(calcResult.status).toBe('PASS');
      expect(calcResult.voz).toBe(42.5);
    });

    it('ez-unidirectional-flow is frozen as unverified / non-production in 2022 baseline', () => {
      const ez2022 = StandardDataProvider.get621EzValues('2022');
      const unidirectional = ez2022.find(e => e.id === 'ez-unidirectional-flow');
      expect(unidirectional).toBeDefined();
      expect(unidirectional!.verificationStatus).toBe('NOT_VERIFIED');
    });
  });
});
