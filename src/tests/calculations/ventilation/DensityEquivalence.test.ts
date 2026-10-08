import { describe, it, expect } from 'vitest';
import { DensityCorrectionService } from '../../../lib/DensityCorrectionService';

describe('ASHRAE 62.1-2022 Addendum j Density Equivalence', () => {
  it('MATHEMATICAL TEST: Produces Eρ = 1.0 at standard conditions', () => {
    // Standard conditions per Addendum j: 1.2 kg/m3, 21 C, 101.3 kPa
    const res = DensityCorrectionService.calculate({ elevation: 0, temperature: 21, relativeHumidity: 0, method: 'ANALYTICAL' });
    expect(res.eRho).toBeCloseTo(1.0, 3);
  });
  
  it('MATHEMATICAL TEST: Produces Eρ > 1.0 at high elevation (Denver ~1600m)', () => {
    const res = DensityCorrectionService.calculate({ elevation: 1600, temperature: 21, relativeHumidity: 0, method: 'ANALYTICAL' });
    expect(res.eRho).toBeGreaterThan(1.1);
  });
  
  it('TABLE TEST: Correct table values', () => {
    expect(DensityCorrectionService.calculate({ elevation: 158, temperature: 21, method: 'TABLE' }).eRho).toBe(1.00);
    expect(DensityCorrectionService.calculate({ elevation: 159, temperature: 21, method: 'TABLE' }).eRho).toBe(1.05);
    expect(DensityCorrectionService.calculate({ elevation: 566, temperature: 21, method: 'TABLE' }).eRho).toBe(1.05);
    expect(DensityCorrectionService.calculate({ elevation: 951, temperature: 21, method: 'TABLE' }).eRho).toBe(1.10);
    expect(DensityCorrectionService.calculate({ elevation: 1317, temperature: 21, method: 'TABLE' }).eRho).toBe(1.15);
    expect(DensityCorrectionService.calculate({ elevation: 1664, temperature: 21, method: 'TABLE' }).eRho).toBe(1.20);
    expect(DensityCorrectionService.calculate({ elevation: 1994, temperature: 21, method: 'TABLE' }).eRho).toBe(1.25);
    expect(DensityCorrectionService.calculate({ elevation: 2309, temperature: 21, method: 'TABLE' }).eRho).toBe(1.30);
    expect(DensityCorrectionService.calculate({ elevation: 2609, temperature: 21, method: 'TABLE' }).eRho).toBe(1.35);
    expect(DensityCorrectionService.calculate({ elevation: 2897, temperature: 21, method: 'TABLE' }).eRho).toBe(1.40);
    expect(DensityCorrectionService.calculate({ elevation: 3173, temperature: 21, method: 'TABLE' }).eRho).toBe(1.45);
    expect(DensityCorrectionService.calculate({ elevation: 3437, temperature: 21, method: 'TABLE' }).eRho).toBe(1.50);
  });

  it('TABLE TEST: Fallback to Analytical at > 3437m', () => {
    const res = DensityCorrectionService.calculate({ elevation: 3438, temperature: 21, relativeHumidity: 0, method: 'TABLE' });
    expect(res.auditTrail.find(a => a.symbol === 'Table Limit')).toBeDefined();
    expect(res.eRho).toBeGreaterThan(1.5);
  });
});
