import { describe, it, expect } from 'vitest';
import { MechanicalCoolingEngine, CoolingLoadInput } from '../../lib/MechanicalCoolingEngine';

describe('Cooling Sensitivity Analysis & Chiller Tonnage', () => {
  const baseInput: CoolingLoadInput = {
    isMetric: true,
    area: 100,
    volume: 300,
    height: 3,
    occupants: 8,
    estimationBasis: 'area',
    altitude: 0,
    outdoorTemp: 35,
    indoorTemp: 24,
    relativeHumidity: 50,
    indoorRelativeHumidity: 50,
    useAltitudeAdj: false,
    ventilationLps: 50,
    sensiblePerPerson: 75,
    latentPerPerson: 55,
    lightingWpm2: 12,
    equipmentWatts: 500,
    wallArea: 60,
    wallUValue: 2.0,
    roofArea: 100,
    roofUValue: 0.5,
    windowArea: 20,
    windowUValue: 3.0,
    windowShgc: 0.6,
    infiltrationACH: 0.5,
    safetyFactor: 10
  };

  it('calculates valid baseline chiller tonnage', () => {
    const baseResult = MechanicalCoolingEngine.calculateCoolingLoad(baseInput);
    expect(baseResult.status).toBe('PASS');
    expect(baseResult.tons).toBeGreaterThan(0);
    expect(baseResult.watts).toBeGreaterThan(0);
    expect(baseResult.btu).toBeGreaterThan(0);
  });

  it('scales chiller tonnage proportionally when heat gain sensitivity increases', () => {
    const baseResult = MechanicalCoolingEngine.calculateCoolingLoad(baseInput);

    // 1.50x sensitivity applied to envelope, solar, and internal heat gains
    const factor = 1.50;
    const stressedInput: CoolingLoadInput = {
      ...baseInput,
      lightingWpm2: baseInput.lightingWpm2 * factor,
      equipmentWatts: baseInput.equipmentWatts * factor,
      wallUValue: baseInput.wallUValue * factor,
      roofUValue: baseInput.roofUValue * factor,
      windowUValue: baseInput.windowUValue * factor,
      windowShgc: Math.min(0.95, baseInput.windowShgc * factor)
    };

    const stressedResult = MechanicalCoolingEngine.calculateCoolingLoad(stressedInput);

    expect(stressedResult.tons).toBeGreaterThan(baseResult.tons);
    expect(stressedResult.watts).toBeGreaterThan(baseResult.watts);
    expect(stressedResult.wallSensible).toBeCloseTo(baseResult.wallSensible * factor, 1);
    expect(stressedResult.roofSensible).toBeCloseTo(baseResult.roofSensible * factor, 1);
    expect(stressedResult.windowCondSensible).toBeCloseTo(baseResult.windowCondSensible * factor, 1);
    expect(stressedResult.solarSensible).toBeCloseTo(baseResult.solarSensible * factor, 1);
  });

  it('reduces chiller tonnage when heat gain sensitivity decreases (efficient envelope)', () => {
    const baseResult = MechanicalCoolingEngine.calculateCoolingLoad(baseInput);

    // 0.75x sensitivity (high-efficiency envelope & LED)
    const factor = 0.75;
    const efficientInput: CoolingLoadInput = {
      ...baseInput,
      lightingWpm2: baseInput.lightingWpm2 * factor,
      equipmentWatts: baseInput.equipmentWatts * factor,
      wallUValue: baseInput.wallUValue * factor,
      roofUValue: baseInput.roofUValue * factor,
      windowUValue: baseInput.windowUValue * factor,
      windowShgc: baseInput.windowShgc * factor
    };

    const efficientResult = MechanicalCoolingEngine.calculateCoolingLoad(efficientInput);

    expect(efficientResult.tons).toBeLessThan(baseResult.tons);
    expect(efficientResult.watts).toBeLessThan(baseResult.watts);
  });

  it('preserves people and ventilation sensible loads while adjusting thermal coefficients', () => {
    const baseResult = MechanicalCoolingEngine.calculateCoolingLoad(baseInput);

    const factor = 1.30;
    const modifiedInput: CoolingLoadInput = {
      ...baseInput,
      wallUValue: baseInput.wallUValue * factor,
      roofUValue: baseInput.roofUValue * factor,
      windowUValue: baseInput.windowUValue * factor
    };

    const modResult = MechanicalCoolingEngine.calculateCoolingLoad(modifiedInput);

    // People sensible load (P * Qs) should remain invariant
    expect(modResult.peopleSensible).toBe(baseResult.peopleSensible);
    expect(modResult.peopleLatent).toBe(baseResult.peopleLatent);
    // Ventilation sensible load depends on vent rate and air props, unaffected by envelope U-values
    expect(modResult.ventSensible).toBe(baseResult.ventSensible);
    // Wall and roof loads should increase by factor
    expect(modResult.wallSensible).toBeGreaterThan(baseResult.wallSensible);
    expect(modResult.roofSensible).toBeGreaterThan(baseResult.roofSensible);
  });
});
