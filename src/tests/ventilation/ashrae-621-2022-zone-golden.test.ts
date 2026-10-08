import { describe, it, expect } from 'vitest';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { DensityCorrectionService } from '../../lib/DensityCorrectionService';
import { VentilationEngine } from '../../lib/VentilationEngine';

describe('ASHRAE 62.1-2022 Zone Calculation Chain - Golden Numerical Tests (A through H)', () => {
  const get2022SpaceType = (id: string) => {
    const st = StandardDataProvider.getProduction621SpaceTypes().find(s => s.id === id);
    if (!st) throw new Error(`Space type ${id} not found in 2022 baseline`);
    return st;
  };

  const get2022Ez = (id: string) => {
    const ez = StandardDataProvider.getProduction621EzValues().find(e => e.id === id);
    if (!ez) throw new Error(`Ez config ${id} not found in 2022 baseline`);
    return ez;
  };

  const office = get2022SpaceType('office');
  const conference = get2022SpaceType('conference');
  const classroom = get2022SpaceType('classroom');
  const retail = get2022SpaceType('retail');
  const corridor = get2022SpaceType('corridor');

  const ezCooling = get2022Ez('ez-1'); // Ez = 1.0
  const ezHeating = get2022Ez('ez-2'); // Ez = 0.8

  // TEST A: Office space with default occupant density
  it('TEST A: Office space with default occupant density', () => {
    // Office Table 6-1: Rp = 2.5 L/s-person, Ra = 0.3 L/s-m2, default = 5.0 / 100 m2
    const area = 200; // m2
    // Expected Pz = (200 / 100) * 5.0 = 10 people
    // Vbp = 2.5 * 10 = 25.0 L/s
    // Vba = 0.3 * 200 = 60.0 L/s
    // Vbz = 25.0 + 60.0 = 85.0 L/s
    // Ez = 1.0, Ep = 1.0
    // Voz = (85.0 / 1.0) * 1.0 = 85.0 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area,
      designOccupancy: null,
      useDefaultOccupancy: true,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('default');
    expect(result.occupancyDensityUsed).toBe(5.0);
    expect(result.pz).toBe(10);
    expect(result.rp).toBe(2.5);
    expect(result.ra).toBe(0.3);
    expect(result.vbp).toBeCloseTo(25.0);
    expect(result.vba).toBeCloseTo(60.0);
    expect(result.vbz).toBeCloseTo(85.0);
    expect(result.ez).toBe(1.0);
    expect(result.voz).toBeCloseTo(85.0);
  });

  // TEST B: Office space with user-specified occupant density
  it('TEST B: Office space with user-specified occupant density', () => {
    // User specifies 15 people in 200 m2 (overriding default 10)
    // Vbp = 2.5 * 15 = 37.5 L/s
    // Vba = 0.3 * 200 = 60.0 L/s
    // Vbz = 37.5 + 60.0 = 97.5 L/s
    // Voz = 97.5 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 200,
      designOccupancy: 15,
      useDefaultOccupancy: false,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('design');
    expect(result.pz).toBe(15);
    expect(result.vbp).toBeCloseTo(37.5);
    expect(result.vba).toBeCloseTo(60.0);
    expect(result.vbz).toBeCloseTo(97.5);
    expect(result.voz).toBeCloseTo(97.5);
  });

  // TEST C: Conference room with high occupant density
  it('TEST C: Conference room with high occupant density', () => {
    // Conference Table 6-1: Rp = 2.5 L/s-person, Ra = 0.3 L/s-m2, default = 50 / 100 m2
    // Area = 50 m2 -> Pz = 25 people
    // Vbp = 2.5 * 25 = 62.5 L/s
    // Vba = 0.3 * 50 = 15.0 L/s
    // Vbz = 62.5 + 15.0 = 77.5 L/s
    // Voz = 77.5 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: conference,
      area: 50,
      designOccupancy: null,
      useDefaultOccupancy: true,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('default');
    expect(result.pz).toBe(25);
    expect(result.vbp).toBeCloseTo(62.5);
    expect(result.vba).toBeCloseTo(15.0);
    expect(result.vbz).toBeCloseTo(77.5);
    expect(result.voz).toBeCloseTo(77.5);
  });

  // TEST D: Classroom with default occupant density
  it('TEST D: Classroom (ages 9+) with default occupant density', () => {
    // Classroom Table 6-1: Rp = 5.0 L/s-person, Ra = 0.6 L/s-m2, default = 35 / 100 m2
    // Area = 100 m2 -> Pz = 35 people
    // Vbp = 5.0 * 35 = 175.0 L/s
    // Vba = 0.6 * 100 = 60.0 L/s
    // Vbz = 175.0 + 60.0 = 235.0 L/s
    // Voz = 235.0 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: classroom,
      area: 100,
      designOccupancy: null,
      useDefaultOccupancy: true,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('default');
    expect(result.pz).toBe(35);
    expect(result.vbp).toBeCloseTo(175.0);
    expect(result.vba).toBeCloseTo(60.0);
    expect(result.vbz).toBeCloseTo(235.0);
    expect(result.voz).toBeCloseTo(235.0);
  });

  // TEST E: Retail sales space with default occupant density
  it('TEST E: Retail sales space with default occupant density', () => {
    // Retail Table 6-1: Rp = 3.8 L/s-person, Ra = 0.6 L/s-m2, default = 15 / 100 m2
    // Area = 300 m2 -> Pz = (300 / 100) * 15 = 45 people
    // Vbp = 3.8 * 45 = 171.0 L/s
    // Vba = 0.6 * 300 = 180.0 L/s
    // Vbz = 171.0 + 180.0 = 351.0 L/s
    // Voz = 351.0 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: retail,
      area: 300,
      designOccupancy: null,
      useDefaultOccupancy: true,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('default');
    expect(result.pz).toBe(45);
    expect(result.vbp).toBeCloseTo(171.0);
    expect(result.vba).toBeCloseTo(180.0);
    expect(result.vbz).toBeCloseTo(351.0);
    expect(result.voz).toBeCloseTo(351.0);
  });

  // TEST F: Corridor with zero occupant rate and area-only ventilation
  it('TEST F: Corridor with zero occupant rate and area-only ventilation', () => {
    // Corridor Table 6-1: Rp = 0 L/s-person, Ra = 0.3 L/s-m2, default = 0
    // Area = 150 m2 -> Pz = 0 people
    // Vbp = 0 * 0 = 0 L/s
    // Vba = 0.3 * 150 = 45.0 L/s
    // Vbz = 0 + 45.0 = 45.0 L/s
    // Voz = 45.0 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: corridor,
      area: 150,
      designOccupancy: null,
      useDefaultOccupancy: true,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('default');
    expect(result.pz).toBe(0);
    expect(result.vbp).toBeCloseTo(0.0);
    expect(result.vba).toBeCloseTo(45.0);
    expect(result.vbz).toBeCloseTo(45.0);
    expect(result.voz).toBeCloseTo(45.0);
  });

  // TEST G: Zone with heating airflow and Ez = 0.8
  it('TEST G: Zone with heating airflow and Ez = 0.8', () => {
    // Office, Area = 100 m2, Pz = 5 people
    // Vbp = 2.5 * 5 = 12.5 L/s
    // Vba = 0.3 * 100 = 30.0 L/s
    // Vbz = 12.5 + 30.0 = 42.5 L/s
    // Ez = 0.8 (Ceiling supply/return heating >= 8°C diff)
    // Voz = (42.5 / 0.8) = 53.125 L/s
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: ezHeating,
      supplyTempRelationship: 'heating_gte_8c'
    });

    expect(result.status).toBe('PASS');
    expect(result.ez).toBe(0.8);
    expect(result.vbz).toBeCloseTo(42.5);
    expect(result.voz).toBeCloseTo(53.125);
  });

  // TEST H: Zone with density correction Ep != 1.0 (Denver elevation 1609 m)
  it('TEST H: Zone with density correction Ep != 1.0 (Denver elevation 1609 m)', () => {
    // Office, Area = 100 m2, Pz = 5 people -> Vbz = 42.5 L/s
    // Denver elevation = 1609 m -> Table 6-5 lookup yields Ep = 1.20
    const densityResult = DensityCorrectionService.calculate({
      elevation: 1609,
      temperature: 21,
      method: 'TABLE'
    });
    expect(densityResult.eRho).toBe(1.20);

    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: ezCooling,
      epDensity: densityResult.eRho
    });

    expect(result.status).toBe('PASS');
    expect(result.epDensity).toBe(1.20);
    expect(result.vbz).toBeCloseTo(42.5);
    // Voz = (42.5 / 1.0) * 1.20 = 51.0 L/s
    expect(result.voz).toBeCloseTo(51.0);
  });

  // POPULATION PRECEDENCE AND BEHAVIOR TESTS
  it('Population Precedence: Explicit design population 0 is preserved and does NOT fall back to default', () => {
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 0,
      useDefaultOccupancy: false,
      ezConfig: ezCooling
    });

    expect(result.status).toBe('PASS');
    expect(result.occupancySource).toBe('design');
    expect(result.pz).toBe(0);
    expect(result.vbp).toBe(0);
    expect(result.vba).toBeCloseTo(30.0);
    expect(result.vbz).toBeCloseTo(30.0);
  });

  // INVALID INPUT VALIDATION TESTS (SECTION 11)
  describe('Input Validation for Boundary and Invalid Values', () => {
    it('Area <= 0 returns FAIL Invalid Area', () => {
      const resZero = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: 0, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(resZero.status).toBe('FAIL');
      expect(resZero.reason).toBe('Invalid Area');

      const resNeg = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: -50, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(resNeg.status).toBe('FAIL');
      expect(resNeg.reason).toBe('Invalid Area');

      const resNaN = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: NaN, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(resNaN.status).toBe('FAIL');
      expect(resNaN.reason).toBe('Invalid Area');
    });

    it('Occupancy < 0 or NaN returns FAIL Invalid Occupancy', () => {
      const resNeg = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: 100, designOccupancy: -3, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(resNeg.status).toBe('FAIL');
      expect(resNeg.reason).toBe('Invalid Occupancy');

      const resNaN = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: 100, designOccupancy: NaN, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(resNaN.status).toBe('FAIL');
      expect(resNaN.reason).toBe('Invalid Occupancy');
    });

    it('Missing space type returns INCOMPLETE Missing Space Type', () => {
      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: null, area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezCooling
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.reason).toBe('Missing Space Type');
    });

    it('Missing Ez configuration returns INCOMPLETE Missing Ez configuration', () => {
      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: null
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.reason).toBe('Missing Ez configuration');
    });

    it('Ez <= 0 returns FAIL Invalid Ez', () => {
      const invalidEz = { ...ezCooling, ez: 0 };
      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022',
        spaceType: office, area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: invalidEz
      });
      expect(res.status).toBe('FAIL');
      expect(res.reason).toBe('Invalid Ez');
    });
  });

  // DATA PROVENANCE AUDITABILITY TESTS (SECTION 13)
  it('Exposes auditable data provenance and Air Class for zone results', () => {
    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: ezCooling
    });

    expect(result.spaceTypeId).toBe('office');
    expect(result.spaceTypeName).toBe('Office space');
    expect(result.airClass).toBe(1);
    expect(result.standard).toBe('ASHRAE 62.1');
    expect(result.edition).toBe('2022');
    expect(result.auditTrail.length).toBeGreaterThanOrEqual(2);
    expect(result.auditTrail.some(a => a.symbol === 'Vbz')).toBe(true);
    expect(result.auditTrail.some(a => a.symbol === 'Voz')).toBe(true);
  });

  // SINGLE-ZONE VS MULTI-ZONE BEHAVIOR (SECTION 6)
  it('Single-zone system Vot strictly equals Voz = (Vbz / Ez) * Ep', () => {
    const singleZoneResult = VentilationEngine.runSingleZone({
      edition: '2022',
      density: { elevation: 0, temperature: 21 },
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCooling
      }
    });

    expect(singleZoneResult.status).toBe('PASS');
    expect(singleZoneResult.voz).toBeCloseTo(42.5);
    expect(singleZoneResult.vot).toBeCloseTo(42.5);
    expect(singleZoneResult.finalDesignOutdoorAir).toBeCloseTo(42.5);
  });
});
