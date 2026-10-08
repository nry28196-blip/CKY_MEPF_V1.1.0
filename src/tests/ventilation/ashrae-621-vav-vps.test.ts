import { describe, it, expect } from 'vitest';
import { Ashrae621AlternativeSystemService, AlternativeZoneInput } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { Ashrae621SimplifiedSystemService, SimplifiedSystemZoneInput } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('ASHRAE 62.1-2022 VAV System Airflow (Vps & Vpz-min) Regression Test Suite', () => {
  const createAlternativeZone = (id: string, overrides: Partial<AlternativeZoneInput> = {}): AlternativeZoneInput => ({
    id,
    pz: 10,
    rp: 2.5,
    ra: 0.3,
    az: 100,
    voz: 60,
    vpz: 100,
    vpzMinRequired: 60,
    vpzMinDesign: 80,
    ep: 1.0,
    er: 0,
    ez: 1.0,
    dMode: 'VAV',
    ...overrides
  });

  // TEST 1 — VAV Vps must NOT equal ΣVpz automatically
  it('TEST 1 — VAV Vps must NOT equal ΣVpz automatically', () => {
    // Given:
    // Zone 1 Vpz = 500 L/s
    // Zone 2 Vpz = 400 L/s
    // Zone 3 Vpz = 300 L/s
    // ΣVpz = 1,200 L/s
    // Vps = 900 L/s
    const input = {
      zones: [
        createAlternativeZone('Z1', { vpz: 500, voz: 50, vpzMinDesign: 100 }),
        createAlternativeZone('Z2', { vpz: 400, voz: 50, vpzMinDesign: 100 }),
        createAlternativeZone('Z3', { vpz: 300, voz: 50, vpzMinDesign: 100 })
      ],
      ps: 30,
      vps: 900,
      vpsDesignBasis: 'Highest expected system primary airflow at analyzed design condition',
      designCondition: 'Cooling design',
      airDistributionType: 'VAV' as const,
      edition: '2022' as const,
      systemType: 'single_supply' as const
    };

    const result = Ashrae621AlternativeSystemService.calculate(input);

    // Expected: Vps = 900 L/s. The system must NOT replace it with 1,200 L/s.
    expect(result.vps).toBe(900);
    expect(result.vps).not.toBe(1200);
    expect(result.status).toBe('PASS');
    expect(result.vpsDesignBasis).toBe('Highest expected system primary airflow at analyzed design condition');
    expect(result.designCondition).toBe('Cooling design');
  });

  // TEST 2 — Missing Vps
  it('TEST 2 — Missing Vps: VAV system with Vps = null returns INCOMPLETE', () => {
    const input = {
      zones: [
        createAlternativeZone('Z1', { vpz: 500, voz: 50, vpzMinDesign: 100 })
      ],
      ps: 10,
      vps: null,
      airDistributionType: 'VAV' as const,
      edition: '2022' as const,
      systemType: 'single_supply' as const
    };

    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('INCOMPLETE');
    expect(result.ev).toBeNull();
    expect(result.message).toContain('System primary airflow Vps is required for VAV systems');
  });

  // TEST 3 — Invalid Vps (Vps = 0)
  it('TEST 3 — Invalid Vps: VAV system with Vps = 0 returns INCOMPLETE and does not calculate normal Ev', () => {
    const input = {
      zones: [
        createAlternativeZone('Z1', { vpz: 500, voz: 50, vpzMinDesign: 100 })
      ],
      ps: 10,
      vps: 0,
      airDistributionType: 'VAV' as const,
      edition: '2022' as const,
      systemType: 'single_supply' as const
    };

    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('INCOMPLETE');
    expect(result.ev).toBeNull();
    expect(result.message).toContain('System primary airflow Vps is required for VAV systems');
  });

  // TEST 4 — Vps < Vou
  it('TEST 4 — Vps < Vou: VAV system where Vps < Vou returns FAIL', () => {
    // Vou ~ 150 L/s, Vps = 100 L/s < Vou
    const input = {
      zones: [
        createAlternativeZone('Z1', { rp: 5, ra: 1, az: 100, pz: 10, voz: 150, vpz: 500, vpzMinDesign: 200 })
      ],
      ps: 10,
      vps: 100, // Vps < Vou
      airDistributionType: 'VAV' as const,
      edition: '2022' as const,
      systemType: 'single_supply' as const
    };

    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('FAIL');
    expect(result.ev).toBeNull();
    expect(result.message).toContain('System primary airflow Vps is less than uncorrected outdoor-air intake Vou');
  });

  // TEST 5 — Vpz-min requirement calculation
  it('TEST 5 — Vpz-min requirement calculation: Simplified Vpz-min-required = 1.5 × Voz', () => {
    // Voz = 100 L/s -> Expected Simplified Vpz-min-required = 150 L/s (1.5 * Voz)
    const simplifiedInput = {
      zones: [
        { id: 'Z1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 100, vpz: 500, vpzMinDesign: 160, dMode: 'VAV' as const }
      ],
      ps: 10
    };

    const result = Ashrae621SimplifiedSystemService.calculate(simplifiedInput);
    const z = result.zoneResults[0];
    expect(z.vpzMinRequired).toBe(150); // 1.5 * 100
    expect(z.compliance).toBe('PASS');
  });

  // TEST 6 — Vpz-min PASS
  it('TEST 6 — Vpz-min PASS: Voz = 200 L/s, Vpz-min-design = 320 L/s (>= 300) returns PASS', () => {
    const simplifiedInput = {
      zones: [
        { id: 'Z1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 200, vpz: 500, vpzMinDesign: 320, dMode: 'VAV' as const }
      ],
      ps: 10
    };

    const result = Ashrae621SimplifiedSystemService.calculate(simplifiedInput);
    const z = result.zoneResults[0];
    expect(z.vpzMinRequired).toBe(300); // 1.5 * 200
    expect(z.compliance).toBe('PASS');
    expect(result.status).toBe('PASS');
  });

  // TEST 7 — Vpz-min FAIL
  it('TEST 7 — Vpz-min FAIL: Voz = 200 L/s, Vpz-min-design = 250 L/s (< 300) returns FAIL', () => {
    const simplifiedInput = {
      zones: [
        { id: 'Z1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 200, vpz: 500, vpzMinDesign: 250, dMode: 'VAV' as const }
      ],
      ps: 10
    };

    const result = Ashrae621SimplifiedSystemService.calculate(simplifiedInput);
    const z = result.zoneResults[0];
    expect(z.vpzMinRequired).toBe(300); // 1.5 * 200
    expect(z.compliance).toBe('FAIL');
    expect(result.status).toBe('FAIL');
    expect(z.message).toContain('less than required minimum');
  });

  // TEST 8 — Missing Vpz-min design
  it('TEST 8 — Missing Vpz-min design: Vpz-min-design = null returns INCOMPLETE', () => {
    const simplifiedInput = {
      zones: [
        { id: 'Z1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 200, vpz: 500, vpzMinDesign: null, dMode: 'VAV' as const }
      ],
      ps: 10
    };

    const result = Ashrae621SimplifiedSystemService.calculate(simplifiedInput);
    const z = result.zoneResults[0];
    expect(z.compliance).toBe('INCOMPLETE');
    expect(result.status).toBe('INCOMPLETE');
    expect(z.message).toContain('Vpz-min design is missing');
  });

  // TEST 9 — Multiple VAV zones (Zone 1 passes, Zone 2 fails)
  it('TEST 9 — Multiple VAV zones: Zone 1 passes Vpz-min, Zone 2 fails Vpz-min -> System FAIL with audit trail', () => {
    const simplifiedInput = {
      zones: [
        { id: 'Zone-1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 100, vpz: 400, vpzMinDesign: 160, dMode: 'VAV' as const }, // Req: 150 -> PASS
        { id: 'Zone-2', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 100, vpz: 400, vpzMinDesign: 120, dMode: 'VAV' as const }  // Req: 150 -> FAIL (120 < 150)
      ],
      ps: 20
    };

    const result = Ashrae621SimplifiedSystemService.calculate(simplifiedInput);
    expect(result.status).toBe('FAIL');
    
    const z1 = result.zoneResults.find(z => z.id === 'Zone-1')!;
    const z2 = result.zoneResults.find(z => z.id === 'Zone-2')!;

    expect(z1.compliance).toBe('PASS');
    expect(z2.compliance).toBe('FAIL');
    expect(z2.message).toContain('less than required minimum (1.5 × Voz = 150.0 L/s)');

    // Verify audit trail identifies the failure
    const failedAudit = result.auditTrail.find(a => a.symbol === 'Vpz-min compliance (Zone-2)');
    expect(failedAudit).toBeDefined();
    expect(failedAudit?.status).toBe('FAIL');
  });

  // TEST 10 — MultiZone Engine Pipeline integration with Vps and Vpz-min
  it('TEST 10 — VentilationEngine.runMultiZone passes explicit Vps and performs Vpz-min validation', () => {
    const spaceType = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
    const ez = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;

    const result = VentilationEngine.runMultiZone({
      method: 'Alternative',
      edition: '2022',
      systemPopulation: 10,
      airDistributionType: 'VAV',
      vps: 800,
      vpsDesignBasis: 'Highest expected system primary airflow at analyzed design condition',
      designCondition: 'Cooling design',
      density: { elevation: 0, temperature: 20 },
      systemType: 'single_supply',
      zones: [
        {
          id: 'z1',
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType,
          area: 100,
          designOccupancy: 10,
          useDefaultOccupancy: false,
          ezConfig: ez,
          dMode: 'VAV',
          vpz: 500,
          vpzMinDesign: 100,
          ep: 1.0,
          er: 0
        }
      ]
    });

    expect(result.status).toBe('PASS');
    expect(result.vps).toBe(800);
    expect(result.vpsDesignBasis).toBe('Highest expected system primary airflow at analyzed design condition');
    expect(result.designCondition).toBe('Cooling design');
    expect(result.xs).toBeCloseTo(result.vou! / 800);
  });
});
