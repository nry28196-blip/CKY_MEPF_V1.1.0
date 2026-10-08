import { describe, it, expect } from 'vitest';
import {
  BATCH_PARAMETERS,
  BATCH_PRESETS,
  convertSingleParameter
} from '../../lib/batchUnitConversions';

describe('Batch Unit Conversions Engine', () => {
  it('defines valid parameter definitions with required attributes', () => {
    expect(BATCH_PARAMETERS.length).toBeGreaterThanOrEqual(20);
    BATCH_PARAMETERS.forEach(p => {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.category).toBeDefined();
      expect(p.imperialUnit).toBeDefined();
      expect(p.metricUnit).toBeDefined();
      expect(typeof p.imperialDefault).toBe('number');
      expect(typeof p.metricDefault).toBe('number');
      expect(p.decimals).toBeGreaterThanOrEqual(0);
    });
  });

  it('correctly converts airflow from CFM to L/s and vice versa', () => {
    const supplyAir = BATCH_PARAMETERS.find(p => p.id === 'supply_airflow')!;
    expect(supplyAir).toBeDefined();

    // 1000 CFM -> ~471.9 L/s
    const met = convertSingleParameter(supplyAir, 1000, 'imp_to_met');
    expect(met).toBeCloseTo(471.9, 0);

    // 471.9 L/s -> ~1000 CFM
    const imp = convertSingleParameter(supplyAir, met, 'met_to_imp');
    expect(imp).toBeCloseTo(1000, 0);
  });

  it('correctly converts cooling tons to kW and vice versa', () => {
    const coolingTons = BATCH_PARAMETERS.find(p => p.id === 'cooling_capacity_tons')!;
    expect(coolingTons).toBeDefined();

    // 100 TR -> ~351.7 kW
    const kw = convertSingleParameter(coolingTons, 100, 'imp_to_met');
    expect(kw).toBeCloseTo(351.69, 1);

    // 351.69 kW -> ~100 TR
    const tr = convertSingleParameter(coolingTons, kw, 'met_to_imp');
    expect(tr).toBeCloseTo(100, 1);
  });

  it('correctly converts duct friction loss in. wg/100ft to Pa/m', () => {
    const fric = BATCH_PARAMETERS.find(p => p.id === 'friction_rate')!;
    expect(fric).toBeDefined();

    // 0.1 in. wg/100ft -> ~0.82 Pa/m
    const pam = convertSingleParameter(fric, 0.1, 'imp_to_met');
    expect(pam).toBeCloseTo(0.82, 1);

    // Reversible
    const inwg = convertSingleParameter(fric, pam, 'met_to_imp');
    expect(inwg).toBeCloseTo(0.1, 2);
  });

  it('correctly converts hydronic GPM to L/s and vice versa', () => {
    const chw = BATCH_PARAMETERS.find(p => p.id === 'chilled_water_flow')!;
    expect(chw).toBeDefined();

    // 100 GPM -> ~6.31 L/s
    const lps = convertSingleParameter(chw, 100, 'imp_to_met');
    expect(lps).toBeCloseTo(6.31, 1);

    const gpm = convertSingleParameter(chw, lps, 'met_to_imp');
    expect(gpm).toBeCloseTo(100, 1);
  });

  it('handles absolute temperature conversions (°F <-> °C)', () => {
    const temp = BATCH_PARAMETERS.find(p => p.id === 'supply_air_temp')!;
    expect(temp).toBeDefined();

    // 32 °F -> 0 °C
    expect(convertSingleParameter(temp, 32, 'imp_to_met')).toBe(0);

    // 212 °F -> 100 °C
    expect(convertSingleParameter(temp, 212, 'imp_to_met')).toBe(100);

    // 0 °C -> 32 °F
    expect(convertSingleParameter(temp, 0, 'met_to_imp')).toBe(32);

    // 55 °F -> ~12.8 °C
    expect(convertSingleParameter(temp, 55, 'imp_to_met')).toBeCloseTo(12.8, 1);
  });

  it('handles differential temperature conversions (Δ°F <-> Δ°C)', () => {
    const deltaT = BATCH_PARAMETERS.find(p => p.id === 'temperature_diff')!;
    expect(deltaT).toBeDefined();

    // 18 Δ°F -> 10 Δ°C
    expect(convertSingleParameter(deltaT, 18, 'imp_to_met')).toBeCloseTo(10, 1);

    // 10 Δ°C -> 18 Δ°F
    expect(convertSingleParameter(deltaT, 10, 'met_to_imp')).toBeCloseTo(18, 1);
  });

  it('ensures all presets reference existing parameter IDs', () => {
    const validIds = new Set(BATCH_PARAMETERS.map(p => p.id));
    BATCH_PRESETS.forEach(preset => {
      expect(preset.parameterIds.length).toBeGreaterThan(0);
      preset.parameterIds.forEach(id => {
        expect(validIds.has(id)).toBe(true);
      });
    });
  });

  it('handles edge cases safely without crash', () => {
    const param = BATCH_PARAMETERS[0];
    expect(convertSingleParameter(param, 0, 'imp_to_met')).toBe(0);
    expect(convertSingleParameter(param, NaN, 'imp_to_met')).toBe(0);
  });
});
