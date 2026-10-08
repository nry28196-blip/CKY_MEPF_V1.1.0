export type BuildingType = 'Commercial' | 'Residential' | 'Healthcare' | 'Industrial';

export interface AshraeBuildingLimits {
  wallUValueMax: number; // W/(m²·K)
  roofUValueMax: number; // W/(m²·K)
  windowUValueMax: number; // W/(m²·K)
  windowShgcMax: number; // Solar Heat Gain Coefficient
  lightingWpm2Max: number; // W/m²
  equipmentWattsPerM2Max: number; // W/m² equivalent
  heatGainSensitivityMax: number; // Factor multiplier
  heatGainSensitivityMin: number;
  indoorTempMin: number; // °C
  indoorTempMax: number; // °C
  minAreaPerPerson: number; // m²/person
}

export const ASHRAE_BUILDING_LIMITS: Record<BuildingType, AshraeBuildingLimits> = {
  Commercial: {
    wallUValueMax: 2.20,
    roofUValueMax: 0.70,
    windowUValueMax: 3.20,
    windowShgcMax: 0.45,
    lightingWpm2Max: 14.0,
    equipmentWattsPerM2Max: 25.0,
    heatGainSensitivityMax: 1.40,
    heatGainSensitivityMin: 0.60,
    indoorTempMin: 21.0,
    indoorTempMax: 26.0,
    minAreaPerPerson: 8.0
  },
  Residential: {
    wallUValueMax: 1.80,
    roofUValueMax: 0.50,
    windowUValueMax: 2.80,
    windowShgcMax: 0.40,
    lightingWpm2Max: 9.0,
    equipmentWattsPerM2Max: 15.0,
    heatGainSensitivityMax: 1.35,
    heatGainSensitivityMin: 0.65,
    indoorTempMin: 20.0,
    indoorTempMax: 25.5,
    minAreaPerPerson: 20.0
  },
  Healthcare: {
    wallUValueMax: 1.60,
    roofUValueMax: 0.45,
    windowUValueMax: 2.60,
    windowShgcMax: 0.38,
    lightingWpm2Max: 18.0,
    equipmentWattsPerM2Max: 35.0,
    heatGainSensitivityMax: 1.45,
    heatGainSensitivityMin: 0.70,
    indoorTempMin: 20.0,
    indoorTempMax: 24.5,
    minAreaPerPerson: 10.0
  },
  Industrial: {
    wallUValueMax: 3.20,
    roofUValueMax: 1.20,
    windowUValueMax: 4.50,
    windowShgcMax: 0.65,
    lightingWpm2Max: 22.0,
    equipmentWattsPerM2Max: 60.0,
    heatGainSensitivityMax: 1.75,
    heatGainSensitivityMin: 0.50,
    indoorTempMin: 18.0,
    indoorTempMax: 28.0,
    minAreaPerPerson: 30.0
  }
};

export interface AshraeValidationViolation {
  id: string; // Deterministic key for duplicate tracking
  parameter: string;
  field: string;
  currentValue: number;
  unit: string;
  allowedLimit: number;
  allowedRange: string;
  buildingType: BuildingType;
  standardReference: string;
  message: string;
  severity: 'warning' | 'error';
  recommendedValue: number;
}

export interface CoolingValidationParams {
  buildingType: BuildingType;
  heatGainSensitivity: number;
  wallUValue: number;
  roofUValue: number;
  windowUValue: number;
  windowShgc: number;
  lightingWpm2: number;
  equipmentWatts: number;
  indoorTemp: number;
  area: number | '';
  occupants: number | '';
}

export class CoolingAshraeDesignValidator {
  /**
   * Validates cooling input parameters against ASHRAE design ranges for the selected building type
   */
  static validate(params: CoolingValidationParams): AshraeValidationViolation[] {
    const violations: AshraeValidationViolation[] = [];
    const limits = ASHRAE_BUILDING_LIMITS[params.buildingType] || ASHRAE_BUILDING_LIMITS.Commercial;

    // 1. Effective Wall U-Value (including sensitivity)
    const effectiveWallU = params.wallUValue * params.heatGainSensitivity;
    if (effectiveWallU > limits.wallUValueMax) {
      violations.push({
        id: `wall-u-${params.buildingType}-${effectiveWallU.toFixed(2)}`,
        parameter: 'Wall U-Value',
        field: 'wallUValue',
        currentValue: Number(effectiveWallU.toFixed(2)),
        unit: 'W/(m²·K)',
        allowedLimit: limits.wallUValueMax,
        allowedRange: `≤ ${limits.wallUValueMax} W/(m²·K)`,
        buildingType: params.buildingType,
        standardReference: 'ASHRAE 90.1 Table 5.5 (Envelope)',
        message: `${params.buildingType} wall heat transmission (${effectiveWallU.toFixed(2)} W/m²·K) exceeds standard envelope limit (${limits.wallUValueMax} W/m²·K max).`,
        severity: 'warning',
        recommendedValue: limits.wallUValueMax
      });
    }

    // 2. Effective Roof U-Value
    const effectiveRoofU = params.roofUValue * params.heatGainSensitivity;
    if (effectiveRoofU > limits.roofUValueMax) {
      violations.push({
        id: `roof-u-${params.buildingType}-${effectiveRoofU.toFixed(2)}`,
        parameter: 'Roof U-Value',
        field: 'roofUValue',
        currentValue: Number(effectiveRoofU.toFixed(2)),
        unit: 'W/(m²·K)',
        allowedLimit: limits.roofUValueMax,
        allowedRange: `≤ ${limits.roofUValueMax} W/(m²·K)`,
        buildingType: params.buildingType,
        standardReference: 'ASHRAE 90.1 Table 5.5 (Roof)',
        message: `${params.buildingType} roof heat transmission (${effectiveRoofU.toFixed(2)} W/m²·K) exceeds standard code limit (${limits.roofUValueMax} W/m²·K max).`,
        severity: 'warning',
        recommendedValue: limits.roofUValueMax
      });
    }

    // 3. Effective Solar Heat Gain Coefficient (SHGC)
    const effectiveShgc = Math.min(1.0, params.windowShgc * params.heatGainSensitivity);
    if (effectiveShgc > limits.windowShgcMax) {
      violations.push({
        id: `window-shgc-${params.buildingType}-${effectiveShgc.toFixed(2)}`,
        parameter: 'Solar SHGC',
        field: 'windowShgc',
        currentValue: Number(effectiveShgc.toFixed(2)),
        unit: '',
        allowedLimit: limits.windowShgcMax,
        allowedRange: `≤ ${limits.windowShgcMax}`,
        buildingType: params.buildingType,
        standardReference: 'ASHRAE 90.1 Section 5.5.4 (Fenestration)',
        message: `${params.buildingType} solar heat gain coefficient (${effectiveShgc.toFixed(2)}) exceeds standard fenestration limit (${limits.windowShgcMax} max).`,
        severity: 'warning',
        recommendedValue: limits.windowShgcMax
      });
    }

    // 4. Effective Lighting Power Density (W/m²)
    const effectiveLighting = params.lightingWpm2 * params.heatGainSensitivity;
    if (effectiveLighting > limits.lightingWpm2Max) {
      violations.push({
        id: `lighting-wpm2-${params.buildingType}-${effectiveLighting.toFixed(1)}`,
        parameter: 'Lighting Power Density',
        field: 'lightingWpm2',
        currentValue: Number(effectiveLighting.toFixed(1)),
        unit: 'W/m²',
        allowedLimit: limits.lightingWpm2Max,
        allowedRange: `≤ ${limits.lightingWpm2Max} W/m²`,
        buildingType: params.buildingType,
        standardReference: 'ASHRAE 90.1 Table 9.6.1 (Lighting)',
        message: `${params.buildingType} lighting power (${effectiveLighting.toFixed(1)} W/m²) exceeds code allowance (${limits.lightingWpm2Max} W/m² max).`,
        severity: 'warning',
        recommendedValue: limits.lightingWpm2Max
      });
    }

    // 5. Heat Gain Sensitivity Multiplier Factor
    if (params.heatGainSensitivity > limits.heatGainSensitivityMax) {
      violations.push({
        id: `sensitivity-high-${params.buildingType}-${params.heatGainSensitivity.toFixed(2)}`,
        parameter: 'Sensitivity Factor',
        field: 'heatGainSensitivity',
        currentValue: Number(params.heatGainSensitivity.toFixed(2)),
        unit: '×',
        allowedLimit: limits.heatGainSensitivityMax,
        allowedRange: `≤ ${limits.heatGainSensitivityMax}×`,
        buildingType: params.buildingType,
        standardReference: 'ASHRAE Fundamentals Ch. 18',
        message: `Heat gain sensitivity (${params.heatGainSensitivity.toFixed(2)}×) exceeds typical ${params.buildingType} design boundary (${limits.heatGainSensitivityMax}× max).`,
        severity: 'warning',
        recommendedValue: 1.00
      });
    }

    // 6. Indoor Temperature Comfort (ASHRAE 55)
    if (params.indoorTemp < limits.indoorTempMin || params.indoorTemp > limits.indoorTempMax) {
      violations.push({
        id: `indoor-temp-${params.indoorTemp}`,
        parameter: 'Indoor Design Temperature',
        field: 'indoorTemp',
        currentValue: params.indoorTemp,
        unit: '°C',
        allowedLimit: limits.indoorTempMax,
        allowedRange: `${limits.indoorTempMin}°C – ${limits.indoorTempMax}°C`,
        buildingType: params.buildingType,
        standardReference: 'ANSI/ASHRAE Standard 55 (Thermal Comfort)',
        message: `Indoor temperature (${params.indoorTemp}°C) falls outside ASHRAE 55 comfort boundary (${limits.indoorTempMin}°C – ${limits.indoorTempMax}°C).`,
        severity: 'warning',
        recommendedValue: params.indoorTemp > limits.indoorTempMax ? limits.indoorTempMax : limits.indoorTempMin
      });
    }

    // 7. Occupant Space Density (Area per Person)
    if (typeof params.area === 'number' && typeof params.occupants === 'number' && params.occupants > 0 && params.area > 0) {
      const areaPerPerson = params.area / params.occupants;
      if (areaPerPerson < limits.minAreaPerPerson) {
        violations.push({
          id: `occupant-density-${params.buildingType}-${areaPerPerson.toFixed(1)}`,
          parameter: 'Occupant Area Density',
          field: 'occupants',
          currentValue: Number(areaPerPerson.toFixed(1)),
          unit: 'm²/person',
          allowedLimit: limits.minAreaPerPerson,
          allowedRange: `≥ ${limits.minAreaPerPerson} m²/person`,
          buildingType: params.buildingType,
          standardReference: 'ASHRAE 62.1 Table 6.1 (Occupancy)',
          message: `${params.buildingType} occupant density (${areaPerPerson.toFixed(1)} m²/person) exceeds standard occupancy threshold (minimum ${limits.minAreaPerPerson} m²/person).`,
          severity: 'warning',
          recommendedValue: Math.floor(params.area / limits.minAreaPerPerson)
        });
      }
    }

    return violations;
  }
}
