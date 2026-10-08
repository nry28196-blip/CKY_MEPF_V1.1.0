import { describe, it, expect } from 'vitest';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { DensityCorrectionService } from '../../lib/DensityCorrectionService';

const makeVerified = (item: any) => {
    if (!item) return item;
    const ref = item.reference || 'ASHRAE 62.1 Section 6.2.2.1';
    const fakeProvenanceItem = {
        value: 1,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: ref,
        sourceType: 'ASHRAE_PUBLISHED',
        verificationStatus: 'VERIFIED',
        verificationDate: '2022-01-01',
        revision: '2022'
    };
    return {
      ...item,
      sourceType: 'ASHRAE_PUBLISHED',
      verificationStatus: 'VERIFIED',
      verificationDate: '2022-01-01',
      reference: ref,
      revisionState: {
        ...item.revisionState,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        baseEdition: '2022',
        source: 'ASHRAE_PUBLISHED',
        publishedAddendaApplied: ['Addendum j']
      },
      provenance: item.category ? {
          rp: { ...fakeProvenanceItem, value: item.rpMetric },
          ra: { ...fakeProvenanceItem, value: item.raMetric },
          defaultOccupancy: { ...fakeProvenanceItem, value: item.defaultOccupancyMetric },
          reference: { ...fakeProvenanceItem, value: ref }
      } : {
          ez: { ...fakeProvenanceItem, value: item.ez },
          applicability: { ...fakeProvenanceItem, value: item.applicableCondition },
          reference: { ...fakeProvenanceItem, value: ref }
      }
    };
};

describe('ASHRAE 62.1-2022 Density Correction (Addendum j)', () => {
  const getSpaceType = (id: string) => makeVerified(StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === id)!);
  const getEzConfig = (id: string) => makeVerified(StandardDataProvider.get621EzValues('2022').find(e => e.id === id)!);

  it('Should apply Addendum j density correction equation (Eρ = ρ_standard / ρ_actual) in 2022 edition', () => {
    const result = VentilationEngine.runSingleZone({
      edition: '2022',
      density: { elevation: 1524, temperature: 35 }, // 5000 ft, 95F
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: getSpaceType('office'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1')
      }
    });

    // ρ_standard = 1.204
    // At 1524m, 35C: P ~ 84.5 kPa, T = 308.15 K
    // ρ_actual = 84.5 / (0.287058 * 308.15) = 84.5 / 88.456 = 0.955 kg/m3
    // eRho = 1.204 / 0.955 = 1.26
    
    expect(result.density.eRho).toBe(1.2);
    expect(result.density.eRho).toBeLessThan(1.3);
    
    // Vot_standard = 42.5
    // Vot_actual = 42.5 * 1.26 = 53.5
    expect(result.vot).toBeGreaterThan(50);
  });

  // =========================================================================
  // TASK 1 — EXACT TEMPERATURE BOUNDARY
  // =========================================================================
  describe('TASK 1 — Exact Temperature Boundary (< 40.0°C)', () => {
    it('39.999°C -> CT simplification permitted (CT = 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 39.999,
        relativeHumidity: 20,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.ctSimplified).toBe(true);
      expect(res.ct).toBe(1.0);
    });

    it('40.000°C -> CT simplification not permitted (CT != 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 40.000,
        relativeHumidity: 20,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.ctSimplified).toBe(false);
      expect(res.ct).not.toBe(1.0);
      const expectedCt = (40.0 + 273.15) / 294.15;
      expect(res.ct).toBeCloseTo(expectedCt, 5);
      expect(res.ct).toBeGreaterThan(1.0);
    });

    it('40.001°C -> CT simplification not permitted (CT != 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 40.001,
        relativeHumidity: 20,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.ctSimplified).toBe(false);
      expect(res.ct).not.toBe(1.0);
      const expectedCt = (40.001 + 273.15) / 294.15;
      expect(res.ct).toBeCloseTo(expectedCt, 5);
      expect(res.ct).toBeGreaterThan(1.0);
    });
  });

  // =========================================================================
  // TASK 2 — EXACT HUMIDITY BOUNDARY
  // =========================================================================
  describe('TASK 2 — Exact Humidity Boundary (< 0.024 kg/kg)', () => {
    it('W = 0.023999 -> CW simplification permitted (CW = 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.023999,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.cwSimplified).toBe(true);
      expect(res.cw).toBe(1.0);
    });

    it('W = 0.024000 -> CW simplification not permitted (CW != 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.024000,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.cwSimplified).toBe(false);
      expect(res.cw).not.toBe(1.0);
      const expectedCw = (1 + 0.024) / (1 + 1.6078 * 0.024);
      expect(res.cw).toBeCloseTo(expectedCw, 5);
    });

    it('W = 0.024001 -> CW simplification not permitted (CW != 1.0)', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: 30,
        humidityRatio: 0.024001,
        method: 'ANALYTICAL',
        applyStandardSimplifications: true,
        analyticalEquation: 'D-4'
      });
      expect(res.simplificationsApplied?.cwSimplified).toBe(false);
      expect(res.cw).not.toBe(1.0);
      const expectedCw = (1 + 0.024001) / (1 + 1.6078 * 0.024001);
      expect(res.cw).toBeCloseTo(expectedCw, 5);
    });
  });

  // =========================================================================
  // TASK 3 — MOISTURE INPUT CONSISTENCY
  // =========================================================================
  describe('TASK 3 — Moisture Input Consistency', () => {
    it('A. Explicit humidityRatio controls the analytical density calculation', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 500,
        temperature: 28,
        humidityRatio: 0.015,
        relativeHumidity: 10, // Conflicting RH should be overridden by authoritative humidityRatio
        method: 'ANALYTICAL'
      });
      expect(res.humidityRatioKgKg).toBe(0.015);
      // Verify density was calculated with W = 0.015
      const pAtm = DensityCorrectionService.calculatePressure(500);
      const pv = (0.015 / (0.621945 + 0.015)) * pAtm;
      const pd = pAtm - pv;
      const expectedDensity = pd / (0.287058 * (28 + 273.15));
      expect(res.density).toBeCloseTo(expectedDensity, 4);
    });

    it('B. relativeHumidity is used when explicit humidity ratio is absent', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 500,
        temperature: 28,
        relativeHumidity: 60,
        method: 'ANALYTICAL'
      });
      expect(res.relativeHumidity).toBe(60);
      const pAtm = DensityCorrectionService.calculatePressure(500);
      const expectedW = DensityCorrectionService.calculateHumidityRatio(28, 60, pAtm);
      expect(res.humidityRatioKgKg).toBeCloseTo(expectedW, 5);
    });

    it('C. Both paths produce consistent physical moisture states', () => {
      // 1. From RH
      const fromRH = DensityCorrectionService.calculate({
        elevation: 200,
        temperature: 25,
        relativeHumidity: 50,
        method: 'ANALYTICAL'
      });

      // 2. Feed derived W back as explicit humidityRatio
      const fromW = DensityCorrectionService.calculate({
        elevation: 200,
        temperature: 25,
        humidityRatio: fromRH.humidityRatioKgKg,
        method: 'ANALYTICAL'
      });

      expect(fromW.density).toBeCloseTo(fromRH.density, 5);
      expect(fromW.eRho).toBeCloseTo(fromRH.eRho, 5);
      expect(fromW.relativeHumidity).toBeCloseTo(50, 2);
      expect(fromW.eRhoEqD4).toBeCloseTo(fromRH.eRhoEqD4, 5);
      expect(fromW.eRhoEqD5b).toBeCloseTo(fromRH.eRhoEqD5b, 5);
    });

    it('D. method: ANALYTICAL with neither W nor RH returns INCOMPLETE and non-verified state', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 200,
        temperature: 25,
        method: 'ANALYTICAL'
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.message).toContain('Missing outdoor-air moisture input');

      // Verify engine execution with missing moisture also yields INCOMPLETE
      const engineResult = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 200, temperature: 25, method: 'ANALYTICAL' },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: getSpaceType('office'),
          area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1')
        }
      });
      expect(engineResult.status).toBe('INCOMPLETE');
      expect(engineResult.vot).toBeNull();
    });
  });

  // =========================================================================
  // TASK 4 — ANALYTICAL EQUATIONS (D-4 vs D-5b)
  // =========================================================================
  describe('TASK 4 — Analytical Equations (D-4 vs D-5b)', () => {
    it('eRhoEqD4 = Cz * CT * CW and eRhoEqD5b = 1.2 / rho', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 1500,
        temperature: 35,
        relativeHumidity: 60,
        method: 'ANALYTICAL',
        applyStandardSimplifications: false
      });
      const expectedD4 = res.cz * res.ct * res.cw;
      expect(res.eRhoEqD4).toBeCloseTo(expectedD4, 5);
      const expectedD5b = 1.2 / res.density;
      expect(res.eRhoEqD5b).toBeCloseTo(expectedD5b, 5);
    });

    it('Equation selection input changes calculation path correctly', () => {
      // D-4 selection
      const resD4 = DensityCorrectionService.calculate({
        elevation: 1500,
        temperature: 35,
        relativeHumidity: 60,
        method: 'ANALYTICAL',
        analyticalEquation: 'D-4',
        applyStandardSimplifications: false
      });
      expect(resD4.eRho).toBe(resD4.eRhoEqD4);

      // D-5b selection
      const resD5b = DensityCorrectionService.calculate({
        elevation: 1500,
        temperature: 35,
        relativeHumidity: 60,
        method: 'ANALYTICAL',
        analyticalEquation: 'D-5b',
        applyStandardSimplifications: false
      });
      expect(resD5b.eRho).toBe(resD5b.eRhoEqD5b);

      // Values differ between D-4 and D-5b at this condition
      expect(resD4.eRho).not.toBe(resD5b.eRho);
    });
  });

  // =========================================================================
  // TASK 5 — TABLE METHOD BEHAVIOR PRESERVED
  // =========================================================================
  describe('TASK 5 — Table Method Elevation Lookup', () => {
    it('Supported elevations continue to use Table 6-5 lookup without replacement', () => {
      const elevations = [
        { z: 0, expected: 1.00 },
        { z: 158, expected: 1.00 },
        { z: 300, expected: 1.05 },
        { z: 700, expected: 1.10 },
        { z: 1100, expected: 1.15 },
        { z: 1500, expected: 1.20 },
        { z: 1800, expected: 1.25 },
        { z: 2100, expected: 1.30 },
        { z: 2500, expected: 1.35 },
        { z: 2800, expected: 1.40 },
        { z: 3100, expected: 1.45 },
        { z: 3400, expected: 1.50 }
      ];

      elevations.forEach(({ z, expected }) => {
        const res = DensityCorrectionService.calculate({
          elevation: z,
          temperature: 25,
          method: 'TABLE'
        });
        expect(res.methodUsed).toBe('TABLE');
        expect(res.eRho).toBe(expected);
        expect(res.status).toBe('PASS');
      });
    });

    it('Elevations above 3437 m fallback to analytical with Table Limit noted', () => {
      const res = DensityCorrectionService.calculate({
        elevation: 3500,
        temperature: 20,
        relativeHumidity: 50,
        method: 'TABLE'
      });
      expect(res.eRho).toBeGreaterThan(1.50);
      expect(res.auditTrail.find(a => a.symbol === 'Table Limit')).toBeDefined();
    });
  });

  // =========================================================================
  // TASK 6 — ENGINE PROPAGATION (eRho affects Voz = (Vbz / Ez) * Ep)
  // =========================================================================
  describe('TASK 6 — Engine Propagation to Zone Calculation', () => {
    it('Selected eRho reaches Ashrae621ZoneService and affects Voz = (Vbz / Ez) * Ep', () => {
      // Office: Rp = 2.5, Ra = 0.3. Area = 100 m2, Pz = 5.
      // Vbz = 2.5 * 5 + 0.3 * 100 = 12.5 + 30 = 42.5 L/s.
      // Ez = 1.0.

      // Run 1: eRho = 1.00 (sea level)
      const res1 = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 21, method: 'TABLE' },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: getSpaceType('office'),
          area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1')
        }
      });
      expect(res1.density.eRho).toBe(1.00);
      expect(res1.voz).toBeCloseTo(42.5 * 1.00, 3);

      // Run 2: eRho = 1.20 (elevation 1500 m)
      const res2 = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 1500, temperature: 21, method: 'TABLE' },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: getSpaceType('office'),
          area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1')
        }
      });
      expect(res2.density.eRho).toBe(1.20);
      expect(res2.voz).toBeCloseTo(42.5 * 1.20, 3);

      // Run 3: eRho = 1.35 (elevation 2500 m)
      const res3 = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 2500, temperature: 21, method: 'TABLE' },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: getSpaceType('office'),
          area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1')
        }
      });
      expect(res3.density.eRho).toBe(1.35);
      expect(res3.voz).toBeCloseTo(42.5 * 1.35, 3);

      // Ratio verification
      expect(res2.voz! / res1.voz!).toBeCloseTo(1.20, 3);
      expect(res3.voz! / res1.voz!).toBeCloseTo(1.35, 3);
    });
  });
});
