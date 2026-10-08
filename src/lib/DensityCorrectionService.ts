import { ValidationStatus } from '../calculations/ventilation/VentilationValidationService';
import { AuditTrailItem } from '../calculations/ventilation/Ashrae621ZoneService';

export interface DensityInput {
  /**
   * Outdoor-air intake elevation above sea level at the center of the outdoor-air intake louver (m)
   */
  elevation: number | null;
  elevationDescription?: string;
  /**
   * Outdoor-air design temperature (°C)
   */
  temperature: number | null;
  /**
   * Outdoor-air design humidity ratio (kg water / kg dry air)
   */
  humidityRatio?: number | null;
  /**
   * Relative humidity (%, 0-100). Used to derive humidity ratio if humidityRatio is omitted.
   */
  relativeHumidity?: number | null;
  edition?: '2019' | '2022' | '2025';
  /**
   * Explicit method selection: 'TABLE' (Table 6-5) or 'ANALYTICAL' (Normative Appendix D)
   */
  method?: 'TABLE' | 'ANALYTICAL';
  /**
   * Whether to apply standard-permitted simplifications:
   * CT = 1.0 when T < 40°C
   * CW = 1.0 when W < 0.024 kg/kg
   */
  applyStandardSimplifications?: boolean;
  /**
   * Specific analytical equation preference: 'D-4' (Cz * CT * CW) or 'D-5b' (1.2 / rho)
   */
  analyticalEquation?: 'D-4' | 'D-5b';
}

export interface DensityResult {
  elevation: number;
  temperature: number;
  relativeHumidity: number;
  humidityRatioKgKg: number;
  pressureAtm: number; // kPa
  density: number; // kg/m³
  cz: number;
  ct: number;
  cw: number;
  eRho: number; // Ep factor
  eRhoEqD4: number; // Cz * CT * CW (Normative Appendix D Eq D-4)
  eRhoEqD5b: number; // 1.2 / rho (Section D2.3 alternative density calculation)
  methodUsed: 'TABLE' | 'ANALYTICAL';
  simplificationsApplied?: {
    ctSimplified: boolean;
    cwSimplified: boolean;
  };
  tableReference: string;
  status: ValidationStatus;
  message?: string;
  auditTrail: AuditTrailItem[];
}

export class DensityCorrectionService {
  static STANDARD_PRESSURE_KPA = 101.3;
  static STANDARD_TEMP_C = 21.0;
  static R_DRY_AIR_KJ = 0.287058;
  static STANDARD_DENSITY = 1.2; // kg/m³, dry air at 21°C, 101.3 kPa per ASHRAE 62.1 Addendum j

  /**
   * Table 6-5 Air-Density Factor (Ep) Mapping
   * Outdoor-air intake elevation ranges and factors.
   */
  static getTableERho(elevation: number): number | null {
    if (elevation <= 158) return 1.00;
    if (elevation <= 566) return 1.05;
    if (elevation <= 951) return 1.10;
    if (elevation <= 1317) return 1.15;
    if (elevation <= 1664) return 1.20;
    if (elevation <= 1994) return 1.25;
    if (elevation <= 2309) return 1.30;
    if (elevation <= 2609) return 1.35;
    if (elevation <= 2897) return 1.40;
    if (elevation <= 3173) return 1.45;
    if (elevation <= 3437) return 1.50;
    return null; // Above 3437 m requires Normative Appendix D analytical method
  }

  /**
   * Calculates outdoor air pressure in kPa at elevation Z (m) using ISA standard atmosphere.
   */
  static calculatePressure(elevationM: number): number {
    return this.STANDARD_PRESSURE_KPA * Math.pow(1 - 2.25577e-5 * elevationM, 5.2559);
  }

  /**
   * Calculates saturation vapor pressure in kPa at temperature T (°C).
   */
  static calculatePsat(temperatureC: number): number {
    if (temperatureC >= 0) {
      return 0.61078 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
    } else {
      return 0.61078 * Math.exp((21.875 * temperatureC) / (temperatureC + 265.5));
    }
  }

  /**
   * Calculates moisture ratio W (kg_water / kg_dry_air) from temperature and relative humidity.
   */
  static calculateHumidityRatio(temperatureC: number, rhPercent: number, pressureKpa: number): number {
    if (rhPercent <= 0) return 0;
    const psat = this.calculatePsat(temperatureC);
    const rhFraction = Math.max(0, Math.min(100, rhPercent)) / 100;
    const pv = rhFraction * psat;
    const pd = pressureKpa - pv;
    if (pd <= 0) return 0;
    return 0.621945 * (pv / pd);
  }

  /**
   * Main calculation entry point for ASHRAE 62.1-2022 Air Density Correction Factor (Ep).
   */
  static calculate(input: DensityInput | null): DensityResult {
    const auditTrail: AuditTrailItem[] = [];
    
    let elevation = 0;
    let temperature = 21.0;
    let rh = 0;
    let status: ValidationStatus = 'PASS';
    let message: string | undefined = undefined;

    if (!input || input.elevation === null || input.elevation === undefined || input.temperature === null || input.temperature === undefined) {
      status = 'INCOMPLETE';
      message = 'Missing outdoor-air intake elevation or design temperature';
      auditTrail.push({
        symbol: 'Assumed Data',
        name: 'Missing Density Inputs',
        formula: 'Default to Sea Level (0 m), 21°C',
        inputs: {},
        result: 'INCOMPLETE',
        unit: '',
        reference: 'Missing site intake elevation or design temperature'
      });
    } else if (isNaN(input.elevation) || isNaN(input.temperature) || !isFinite(input.temperature) || input.temperature <= -273.15) {
      status = 'FAIL';
      message = 'Invalid outdoor-air temperature or elevation';
      auditTrail.push({
        symbol: 'T',
        name: 'Invalid Temperature or Elevation',
        formula: 'T(K) > 0',
        inputs: { 'T (°C)': input.temperature, 'Z (m)': input.elevation },
        result: 'FAIL',
        unit: '',
        reference: 'Invalid numeric input'
      });
      return {
        elevation: input.elevation || 0,
        temperature: input.temperature || 0,
        relativeHumidity: 0,
        pressureAtm: 0,
        density: 0,
        humidityRatioKgKg: 0,
        cz: 1.0,
        ct: 1.0,
        cw: 1.0,
        eRho: 1.0,
        eRhoEqD4: 1.0,
        eRhoEqD5b: 1.0,
        methodUsed: input.method || 'TABLE',
        tableReference: 'ASHRAE 62.1-2022 Table 6-5',
        status,
        message,
        auditTrail
      };
    } else if (!isFinite(input.elevation)) {
      status = 'FAIL';
      message = 'Invalid outdoor-air intake elevation';
      auditTrail.push({
        symbol: 'Z',
        name: 'Invalid Elevation',
        formula: 'Z must be finite',
        inputs: { 'Z (m)': input.elevation },
        result: 'FAIL',
        unit: '',
        reference: 'Validation'
      });
      return {
        elevation: input.elevation,
        temperature: input.temperature,
        relativeHumidity: 0,
        pressureAtm: 0,
        density: 0,
        humidityRatioKgKg: 0,
        cz: 1.0,
        ct: 1.0,
        cw: 1.0,
        eRho: 1.0,
        eRhoEqD4: 1.0,
        eRhoEqD5b: 1.0,
        methodUsed: input.method || 'TABLE',
        tableReference: 'ASHRAE 62.1-2022 Table 6-5',
        status,
        message,
        auditTrail
      };
    } else {
      elevation = input.elevation;
      temperature = input.temperature;
      rh = input.relativeHumidity && !isNaN(input.relativeHumidity) ? input.relativeHumidity : 0;
    }

    const method = input?.method || 'TABLE';
    const applySimplifications = input?.applyStandardSimplifications === true;

    // Atmospheric barometric pressure
    const pressureAtm = this.calculatePressure(elevation);
    const tKelvin = temperature + 273.15;
    const psat = this.calculatePsat(temperature);
    const rDryAir = 0.287058; // kJ/(kg·K)

    // Determine design humidity ratio W and compute moisture state consistently
    let humidityRatioKgKg = 0;
    let dryAirDensity = 0;

    const hasExplicitW = input?.humidityRatio !== undefined && input?.humidityRatio !== null && !isNaN(input.humidityRatio);
    const hasExplicitRH = input?.relativeHumidity !== undefined && input?.relativeHumidity !== null && !isNaN(input.relativeHumidity);

    if (hasExplicitW) {
      // Explicit humidityRatio is authoritative moisture input
      humidityRatioKgKg = input!.humidityRatio!;
      const pv = (humidityRatioKgKg / (0.621945 + humidityRatioKgKg)) * pressureAtm;
      const pd = Math.max(0, pressureAtm - pv);
      dryAirDensity = pd / (rDryAir * tKelvin);
      rh = psat > 0 ? Math.min(100, Math.max(0, (pv / psat) * 100)) : 0;
    } else if (hasExplicitRH) {
      // Derive humidityRatio from RH, temperature, and atmospheric pressure
      rh = input!.relativeHumidity!;
      humidityRatioKgKg = this.calculateHumidityRatio(temperature, rh, pressureAtm);
      const rhFraction = Math.max(0, Math.min(100, rh)) / 100;
      const pv = rhFraction * psat;
      const pd = Math.max(0, pressureAtm - pv);
      dryAirDensity = pd / (rDryAir * tKelvin);
    } else {
      // Missing analytical moisture: do not silently assume W = 0 without explicit notification
      if (method === 'ANALYTICAL') {
        status = 'INCOMPLETE';
        message = 'Missing outdoor-air moisture input (humidityRatio or relativeHumidity) for Normative Appendix D analytical calculation.';
        auditTrail.push({
          symbol: 'W / RH',
          name: 'Missing Analytical Moisture Input',
          formula: 'Appendix D requires explicit moisture input (humidityRatio or relativeHumidity)',
          inputs: {},
          result: 'INCOMPLETE',
          unit: '',
          reference: 'ASHRAE 62.1-2022 Section D2.2'
        });
      }
      humidityRatioKgKg = 0;
      rh = 0;
      dryAirDensity = pressureAtm / (rDryAir * tKelvin);
    }

    // Analytical factors (Normative Appendix D)
    // Eq D-1b (SI units): Cz = 1 / (1 - Z * 2.25577 * 10^-5)^5.2559
    const cz = 1 / Math.pow(1 - elevation * 2.25577e-5, 5.2559);

    // Eq D-2: CT = (T + 273.15) / 294.15
    // Section D1.3.1: CT may be taken as 1.0 where design temperature T < 40°C
    let ct = (temperature + 273.15) / 294.15;
    let ctSimplified = false;
    if (applySimplifications && temperature < 40.0) {
      ct = 1.0;
      ctSimplified = true;
    }

    // Eq D-3: CW = (1 + W) / (1 + 1.6078 * W)
    // Section D1.4.1: CW may be taken as 1.0 where design humidity ratio W < 0.024 kg/kg
    let cw = (1 + humidityRatioKgKg) / (1 + 1.6078 * humidityRatioKgKg);
    let cwSimplified = false;
    if (applySimplifications && humidityRatioKgKg < 0.024) {
      cw = 1.0;
      cwSimplified = true;
    }

    // Eq D-4: Ep = Cz * CT * CW
    const eRhoEqD4 = cz * ct * cw;
    // Section D2.3: Ep = 1.2 / rho
    const eRhoEqD5b = dryAirDensity > 0 ? (this.STANDARD_DENSITY / dryAirDensity) : eRhoEqD4;

    let analyticalEp: number;
    if (input?.analyticalEquation === 'D-4') {
      analyticalEp = eRhoEqD4;
    } else if (input?.analyticalEquation === 'D-5b') {
      analyticalEp = eRhoEqD5b;
    } else if (applySimplifications) {
      analyticalEp = eRhoEqD4;
    } else {
      analyticalEp = eRhoEqD5b;
    }

    let eRho = 1.0;

    if (method === 'TABLE') {
      const tableERho = this.getTableERho(elevation);
      if (tableERho !== null) {
        eRho = tableERho;
        auditTrail.push({
          symbol: 'Z',
          name: 'Outdoor-Air Intake Elevation',
          formula: 'Intake louver center above sea level',
          inputs: { 'Z': elevation },
          result: elevation,
          unit: 'm',
          reference: 'ASHRAE 62.1-2022 Table 6-5'
        });
        auditTrail.push({
          symbol: 'Ep',
          name: 'Air-Density Factor (Table 6-5)',
          formula: 'Table 6-5 Lookup by Intake Elevation',
          inputs: { 'Outdoor-air intake elevation (m)': elevation },
          result: eRho,
          unit: '',
          reference: 'ASHRAE 62.1-2022 Table 6-5'
        });
      } else {
        // Elevations above 3437 m require Normative Appendix D analytical method
        // In TABLE mode, record Table Limit fallback and use Normative Appendix D analytical value
        eRho = analyticalEp;
        auditTrail.push({
          symbol: 'Table Limit',
          name: 'Elevation above Table 6-5 (Z > 3437 m)',
          formula: 'Z > 3437 m requires Normative Appendix D (Fallback to Analytical)',
          inputs: { 'Z (m)': elevation },
          result: eRho,
          unit: '',
          reference: 'ASHRAE 62.1-2022 Table 6-5 Footnote / Normative Appendix D'
        });
      }
    } else {
      // Normative Appendix D Analytical Method
      eRho = analyticalEp;

      auditTrail.push({
        symbol: 'Cz',
        name: 'Altitude Factor (Eq D-1b)',
        formula: '1 / (1 - Z × 2.25577×10⁻⁵)⁵·²⁵⁵⁹',
        inputs: { 'Z (m)': elevation },
        result: cz,
        unit: '',
        reference: 'ASHRAE 62.1-2022 Normative Appendix D (Eq D-1b)'
      });

      auditTrail.push({
        symbol: 'CT',
        name: 'Temperature Factor (Eq D-2)',
        formula: ctSimplified ? '1.0 (Permitted simplification for T < 40°C)' : '(T + 273.15) / 294.15',
        inputs: { 'T (°C)': temperature },
        result: ct,
        unit: '',
        reference: 'ASHRAE 62.1-2022 Normative Appendix D (Eq D-2 / Section D.1)'
      });

      auditTrail.push({
        symbol: 'CW',
        name: 'Moisture Factor (Eq D-3)',
        formula: cwSimplified ? '1.0 (Permitted simplification for W < 0.024 kg/kg)' : '(1 + W) / (1 + 1.6078 × W)',
        inputs: { 'W (kg/kg)': humidityRatioKgKg },
        result: cw,
        unit: '',
        reference: 'ASHRAE 62.1-2022 Normative Appendix D (Eq D-3 / Section D.1)'
      });

      if (input?.analyticalEquation === 'D-5b') {
        auditTrail.push({
          symbol: 'Ep',
          name: 'Air-Density Factor (Analytical Section D2.3)',
          formula: '1.2 / ρ',
          inputs: { 'ρ_standard': this.STANDARD_DENSITY, 'ρ_actual': dryAirDensity },
          result: eRho,
          unit: '',
          reference: 'ASHRAE 62.1-2022 Normative Appendix D (Section D2.3)'
        });
      } else {
        auditTrail.push({
          symbol: 'Ep',
          name: 'Air-Density Factor (Analytical)',
          formula: 'Cz × CT × CW',
          inputs: { 'Cz': cz, 'CT': ct, 'CW': cw },
          result: eRho,
          unit: '',
          reference: 'ASHRAE 62.1-2022 Normative Appendix D (Eq D-4)'
        });
      }
    }

    return {
      elevation,
      temperature,
      relativeHumidity: rh,
      humidityRatioKgKg,
      pressureAtm,
      density: dryAirDensity,
      cz,
      ct,
      cw,
      eRho,
      eRhoEqD4,
      eRhoEqD5b,
      methodUsed: method,
      simplificationsApplied: {
        ctSimplified,
        cwSimplified
      },
      tableReference: method === 'TABLE' ? 'ASHRAE 62.1-2022 Table 6-5' : 'ASHRAE 62.1-2022 Normative Appendix D',
      status,
      message,
      auditTrail
    };
  }

  static getAirProperties(elevationM: number, temperatureC: number, relativeHumidity: number = 0) {
    const res = this.calculate({
      elevation: elevationM,
      temperature: temperatureC,
      relativeHumidity: relativeHumidity,
      method: 'ANALYTICAL',
      applyStandardSimplifications: false
    });
    
    return {
      elevationM: res.elevation,
      temperatureC: res.temperature,
      relativeHumidity: res.relativeHumidity,
      humidityRatioKgKg: res.humidityRatioKgKg,
      pressurePa: res.pressureAtm * 1000,
      densityKgM3: res.density,
      densityRatio: res.eRho,
      standardDensityKgM3: this.STANDARD_DENSITY
    };
  }
}
