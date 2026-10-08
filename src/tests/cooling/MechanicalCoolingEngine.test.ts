import { describe, it, expect } from 'vitest';
import { MechanicalCoolingEngine } from '../../lib/MechanicalCoolingEngine';

describe('MechanicalCoolingEngine', () => {
  it('should not return fixed placeholder outputs for calcRoomTonsAndWatts', () => {
    const result1 = MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 100, 5, true);
    const result2 = MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 200, 10, true);

    expect(result1.tons).not.toBe(1.0);
    expect(result1.watts).not.toBe(3500);

    // Results should scale with input
    expect(result2.tons).toBeGreaterThan(result1.tons);
    expect(result2.watts).toBeGreaterThan(result1.watts);
  });
});
