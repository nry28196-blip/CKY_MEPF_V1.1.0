/**
 * Comprehensive Engineering Formula Data Registry
 * Grounded in ASHRAE 62.1-2022, ASHRAE Fundamentals, NEC (NFPA 70),
 * NFPA 13, International Plumbing Code (IPC), and SMACNA.
 */

export interface FormulaVariable {
  symbol: string;
  name: string;
  unitMetric: string;
  unitImperial: string;
  description: string;
  typicalRange?: string;
  defaultValueMetric?: number;
  defaultValueImperial?: number;
  step?: number;
  min?: number;
  max?: number;
}

export interface EngineeringFormula {
  id: string;
  title: string;
  discipline: 'mechanical' | 'electrical' | 'plumbing' | 'fire' | 'bulk' | 'cost';
  subCategory: string; // e.g. 'ventilation', 'cooling', 'ductSizing', 'fanDuty', 'flc', 'vd', etc.
  standardCitation: string;
  equation: string;
  equationPlain: string;
  description: string;
  practicalNotes?: string;
  variables: FormulaVariable[];
  // Interactive live evaluation function for the sandbox
  calculateLive?: (values: Record<string, number>, isMetric: boolean) => {
    result: number;
    resultUnit: string;
    steps: { label: string; math: string; value: string }[];
  };
}

export const ENGINEERING_FORMULAS: EngineeringFormula[] = [
  // ==========================================
  // MECHANICAL: VENTILATION (ASHRAE 62.1-2022)
  // ==========================================
  {
    id: 'ashrae_vbz',
    title: 'Breathing Zone Outdoor Airflow (Vbz)',
    discipline: 'mechanical',
    subCategory: 'ventilation',
    standardCitation: 'ANSI/ASHRAE Standard 62.1-2022 §6.2.2.1 (Eq 6-1)',
    equation: 'V_{bz} = (R_p \\cdot P_z) + (R_a \\cdot A_z)',
    equationPlain: 'Vbz = (Rp * Pz) + (Ra * Az)',
    description: 'Calculates the net outdoor airflow rate required in the breathing zone to dilute occupant-generated contaminants (human bioeffluents) and building-source contaminants (material emissions).',
    practicalNotes: 'Table 6-1 provides prescriptive Rp and Ra rates by space occupancy category. Zone population Pz should reflect peak design occupancy.',
    variables: [
      {
        symbol: 'V_{bz}',
        name: 'Breathing Zone Outdoor Airflow',
        unitMetric: 'L/s',
        unitImperial: 'CFM',
        description: 'Required rate of outdoor airflow to the breathing zone under design occupancy.'
      },
      {
        symbol: 'R_p',
        name: 'Outdoor Airflow Rate per Person',
        unitMetric: 'L/s·person',
        unitImperial: 'CFM/person',
        description: 'Prescriptive person-based dilution airflow from Table 6-1.',
        typicalRange: '2.5 to 10.0 L/s·person (5 to 20 CFM/person)',
        defaultValueMetric: 2.5,
        defaultValueImperial: 5,
        min: 0,
        max: 25,
        step: 0.5
      },
      {
        symbol: 'P_z',
        name: 'Zone Population',
        unitMetric: 'people',
        unitImperial: 'people',
        description: 'Number of occupants in the zone during typical peak design hours.',
        typicalRange: '1 to 500 people',
        defaultValueMetric: 10,
        defaultValueImperial: 10,
        min: 1,
        max: 500,
        step: 1
      },
      {
        symbol: 'R_a',
        name: 'Outdoor Airflow Rate per Area',
        unitMetric: 'L/s·m²',
        unitImperial: 'CFM/ft²',
        description: 'Prescriptive floor area dilution airflow from Table 6-1 for building emissions.',
        typicalRange: '0.3 to 0.9 L/s·m² (0.06 to 0.18 CFM/ft²)',
        defaultValueMetric: 0.3,
        defaultValueImperial: 0.06,
        min: 0,
        max: 5,
        step: 0.05
      },
      {
        symbol: 'A_z',
        name: 'Zone Floor Area',
        unitMetric: 'm²',
        unitImperial: 'ft²',
        description: 'Net occupiable floor area within the zone boundaries.',
        typicalRange: '10 to 5000 m² (100 to 50,000 ft²)',
        defaultValueMetric: 100,
        defaultValueImperial: 1076,
        min: 10,
        max: 2000,
        step: 10
      }
    ],
    calculateLive: (vals, isMetric) => {
      const rp = vals['R_p'] ?? (isMetric ? 2.5 : 5);
      const pz = vals['P_z'] ?? 10;
      const ra = vals['R_a'] ?? (isMetric ? 0.3 : 0.06);
      const az = vals['A_z'] ?? (isMetric ? 100 : 1076);
      const vPeople = rp * pz;
      const vArea = ra * az;
      const total = vPeople + vArea;
      const unit = isMetric ? 'L/s' : 'CFM';

      return {
        result: Math.round(total * 10) / 10,
        resultUnit: unit,
        steps: [
          { label: 'Occupant Component (Rp · Pz)', math: `${rp} \\times ${pz}`, value: `${(Math.round(vPeople * 10) / 10)} ${unit}` },
          { label: 'Area Component (Ra · Az)', math: `${ra} \\times ${az}`, value: `${(Math.round(vArea * 10) / 10)} ${unit}` },
          { label: 'Net Breathing Zone Flow (Vbz)', math: `${(Math.round(vPeople * 10) / 10)} + ${(Math.round(vArea * 10) / 10)}`, value: `${Math.round(total * 10) / 10} ${unit}` }
        ]
      };
    }
  },
  {
    id: 'ashrae_voz',
    title: 'Zone Outdoor Airflow with Density Correction (Voz)',
    discipline: 'mechanical',
    subCategory: 'ventilation',
    standardCitation: 'ANSI/ASHRAE Standard 62.1-2022 §6.2.2.3 & Addendum j (Eq 6-4)',
    equation: 'V_{oz} = \\left(\\frac{V_{bz}}{E_z}\\right) \\cdot E_\\rho',
    equationPlain: 'Voz = (Vbz / Ez) * Ep',
    description: 'Calculates the outdoor airflow required at the zone supply terminal, corrected for air distribution effectiveness (Ez, Table 6-4) and site air density adjustment (Eρ, Normative Appendix D).',
    practicalNotes: 'Under ASHRAE 62.1-2022 Addendum j, Eρ scales volumetric airflow so mass delivery matches sea-level standard air standards.',
    variables: [
      {
        symbol: 'V_{oz}',
        name: 'Zone Outdoor Airflow',
        unitMetric: 'L/s',
        unitImperial: 'CFM',
        description: 'Design outdoor air supply to the zone terminal.'
      },
      {
        symbol: 'V_{bz}',
        name: 'Breathing Zone Airflow',
        unitMetric: 'L/s',
        unitImperial: 'CFM',
        description: 'Uncorrected breathing zone flow rate from Eq 6-1.',
        defaultValueMetric: 55,
        defaultValueImperial: 115,
        min: 5,
        max: 1000,
        step: 5
      },
      {
        symbol: 'E_z',
        name: 'Air Distribution Effectiveness',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Effectiveness of air delivery to the breathing zone based on supply/return diffuser geometry and heating/cooling mode (Table 6-4).',
        typicalRange: '0.7 to 1.2 (1.0 for ceiling cooling; 0.8 for ceiling warm air heating)',
        defaultValueMetric: 1.0,
        defaultValueImperial: 1.0,
        min: 0.5,
        max: 1.4,
        step: 0.1
      },
      {
        symbol: 'E_\\rho',
        name: 'Local Air Density Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Ratio of standard air density to local air density from Table 6-5 or Eq D-4.',
        typicalRange: '1.00 at sea level up to ~1.45 at high altitudes (3000 m)',
        defaultValueMetric: 1.05,
        defaultValueImperial: 1.05,
        min: 0.8,
        max: 1.6,
        step: 0.01
      }
    ],
    calculateLive: (vals, isMetric) => {
      const vbz = vals['V_{bz}'] ?? (isMetric ? 55 : 115);
      const ez = vals['E_z'] ?? 1.0;
      const ep = vals['E_\\rho'] ?? 1.05;
      const uncorrected = ez > 0 ? vbz / ez : 0;
      const voz = uncorrected * ep;
      const unit = isMetric ? 'L/s' : 'CFM';

      return {
        result: Math.round(voz * 10) / 10,
        resultUnit: unit,
        steps: [
          { label: 'Effective Zone Demand (Vbz / Ez)', math: `${vbz} / ${ez}`, value: `${Math.round(uncorrected * 10) / 10} ${unit}` },
          { label: 'Density Scaled Flow (Voz)', math: `${Math.round(uncorrected * 10) / 10} \\times ${ep}`, value: `${Math.round(voz * 10) / 10} ${unit}` }
        ]
      };
    }
  },
  {
    id: 'ashrae_density_d4',
    title: 'Local Air Density Factor (Normative Appendix D Eq D-4)',
    discipline: 'mechanical',
    subCategory: 'ventilation',
    standardCitation: 'ANSI/ASHRAE Standard 62.1-2022 Normative Appendix D (Eq D-4)',
    equation: 'E_\\rho = C_z \\cdot C_T \\cdot C_W',
    equationPlain: 'Ep = Cz * CT * CW',
    description: 'Analytical calculation of the air density factor as the product of elevation factor (Cz), temperature correction (CT), and moisture correction (CW).',
    practicalNotes: 'Simplification CT=1.0 is strictly permitted only for T < 40.0°C. Simplification CW=1.0 is strictly permitted only for W < 0.024 kg/kg.',
    variables: [
      {
        symbol: 'E_\\rho',
        name: 'Air Density Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Normalized ratio (standard air density / actual air density).'
      },
      {
        symbol: 'C_z',
        name: 'Elevation Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Pressure altitude factor: exp(z / 8435) with elevation z in meters.',
        defaultValueMetric: 1.06,
        defaultValueImperial: 1.06,
        min: 1.0,
        max: 1.6,
        step: 0.01
      },
      {
        symbol: 'C_T',
        name: 'Temperature Correction Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: '(T + 273.15) / 294.15 for T in Celsius.',
        defaultValueMetric: 0.98,
        defaultValueImperial: 0.98,
        min: 0.9,
        max: 1.2,
        step: 0.01
      },
      {
        symbol: 'C_W',
        name: 'Moisture Correction Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: '(1 + W) / (1 + 1.6078 W) where W is humidity ratio.',
        defaultValueMetric: 0.99,
        defaultValueImperial: 0.99,
        min: 0.95,
        max: 1.0,
        step: 0.005
      }
    ],
    calculateLive: (vals) => {
      const cz = vals['C_z'] ?? 1.06;
      const ct = vals['C_T'] ?? 0.98;
      const cw = vals['C_W'] ?? 0.99;
      const ep = cz * ct * cw;

      return {
        result: Math.round(ep * 1000) / 1000,
        resultUnit: 'dimensionless',
        steps: [
          { label: 'Elevation Factor (Cz)', math: `${cz}`, value: `${cz}` },
          { label: 'Temp × Moisture (CT · CW)', math: `${ct} \\times ${cw}`, value: `${Math.round(ct * cw * 1000) / 1000}` },
          { label: 'Net Density Factor (Ep)', math: `${cz} \\times ${ct} \\times ${cw}`, value: `${Math.round(ep * 1000) / 1000}` }
        ]
      };
    }
  },

  // ==========================================
  // MECHANICAL: COOLING LOAD
  // ==========================================
  {
    id: 'cooling_sensible_air',
    title: 'Sensible Air Thermal Capacity',
    discipline: 'mechanical',
    subCategory: 'cooling',
    standardCitation: 'ASHRAE Handbook — Fundamentals Ch 18 (Heat Transfer)',
    equation: 'Q_s = \\rho \\cdot c_p \\cdot q_v \\cdot \\Delta T = 1.2 \\cdot q_v \\cdot \\Delta T',
    equationPlain: 'Qs = 1.2 * qv * deltaT (W)',
    description: 'Calculates sensible cooling or heating capacity required to change the dry-bulb temperature of an airflow.',
    practicalNotes: 'In Imperial units, Qs = 1.08 × CFM × ΔT (°F) in BTU/h. Constant 1.2 derives from standard air density 1.204 kg/m³ and specific heat 1005 J/kg·K.',
    variables: [
      {
        symbol: 'Q_s',
        name: 'Sensible Heat Capacity',
        unitMetric: 'kW',
        unitImperial: 'BTU/h',
        description: 'Sensible rate of thermal energy removal or addition.'
      },
      {
        symbol: 'q_v',
        name: 'Airflow Rate',
        unitMetric: 'L/s',
        unitImperial: 'CFM',
        description: 'Volumetric air flow rate.',
        typicalRange: '100 to 10,000 L/s (200 to 20,000 CFM)',
        defaultValueMetric: 500,
        defaultValueImperial: 1000,
        min: 50,
        max: 5000,
        step: 50
      },
      {
        symbol: '\\Delta T',
        name: 'Temperature Difference',
        unitMetric: '°C (or K)',
        unitImperial: '°F',
        description: 'Dry-bulb temperature difference across the coil or zone.',
        typicalRange: '5 to 15 °C (10 to 25 °F)',
        defaultValueMetric: 10,
        defaultValueImperial: 20,
        min: 1,
        max: 30,
        step: 1
      }
    ],
    calculateLive: (vals, isMetric) => {
      const qv = vals['q_v'] ?? (isMetric ? 500 : 1000);
      const dt = vals['\\Delta T'] ?? (isMetric ? 10 : 20);
      let qs: number;
      let unit: string;

      if (isMetric) {
        // Qs = 1.2 * L/s * dt (Watts) -> /1000 = kW
        qs = (1.2 * qv * dt) / 1000;
        unit = 'kW';
      } else {
        // Qs = 1.08 * CFM * dt (BTU/h)
        qs = 1.08 * qv * dt;
        unit = 'BTU/h';
      }

      return {
        result: Math.round(qs * 10) / 10,
        resultUnit: unit,
        steps: [
          {
            label: isMetric ? 'Constant (ρ · cp / 1000)' : 'Constant (1.08)',
            math: isMetric ? '1.2 / 1000' : '1.08',
            value: isMetric ? '0.0012' : '1.08'
          },
          {
            label: 'Capacity Calculation',
            math: isMetric ? `0.0012 \\times ${qv} \\times ${dt}` : `1.08 \\times ${qv} \\times ${dt}`,
            value: `${Math.round(qs * 10) / 10} ${unit}`
          }
        ]
      };
    }
  },

  // ==========================================
  // MECHANICAL: DUCT DESIGN
  // ==========================================
  {
    id: 'duct_continuity',
    title: 'Duct Airflow Continuity Equation',
    discipline: 'mechanical',
    subCategory: 'ductSizing',
    standardCitation: 'SMACNA HVAC Duct Systems Design / ASHRAE Fundamentals Ch 21',
    equation: 'Q = A \\cdot V',
    equationPlain: 'Q = A * V',
    description: 'Fundamental fluid continuity equation relating volumetric airflow rate, duct cross-sectional area, and mean air velocity.',
    practicalNotes: 'Recommended duct velocities: Main supply ducts 5 to 8 m/s (1000–1600 FPM); branch runouts 3 to 5 m/s (600–1000 FPM) for low acoustic noise.',
    variables: [
      {
        symbol: 'Q',
        name: 'Volumetric Airflow',
        unitMetric: 'm³/s',
        unitImperial: 'CFM',
        description: 'Total volume flow of air carried by the duct.'
      },
      {
        symbol: 'A',
        name: 'Duct Cross-Sectional Area',
        unitMetric: 'm²',
        unitImperial: 'sq.ft',
        description: 'Internal net clear area of the duct.',
        defaultValueMetric: 0.1,
        defaultValueImperial: 1.0,
        min: 0.01,
        max: 2.0,
        step: 0.01
      },
      {
        symbol: 'V',
        name: 'Mean Air Velocity',
        unitMetric: 'm/s',
        unitImperial: 'FPM',
        description: 'Mean fluid velocity across the duct profile.',
        typicalRange: '3.0 to 10.0 m/s (600 to 2000 FPM)',
        defaultValueMetric: 6.0,
        defaultValueImperial: 1200,
        min: 1.0,
        max: 15.0,
        step: 0.5
      }
    ],
    calculateLive: (vals, isMetric) => {
      const a = vals['A'] ?? (isMetric ? 0.1 : 1.0);
      const v = vals['V'] ?? (isMetric ? 6.0 : 1200);
      let q: number;
      let unit: string;

      if (isMetric) {
        q = a * v * 1000; // m³/s to L/s
        unit = 'L/s';
      } else {
        q = a * v; // sq.ft * FPM = CFM
        unit = 'CFM';
      }

      return {
        result: Math.round(q * 10) / 10,
        resultUnit: unit,
        steps: [
          { label: 'Area × Velocity', math: `${a} \\times ${v}`, value: `${isMetric ? Math.round(a * v * 1000) / 1000 + ' m³/s' : Math.round(q) + ' CFM'}` },
          { label: 'Flow Rate', math: isMetric ? `${a * v} \\times 1000` : `${a} \\times ${v}`, value: `${Math.round(q * 10) / 10} ${unit}` }
        ]
      };
    }
  },
  {
    id: 'duct_darcy_weisbach',
    title: 'Duct Friction Loss (Darcy-Weisbach)',
    discipline: 'mechanical',
    subCategory: 'ductSizing',
    standardCitation: 'ASHRAE Handbook — Fundamentals Ch 21 (Duct Design)',
    equation: '\\Delta P_f = f \\cdot \\left(\\frac{L}{D_h}\\right) \\cdot \\left(\\frac{\\rho \\cdot V^2}{2}\\right)',
    equationPlain: 'deltaPf = f * (L / Dh) * (rho * V^2 / 2)',
    description: 'Calculates the frictional head or pressure loss of air flowing through straight duct runs of uniform hydraulic diameter.',
    practicalNotes: 'Friction factor f is determined using the Colebrook-White equation. For galvanized sheet steel, absolute roughness ε ≈ 0.09 mm (0.0003 ft).',
    variables: [
      {
        symbol: '\\Delta P_f',
        name: 'Frictional Pressure Loss',
        unitMetric: 'Pa',
        unitImperial: 'in.wg',
        description: 'Total pressure drop along duct length L.'
      },
      {
        symbol: 'f',
        name: 'Darcy Friction Factor',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Dimensionless friction coefficient depending on Reynolds number and duct roughness.',
        typicalRange: '0.015 to 0.035',
        defaultValueMetric: 0.02,
        defaultValueImperial: 0.02,
        min: 0.01,
        max: 0.05,
        step: 0.002
      },
      {
        symbol: 'L',
        name: 'Duct Length',
        unitMetric: 'm',
        unitImperial: 'ft',
        description: 'Linear length of duct segment.',
        defaultValueMetric: 20,
        defaultValueImperial: 65,
        min: 1,
        max: 200,
        step: 5
      },
      {
        symbol: 'D_h',
        name: 'Hydraulic Diameter',
        unitMetric: 'm',
        unitImperial: 'ft',
        description: 'Hydraulic diameter 4A/P or equivalent circular diameter.',
        defaultValueMetric: 0.4,
        defaultValueImperial: 1.3,
        min: 0.1,
        max: 1.5,
        step: 0.05
      },
      {
        symbol: 'V',
        name: 'Air Velocity',
        unitMetric: 'm/s',
        unitImperial: 'FPM',
        description: 'Mean velocity inside the duct.',
        defaultValueMetric: 6.0,
        defaultValueImperial: 1200,
        min: 2,
        max: 15,
        step: 0.5
      }
    ],
    calculateLive: (vals, isMetric) => {
      const f = vals['f'] ?? 0.02;
      const L = vals['L'] ?? (isMetric ? 20 : 65);
      const Dh = vals['D_h'] ?? (isMetric ? 0.4 : 1.3);
      const v = vals['V'] ?? (isMetric ? 6.0 : 1200);

      let dp: number;
      let unit: string;

      if (isMetric) {
        const rho = 1.2; // kg/m3
        const velPres = 0.5 * rho * v * v;
        dp = f * (L / Dh) * velPres;
        unit = 'Pa';
      } else {
        // Imperial: Pv = (V / 4005)^2 in.wg, dp = f * (L/Dh) * Pv
        const velPres = Math.pow(v / 4005, 2);
        dp = f * (L / Dh) * velPres;
        unit = 'in.wg';
      }

      return {
        result: Math.round(dp * 100) / 100,
        resultUnit: unit,
        steps: [
          { label: 'Length to Diameter Ratio (L / Dh)', math: `${L} / ${Dh}`, value: `${Math.round((L / Dh) * 10) / 10}` },
          { label: 'Total Loss (ΔPf)', math: `f \\times (L/D_h) \\times P_v`, value: `${Math.round(dp * 100) / 100} ${unit}` }
        ]
      };
    }
  },

  // ==========================================
  // ELECTRICAL: FLC & VOLTAGE DROP
  // ==========================================
  {
    id: 'elec_flc_3phase',
    title: 'Three-Phase Full Load Current (FLC)',
    discipline: 'electrical',
    subCategory: 'flc',
    standardCitation: 'National Electrical Code (NEC / NFPA 70) Article 430 & IEEE Red Book',
    equation: 'I = \\frac{P \\times 1000}{\\sqrt{3} \\times V_{LL} \\times \\text{PF}}',
    equationPlain: 'I = (P * 1000) / (sqrt(3) * VLL * PF)',
    description: 'Calculates the steady-state line current drawn by balanced three-phase loads from rated active power, line-to-line voltage, and power factor.',
    practicalNotes: 'Under NEC Article 430.22, continuous motor circuits require branch conductor sizing sized to at least 125% of this full-load current.',
    variables: [
      {
        symbol: 'I',
        name: 'Full Load Current',
        unitMetric: 'A',
        unitImperial: 'A',
        description: 'Line current drawn per phase.'
      },
      {
        symbol: 'P',
        name: 'Active Power',
        unitMetric: 'kW',
        unitImperial: 'kW',
        description: 'Real electrical load power.',
        typicalRange: '1.0 to 1000 kW',
        defaultValueMetric: 45,
        defaultValueImperial: 45,
        min: 1,
        max: 500,
        step: 5
      },
      {
        symbol: 'V_{LL}',
        name: 'Line-to-Line Voltage',
        unitMetric: 'V',
        unitImperial: 'V',
        description: 'Nominal AC three-phase supply line-to-line voltage (e.g. 400V in IEC, 480V in US).',
        typicalRange: '208V, 400V, 415V, 480V',
        defaultValueMetric: 400,
        defaultValueImperial: 480,
        min: 200,
        max: 690,
        step: 10
      },
      {
        symbol: '\\text{PF}',
        name: 'Power Factor (cos φ)',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Ratio of real power to apparent power.',
        typicalRange: '0.80 to 0.95',
        defaultValueMetric: 0.85,
        defaultValueImperial: 0.85,
        min: 0.6,
        max: 1.0,
        step: 0.05
      }
    ],
    calculateLive: (vals) => {
      const p = vals['P'] ?? 45;
      const v = vals['V_{LL}'] ?? 400;
      const pf = vals['\\text{PF}'] ?? 0.85;
      const denominator = Math.sqrt(3) * v * pf;
      const current = denominator > 0 ? (p * 1000) / denominator : 0;

      return {
        result: Math.round(current * 10) / 10,
        resultUnit: 'A',
        steps: [
          { label: 'Total Active Power', math: `${p} \\times 1000`, value: `${p * 1000} W` },
          { label: '√3 × V_LL × PF', math: `1.732 \\times ${v} \\times ${pf}`, value: `${Math.round(denominator * 10) / 10}` },
          { label: 'Full Load Current (I)', math: `(${p * 1000}) / ${Math.round(denominator * 10) / 10}`, value: `${Math.round(current * 10) / 10} A` }
        ]
      };
    }
  },
  {
    id: 'elec_voltage_drop',
    title: 'Three-Phase Feeder Voltage Drop (VD)',
    discipline: 'electrical',
    subCategory: 'vd',
    standardCitation: 'NEC 210.19(A) Informational Note No. 4 & BS 7671',
    equation: '\\Delta V = \\frac{\\sqrt{3} \\cdot I \\cdot L \\cdot (R \\cdot \\cos\\phi + X \\cdot \\sin\\phi)}{1000}',
    equationPlain: 'deltaV = sqrt(3) * I * L * (R*cos(phi) + X*sin(phi)) / 1000',
    description: 'Calculates the AC terminal voltage drop along a conductor route due to resistance and reactance under inductive load.',
    practicalNotes: 'NEC recommends max 3% voltage drop on branch circuits, and max 5% overall combined feeder + branch drop to maintain equipment efficiency.',
    variables: [
      {
        symbol: '\\Delta V',
        name: 'Voltage Drop',
        unitMetric: 'V',
        unitImperial: 'V',
        description: 'Line-to-line voltage loss along the conductor run.'
      },
      {
        symbol: 'I',
        name: 'Design Current',
        unitMetric: 'A',
        unitImperial: 'A',
        description: 'Continuous circuit load current.',
        defaultValueMetric: 80,
        defaultValueImperial: 80,
        min: 10,
        max: 500,
        step: 5
      },
      {
        symbol: 'L',
        name: 'One-Way Run Length',
        unitMetric: 'm',
        unitImperial: 'ft',
        description: 'Route length from supply distribution board to terminal load.',
        defaultValueMetric: 50,
        defaultValueImperial: 165,
        min: 5,
        max: 300,
        step: 5
      },
      {
        symbol: 'R',
        name: 'Conductor Resistance',
        unitMetric: 'mΩ/m',
        unitImperial: 'Ω/1000ft',
        description: 'AC operating resistance of conductor at design temperature (e.g. 75°C).',
        defaultValueMetric: 0.5,
        defaultValueImperial: 0.15,
        min: 0.05,
        max: 3.0,
        step: 0.05
      }
    ],
    calculateLive: (vals, isMetric) => {
      const i = vals['I'] ?? 80;
      const l = vals['L'] ?? (isMetric ? 50 : 165);
      const r = vals['R'] ?? (isMetric ? 0.5 : 0.15);
      const pf = 0.85;

      // Approximate resistive drop
      let vd: number;
      if (isMetric) {
        // R in mOhm/m -> R/1000 in Ohm/m
        vd = (Math.sqrt(3) * i * l * (r / 1000) * pf);
      } else {
        // R in Ohm/1000ft -> R/1000 in Ohm/ft
        vd = (Math.sqrt(3) * i * l * (r / 1000) * pf);
      }

      return {
        result: Math.round(vd * 10) / 10,
        resultUnit: 'V',
        steps: [
          { label: 'One-Way Distance', math: `${l}`, value: `${l} ${isMetric ? 'm' : 'ft'}` },
          { label: 'Effective Drop (ΔV)', math: `\\sqrt{3} \\times ${i} \\times ${l} \\times R`, value: `${Math.round(vd * 10) / 10} V` }
        ]
      };
    }
  },

  // ==========================================
  // PLUMBING: HAZEN-WILLIAMS & HUNTER'S CURVE
  // ==========================================
  {
    id: 'plumb_hazen_williams',
    title: 'Friction Head Loss (Hazen-Williams)',
    discipline: 'plumbing',
    subCategory: 'friction',
    standardCitation: 'ASPE Plumbing Engineering Design Handbook Vol 2 / IPC §604',
    equation: 'H_f = 10.67 \\cdot L \\cdot \\left(\\frac{Q}{C}\\right)^{1.852} \\cdot \\frac{1}{D^{4.87}}',
    equationPlain: 'Hf = 10.67 * L * (Q/C)^1.852 * (1 / D^4.87)',
    description: 'Empirical formula standard in plumbing and water supply engineering for calculating frictional head loss in closed full-pipe turbulent water flow.',
    practicalNotes: 'C coefficient reflects pipe material interior roughness: Copper/PEX C=150; PVC C=150; New steel C=120; Older cast iron C=100.',
    variables: [
      {
        symbol: 'H_f',
        name: 'Frictional Head Loss',
        unitMetric: 'm of water',
        unitImperial: 'psi',
        description: 'Total pressure or elevation loss resulting from pipe boundary friction.'
      },
      {
        symbol: 'L',
        name: 'Pipe Equivalent Length',
        unitMetric: 'm',
        unitImperial: 'ft',
        description: 'Physical straight length plus equivalent length of fittings and valves.',
        defaultValueMetric: 30,
        defaultValueImperial: 100,
        min: 5,
        max: 300,
        step: 5
      },
      {
        symbol: 'Q',
        name: 'Flow Rate',
        unitMetric: 'L/s',
        unitImperial: 'GPM',
        description: 'Peak volumetric flow of water.',
        defaultValueMetric: 2.5,
        defaultValueImperial: 40,
        min: 0.1,
        max: 50,
        step: 0.5
      },
      {
        symbol: 'D',
        name: 'Internal Diameter',
        unitMetric: 'mm',
        unitImperial: 'in',
        description: 'Inside diameter of pipe bore.',
        defaultValueMetric: 50,
        defaultValueImperial: 2.0,
        min: 15,
        max: 200,
        step: 5
      },
      {
        symbol: 'C',
        name: 'Roughness Coefficient',
        unitMetric: 'dimensionless',
        unitImperial: 'dimensionless',
        description: 'Hazen-Williams roughness coefficient.',
        typicalRange: '100 (Steel) to 150 (Copper/PVC)',
        defaultValueMetric: 140,
        defaultValueImperial: 140,
        min: 80,
        max: 160,
        step: 5
      }
    ],
    calculateLive: (vals, isMetric) => {
      const L = vals['L'] ?? (isMetric ? 30 : 100);
      const Q = vals['Q'] ?? (isMetric ? 2.5 : 40);
      const D = vals['D'] ?? (isMetric ? 50 : 2.0);
      const C = vals['C'] ?? 140;

      let hf: number;
      let unit: string;

      if (isMetric) {
        // Metric: Q in m3/s, D in m
        const qM3s = Q / 1000;
        const dM = D / 1000;
        hf = 10.67 * L * Math.pow(qM3s / C, 1.852) * Math.pow(1 / dM, 4.87);
        unit = 'm';
      } else {
        // Imperial psi: p = 4.52 * Q^1.852 / (C^1.852 * D^4.87) * L
        hf = (4.52 * Math.pow(Q, 1.852)) / (Math.pow(C, 1.852) * Math.pow(D, 4.87)) * (L / 100);
        unit = 'psi';
      }

      return {
        result: Math.round(hf * 100) / 100,
        resultUnit: unit,
        steps: [
          { label: 'Flow & Roughness Term (Q / C)', math: `${Q} / ${C}`, value: `${Math.round((Q / C) * 1000) / 1000}` },
          { label: 'Total Friction Head Loss (Hf)', math: isMetric ? '10.67 \\times L \\times (Q/C)^{1.852} / D^{4.87}' : '4.52 \\times L \\times Q^{1.852} / (C^{1.852} D^{4.87})', value: `${Math.round(hf * 100) / 100} ${unit}` }
        ]
      };
    }
  },

  // ==========================================
  // FIRE PROTECTION: SPRINKLER DEMAND & K-FACTOR
  // ==========================================
  {
    id: 'fire_k_factor',
    title: 'Sprinkler Orifice Discharge (K-Factor)',
    discipline: 'fire',
    subCategory: 'sprinkler',
    standardCitation: 'NFPA 13 (2022) Standard for the Installation of Sprinkler Systems §19.2',
    equation: 'Q = K \\cdot \\sqrt{P}',
    equationPlain: 'Q = K * sqrt(P)',
    description: 'Calculates water discharge flow rate from an automatic sprinkler head based on its orifice discharge coefficient (K-Factor) and residual operating pressure.',
    practicalNotes: 'Standard residential/light hazard heads commonly use K=5.6 (metric K=80). Minimum operating pressure under NFPA 13 is 7 psi (0.48 bar).',
    variables: [
      {
        symbol: 'Q',
        name: 'Discharge Flow Rate',
        unitMetric: 'L/min',
        unitImperial: 'GPM',
        description: 'Water discharge rate from single sprinkler head.'
      },
      {
        symbol: 'K',
        name: 'Orifice K-Factor',
        unitMetric: 'L/min·bar^0.5',
        unitImperial: 'GPM/psi^0.5',
        description: 'Discharge coefficient corresponding to orifice internal geometry (e.g. Imperial 5.6 = Metric 80).',
        typicalRange: 'K=5.6 (80 metric), K=8.0 (115 metric), K=11.2 (160 metric)',
        defaultValueMetric: 80,
        defaultValueImperial: 5.6,
        min: 40,
        max: 360,
        step: 5
      },
      {
        symbol: 'P',
        name: 'Residual Operating Pressure',
        unitMetric: 'bar',
        unitImperial: 'psi',
        description: 'Effective water pressure at sprinkler head nozzle.',
        typicalRange: '0.5 to 3.5 bar (7 to 50 psi)',
        defaultValueMetric: 1.0,
        defaultValueImperial: 15,
        min: 0.5,
        max: 5.0,
        step: 0.2
      }
    ],
    calculateLive: (vals, isMetric) => {
      const k = vals['K'] ?? (isMetric ? 80 : 5.6);
      const p = vals['P'] ?? (isMetric ? 1.0 : 15);
      const q = k * Math.sqrt(p);
      const unit = isMetric ? 'L/min' : 'GPM';

      return {
        result: Math.round(q * 10) / 10,
        resultUnit: unit,
        steps: [
          { label: 'Square Root Pressure (√P)', math: `\\sqrt{${p}}`, value: `${Math.round(Math.sqrt(p) * 100) / 100}` },
          { label: 'Discharge Flow (Q)', math: `${k} \\times ${Math.round(Math.sqrt(p) * 100) / 100}`, value: `${Math.round(q * 10) / 10} ${unit}` }
        ]
      };
    }
  },
  {
    id: 'fire_hydraulic_demand',
    title: 'Sprinkler System Hydraulic Demand (NFPA 13)',
    discipline: 'fire',
    subCategory: 'sprinkler',
    standardCitation: 'NFPA 13 (2022) Standard for the Installation of Sprinkler Systems §19.3',
    equation: 'Q_{demand} = (\\text{Density} \\times A_{design}) + Q_{hose}',
    equationPlain: 'Qdemand = (Density * Area) + Qhose',
    description: 'Calculates the total water flow required for the fire sprinkler system by multiplying the design hazard density by the hydraulically most remote design area, plus required hose stream allowance.',
    practicalNotes: 'Light hazard: 0.10 GPM/sq.ft (4.1 mm/min) over 1500 sq.ft (139 m²), plus 100 GPM (378 L/min) hose allowance.',
    variables: [
      {
        symbol: 'Q_{demand}',
        name: 'Total Hydraulic Demand',
        unitMetric: 'L/min',
        unitImperial: 'GPM',
        description: 'Total water flow required from fire pump or municipal connection.'
      },
      {
        symbol: '\\text{Density}',
        name: 'Design Hazard Density',
        unitMetric: 'mm/min (L/min·m²)',
        unitImperial: 'GPM/ft²',
        description: 'Prescriptive discharge water density per unit floor area based on occupancy hazard class.',
        defaultValueMetric: 4.1,
        defaultValueImperial: 0.10,
        min: 2.0,
        max: 15.0,
        step: 0.5
      },
      {
        symbol: 'A_{design}',
        name: 'Hydraulic Design Area',
        unitMetric: 'm²',
        unitImperial: 'ft²',
        description: 'Assumed operating area of sprinklers in the hydraulically most demanding zone.',
        defaultValueMetric: 139,
        defaultValueImperial: 1500,
        min: 50,
        max: 500,
        step: 10
      },
      {
        symbol: 'Q_{hose}',
        name: 'Hose Stream Allowance',
        unitMetric: 'L/min',
        unitImperial: 'GPM',
        description: 'Additional allowance for interior/exterior fire brigade fire hoses (NFPA 13 Table 19.2.3.1.2).',
        defaultValueMetric: 378,
        defaultValueImperial: 100,
        min: 0,
        max: 2000,
        step: 50
      }
    ],
    calculateLive: (vals, isMetric) => {
      const dens = vals['\\text{Density}'] ?? (isMetric ? 4.1 : 0.10);
      const area = vals['A_{design}'] ?? (isMetric ? 139 : 1500);
      const hose = vals['Q_{hose}'] ?? (isMetric ? 378 : 100);
      const sprinklerFlow = dens * area;
      const total = sprinklerFlow + hose;
      const unit = isMetric ? 'L/min' : 'GPM';

      return {
        result: Math.round(total),
        resultUnit: unit,
        steps: [
          { label: 'Sprinkler Flow (Density × Area)', math: `${dens} \\times ${area}`, value: `${Math.round(sprinklerFlow)} ${unit}` },
          { label: 'Hose Stream Allowance', math: `${hose}`, value: `${hose} ${unit}` },
          { label: 'Total Demand Flow (Qdemand)', math: `${Math.round(sprinklerFlow)} + ${hose}`, value: `${Math.round(total)} ${unit}` }
        ]
      };
    }
  }
];

export function getFormulasByDiscipline(discipline: string, subCategory?: string): EngineeringFormula[] {
  const matches = ENGINEERING_FORMULAS.filter(f => f.discipline === discipline);
  if (subCategory && subCategory !== 'all') {
    const subMatches = matches.filter(f => f.subCategory.toLowerCase() === subCategory.toLowerCase());
    return subMatches.length > 0 ? subMatches : matches;
  }
  return matches;
}
