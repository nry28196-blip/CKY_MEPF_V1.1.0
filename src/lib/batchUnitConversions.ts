export type DisciplineCategory = 
  | 'hvac_air' 
  | 'hydronics' 
  | 'thermal' 
  | 'dimensions' 
  | 'temperature' 
  | 'power';

export interface BatchParameterDefinition {
  id: string;
  name: string;
  category: DisciplineCategory;
  categoryLabel: string;
  description: string;
  imperialUnit: string;
  metricUnit: string;
  imperialDefault: number;
  metricDefault: number;
  multiplierImpToMet: number; // For linear conversions: metric = imperial * multiplier
  formulaMetToImp?: (met: number) => number; // Non-linear fallback (e.g. temperature)
  formulaImpToMet?: (imp: number) => number;
  decimals: number;
  codeReference?: string;
}

export const BATCH_PARAMETERS: BatchParameterDefinition[] = [
  // 1. HVAC Air Distribution
  {
    id: 'supply_airflow',
    name: 'Supply Airflow Rate',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Design supply air volume for air handling and ventilation units',
    imperialUnit: 'CFM',
    metricUnit: 'L/s',
    imperialDefault: 4500,
    metricDefault: 2124,
    multiplierImpToMet: 0.47194744,
    decimals: 1,
    codeReference: 'ASHRAE 62.1 Section 6'
  },
  {
    id: 'exhaust_airflow',
    name: 'Exhaust Airflow Rate',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Restroom, kitchen, and specialty zone exhaust volume',
    imperialUnit: 'CFM',
    metricUnit: 'L/s',
    imperialDefault: 750,
    metricDefault: 354,
    multiplierImpToMet: 0.47194744,
    decimals: 1,
    codeReference: 'ASHRAE 62.1 Table 6.5'
  },
  {
    id: 'airflow_volumetric',
    name: 'Airflow (Hourly Volume)',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Hourly volumetric ventilation and smoke purging capacity',
    imperialUnit: 'CFM',
    metricUnit: 'm³/h',
    imperialDefault: 12000,
    metricDefault: 20388,
    multiplierImpToMet: 1.6990108,
    decimals: 0,
    codeReference: 'ISO 5801'
  },
  {
    id: 'duct_velocity',
    name: 'Main Duct Air Velocity',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Target duct velocity for noise and static balance control',
    imperialUnit: 'FPM',
    metricUnit: 'm/s',
    imperialDefault: 1200,
    metricDefault: 6.1,
    multiplierImpToMet: 0.00508,
    decimals: 2,
    codeReference: 'SMACNA Duct Design'
  },
  {
    id: 'friction_rate',
    name: 'Duct Friction Loss Rate',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Equal friction design loss per unit linear run',
    imperialUnit: 'in. wg/100ft',
    metricUnit: 'Pa/m',
    imperialDefault: 0.08,
    metricDefault: 0.65,
    multiplierImpToMet: 8.169,
    decimals: 2,
    codeReference: 'ASHRAE Fundamentals Ch. 21'
  },
  {
    id: 'external_static_pressure',
    name: 'Fan External Static Pressure (ESP)',
    category: 'hvac_air',
    categoryLabel: 'HVAC Air',
    description: 'Total pressure required to overcome duct and terminal resistance',
    imperialUnit: 'in. wg',
    metricUnit: 'Pa',
    imperialDefault: 1.75,
    metricDefault: 436,
    multiplierImpToMet: 249.0889,
    decimals: 1,
    codeReference: 'AMCA 210'
  },

  // 2. Hydronics & Piping
  {
    id: 'chilled_water_flow',
    name: 'Chilled Water Flow (CHW)',
    category: 'hydronics',
    categoryLabel: 'Hydronics',
    description: 'Cooling coil water circulation flow at 10°F / 5.5°C delta T',
    imperialUnit: 'GPM',
    metricUnit: 'L/s',
    imperialDefault: 120,
    metricDefault: 7.57,
    multiplierImpToMet: 0.0630902,
    decimals: 2,
    codeReference: 'ASHRAE 90.1 Ch. 6'
  },
  {
    id: 'condenser_water_flow',
    name: 'Condenser Water Flow (CW)',
    category: 'hydronics',
    categoryLabel: 'Hydronics',
    description: 'Cooling tower heat rejection loop flow rate',
    imperialUnit: 'GPM',
    metricUnit: 'm³/h',
    imperialDefault: 360,
    metricDefault: 81.76,
    multiplierImpToMet: 0.2271247,
    decimals: 2,
    codeReference: 'CTI ATC-105'
  },
  {
    id: 'pipe_velocity',
    name: 'Hydronic Pipe Velocity',
    category: 'hydronics',
    categoryLabel: 'Hydronics',
    description: 'Liquid velocity for erosion and acoustic limits',
    imperialUnit: 'fps',
    metricUnit: 'm/s',
    imperialDefault: 6.5,
    metricDefault: 1.98,
    multiplierImpToMet: 0.3048,
    decimals: 2,
    codeReference: 'ASHRAE 90.1 Table 6.5.4.6'
  },
  {
    id: 'water_pressure_drop',
    name: 'Hydronic Head Loss / Pressure Drop',
    category: 'hydronics',
    categoryLabel: 'Hydronics',
    description: 'Pressure loss across valves, strainers, and coil banks',
    imperialUnit: 'psi',
    metricUnit: 'kPa',
    imperialDefault: 15.0,
    metricDefault: 103.4,
    multiplierImpToMet: 6.894757,
    decimals: 1,
    codeReference: 'Crane TP 410'
  },
  {
    id: 'pump_head',
    name: 'Pump Total Dynamic Head (TDH)',
    category: 'hydronics',
    categoryLabel: 'Hydronics',
    description: 'Total elevation and frictional head against circulation pump',
    imperialUnit: 'ft head',
    metricUnit: 'm head',
    imperialDefault: 60.0,
    metricDefault: 18.29,
    multiplierImpToMet: 0.3048,
    decimals: 2,
    codeReference: 'Hydraulic Institute (HI)'
  },

  // 3. Thermal & Equipment Loads
  {
    id: 'cooling_capacity_tons',
    name: 'Cooling Plant Capacity',
    category: 'thermal',
    categoryLabel: 'Thermal & Loads',
    description: 'Refrigeration heat extraction rate',
    imperialUnit: 'Tons (TR)',
    metricUnit: 'kW',
    imperialDefault: 50.0,
    metricDefault: 175.8,
    multiplierImpToMet: 3.5168528,
    decimals: 2,
    codeReference: 'AHRI 550/590'
  },
  {
    id: 'heating_capacity',
    name: 'Heating Capacity / Output',
    category: 'thermal',
    categoryLabel: 'Thermal & Loads',
    description: 'Boiler, heat pump, or electric reheat heating capacity',
    imperialUnit: 'MBH',
    metricUnit: 'kW',
    imperialDefault: 250.0,
    metricDefault: 73.27,
    multiplierImpToMet: 0.293071,
    decimals: 2,
    codeReference: 'AHRI 1500'
  },
  {
    id: 'sensible_heat_gain',
    name: 'Space Heat Gain Rate',
    category: 'thermal',
    categoryLabel: 'Thermal & Loads',
    description: 'Internal heat dissipation from equipment, lighting, and solar',
    imperialUnit: 'BTU/h',
    metricUnit: 'W',
    imperialDefault: 45000,
    metricDefault: 13188,
    multiplierImpToMet: 0.293071,
    decimals: 0,
    codeReference: 'ASHRAE Fundamentals Ch. 18'
  },
  {
    id: 'overall_u_value',
    name: 'Envelope U-Value (Conductance)',
    category: 'thermal',
    categoryLabel: 'Thermal & Loads',
    description: 'Overall heat transfer coefficient for walls, glass, and roofs',
    imperialUnit: 'BTU/(h·ft²·°F)',
    metricUnit: 'W/(m²·K)',
    imperialDefault: 0.055,
    metricDefault: 0.312,
    multiplierImpToMet: 5.678263,
    decimals: 3,
    codeReference: 'ASHRAE 90.1 Envelope'
  },
  {
    id: 'thermal_r_value',
    name: 'Thermal Resistance (R-Value)',
    category: 'thermal',
    categoryLabel: 'Thermal & Loads',
    description: 'Insulation thermal resistance rating (R vs RSI)',
    imperialUnit: 'h·ft²·°F/BTU',
    metricUnit: 'm²·K/W',
    imperialDefault: 19.0,
    metricDefault: 3.35,
    multiplierImpToMet: 0.17611,
    decimals: 2,
    codeReference: 'ASTM C518 / ISO 8301'
  },

  // 4. Dimensions & Geometry
  {
    id: 'duct_dimension',
    name: 'Duct Dimension / Diameter',
    category: 'dimensions',
    categoryLabel: 'Dimensions',
    description: 'Clear internal dimension for rectangular or spiral round duct',
    imperialUnit: 'in',
    metricUnit: 'mm',
    imperialDefault: 24.0,
    metricDefault: 610,
    multiplierImpToMet: 25.4,
    decimals: 0,
    codeReference: 'SMACNA HVAC Duct Standard'
  },
  {
    id: 'pipe_diameter_nom',
    name: 'Pipe Nominal Size',
    category: 'dimensions',
    categoryLabel: 'Dimensions',
    description: 'Nominal pipe size (NPS to DN metric equivalent)',
    imperialUnit: 'in (NPS)',
    metricUnit: 'mm (DN)',
    imperialDefault: 4.0,
    metricDefault: 100,
    multiplierImpToMet: 25.4,
    decimals: 0,
    codeReference: 'ASME B36.10M / EN 10255'
  },
  {
    id: 'floor_area',
    name: 'Floor / Zone Area',
    category: 'dimensions',
    categoryLabel: 'Dimensions',
    description: 'Conditioned floor footprint for occupancy ventilation',
    imperialUnit: 'sq ft',
    metricUnit: 'm²',
    imperialDefault: 3500,
    metricDefault: 325.2,
    multiplierImpToMet: 0.09290304,
    decimals: 1,
    codeReference: 'ASHRAE 62.1 Area Rate'
  },
  {
    id: 'building_volume',
    name: 'Room Enclosed Volume',
    category: 'dimensions',
    categoryLabel: 'Dimensions',
    description: 'Net interior air volume for air exchange rate (ACH) calculation',
    imperialUnit: 'cu ft',
    metricUnit: 'm³',
    imperialDefault: 42000,
    metricDefault: 1189.3,
    multiplierImpToMet: 0.02831685,
    decimals: 1,
    codeReference: 'NFPA 96 / ASHRAE 62.2'
  },

  // 5. Temperature & Psychrometrics
  {
    id: 'supply_air_temp',
    name: 'Supply Air Dry-Bulb Temperature',
    category: 'temperature',
    categoryLabel: 'Temperature',
    description: 'Off-coil discharge dry-bulb temperature for cooling supply',
    imperialUnit: '°F',
    metricUnit: '°C',
    imperialDefault: 55.0,
    metricDefault: 12.8,
    multiplierImpToMet: 0,
    formulaImpToMet: (f: number) => (f - 32) * (5 / 9),
    formulaMetToImp: (c: number) => (c * (9 / 5)) + 32,
    decimals: 1,
    codeReference: 'ASHRAE 55 Comfort'
  },
  {
    id: 'temperature_diff',
    name: 'Coil / Space Temperature Difference (ΔT)',
    category: 'temperature',
    categoryLabel: 'Temperature',
    description: 'Temperature rise or drop differential across coils',
    imperialUnit: 'Δ°F',
    metricUnit: 'Δ°C',
    imperialDefault: 20.0,
    metricDefault: 11.1,
    multiplierImpToMet: 5 / 9,
    formulaImpToMet: (df: number) => df * (5 / 9),
    formulaMetToImp: (dc: number) => dc * (9 / 5),
    decimals: 1,
    codeReference: 'ASHRAE Fundamentals Ch. 1'
  },
  {
    id: 'humidity_ratio',
    name: 'Air Humidity Ratio (Specific Moisture)',
    category: 'temperature',
    categoryLabel: 'Temperature',
    description: 'Grains of moisture per pound vs grams moisture per kg dry air',
    imperialUnit: 'gr/lb',
    metricUnit: 'g/kg',
    imperialDefault: 65.0,
    metricDefault: 9.29,
    multiplierImpToMet: 0.1428571,
    decimals: 2,
    codeReference: 'ASHRAE Psychrometrics'
  },

  // 6. Power & Energy Density
  {
    id: 'fan_motor_power',
    name: 'Fan / Pump Motor Power',
    category: 'power',
    categoryLabel: 'Power & Motor',
    description: 'Shaft mechanical or electrical motor nameplate power',
    imperialUnit: 'HP',
    metricUnit: 'kW',
    imperialDefault: 15.0,
    metricDefault: 11.19,
    multiplierImpToMet: 0.74569987,
    decimals: 2,
    codeReference: 'NEMA MG 1 / IEC 60034'
  },
  {
    id: 'power_density',
    name: 'Lighting / Power Density',
    category: 'power',
    categoryLabel: 'Power & Motor',
    description: 'Connected plug or lighting load allowance per unit area',
    imperialUnit: 'W/sq ft',
    metricUnit: 'W/m²',
    imperialDefault: 0.85,
    metricDefault: 9.15,
    multiplierImpToMet: 10.76391,
    decimals: 2,
    codeReference: 'ASHRAE 90.1 Table 9.6.1'
  }
];

export interface BatchPreset {
  id: string;
  name: string;
  description: string;
  parameterIds: string[];
}

export const BATCH_PRESETS: BatchPreset[] = [
  {
    id: 'all',
    name: 'All Parameters (22 Items)',
    description: 'Convert complete MEP suite parameters across all disciplines simultaneously',
    parameterIds: BATCH_PARAMETERS.map(p => p.id)
  },
  {
    id: 'hvac_air',
    name: 'HVAC Air Handling & Ventilation',
    description: 'Airflows, duct velocities, friction rate, and fan external static pressure',
    parameterIds: ['supply_airflow', 'exhaust_airflow', 'airflow_volumetric', 'duct_velocity', 'friction_rate', 'external_static_pressure']
  },
  {
    id: 'hydronics_piping',
    name: 'Chilled Water & Hydronic Piping',
    description: 'GPM flow rates, pipe velocity, hydronic pressure drop, and pump head',
    parameterIds: ['chilled_water_flow', 'condenser_water_flow', 'pipe_velocity', 'water_pressure_drop', 'pump_head', 'pipe_diameter_nom']
  },
  {
    id: 'cooling_thermal',
    name: 'Cooling Plant & Thermal Loads',
    description: 'Chiller tons, boiler heating output, space heat gains, and U-values',
    parameterIds: ['cooling_capacity_tons', 'heating_capacity', 'sensible_heat_gain', 'overall_u_value', 'thermal_r_value', 'temperature_diff']
  },
  {
    id: 'duct_dimensions',
    name: 'Ductwork & Space Geometry',
    description: 'Duct sizes, nominal pipe diameters, conditioned floor areas, and room volumes',
    parameterIds: ['duct_dimension', 'pipe_diameter_nom', 'floor_area', 'building_volume', 'friction_rate', 'supply_airflow']
  }
];

/**
 * Universal single-parameter converter
 */
export function convertSingleParameter(
  param: BatchParameterDefinition,
  value: number,
  direction: 'imp_to_met' | 'met_to_imp'
): number {
  if (isNaN(value)) return 0;
  
  if (param.formulaImpToMet && param.formulaMetToImp) {
    if (direction === 'imp_to_met') {
      return Number(param.formulaImpToMet(value).toFixed(param.decimals));
    } else {
      return Number(param.formulaMetToImp(value).toFixed(param.decimals));
    }
  }

  if (direction === 'imp_to_met') {
    return Number((value * param.multiplierImpToMet).toFixed(param.decimals));
  } else {
    return Number((value / param.multiplierImpToMet).toFixed(param.decimals));
  }
}
