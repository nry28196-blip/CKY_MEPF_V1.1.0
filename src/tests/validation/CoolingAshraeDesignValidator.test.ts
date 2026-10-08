import { describe, it, expect } from 'vitest';
import {
  CoolingAshraeDesignValidator,
  CoolingValidationParams,
  ASHRAE_BUILDING_LIMITS
} from '../../validation/CoolingAshraeDesignValidator';

describe('CoolingAshraeDesignValidator', () => {
  const standardCommercialParams: CoolingValidationParams = {
    buildingType: 'Commercial',
    heatGainSensitivity: 1.0,
    wallUValue: 1.8,
    roofUValue: 0.45,
    windowUValue: 2.8,
    windowShgc: 0.35,
    lightingWpm2: 11.0,
    equipmentWatts: 500,
    indoorTemp: 24.0,
    area: 100,
    occupants: 8 // 12.5 m2/person > 8.0 min
  };

  it('passes validation when all parameters are compliant with ASHRAE standards', () => {
    const violations = CoolingAshraeDesignValidator.validate(standardCommercialParams);
    expect(violations.length).toBe(0);
  });

  it('detects wall U-value violation when envelope exceeds ASHRAE 90.1 commercial limit', () => {
    const nonCompliant = {
      ...standardCommercialParams,
      wallUValue: 2.8 // > 2.20 max
    };
    const violations = CoolingAshraeDesignValidator.validate(nonCompliant);
    const wallViolation = violations.find(v => v.field === 'wallUValue');
    expect(wallViolation).toBeDefined();
    expect(wallViolation?.severity).toBe('warning');
    expect(wallViolation?.standardReference).toContain('ASHRAE 90.1');
    expect(wallViolation?.recommendedValue).toBe(ASHRAE_BUILDING_LIMITS.Commercial.wallUValueMax);
  });

  it('detects solar SHGC violation when fenestration exceeds ASHRAE limit', () => {
    const nonCompliant = {
      ...standardCommercialParams,
      windowShgc: 0.65 // > 0.45 max
    };
    const violations = CoolingAshraeDesignValidator.validate(nonCompliant);
    const shgcViolation = violations.find(v => v.field === 'windowShgc');
    expect(shgcViolation).toBeDefined();
    expect(shgcViolation?.allowedLimit).toBe(0.45);
  });

  it('detects lighting power density exceedance based on building type allowance', () => {
    // 16 W/m2 is compliant for Healthcare/Industrial, but exceeds Commercial (14 W/m2) and Residential (9 W/m2)
    const commViolations = CoolingAshraeDesignValidator.validate({
      ...standardCommercialParams,
      buildingType: 'Commercial',
      lightingWpm2: 16.0
    });
    expect(commViolations.some(v => v.field === 'lightingWpm2')).toBe(true);

    const indViolations = CoolingAshraeDesignValidator.validate({
      ...standardCommercialParams,
      buildingType: 'Industrial',
      lightingWpm2: 16.0 // Industrial limit is 22 W/m2
    });
    expect(indViolations.some(v => v.field === 'lightingWpm2')).toBe(false);
  });

  it('triggers violation when heat gain sensitivity factor exceeds typical design regime', () => {
    const highSensitivity = {
      ...standardCommercialParams,
      heatGainSensitivity: 1.65 // Commercial max is 1.40
    };
    const violations = CoolingAshraeDesignValidator.validate(highSensitivity);
    expect(violations.some(v => v.field === 'heatGainSensitivity')).toBe(true);
  });

  it('triggers comfort violation when indoor temperature falls outside ASHRAE 55 boundary', () => {
    const tooCold = {
      ...standardCommercialParams,
      indoorTemp: 18.0 // < 21.0 C for Commercial
    };
    const violationsCold = CoolingAshraeDesignValidator.validate(tooCold);
    expect(violationsCold.some(v => v.field === 'indoorTemp')).toBe(true);

    const tooHot = {
      ...standardCommercialParams,
      indoorTemp: 28.5 // > 26.0 C for Commercial
    };
    const violationsHot = CoolingAshraeDesignValidator.validate(tooHot);
    expect(violationsHot.some(v => v.field === 'indoorTemp')).toBe(true);
  });

  it('triggers occupant density violation when area per person is under ASHRAE 62.1 minimum', () => {
    const overcrowded = {
      ...standardCommercialParams,
      area: 50,
      occupants: 15 // 3.33 m2/person < 8.0 m2/person
    };
    const violations = CoolingAshraeDesignValidator.validate(overcrowded);
    expect(violations.some(v => v.field === 'occupants')).toBe(true);
  });

  it('validates stricter Healthcare limits appropriately', () => {
    // 1.70 W/m2K wall U-value is OK for Commercial (max 2.2) and Industrial (max 3.2), but exceeds Healthcare (max 1.6)
    const healthcareViolations = CoolingAshraeDesignValidator.validate({
      ...standardCommercialParams,
      buildingType: 'Healthcare',
      wallUValue: 1.70
    });
    expect(healthcareViolations.some(v => v.field === 'wallUValue')).toBe(true);
  });
});
