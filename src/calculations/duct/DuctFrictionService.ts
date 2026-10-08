import { UnitConversionService } from '../../lib/UnitConversionService';

export interface DuctFrictionInput {
  airflow: number; // L/s or CFM
  width?: number; // mm or inches
  height?: number; // mm or inches
  diameter?: number; // mm or inches
  length: number; // m or ft
  roughness: number; // mm or ft (e.g. 0.09mm for galv steel)
  density: number; // kg/m3 or lb/ft3
  isMetric: boolean;
}

export interface DuctFrictionResult {
  velocity: number; // m/s or fpm
  hydraulicDiameter: number; // mm or inches
  frictionFactor: number;
  pressureDrop: number; // Pa or in.wg
  velocityPressure: number; // Pa or in.wg
}

export class DuctFrictionService {
  /**
   * Calculates straight duct friction using Darcy-Weisbach and Colebrook-White.
   */
  static calculateFriction(input: DuctFrictionInput): DuctFrictionResult {
    const { airflow, width, height, diameter, length, roughness, density, isMetric } = input;
    
    // 1. Convert everything to SI for internal calculation
    // Airflow: m3/s
    const q_m3s = isMetric ? (airflow / 1000) : UnitConversionService.cfmToM3s(airflow);
    
    // Dimensions: m
    let dh_m = 0; // Hydraulic diameter
    let area_m2 = 0;
    
    if (diameter) {
      const d_m = isMetric ? (diameter / 1000) : UnitConversionService.inToM(diameter);
      dh_m = d_m;
      area_m2 = Math.PI * Math.pow(d_m, 2) / 4;
    } else if (width && height) {
      const w_m = isMetric ? (width / 1000) : UnitConversionService.inToM(width);
      const h_m = isMetric ? (height / 1000) : UnitConversionService.inToM(height);
      
      area_m2 = w_m * h_m;
      const perimeter_m = 2 * (w_m + h_m);
      
      // Equivalent diameter by hydraulic diameter (Dh = 4A/P)
      dh_m = (4 * area_m2) / perimeter_m;
      
      // Alternatively, ASHRAE equivalent round diameter for friction De = 1.3 * (w*h)^0.625 / (w+h)^0.25
      // We will use standard Hydraulic Diameter for Colebrook consistency, but De is often used. 
      // Let's use the explicit ASHRAE De for rectangular ducts if preferred, but Dh is strictly physically true for D-W.
      // We'll stick to Dh = 4A/P.
    }
    
    // Length: m
    const L_m = isMetric ? length : UnitConversionService.ftToM(length);
    
    // Roughness: m
    const e_m = isMetric ? (roughness / 1000) : UnitConversionService.ftToM(roughness); // ft to m
    
    // Density: kg/m3
    const rho = isMetric ? density : UnitConversionService.lbFt3ToKgM3(density);
    
    // Dynamic Viscosity (mu) of air at approx 20C
    const mu = 1.81e-5; // kg/(m*s)
    
    // 2. Calculate Velocity
    const v_ms = area_m2 > 0 ? q_m3s / area_m2 : 0;
    
    // Velocity Pressure (Pv = 0.5 * rho * v^2)
    const pv_Pa = 0.5 * rho * Math.pow(v_ms, 2);
    
    // 3. Reynolds Number
    const Re = (rho * v_ms * dh_m) / mu;
    
    // 4. Colebrook-White Friction Factor (f)
    // 1/sqrt(f) = -2 * log10( (e/Dh)/3.7 + 2.51 / (Re * sqrt(f)) )
    // Approximation via Haaland equation for faster explicit calculation:
    // 1/sqrt(f) = -1.8 * log10( ( (e/Dh)/3.7 )^1.11 + 6.9/Re )
    
    let f = 0.02; // default if Re is 0
    if (Re > 0 && dh_m > 0) {
      if (Re < 2300) {
        // Laminar
        f = 64 / Re;
      } else {
        // Turbulent (Haaland approximation)
        const term1 = Math.pow((e_m / dh_m) / 3.7, 1.11);
        const term2 = 6.9 / Re;
        const invSqrtF = -1.8 * Math.log10(term1 + term2);
        f = 1 / Math.pow(invSqrtF, 2);
      }
    }
    
    // 5. Darcy-Weisbach Pressure Drop (delta P = f * (L/Dh) * Pv)
    let dp_Pa = 0;
    if (dh_m > 0) {
      dp_Pa = f * (L_m / dh_m) * pv_Pa;
    }
    
    // 6. Convert back to requested units
    const velocity = isMetric ? v_ms : UnitConversionService.msToFpm(v_ms);
    const hydraulicDiameter = isMetric ? (dh_m * 1000) : UnitConversionService.mToIn(dh_m);
    const pressureDrop = isMetric ? dp_Pa : UnitConversionService.paToInWg(dp_Pa);
    const velocityPressure = isMetric ? pv_Pa : UnitConversionService.paToInWg(pv_Pa);
    
    return {
      velocity,
      hydraulicDiameter,
      frictionFactor: f,
      pressureDrop,
      velocityPressure
    };
  }
}
