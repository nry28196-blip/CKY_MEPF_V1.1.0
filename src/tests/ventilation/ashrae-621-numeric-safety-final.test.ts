import { describe, it, expect } from 'vitest';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ASHRAE_621_2022_EZ_VALUES } from '../../data/ventilation/ashrae621/2022/data';
import {
  StratifiedVentilationPrerequisites,
  PersonalizedVentilationPrerequisites,
  Ashrae621Ez
} from '../../data/ventilation/ashrae621/types';

function getEz(id: string): Ashrae621Ez {
  const found = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === id);
  if (!found) throw new Error(`Missing Ez id: ${id}`);
  return found;
}

const office = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
const ez1 = getEz('ez-1');
const ez3 = getEz('ez-3');
const ezPersonalCool = getEz('ez-personalized-ceiling-cool');

describe('FINAL VENTILATION NUMERIC-SAFETY: NaN / Infinity Protection & Ep Handling', () => {
  const validStratPrereqs: StratifiedVentilationPrerequisites = {
    tempDiffRoomSupplyC: 3.0,
    supplyTempBelowRoomGte2C: true,
    returnOpeningHeightM: 3.2,
    returnOpeningHeightGt28m: true,
    noMechanicalMixingDevices: true,
    protectedFromImpingingAirstreams: true
  };

  const validPersonalPrereqs: PersonalizedVentilationPrerequisites = {
    airDistributedInBreathingZone: true,
    headRegionVelocityMs: 0.20,
    headRegionVelocityMet: true,
    returnOpeningHeightM: 3.2,
    returnOpeningHeightGt28m: true
  };

  // =========================================================================
  // 1. STRATIFIED PREREQUISITES NUMERIC SAFETY
  // =========================================================================
  describe('1. Stratified Prerequisites Non-Finite Number Protection', () => {
    it('rejects tempDiffRoomSupplyC = NaN as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          tempDiffRoomSupplyC: NaN
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects tempDiffRoomSupplyC = NaN even when supplyTempBelowRoomGte2C is true', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          tempDiffRoomSupplyC: NaN,
          supplyTempBelowRoomGte2C: true
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects tempDiffRoomSupplyC = Infinity as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          tempDiffRoomSupplyC: Infinity,
          supplyTempBelowRoomGte2C: true
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects tempDiffRoomSupplyC = -Infinity as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          tempDiffRoomSupplyC: -Infinity,
          supplyTempBelowRoomGte2C: true
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = NaN as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          returnOpeningHeightM: NaN
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = Infinity as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          returnOpeningHeightM: Infinity,
          returnOpeningHeightGt28m: true
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = -Infinity as FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: {
          ...validStratPrereqs,
          returnOpeningHeightM: -Infinity,
          returnOpeningHeightGt28m: true
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('allows valid finite stratified inputs to PASS', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        distributionCategory: 'stratified',
        stratifiedPrerequisites: validStratPrereqs
      });
      expect(res.valid).toBe(true);
      expect(res.status).toBe('PASS');
    });
  });

  // =========================================================================
  // 2. PERSONALIZED PREREQUISITES NUMERIC SAFETY
  // =========================================================================
  describe('2. Personalized Prerequisites Non-Finite Number Protection', () => {
    it('rejects headRegionVelocityMs = NaN as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: NaN,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects headRegionVelocityMs = Infinity as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: Infinity,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects headRegionVelocityMs = -Infinity as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: -Infinity,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = NaN as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: 0.20,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: NaN
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = Infinity as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: 0.20,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: Infinity
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('rejects returnOpeningHeightM = -Infinity as FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: {
          headRegionVelocityMs: 0.20,
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: -Infinity
        }
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe('FAIL');
    });

    it('allows valid finite personalized inputs to PASS', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        isPersonalizedVentilation: true,
        personalizedPrerequisites: validPersonalPrereqs
      });
      expect(res.valid).toBe(true);
      expect(res.status).toBe('PASS');
    });
  });

  // =========================================================================
  // 3. ZONE EP / ERHO NUMERIC SAFETY IN Ashrae621ZoneService
  // =========================================================================
  describe('3. Zone Ep / eRho Validation in Ashrae621ZoneService', () => {
    const baseZoneInput = {
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: ez1
    };

    it('rejects epDensity = NaN as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: NaN
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('rejects epDensity = Infinity as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: Infinity
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('rejects epDensity = -Infinity as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: -Infinity
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('rejects epDensity = 0 as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: 0
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('rejects epDensity = -1 as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: -1
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('rejects legacy eRho = NaN as FAIL with voz = null', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        eRho: NaN
      });
      expect(res.status).toBe('FAIL');
      expect(res.voz).toBeNull();
    });

    it('defaults omitted epDensity / eRho to 1.0 cleanly', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput
      });
      expect(res.status).toBe('PASS');
      expect(res.epDensity).toBe(1.0);
      expect(res.voz).toBe(42.5); // (2.5*5 + 0.3*100)/1.0 * 1.0 = 42.5
    });

    it('correctly uses valid finite positive epDensity', () => {
      const res = Ashrae621ZoneService.calculateZone({
        ...baseZoneInput,
        epDensity: 1.20
      });
      expect(res.status).toBe('PASS');
      expect(res.epDensity).toBe(1.20);
      expect(res.voz).toBeCloseTo(42.5 * 1.20, 4);
    });
  });

  // =========================================================================
  // 4. PRODUCTION ENGINE EP-BYPASS PROTECTION & INVALID EP SAFETY
  // =========================================================================
  describe('4. Production Engine Ep Bypass Protection & Invalid Ep Safety', () => {
    const validRunConfig = {
      edition: '2022' as const,
      density: { elevation: 0, temperature: 20, relativeHumidity: 0 }, // Sea level: eRho = 1.00
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez1
      }
    };

    it('prevents valid caller-supplied zone.epDensity from bypassing production density calculation', () => {
      // Caller attempts to force epDensity: 2.0 at sea level (where production eRho = 1.00)
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: 2.0
        }
      });
      expect(res.status).toBe('PASS');
      expect(res.isAuthoritative).toBe(true);
      expect(res.isApprovedForEngineeringUse).toBe(true);
      expect(res.zone.epDensity).toBe(1.0); // Production engine density eRho (1.00) MUST prevail
      expect(res.voz).toBe(42.5); // (42.5 / 1.0) * 1.0 = 42.5, NOT 85.0
    });

    it('prevents caller-supplied zone.eRho from bypassing production density calculation', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          eRho: 3.5
        }
      });
      expect(res.status).toBe('PASS');
      expect(res.zone.epDensity).toBe(1.0);
      expect(res.voz).toBe(42.5);
    });

    it('rejects caller-supplied zone.epDensity = NaN as non-authoritative FAIL', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: NaN
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.voz).toBeNull();
    });

    it('rejects caller-supplied zone.epDensity = Infinity as non-authoritative FAIL', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: Infinity
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.voz).toBeNull();
    });

    it('rejects caller-supplied zone.epDensity = -Infinity as non-authoritative FAIL', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: -Infinity
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.voz).toBeNull();
    });

    it('rejects caller-supplied zone.epDensity = 0 as non-authoritative FAIL', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: 0
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.voz).toBeNull();
    });

    it('rejects caller-supplied zone.epDensity = -1 as non-authoritative FAIL', () => {
      const res = VentilationEngine.runSingleZone({
        ...validRunConfig,
        zone: {
          ...validRunConfig.zone,
          epDensity: -1
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.voz).toBeNull();
    });

    it('protects runMultiZone from caller-supplied invalid epDensity on a zone', () => {
      const res = VentilationEngine.runMultiZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        method: 'Simplified',
        systemType: 'single_supply',
        systemPopulation: 10,
        zones: [
          {
            ...validRunConfig.zone,
            id: 'z1'
          },
          {
            ...validRunConfig.zone,
            id: 'z2',
            epDensity: NaN // Malicious / invalid caller Ep
          }
        ]
      });
      expect(res.status).toBe('FAIL');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.vot).toBeNull();
    });

    it('confirms standard office cooling baseline remains numerically exact (Vbz = 42.5, Voz = 42.5)', () => {
      const res = VentilationEngine.runSingleZone(validRunConfig);
      expect(res.status).toBe('PASS');
      expect(res.isAuthoritative).toBe(true);
      expect(res.isApprovedForEngineeringUse).toBe(true);
      expect(res.zone.vbz).toBe(42.5);
      expect(res.zone.voz).toBe(42.5);
      expect(res.voz).toBe(42.5);
    });
  });
});
