import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EngineeringValidationLogger, SafetyFailureEntry } from '../../calculations/validation/EngineeringValidationLogger';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ASHRAE_621_2022_EZ_VALUES } from '../../data/ventilation/ashrae621/2022/data';

describe('EngineeringValidationLogger - Centralized Safety Logging Utility', () => {
  const office = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
  const ez1 = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-1')!;

  beforeEach(() => {
    EngineeringValidationLogger.resetConfig();
    EngineeringValidationLogger.clearHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Non-Finite Number Formatting & Capture', () => {
    it('correctly formats and logs NaN values with non-finite classification', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const entry = EngineeringValidationLogger.logNonFinite({
        system: 'TestSystem',
        field: 'testParam',
        value: NaN,
        expected: 'finite number >= 2.0'
      });

      expect(entry.failureType).toBe('NON_FINITE_NUMERIC');
      expect(entry.formattedValue).toBe('NaN (typeof number)');
      expect(entry.status).toBe('FAIL');
      expect(entry.reasons[0]).toContain('non-finite');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('correctly formats and logs +Infinity values', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const entry = EngineeringValidationLogger.logNonFinite({
        system: 'TestSystem',
        field: 'heightParam',
        value: Infinity,
        expected: 'finite number > 2.8'
      });

      expect(entry.failureType).toBe('NON_FINITE_NUMERIC');
      expect(entry.formattedValue).toBe('+Infinity (typeof number)');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('correctly formats and logs -Infinity values', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const entry = EngineeringValidationLogger.logNonFinite({
        system: 'TestSystem',
        field: 'velocityParam',
        value: -Infinity,
        expected: 'finite number <= 0.25'
      });

      expect(entry.failureType).toBe('NON_FINITE_NUMERIC');
      expect(entry.formattedValue).toBe('-Infinity (typeof number)');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('2. assertFinite Helper', () => {
    it('returns true for valid finite numbers and does not log', () => {
      const spy = vi.spyOn(EngineeringValidationLogger, 'logNonFinite');
      expect(EngineeringValidationLogger.assertFinite('Test', 'val', 42.5)).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      expect(EngineeringValidationLogger.getHistory().length).toBe(0);
    });

    it('returns false and logs when given NaN', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(EngineeringValidationLogger.assertFinite('Test', 'qFlow', NaN)).toBe(false);
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest).not.toBeNull();
      expect(latest?.failureType).toBe('NON_FINITE_NUMERIC');
      expect(latest?.field).toBe('qFlow');
      expect(latest?.formattedValue).toContain('NaN');
    });

    it('returns false and logs when given Infinity', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(EngineeringValidationLogger.assertFinite('Test', 'qFlow', Infinity)).toBe(false);
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest?.formattedValue).toContain('+Infinity');
    });

    it('enforces positive boundary when mustBePositive is set', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(EngineeringValidationLogger.assertFinite('Test', 'densityRatio', -0.5, { mustBePositive: true })).toBe(false);
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest?.failureType).toBe('OUT_OF_BOUNDS');
      expect(latest?.expected).toBe('> 0');
    });
  });

  describe('3. History Ring Buffer and Subscriptions', () => {
    it('records entries up to maxHistorySize in FIFO order', () => {
      EngineeringValidationLogger.configure({ maxHistorySize: 3, consoleReporting: false });

      EngineeringValidationLogger.logSafetyFailure({ system: 'Sys', failureType: 'GENERAL_SAFETY_FAIL', message: 'Fail 1' });
      EngineeringValidationLogger.logSafetyFailure({ system: 'Sys', failureType: 'GENERAL_SAFETY_FAIL', message: 'Fail 2' });
      EngineeringValidationLogger.logSafetyFailure({ system: 'Sys', failureType: 'GENERAL_SAFETY_FAIL', message: 'Fail 3' });
      EngineeringValidationLogger.logSafetyFailure({ system: 'Sys', failureType: 'GENERAL_SAFETY_FAIL', message: 'Fail 4' });

      const history = EngineeringValidationLogger.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].message).toBe('Fail 2');
      expect(history[2].message).toBe('Fail 4');
    });

    it('supports subscription listeners and unsubscription', () => {
      EngineeringValidationLogger.configure({ consoleReporting: false });
      const captured: SafetyFailureEntry[] = [];
      const unsubscribe = EngineeringValidationLogger.subscribe((entry) => {
        captured.push(entry);
      });

      EngineeringValidationLogger.logNonFinite({ system: 'S', field: 'f1', value: NaN });
      expect(captured.length).toBe(1);
      expect(captured[0].field).toBe('f1');

      unsubscribe();
      EngineeringValidationLogger.logNonFinite({ system: 'S', field: 'f2', value: Infinity });
      expect(captured.length).toBe(1); // Unsubscribed, no new additions
    });
  });

  describe('4. Integration with Stratified and Personalized Non-Finite Checks', () => {
    it('captures safety failure when tempDiffRoomSupplyC is NaN in EzSelectionService', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: NaN,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.2,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });

      expect(res.status).toBe('FAIL');
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest).not.toBeNull();
      expect(latest?.failureType).toBe('NON_FINITE_NUMERIC');
      expect(latest?.field).toBe('tempDiffRoomSupplyC');
      expect(latest?.formattedValue).toContain('NaN');
    });

    it('captures safety failure when returnOpeningHeightM is Infinity in EzSelectionService', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 3.0,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: Infinity,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });

      expect(res.status).toBe('FAIL');
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest?.field).toBe('returnOpeningHeightM');
      expect(latest?.formattedValue).toContain('+Infinity');
    });

    it('captures safety failure when headRegionVelocityMs is NaN in personalized prerequisites', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: NaN,
          returnOpeningHeightM: 3.0
        }
      });

      expect(res.status).toBe('FAIL');
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest?.field).toBe('headRegionVelocityMs');
      expect(latest?.formattedValue).toContain('NaN');
    });
  });

  describe('5. Integration with Zone and Engine Ep Safety Validation', () => {
    it('captures safety failure when zone epDensity is NaN in Ashrae621ZoneService', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez1,
        epDensity: NaN
      });

      expect(res.status).toBe('FAIL');
      const latest = EngineeringValidationLogger.getLatestFailure();
      expect(latest?.field).toBe('epDensity');
      expect(latest?.formattedValue).toContain('NaN');
      expect(latest?.failureType).toBe('NON_FINITE_NUMERIC');
    });

    it('captures safety failure when caller supplies invalid epDensity to VentilationEngine.runSingleZone', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ez1,
          epDensity: -Infinity
        }
      });

      expect(res.status).toBe('FAIL');
      const failures = EngineeringValidationLogger.getHistory();
      const engineFailure = failures.find(f => f.system === 'VentilationEngine.runSingleZone');
      expect(engineFailure).toBeDefined();
      expect(engineFailure?.field).toBe('zone.epDensity');
      expect(engineFailure?.formattedValue).toContain('-Infinity');
    });
  });
});
