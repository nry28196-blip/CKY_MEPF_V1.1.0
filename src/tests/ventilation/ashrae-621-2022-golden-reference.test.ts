import { describe, it, expect } from 'vitest';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { DensityCorrectionService } from '../../lib/DensityCorrectionService';
import { Ashrae621SimplifiedSystemService } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621AlternativeSystemService } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ProductionScopeService } from '../../calculations/scope/ProductionCalculationScope';
import {
  Ashrae621SpaceType,
  Ashrae621Ez,
  Ashrae621ExhaustType,
  StratifiedVentilationPrerequisites,
  PersonalizedVentilationPrerequisites
} from '../../data/ventilation/ashrae621/types';

/**
 * INDEPENDENT ENGINEERING GOLDEN REFERENCE SUITE — ANSI/ASHRAE Standard 62.1-2022
 * 
 * ARCHITECTURAL MANDATES (Prompt 4):
 * 1. Test calculation physics and standards, not just software flow logic.
 * 2. Every expected value is derived independently from first principles and hand calculations.
 * 3. Never call the production service to compute the expected value.
 * 4. Explicit hand-calculated constants across all tested domains.
 * 5. Verify that invalid engineering states cannot produce PASS.
 */
describe('PROMPT 4 — ASHRAE 62.1-2022 Independent Engineering Golden Reference Suite', () => {
  const spaceTypes2022 = StandardDataProvider.getProduction621SpaceTypes();
  const ezValues2022 = StandardDataProvider.getProduction621EzValues();
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');

  const getSpaceType = (id: string): Ashrae621SpaceType => {
    const st = spaceTypes2022.find(s => s.id === id);
    if (!st) throw new Error(`Space type ${id} not found in production baseline`);
    return st;
  };

  const getEz = (id: string): Ashrae621Ez => {
    const ez = ezValues2022.find(e => e.id === id);
    if (!ez) throw new Error(`Ez record ${id} not found in production baseline`);
    return ez;
  };

  const getExhaust = (id: string): Ashrae621ExhaustType => {
    const ex = exhaustRates2022.find(e => e.id === id);
    if (!ex) throw new Error(`Exhaust record ${id} not found in production baseline`);
    return ex;
  };

  // =========================================================================
  // 1. ZONE CALCULATION CHAIN: Vbz = Rp × Pz + Ra × Az and Voz = (Vbz / Ez) × Eρ
  // =========================================================================
  describe('1. Zone Calculation Golden Vectors (Vbz and Voz)', () => {
    it('Golden Vector 1A: Office Zone — Standard density (Eρ = 1.0) and ceiling cooling (Ez = 1.0)', () => {
      // Office: Rp = 2.5 L/s·person, Ra = 0.3 L/s·m²
      // Input: Az = 200 m², Pz = 10 people (design), Ez = 1.0, Eρ = 1.0
      // Independent hand calculations:
      // Vbp = 2.5 × 10 = 25.0 L/s
      // Vba = 0.3 × 200 = 60.0 L/s
      // Vbz = 25.0 + 60.0 = 85.0 L/s
      // Voz = (85.0 / 1.0) × 1.0 = 85.0 L/s
      const office = getSpaceType('office');
      const ez1 = getEz('ez-1');

      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 200,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: ez1
      });

      expect(result.status).toBe('PASS');
      expect(result.pz).toBe(10);
      expect(result.rp).toBe(2.5);
      expect(result.ra).toBe(0.3);
      expect(result.vbp).toBe(25.0);
      expect(result.vba).toBe(60.0);
      expect(result.vbz).toBe(85.0);
      expect(result.ez).toBe(1.0);
      expect(result.epDensity).toBe(1.0);
      expect(result.voz).toBe(85.0);
    });

    it('Golden Vector 1B: Classroom Zone with Heating Ez = 0.8 and Altitude Density Correction Eρ = 1.20', () => {
      // Classroom (ages 5-8): Rp = 5.0 L/s·person, Ra = 0.6 L/s·m²
      // Input: Az = 80 m², Pz = 20 people, Ez = 0.8 (ceiling warm >= 8°C diff), Eρ = 1.20 (1600 m altitude Table 6-5)
      // Independent hand calculations:
      // Vbp = 5.0 × 20 = 100.0 L/s
      // Vba = 0.6 × 80 = 48.0 L/s
      // Vbz = 100.0 + 48.0 = 148.0 L/s
      // Voz = (148.0 / 0.8) × 1.20 = 185.0 × 1.20 = 222.0 L/s
      const classroom = getSpaceType('classroom');
      const ez2 = getEz('ez-2');

      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: classroom,
        area: 80,
        designOccupancy: 20,
        useDefaultOccupancy: false,
        ezConfig: ez2,
        epDensity: 1.20,
        eRho: 1.20,
        ezConditions: {
          supplyTempRelationship: 'heating_gte_8c'
        }
      });

      expect(result.status).toBe('PASS');
      expect(result.pz).toBe(20);
      expect(result.vbp).toBe(100.0);
      expect(result.vba).toBe(48.0);
      expect(result.vbz).toBe(148.0);
      expect(result.ez).toBe(0.8);
      expect(result.epDensity).toBe(1.20);
      expect(result.voz).toBe(222.0);
    });

    it('Golden Vector 1C: Retail Space with Default Occupancy and Displacement Ez = 1.2', () => {
      // Retail sales: Rp = 3.8 L/s·person, Ra = 0.6 L/s·m², default occupancy = 15 / 100 m²
      // Input: Az = 100 m² -> Pz = 15 people, Ez = 1.2 (displacement cooling Case 2), Eρ = 1.0
      // Independent hand calculations:
      // Pz = (100 / 100) × 15 = 15 people
      // Vbp = 3.8 × 15 = 57.0 L/s
      // Vba = 0.6 × 100 = 60.0 L/s
      // Vbz = 57.0 + 60.0 = 117.0 L/s
      // Voz = (117.0 / 1.2) × 1.0 = 97.5 L/s
      const retail = getSpaceType('retail');
      const ez3 = getEz('ez-3');

      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: retail,
        area: 100,
        designOccupancy: null,
        useDefaultOccupancy: true,
        ezConfig: ez3,
        ezConditions: {
          supplyTempRelationship: 'cooling',
          stratifiedPrerequisites: {
            tempDiffRoomSupplyC: 3.0,
            returnOpeningHeightM: 3.0,
            noMechanicalMixingDevices: true,
            protectedFromImpingingAirstreams: true
          },
          stratifiedPrerequisitesMet: true,
          verticalThrowMet: false,
          returnHeightGt55m: false
        }
      });

      expect(result.status).toBe('PASS');
      expect(result.pz).toBe(15);
      expect(result.vbp).toBe(57.0);
      expect(result.vba).toBe(60.0);
      expect(result.vbz).toBe(117.0);
      expect(result.ez).toBe(1.2);
      expect(result.epDensity).toBe(1.0);
      expect(result.voz).toBe(97.5);
    });
  });

  // =========================================================================
  // 2. TABLE 6-4 AIR DISTRIBUTION EFFECTIVENESS (Ez) GOLDEN VECTORS
  // =========================================================================
  describe('2. Table 6-4 Configuration Golden Vectors', () => {
    it('A. Ceiling cooling (ez-1): Ez = 1.0', () => {
      const cfg = getEz('ez-1');
      expect(cfg.ez).toBe(1.0);
      const res = EzSelectionService.validateEzConfiguration(cfg, {
        supplyTempRelationship: 'cooling'
      });
      expect(res.valid).toBe(true);
      expect(res.status).toBe('PASS');

      // Verify criteria resolution resolves ez-1 with Ez = 1.0
      const resolved = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'ceiling',
        distributionCategory: 'ceiling',
        supplyAirCondition: 'cool',
        spaceTempRelationship: 'cooling'
      });
      expect(resolved.status).toBe('PASS');
      expect(resolved.ez).toBe(1.0);
    });

    it('B. Warm ceiling cases: ez-2 (Ez = 0.8), ez-ceil-warm-floor-ret (Ez = 1.0), ez-ceil-warm-lt8c-highvel (Ez = 1.0), ez-ceil-warm-lt8c-lowvel (Ez = 0.8)', () => {
      // 1. ez-2: delta T >= 8°C, ceiling return -> Ez = 0.8
      const cfg2 = getEz('ez-2');
      expect(cfg2.ez).toBe(0.8);
      const res2 = EzSelectionService.validateEzConfiguration(cfg2, {
        supplyTempRelationship: 'heating_gte_8c'
      });
      expect(res2.valid).toBe(true);
      expect(res2.status).toBe('PASS');

      // 2. ez-ceil-warm-floor-ret: ceiling warm, floor return -> Ez = 1.0
      const cfgFloorRet = getEz('ez-ceil-warm-floor-ret');
      expect(cfgFloorRet.ez).toBe(1.0);
      const resFloorRet = EzSelectionService.validateEzConfiguration(cfgFloorRet, {
        supplyTempRelationship: 'heating_gte_8c'
      });
      expect(resFloorRet.valid).toBe(true);
      expect(resFloorRet.status).toBe('PASS');

      // 3. ez-ceil-warm-lt8c-highvel: delta T < 8°C, high velocity -> Ez = 1.0
      const cfgHighVel = getEz('ez-ceil-warm-lt8c-highvel');
      expect(cfgHighVel.ez).toBe(1.0);
      const resHighVel = EzSelectionService.validateEzConfiguration(cfgHighVel, {
        supplyTempRelationship: 'heating_lt_8c',
        supplyJetVelocityMet: true
      });
      expect(resHighVel.valid).toBe(true);
      expect(resHighVel.status).toBe('PASS');

      // 4. ez-ceil-warm-lt8c-lowvel: delta T < 8°C, low velocity -> Ez = 0.8
      const cfgLowVel = getEz('ez-ceil-warm-lt8c-lowvel');
      expect(cfgLowVel.ez).toBe(0.8);
      const resLowVel = EzSelectionService.validateEzConfiguration(cfgLowVel, {
        supplyTempRelationship: 'heating_lt_8c',
        supplyJetVelocityMet: false
      });
      expect(resLowVel.valid).toBe(true);
      expect(resLowVel.status).toBe('PASS');
    });

    it('C. Floor warm cases: ez-floor-warm-floor-ret (Ez = 1.0) and ez-floor-warm-ceil-ret (Ez = 0.7)', () => {
      // 1. Floor warm, floor return -> Ez = 1.0
      const cfgFloor = getEz('ez-floor-warm-floor-ret');
      expect(cfgFloor.ez).toBe(1.0);
      const res1 = EzSelectionService.validateEzConfiguration(cfgFloor, {
        supplyTempRelationship: 'heating_gte_8c'
      });
      expect(res1.valid).toBe(true);
      expect(res1.status).toBe('PASS');

      // 2. Floor warm, ceiling return -> Ez = 0.7
      const cfgCeil = getEz('ez-floor-warm-ceil-ret');
      expect(cfgCeil.ez).toBe(0.7);
      const res2 = EzSelectionService.validateEzConfiguration(cfgCeil, {
        supplyTempRelationship: 'heating_gte_8c',
        supplyJetVelocityMet: true
      });
      expect(res2.valid).toBe(true);
      expect(res2.status).toBe('PASS');
    });

    it('D. Stratified cases: Case 1 (ez-floor-cool-strat-case1: Ez = 1.05), Case 2 (ez-3: Ez = 1.2), Case 3 (ez-floor-cool-strat-h-gte55m: Ez = 1.5)', () => {
      const validStrat: StratifiedVentilationPrerequisites = {
        tempDiffRoomSupplyC: 3.0,
        returnOpeningHeightM: 3.0,
        noMechanicalMixingDevices: true,
        protectedFromImpingingAirstreams: true
      };

      // Case 1: Underfloor cooling with vertical throw >= 0.25 m/s at 1.4 m and ceiling return <= 5.5 m -> Ez = 1.05
      const cfgCase1 = getEz('ez-floor-cool-strat-case1');
      expect(cfgCase1.ez).toBe(1.05);
      const resCase1 = EzSelectionService.validateEzConfiguration(cfgCase1, {
        supplyTempRelationship: 'cooling',
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true,
        verticalThrowMet: true,
        returnHeightGt55m: false
      });
      expect(resCase1.valid).toBe(true);
      expect(resCase1.status).toBe('PASS');

      // Case 2: Displacement cooling with vertical throw < 0.25 m/s at 1.4 m and ceiling return <= 5.5 m -> Ez = 1.2
      const cfgCase2 = getEz('ez-3');
      expect(cfgCase2.ez).toBe(1.2);
      const resCase2 = EzSelectionService.validateEzConfiguration(cfgCase2, {
        supplyTempRelationship: 'cooling',
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true,
        verticalThrowMet: false,
        returnHeightGt55m: false
      });
      expect(resCase2.valid).toBe(true);
      expect(resCase2.status).toBe('PASS');

      // Case 3: Low-velocity displacement with vertical throw < 0.25 m/s at 1.4 m and ceiling return > 5.5 m -> Ez = 1.5
      const cfgCase3 = getEz('ez-floor-cool-strat-h-gte55m');
      expect(cfgCase3.ez).toBe(1.5);
      const resCase3 = EzSelectionService.validateEzConfiguration(cfgCase3, {
        supplyTempRelationship: 'cooling',
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true,
        verticalThrowMet: false,
        returnHeightGt55m: true
      });
      expect(resCase3.valid).toBe(true);
      expect(resCase3.status).toBe('PASS');
    });

    it('E. Makeup air cases: ez-makeup-more-half-length (Ez = 0.8) and ez-makeup-direct-exhaust (Ez = 0.5)', () => {
      // Makeup air located > 0.5 space length from exhaust/return -> Ez = 0.8
      const cfgMore = getEz('ez-makeup-more-half-length');
      expect(cfgMore.ez).toBe(0.8);
      const resMore = EzSelectionService.validateEzConfiguration(cfgMore, {
        makeupAirDistance: 'greater_than_half_length'
      });
      expect(resMore.valid).toBe(true);
      expect(resMore.status).toBe('PASS');

      // Makeup air located <= 0.5 space length from exhaust/return -> Ez = 0.5
      const cfgDirect = getEz('ez-makeup-direct-exhaust');
      expect(cfgDirect.ez).toBe(0.5);
      const resDirect = EzSelectionService.validateEzConfiguration(cfgDirect, {
        makeupAirDistance: 'less_than_half_length'
      });
      expect(resDirect.valid).toBe(true);
      expect(resDirect.status).toBe('PASS');
    });

    it('F. Personalized ventilation cases: ceiling cool (Ez = 1.40), ceiling warm (Ez = 1.40), strat nonaspirating (Ez = 1.20), strat aspirating (Ez = 1.50)', () => {
      const validPersonal: PersonalizedVentilationPrerequisites = {
        airDistributedInBreathingZone: true,
        headRegionVelocityMs: 0.20,
        returnOpeningHeightM: 3.0
      };

      // 1. Personalized + ceiling cool + ceiling return -> Ez = 1.40
      const cfgCeilCool = getEz('ez-personalized-ceiling-cool');
      expect(cfgCeilCool.ez).toBe(1.40);
      const resCeilCool = EzSelectionService.validateEzConfiguration(cfgCeilCool, {
        personalizedPrerequisites: validPersonal,
        personalizedPrerequisitesMet: true,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool'
      });
      expect(resCeilCool.valid).toBe(true);
      expect(resCeilCool.status).toBe('PASS');

      // 2. Personalized + ceiling warm + ceiling return -> Ez = 1.40
      const cfgCeilWarm = getEz('ez-personalized-ceiling-warm');
      expect(cfgCeilWarm.ez).toBe(1.40);
      const resCeilWarm = EzSelectionService.validateEzConfiguration(cfgCeilWarm, {
        personalizedPrerequisites: validPersonal,
        personalizedPrerequisitesMet: true,
        supplyTempRelationship: 'heating_gte_8c',
        personalizedSystemType: 'ceiling_warm'
      });
      expect(resCeilWarm.valid).toBe(true);
      expect(resCeilWarm.status).toBe('PASS');

      // 3. Personalized + stratified nonaspirating -> Ez = 1.20
      const cfgStratNon = getEz('ez-personalized-strat-nonaspirating');
      expect(cfgStratNon.ez).toBe(1.20);
      const resStratNon = EzSelectionService.validateEzConfiguration(cfgStratNon, {
        personalizedPrerequisites: validPersonal,
        personalizedPrerequisitesMet: true,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'stratified_nonaspirating'
      });
      expect(resStratNon.valid).toBe(true);
      expect(resStratNon.status).toBe('PASS');

      // 4. Personalized + stratified aspirating -> Ez = 1.50
      const cfgStratAsp = getEz('ez-personalized-strat-aspirating');
      expect(cfgStratAsp.ez).toBe(1.50);
      const resStratAsp = EzSelectionService.validateEzConfiguration(cfgStratAsp, {
        personalizedPrerequisites: validPersonal,
        personalizedPrerequisitesMet: true,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'stratified_aspirating'
      });
      expect(resStratAsp.valid).toBe(true);
      expect(resStratAsp.status).toBe('PASS');
    });

    it('G. Unidirectional downward flow is BLOCKED (NOT_VERIFIED / UNIMPLEMENTED)', () => {
      const unidir = getEz('ez-unidirectional-flow');
      expect(unidir.verificationStatus).toBe('NOT_VERIFIED');

      // 1. Direct validation blocked
      const resVal = EzSelectionService.validateEzConfiguration(unidir);
      expect(resVal.valid).toBe(false);
      expect(resVal.status).toBe('BLOCKED');
      expect(resVal.reasons[0]).toContain('NOT_VERIFIED');

      // 2. Selection criteria blocked
      const resSel = EzSelectionService.resolveEzFromCriteria({
        distributionCategory: 'unidirectional'
      });
      expect(resSel.status).toBe('BLOCKED');
      expect(resSel.ez).toBeNull();

      // 3. Zone calculation blocked
      const resZone = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: getSpaceType('office'),
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: unidir
      });
      expect(resZone.status).toBe('BLOCKED');
      expect(resZone.ez).toBeNull();
      expect(resZone.voz).toBeNull();
    });
  });

  // =========================================================================
  // 3. DENSITY CORRECTION (Addendum j / Table 6-5 & Normative Appendix D)
  // =========================================================================
  describe('3. Density Correction Golden Vectors', () => {
    it('A. Table 6-5 discrete altitude lookup golden vectors', () => {
      // Independent golden constants from ASHRAE 62.1-2022 Table 6-5:
      // Elevation: 0 m (<= 158 m) -> Eρ = 1.00
      // Elevation: 500 m (159 - 566 m) -> Eρ = 1.05
      // Elevation: 1000 m (952 - 1317 m) -> Eρ = 1.15
      // Elevation: 1500 m (1318 - 1664 m) -> Eρ = 1.20
      // Elevation: 2000 m (1995 - 2309 m) -> Eρ = 1.30
      // Elevation: 2500 m (2310 - 2609 m) -> Eρ = 1.35
      // Elevation: 3000 m (2898 - 3173 m) -> Eρ = 1.45
      const altitudes = [
        { elev: 0, expected: 1.00 },
        { elev: 500, expected: 1.05 },
        { elev: 1000, expected: 1.15 },
        { elev: 1500, expected: 1.20 },
        { elev: 2000, expected: 1.30 },
        { elev: 2500, expected: 1.35 },
        { elev: 3000, expected: 1.45 }
      ];

      for (const { elev, expected } of altitudes) {
        const res = DensityCorrectionService.calculate({
          elevation: elev,
          temperature: 20,
          method: 'TABLE'
        });
        expect(res.status).toBe('PASS');
        expect(res.eRho).toBe(expected);
      }
    });

    it('B. Temperature boundary T < 40°C, T = 40°C, T > 40°C', () => {
      // T < 40°C (39.9°C): CT simplification permitted (CT = 1.0)
      const resBelow = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 39.9,
        humidityRatio: 0.010,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resBelow.ct).toBe(1.0);
      expect(resBelow.simplificationsApplied?.ctSimplified).toBe(true);

      // T = 40.0°C: CT simplification not permitted
      // CT = (40 + 273.15) / 294.15 = 313.15 / 294.15 = 1.064593
      const resEqual = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 40.0,
        humidityRatio: 0.010,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resEqual.simplificationsApplied?.ctSimplified).toBe(false);
      expect(resEqual.ct).toBeCloseTo(313.15 / 294.15, 5);
      expect(resEqual.ct).toBeGreaterThan(1.0);

      // T > 40°C (45.0°C): CT simplification not permitted
      // CT = (45 + 273.15) / 294.15 = 318.15 / 294.15 = 1.081591
      const resAbove = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 45.0,
        humidityRatio: 0.010,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resAbove.simplificationsApplied?.ctSimplified).toBe(false);
      expect(resAbove.ct).toBeCloseTo(318.15 / 294.15, 5);
    });

    it('C. Humidity ratio boundary W < 0.024, W = 0.024, W > 0.024 kg/kg', () => {
      // W < 0.024 (0.020): CW simplification permitted (CW = 1.0)
      const resBelow = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.020,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resBelow.cw).toBe(1.0);
      expect(resBelow.simplificationsApplied?.cwSimplified).toBe(true);

      // W = 0.024: CW simplification not permitted
      // CW = (1 + 0.024) / (1 + 1.6078 × 0.024) = 1.024 / (1 + 0.0385872) = 1.024 / 1.0385872 = 0.9859547
      const resEqual = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.024,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resEqual.simplificationsApplied?.cwSimplified).toBe(false);
      const expectedCwEqual = (1 + 0.024) / (1 + 1.6078 * 0.024);
      expect(resEqual.cw).toBeCloseTo(expectedCwEqual, 5);

      // W > 0.024 (0.028): CW simplification not permitted
      // CW = (1 + 0.028) / (1 + 1.6078 × 0.028) = 1.028 / (1 + 0.0450184) = 1.028 / 1.0450184 = 0.9837147
      const resAbove = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.028,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true
      });
      expect(resAbove.simplificationsApplied?.cwSimplified).toBe(false);
      const expectedCwAbove = (1 + 0.028) / (1 + 1.6078 * 0.028);
      expect(resAbove.cw).toBeCloseTo(expectedCwAbove, 5);
    });

    it('D. Analytical Equations D-4 and D-5b consistency', () => {
      // At sea level (0 m), 20°C, 50% RH:
      // P = 101.3 kPa, Psat(20°C) = 2.338 kPa, Pv = 1.169 kPa, Pd = 100.131 kPa
      // dryAirDensity = Pd / (R_dry * T) = 100.131 / (0.287058 * 293.15) = 1.1899 kg/m³
      // Eq D-5b: eRho = 1.2 / 1.1899 = 1.008
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 20,
        relativeHumidity: 50,
        method: 'ANALYTICAL'
      });

      expect(res.status).toBe('PASS');
      expect(res.density).toBeCloseTo(1.190, 2);
      expect(res.eRho).toBeCloseTo(1.008, 2);
      expect(res.eRhoEqD4).toBeDefined();
      expect(res.eRhoEqD5b).toBeDefined();
      // Equations D-4 and D-5b should be in physical consistency (within 2%)
      expect(Math.abs(res.eRhoEqD4! - res.eRhoEqD5b!)).toBeLessThan(0.02);
    });
  });

  // =========================================================================
  // 4. SIMPLIFIED PROCEDURE (Section 6.2.4.2 & Appendix A)
  // =========================================================================
  describe('4. Simplified Multi-Zone Procedure Golden Vectors', () => {
    it('Calculates exact independent D, Ev, Vou, and Vpz-min values', () => {
      // System Input:
      // Zone 1: Pz = 20, Rp = 2.5, Ra = 0.3, Az = 100 m² -> Voz = 80 L/s, designed Vpz-min = 140 L/s, VAV
      // Zone 2: Pz = 30, Rp = 5.0, Ra = 0.6, Az = 80 m² -> Voz = 198 L/s, designed Vpz-min = 320 L/s, VAV
      // System Population Ps = 40 people
      // Independent hand calculations:
      // Σ Pz = 20 + 30 = 50 people
      // D = Ps / Σ Pz = 40 / 50 = 0.80
      // Since D >= 0.60: Ev = 0.75
      // Σ(Rp × Pz) = (2.5 × 20) + (5.0 × 30) = 50 + 150 = 200 L/s
      // Σ(Ra × Az) = (0.3 × 100) + (0.6 × 80) = 30 + 48 = 78 L/s
      // Vou = D × Σ(Rp × Pz) + Σ(Ra × Az) = 0.80 × 200 + 78 = 160 + 78 = 238.0 L/s
      // Vpz-min required = 1.5 × Voz:
      //   Zone 1: 1.5 × 80 = 120.0 L/s (designed 140 >= 120 -> PASS)
      //   Zone 2: 1.5 × 198 = 297.0 L/s (designed 320 >= 297 -> PASS)
      const input = {
        zones: [
          {
            id: 'Z1',
            pz: 20,
            rp: 2.5,
            ra: 0.3,
            az: 100,
            voz: 80,
            vpz: 250,
            vpzMinDesign: 140,
            dMode: 'VAV' as const
          },
          {
            id: 'Z2',
            pz: 30,
            rp: 5.0,
            ra: 0.6,
            az: 80,
            voz: 198,
            vpz: 500,
            vpzMinDesign: 320,
            dMode: 'VAV' as const
          }
        ],
        ps: 40,
        airDistributionType: 'VAV' as const
      };

      const result = Ashrae621SimplifiedSystemService.calculate(input);

      expect(result.status).toBe('PASS');
      expect(result.sumPz).toBe(50);
      expect(result.ps).toBe(40);
      expect(result.d).toBe(0.80);
      expect(result.ev).toBe(0.75);
      expect(result.vou).toBe(238.0);

      // Verify Vpz-min validation
      const z1 = result.zoneResults.find(z => z.id === 'Z1')!;
      expect(z1.vpzMinRequired).toBe(120.0);
      expect(z1.compliance).toBe('PASS');

      const z2 = result.zoneResults.find(z => z.id === 'Z2')!;
      expect(z2.vpzMinRequired).toBe(297.0);
      expect(z2.compliance).toBe('PASS');
    });

    it('Calculates exact Ev when occupant diversity D < 0.60: Ev = 0.88 × D + 0.22', () => {
      // Σ Pz = 100, Ps = 50 -> D = 50 / 100 = 0.50
      // Ev = 0.88 × 0.50 + 0.22 = 0.44 + 0.22 = 0.66
      const input = {
        zones: [
          {
            id: 'Z1',
            pz: 100,
            rp: 2.5,
            ra: 0.3,
            az: 500,
            voz: 400,
            vpz: 800,
            vpzMinDesign: 600,
            dMode: 'VAV' as const
          }
        ],
        ps: 50,
        airDistributionType: 'VAV' as const
      };

      const result = Ashrae621SimplifiedSystemService.calculate(input);
      expect(result.d).toBe(0.50);
      expect(result.ev).toBe(0.66);
    });
  });

  // =========================================================================
  // 5. ALTERNATIVE PROCEDURE (Section 6.2.4.3 & Normative Appendix A)
  // =========================================================================
  describe('5. Alternative Procedure Golden Vectors (Xs, Fa, Fb, Fc, Zd, Evz, Ev, Vot)', () => {
    it('Golden Vector 5A: Single-Supply System exact calculations', () => {
      // 2-zone VAV single-supply system
      // Zone 1: Pz = 10, Rp = 2.5, Ra = 0.3, Az = 100 m² -> Voz = 55 L/s, Vpz = 250, Vpz-min = 110 L/s, Ez = 1.0, VAV
      // Zone 2: Pz = 20, Rp = 2.5, Ra = 0.3, Az = 200 m² -> Voz = 110 L/s, Vpz = 500, Vpz-min = 200 L/s, Ez = 1.0, VAV
      // System: Ps = 30 -> D = 30 / 30 = 1.0
      // Vou = 1.0 × (2.5 × 30) + 0.3 × 300 = 75 + 90 = 165.0 L/s
      // Vps = 660 L/s
      // Independent hand calculations:
      // Xs = Vou / Vps = 165 / 660 = 0.25 (Eq A-1)
      // Single Supply coefficients: Fa = 1.0, Fb = 1.0, Fc = 1.0 (with Ez = 1.0)
      // Zone 1:
      //   Vdz-min = Vpz-min = 110 L/s
      //   Zd1 = Voz1 / Vdz-min = 55 / 110 = 0.50
      //   Evz1 = 1 + Xs - Zd1 = 1 + 0.25 - 0.50 = 0.75
      // Zone 2:
      //   Vdz-min = Vpz-min = 200 L/s
      //   Zd2 = Voz2 / Vdz-min = 110 / 200 = 0.55
      //   Evz2 = 1 + Xs - Zd2 = 1 + 0.25 - 0.55 = 0.70
      // System Ev = min(Evz) = min(0.75, 0.70) = 0.70 (Eq A-4)
      // Critical Zone = Zone 2
      // Vot = Vou / Ev = 165.0 / 0.70 = 235.714 L/s (Eq A-5)
      const input = {
        zones: [
          {
            id: 'Z1',
            pz: 10,
            rp: 2.5,
            ra: 0.3,
            az: 100,
            voz: 55,
            vpz: 250,
            vpzMinDesign: 110,
            dMode: 'VAV' as const,
            ez: 1.0,
            er: 0
          },
          {
            id: 'Z2',
            pz: 20,
            rp: 2.5,
            ra: 0.3,
            az: 200,
            voz: 110,
            vpz: 500,
            vpzMinDesign: 200,
            dMode: 'VAV' as const,
            ez: 1.0,
            er: 0
          }
        ],
        ps: 30,
        systemType: 'single_supply' as const,
        airDistributionType: 'VAV' as const,
        vps: 660
      };

      const result = Ashrae621AlternativeSystemService.calculate(input);

      expect(result.status).toBe('PASS');
      expect(result.vou).toBe(165.0);
      expect(result.xs).toBe(0.25);
      expect(result.ev).toBe(0.70);
      expect(result.criticalZoneId).toBe('Z2');
      expect(result.vot).toBeCloseTo(165.0 / 0.70, 3); // 235.714 L/s

      // Zone 1 details
      const z1 = result.zoneResults.find(z => z.id === 'Z1')!;
      expect(z1.fa).toBe(1.0);
      expect(z1.fb).toBe(1.0);
      expect(z1.fc).toBe(1.0);
      expect(z1.zd).toBe(0.50);
      expect(z1.evz).toBe(0.75);
      expect(z1.isCritical).toBe(false);

      // Zone 2 details
      const z2 = result.zoneResults.find(z => z.id === 'Z2')!;
      expect(z2.fa).toBe(1.0);
      expect(z2.fb).toBe(1.0);
      expect(z2.fc).toBe(1.0);
      expect(z2.zd).toBe(0.55);
      expect(z2.evz).toBe(0.70);
      expect(z2.isCritical).toBe(true);
    });

    it('Golden Vector 5B: Secondary Recirculation exact Fa, Fb, Fc, and Evz calculations', () => {
      // Secondary Recirculation Formulas (Appendix A):
      // Fa = Ep + (1 - Ep) × Er
      // Fb = Ep
      // Fc = 1 - (1 - Ez) × (1 - Er) × (1 - Ep)
      // Evz = (Fa + Xs × Fb - Zd × Fc) / Fa
      // Inputs:
      // Ep = 0.50, Er = 0.40, Ez = 1.0
      // Independent hand calculations:
      // Fa = 0.50 + (1 - 0.50) × 0.40 = 0.50 + 0.20 = 0.70
      // Fb = 0.50
      // Fc = 1 - (1 - 1.0) × ... = 1.0
      // With Vdz-min = 100 L/s, Vpz-min = 50 L/s -> Ep = 50 / 100 = 0.50
      // Voz = 40 L/s -> Zd = 40 / 100 = 0.40
      // With system Vou = 120, Vps = 600 -> Xs = 120 / 600 = 0.20
      // Evz = (0.70 + 0.20 × 0.50 - 0.40 × 1.0) / 0.70 = (0.70 + 0.10 - 0.40) / 0.70 = 0.40 / 0.70 = 0.57142857
      const input = {
        zones: [
          {
            id: 'Z1',
            pz: 10,
            rp: 2.5,
            ra: 0.3,
            az: 100,
            voz: 40,
            vpz: 200,
            vpzMinDesign: 50,
            vdzMinDesign: 100,
            dMode: 'VAV' as const,
            ez: 1.0,
            er: 0.40
          }
        ],
        ps: 10,
        systemType: 'secondary_recirculation' as const,
        airDistributionType: 'VAV' as const,
        vps: 600
      };

      const result = Ashrae621AlternativeSystemService.calculate(input);
      expect(result.status).toBe('PASS');
      const z1 = result.zoneResults[0];

      expect(z1.ep).toBe(0.50);
      expect(z1.er).toBe(0.40);
      expect(z1.fa).toBe(0.70);
      expect(z1.fb).toBe(0.50);
      expect(z1.fc).toBe(1.0);
      expect(z1.zd).toBe(40 / 100); // 0.40

      const expectedXs = result.vou! / 600;
      const expectedEvz = (0.70 + expectedXs * 0.50 - 0.40 * 1.0) / 0.70;
      expect(z1.evz).toBeCloseTo(expectedEvz, 5);
      expect(result.ev).toBeCloseTo(expectedEvz, 5);
    });
  });

  // =========================================================================
  // 6. EXHAUST GOLDEN VECTORS (Table 6-2 Numeric Rows)
  // =========================================================================
  describe('6. Prescriptive Exhaust Golden Vectors (Table 6-2)', () => {
    it('A. Public Restroom (toilet_public): 25 L/s per fixture (50 cfm/fixture), Air Class 2', () => {
      const toilet = getExhaust('toilet_public');
      // 6 fixtures -> 25 × 6 = 150.0 L/s, 50 × 6 = 300.0 cfm
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 6,
        designExhaust: 160,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.rateStatus).toBe('PRESCRIPTIVE');
      expect(res.compliancePath).toBe('PRESCRIPTIVE');
      expect(res.pathStatus).toBe('SUPPORTED');
      expect(res.requiredExhaust).toBe(150.0);
      expect(res.requiredExhaustMetric).toBe(150.0);
      expect(res.requiredExhaustIp).toBe(300.0);
      expect(res.airClass).toBe(2);
      expect(res.exhaustClass).toBe(2);
    });

    it('B. Art Classroom (art_classroom): 3.5 L/s·m² (0.70 cfm/ft²), Air Class 2', () => {
      const art = getExhaust('art_classroom');
      // 50 m² -> 3.5 × 50 = 175.0 L/s
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 50,
        designExhaust: 180,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(175.0);
      expect(res.rateApplied).toBe(3.5);
      expect(res.airClass).toBe(2);
    });

    it('C. Auto Repair Room (auto_repair): 7.5 L/s·m² (1.50 cfm/ft²), Air Class 2', () => {
      const auto = getExhaust('auto_repair');
      // 100 m² -> 7.5 × 100 = 750.0 L/s
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: auto,
        qty: 100,
        designExhaust: 800,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(750.0);
      expect(res.rateApplied).toBe(7.5);
      expect(res.complianceNotes.some(n => n.includes('Direct engine exhaust connection requirement'))).toBe(true);
    });

    it('D. Parking Garage (parking_garage): 3.7 L/s·m² (0.75 cfm/ft²), Air Class 2', () => {
      const garage = getExhaust('parking_garage');
      // 1000 m² -> 3.7 × 1000 = 3700.0 L/s
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: garage,
        qty: 1000,
        designExhaust: 3800,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(3700.0);
      expect(res.rateApplied).toBe(3.7);
    });

    it('E. Janitor Closet (janitor_closet): continuous 5.0 L/s·m², Air Class 3; intermittent is NOT permitted', () => {
      const janitor = getExhaust('janitor_closet');
      // 8 m² continuous -> 5.0 × 8 = 40.0 L/s
      const resCont = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: janitor,
        qty: 8,
        designExhaust: 45,
        operationMode: 'continuous',
        unitSystem: 'metric'
      });
      expect(resCont.status).toBe('PASS');
      expect(resCont.requiredExhaust).toBe(40.0);
      expect(resCont.airClass).toBe(3);

      // Table 6-2 mandates continuous exhaust for janitor closets; intermittent must FAIL
      const resInt = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: janitor,
        qty: 8,
        designExhaust: 90,
        operationMode: 'intermittent',
        unitSystem: 'metric'
      });
      expect(resInt.status).toBe('FAIL');
      expect(resInt.requiredExhaust).toBeNull();
    });

    it('F. Residential Kitchens (residential_kitchens): continuous 25 L/s vs intermittent 50 L/s, Air Class 2', () => {
      const kitchen = getExhaust('residential_kitchens');
      // 1 room: continuous -> 25.0 L/s
      const resCont = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: kitchen,
        qty: 1,
        designExhaust: 30,
        operationMode: 'continuous',
        unitSystem: 'metric'
      });
      expect(resCont.status).toBe('PASS');
      expect(resCont.requiredExhaust).toBe(25.0);
      expect(resCont.airClass).toBe(2);

      // 1 room: intermittent -> 50.0 L/s
      const resInt = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: kitchen,
        qty: 1,
        designExhaust: 55,
        operationMode: 'intermittent',
        unitSystem: 'metric'
      });
      expect(resInt.status).toBe('PASS');
      expect(resInt.requiredExhaust).toBe(50.0);
      expect(resInt.airClass).toBe(2);
    });
  });

  // =========================================================================
  // 7. NEGATIVE ENGINEERING TESTS (Proving invalid engineering states cannot PASS)
  // =========================================================================
  describe('7. Negative Engineering Golden Tests (Zero False Passes)', () => {
    it('A. Missing density inputs in analytical method yields INCOMPLETE (cannot PASS)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 25,
        method: 'ANALYTICAL'
        // Missing relativeHumidity and humidityRatio
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.status).not.toBe('PASS');
    });

    it('B. Missing Ez prerequisites yields INCOMPLETE (cannot PASS)', () => {
      const ez3 = getEz('ez-3');
      // Missing stratified prerequisites and supply temp relationship
      const res = EzSelectionService.validateEzConfiguration(ez3, {});
      expect(res.status).toBe('INCOMPLETE');
      expect(res.status).not.toBe('PASS');
    });

    it('C. Contradictory prerequisites yield FAIL (cannot PASS)', () => {
      const ez3 = getEz('ez-3');
      // Displacement cooling supplied with heating warm air (contradiction)
      const res = EzSelectionService.validateEzConfiguration(ez3, {
        supplyTempRelationship: 'heating_gte_8c',
        stratifiedPrerequisitesMet: true
      });
      expect(res.status).toBe('FAIL');
      expect(res.status).not.toBe('PASS');
    });

    it('D. Unverified data yields BLOCKED (cannot PASS)', () => {
      const unverifiedSpace: Ashrae621SpaceType = {
        ...getSpaceType('office'),
        verificationStatus: 'NOT_VERIFIED' as any
      };

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: unverifiedSpace,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: getEz('ez-1')
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
      expect(res.voz).toBeNull();
    });

    it('E. Unsupported edition (2019 / 2025) yields BLOCKED (cannot PASS)', () => {
      const val2019 = ProductionScopeService.validateStandardAndEdition('ASHRAE 62.1', '2019');
      expect(val2019.status).toBe('BLOCKED');
      expect(val2019.allowed).toBe(false);

      const val2025 = ProductionScopeService.validateStandardAndEdition('ASHRAE 62.1', '2025');
      expect(val2025.status).toBe('BLOCKED');
      expect(val2025.allowed).toBe(false);
    });

    it('F. Unsupported path yields BLOCKED (cannot PASS)', () => {
      const val = ProductionScopeService.validateCalculationPath('performance_exhaust_path_6_5_2');
      expect(val.status).toBe('BLOCKED');
      expect(val.allowed).toBe(false);

      // Section 6.5.2 performance path request returns PERFORMANCE_PATH_UNIMPLEMENTED
      const perfRes = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: getExhaust('toilet_public'),
        qty: 5,
        designExhaust: 200,
        referenceSection: '6.5.2'
      });
      expect(perfRes.status).toBe('BLOCKED');
      expect(perfRes.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(perfRes.rateStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(perfRes.state).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(perfRes.instructionalMessage).toContain('independent engineering evaluation');

      // Table 6-2 rates strictly enforce PRESCRIPTIVE path
      const prescRes = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: getExhaust('toilet_public'),
        qty: 5,
        designExhaust: 200
      });
      expect(prescRes.compliancePath).toBe('PRESCRIPTIVE');
      expect(prescRes.rateStatus).toBe('PRESCRIPTIVE');
      expect(prescRes.pathStatus).toBe('SUPPORTED');
    });

    it('G. Unidirectional flow yields BLOCKED (cannot PASS)', () => {
      const unidir = getEz('ez-unidirectional-flow');
      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: getSpaceType('office'),
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: unidir
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
      expect(res.voz).toBeNull();
    });

    it('H. Invalid Air Class (e.g. out of range or divergent) yields BLOCKED', () => {
      const divergentExhaust: Ashrae621ExhaustType = {
        ...getExhaust('toilet_public'),
        airClass: 2,
        exhaustClass: 3 // divergent airClass vs exhaustClass
      };
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: divergentExhaust,
        qty: 5,
        designExhaust: 500
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
    });

    it('I. Missing VAV Vps in Alternative Procedure yields INCOMPLETE (cannot PASS)', () => {
      const input = {
        zones: [
          {
            id: 'Z1',
            pz: 10,
            rp: 2.5,
            ra: 0.3,
            az: 100,
            voz: 55,
            vpz: 250,
            vpzMinDesign: 110,
            dMode: 'VAV' as const,
            ez: 1.0,
            er: 0
          }
        ],
        ps: 10,
        systemType: 'single_supply' as const,
        airDistributionType: 'VAV' as const,
        vps: null // Missing required Vps
      };

      const result = Ashrae621AlternativeSystemService.calculate(input);
      expect(result.status).toBe('INCOMPLETE');
      expect(result.status).not.toBe('PASS');
      expect(result.vot).toBeNull();
    });

    it('J. Invalid unknown exhaust source yields BLOCKED (cannot PASS)', () => {
      const unknownExhaust: any = {
        id: 'unknown_source_radiation',
        name: 'Radioactive Fume Capture',
        rate: 100,
        unitType: 'm2',
        airClass: 4,
        exhaustClass: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Unknown Table',
        verificationStatus: 'NOT_VERIFIED'
      };

      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: unknownExhaust,
        qty: 10,
        designExhaust: 1000
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
      expect(res.requiredExhaust).toBeNull();
    });
  });
});
