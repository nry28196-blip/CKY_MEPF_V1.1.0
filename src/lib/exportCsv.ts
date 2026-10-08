/**
 * Utility to export engineering calculations to Excel-compatible CSV.
 * Includes UTF-8 Byte Order Mark (BOM) to prevent corruption of symbols (e.g., m³, φ, °, etc.).
 */

export interface CsvRow {
  section: string;
  parameter: string;
  value: string | number;
  unit: string;
  notes?: string;
}

/**
 * Trigger file download of a CSV file generated from rows of data.
 */
export function downloadCsv(filename: string, title: string, rows: CsvRow[]) {
  // Construct CSV content
  let csvContent = `\uFEFF`; // UTF-8 BOM for Excel
  
  // Header Info
  csvContent += `"${title.replace(/"/g, '""')}"\n`;
  csvContent += `"Exported At:","${new Date().toLocaleString()}"\n`;
  csvContent += `"Project Tool:","CKY_MEPF Engineering Suite"\n\n`;
  
  // Columns
  csvContent += `"Category","Engineering Parameter","Value","Unit","Design Notes / Standard"\n`;
  
  // Data Rows
  rows.forEach(row => {
    const escapedSection = `${row.section}`.replace(/"/g, '""');
    const escapedParam = `${row.parameter}`.replace(/"/g, '""');
    const escapedVal = `${row.value}`.replace(/"/g, '""');
    const escapedUnit = `${row.unit}`.replace(/"/g, '""');
    const escapedNotes = `${row.notes || ''}`.replace(/"/g, '""');
    
    csvContent += `"${escapedSection}","${escapedParam}","${escapedVal}","${escapedUnit}","${escapedNotes}"\n`;
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formatters for specific calculation views
 */

export function exportDuctSizingToCsv(params: {
  airflow: number;
  frictionRate: number;
  velocityLimit: number;
  ductHeight: number;
  widthMain: number;
  deMain: number;
  velRoundMain: number;
  velRectMain: number;
  branches: Array<{
    id: number;
    pct: number;
    cfm: number;
    de: number;
    width: number;
    velocityRound: number;
    velocityRect: number;
  }>;
}) {
  const rows: CsvRow[] = [
    { section: "Main Duct Input", parameter: "Design Airflow", value: params.airflow, unit: "CFM", notes: "Volumetric airflow rate" },
    { section: "Main Duct Input", parameter: "Friction Loss Rate", value: params.frictionRate, unit: "in. wg/100 ft", notes: "Equal Friction Method standard" },
    { section: "Main Duct Input", parameter: "Max Velocity Limit", value: params.velocityLimit, unit: "FPM", notes: "ASHRAE noise control guidelines" },
    { section: "Main Duct Input", parameter: "Prescribed Duct Height", value: params.ductHeight, unit: "inches", notes: "Kept uniform for ceiling clearance" },
    
    { section: "Main Duct Output", parameter: "Main Duct Width", value: params.widthMain, unit: "inches", notes: "Calculated aspect dimension" },
    { section: "Main Duct Output", parameter: "Equivalent Circular Diam.", value: (params.deMain || 0).toFixed(2), unit: "inches", notes: "Huebscher relation equivalent" },
    { section: "Main Duct Output", parameter: "Circular Duct Velocity", value: Math.round(params.velRoundMain), unit: "FPM", notes: "Estimated pure round flow velocity" },
    { section: "Main Duct Output", parameter: "Actual Rectangular Velocity", value: Math.round(params.velRectMain), unit: "FPM", notes: "Final velocity in main rectangular section" },
  ];

  params.branches.forEach((b, idx) => {
    const bName = `Branch #${idx + 1}`;
    rows.push(
      { section: bName, parameter: "Airflow Share", value: b.pct, unit: "%", notes: "Recursive flow split" },
      { section: bName, parameter: "Calculated Airflow", value: Math.round(b.cfm), unit: "CFM", notes: "Share of main airflow" },
      { section: bName, parameter: "Equivalent Circular Diam.", value: (b.de || 0).toFixed(2), unit: "inches", notes: "" },
      { section: bName, parameter: "Rectangular Width", value: b.width, unit: "inches", notes: `With same uniform height of ${params.ductHeight} inches` },
      { section: bName, parameter: "Circular Velocity", value: Math.round(b.velocityRound), unit: "FPM", notes: "" },
      { section: bName, parameter: "Rectangular Velocity", value: Math.round(b.velocityRect), unit: "FPM", notes: "" }
    );
  });

  downloadCsv("duct_sizing_calculation", "HVAC Duct Sizing Analysis Report", rows);
}

export function exportCoolingLoadToCsv(params: {
  basis: 'area' | 'volume';
  area: number;
  volume: number;
  occupants: number;
  tons: number;
  btu: number;
  watts: number;
  projectType?: string;
  outdoorTemp?: number;
  indoorTemp?: number;
  ceilingHeight?: number;
  sensiblePerPerson?: number;
  latentPerPerson?: number;
  lightingWpm2?: number;
  equipmentWatts?: number;
  wallArea?: number;
  wallUValue?: number;
  roofArea?: number;
  roofUValue?: number;
  windowArea?: number;
  windowUValue?: number;
  windowShgc?: number;
  ventilationLps?: number;
  infiltrationACH?: number;
  safetyFactor?: number;
  altitude?: number;
  relativeHumidity?: number;
  sensibleWatts?: number;
  latentWatts?: number;
  envelopeWatts?: number;
  peopleWatts?: number;
  lightingWatts?: number;
  ventilationWatts?: number;
  infiltrationWatts?: number;
  safetyWatts?: number;
  status?: string;
}) {
  const rows: CsvRow[] = [
    { section: "Space Parameters", parameter: "Estimation Basis", value: params.basis.toUpperCase(), unit: "N/A", notes: "Primary sizing metric" },
    { section: "Space Parameters", parameter: "Floor Area", value: params.area, unit: "m²", notes: "" },
    { section: "Space Parameters", parameter: "Room Volume", value: params.volume, unit: "m³", notes: "" },
    { section: "Space Parameters", parameter: "Occupants Count", value: params.occupants, unit: "Persons", notes: "Sensible & Latent load contribution" },
  ];

  if (params.projectType) {
    rows.unshift({ section: "Project Information", parameter: "Project Building Type", value: params.projectType, unit: "-", notes: "ASHRAE Standard baseline classification" });
  }

  if (params.ceilingHeight !== undefined) {
    rows.push({ section: "Space Parameters", parameter: "Ceiling Height", value: params.ceilingHeight, unit: "m", notes: "" });
  }

  if (params.outdoorTemp !== undefined || params.indoorTemp !== undefined) {
    if (params.outdoorTemp !== undefined) {
      rows.push({ section: "Design Temperatures", parameter: "Outdoor Design Temp", value: params.outdoorTemp, unit: "°C", notes: "ASHRAE peak ambient design condition" });
    }
    if (params.indoorTemp !== undefined) {
      rows.push({ section: "Design Temperatures", parameter: "Indoor Setpoint Temp", value: params.indoorTemp, unit: "°C", notes: "Comfort setpoint" });
    }
    if (params.outdoorTemp !== undefined && params.indoorTemp !== undefined) {
      rows.push({ section: "Design Temperatures", parameter: "Design Temperature Differential (ΔT)", value: Number((params.outdoorTemp - params.indoorTemp).toFixed(1)), unit: "K (°C)", notes: "Thermal driving potential" });
    }
  }

  if (params.wallArea !== undefined || params.roofArea !== undefined || params.windowArea !== undefined) {
    if (params.wallArea !== undefined) {
      rows.push({ section: "Building Envelope", parameter: "Gross Wall Area", value: params.wallArea, unit: "m²", notes: params.wallUValue ? `U-value: ${params.wallUValue} W/m²·K` : "" });
    }
    if (params.roofArea !== undefined) {
      rows.push({ section: "Building Envelope", parameter: "Roof Area", value: params.roofArea, unit: "m²", notes: params.roofUValue ? `U-value: ${params.roofUValue} W/m²·K` : "" });
    }
    if (params.windowArea !== undefined) {
      rows.push({ section: "Building Envelope", parameter: "Fenestration Area", value: params.windowArea, unit: "m²", notes: params.windowUValue ? `U: ${params.windowUValue} W/m²·K, SHGC: ${params.windowShgc ?? '-'}` : "" });
    }
  }

  if (params.lightingWpm2 !== undefined || params.equipmentWatts !== undefined || params.sensiblePerPerson !== undefined) {
    if (params.lightingWpm2 !== undefined) {
      rows.push({ section: "Internal Heat Gains", parameter: "Lighting Power Density", value: params.lightingWpm2, unit: "W/m²", notes: "" });
    }
    if (params.equipmentWatts !== undefined) {
      rows.push({ section: "Internal Heat Gains", parameter: "Plug Load / Equipment", value: params.equipmentWatts, unit: "Watts", notes: "" });
    }
    if (params.sensiblePerPerson !== undefined && params.latentPerPerson !== undefined) {
      rows.push({ section: "Internal Heat Gains", parameter: "Occupant Heat Rate", value: `${params.sensiblePerPerson} Sensible / ${params.latentPerPerson} Latent`, unit: "W/person", notes: "Metabolic heat emission" });
    }
  }

  if (params.ventilationLps !== undefined || params.infiltrationACH !== undefined) {
    if (params.ventilationLps !== undefined) {
      rows.push({ section: "Ventilation & Infiltration", parameter: "Outdoor Air Ventilation", value: params.ventilationLps, unit: "L/s", notes: "ASHRAE 62.1 fresh air rate" });
    }
    if (params.infiltrationACH !== undefined) {
      rows.push({ section: "Ventilation & Infiltration", parameter: "Infiltration Rate", value: params.infiltrationACH, unit: "ACH", notes: "Air changes per hour" });
    }
  }

  if (params.safetyFactor !== undefined) {
    rows.push({ section: "Design Factors", parameter: "Safety Allowance Factor", value: `${params.safetyFactor}%`, unit: "%", notes: "Equipment sizing safety margin" });
  }

  // Outputs
  rows.push(
    { section: "Cooling Load Output", parameter: "Required Cooling Capacity", value: (params.tons || 0).toFixed(2), unit: "TR (Tons of Refrigeration)", notes: "Standard HVAC unit of measure" },
    { section: "Cooling Load Output", parameter: "Thermal Power Output", value: Math.round(params.btu), unit: "BTU/hr", notes: "" },
    { section: "Cooling Load Output", parameter: "Electric Power Requirement", value: Math.round(params.watts), unit: "W (Thermal)", notes: "Heat transfer rating" }
  );

  if (params.sensibleWatts !== undefined || params.latentWatts !== undefined) {
    if (params.sensibleWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Sensible Heat Load", value: Math.round(params.sensibleWatts), unit: "Watts", notes: "" });
    }
    if (params.latentWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Latent Heat Load", value: Math.round(params.latentWatts), unit: "Watts", notes: "Moisture removal load" });
    }
    if (params.envelopeWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Envelope Conduction Load", value: Math.round(params.envelopeWatts), unit: "Watts", notes: "" });
    }
    if (params.peopleWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Occupant Heat Contribution", value: Math.round(params.peopleWatts), unit: "Watts", notes: "" });
    }
    if (params.lightingWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Lighting Heat Contribution", value: Math.round(params.lightingWatts), unit: "Watts", notes: "" });
    }
    if (params.ventilationWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Ventilation Load", value: Math.round(params.ventilationWatts), unit: "Watts", notes: "" });
    }
    if (params.safetyWatts !== undefined) {
      rows.push({ section: "Heat Gain Breakdown", parameter: "Safety Allowance Load", value: Math.round(params.safetyWatts), unit: "Watts", notes: "" });
    }
  }

  if (params.status) {
    rows.push({ section: "Engineering Verification", parameter: "Calculation Status", value: params.status, unit: "-", notes: "ASHRAE Fundamentals Verification" });
  }

  downloadCsv("cooling_load_calculation", "Cooling Load Heat Estimate Report", rows);
}

export function exportElectricalToCsv(params: {
  power: number;
  voltage: number;
  powerFactor: number;
  phase: 'single' | 'three';
  current: number;
  breaker: number;
}) {
  const rows: CsvRow[] = [
    { section: "Electrical Input", parameter: "Load Active Power", value: params.power, unit: "kW", notes: "Input active load demand" },
    { section: "Electrical Input", parameter: "System Voltage (V)", value: params.voltage, unit: "Volts", notes: "Phase-to-neutral or Phase-to-phase" },
    { section: "Electrical Input", parameter: "Power Factor (cos φ)", value: params.powerFactor, unit: "N/A", notes: "Displacement power factor" },
    { section: "Electrical Input", parameter: "Phase Configuration", value: params.phase === 'three' ? "3-Phase" : "1-Phase", unit: "N/A", notes: "" },
    
    { section: "Electrical Output", parameter: "Full Load Current (FLC)", value: (params.current || 0).toFixed(3), unit: "Amperes", notes: "I = P / (V * cos φ) for 1-Phase, I = P / (√3 * V * cos φ) for 3-Phase" },
    { section: "Electrical Output", parameter: "Suggested Circuit Breaker", value: params.breaker, unit: "Amps", notes: "Sized at 125% FLC rating for safety buffer" },
  ];

  downloadCsv("electrical_flc_calculation", "Electrical FLC and Circuit Breaker Sizing", rows);
}

export function exportPlumbingToCsv(params: {
  standard: 'ipc' | 'bs';
  fixtures: Array<{ name: string; qty: number; value: number; unitType: string }>;
  totalUnits: number;
  flowRate: number;
  velocity: number;
  pipeDiameter: number;
}) {
  const rows: CsvRow[] = [
    { section: "Design Standard", parameter: "Calculated Standard", value: params.standard.toUpperCase(), unit: "N/A", notes: params.standard === 'ipc' ? "International Plumbing Code" : "British Standard (BS EN 806)" },
  ];

  params.fixtures.forEach((f, idx) => {
    if (f.qty > 0) {
      rows.push({
        section: "Plumbing Fixture",
        parameter: f.name,
        value: f.qty,
        unit: "Qty",
        notes: `Value per unit: ${f.value} ${params.standard === 'ipc' ? 'WSFU' : 'LU'}`
      });
    }
  });

  rows.push(
    { section: "Plumbing Output", parameter: "Cumulative Fixture Units", value: (params.totalUnits || 0).toFixed(1), unit: params.standard === 'ipc' ? "WSFU" : "LU", notes: "Total combined supply loading" },
    { section: "Plumbing Output", parameter: "Estimated Flow Demand", value: (params.flowRate || 0).toFixed(2), unit: "L/s", notes: "Peak demand flow rate" },
    { section: "Plumbing Output", parameter: "Design Flow Velocity", value: params.velocity, unit: "m/s", notes: "Target flow speed in pipe" },
    { section: "Plumbing Output", parameter: "Calculated Pipe Diameter", value: (params.pipeDiameter || 0).toFixed(1), unit: "mm", notes: "Required inner pipe diameter to avoid cavitation/noise" }
  );

  downloadCsv("plumbing_sizing_calculation", "Plumbing Supply Flow and Pipe Sizing Report", rows);
}

export function exportFireToCsv(params: {
  hazard: string;
  area: number;
  density: number;
  flow: number;
  duration: number;
  storage: number;
}) {
  const rows: CsvRow[] = [
    { section: "Fire Protection Parameters", parameter: "Hazard Classification", value: params.hazard, unit: "N/A", notes: "NFPA 13 Classification" },
    { section: "Fire Protection Parameters", parameter: "Remote Design Area", value: params.area, unit: "m²", notes: "Most hydraulically demanding zone" },
    { section: "Fire Protection Parameters", parameter: "Required Discharge Density", value: params.density, unit: "mm/min (L/min/m²)", notes: "Constant sprinkler water application" },
    
    { section: "Fire Protection Output", parameter: "Required System Flow Rate", value: (params.flow || 0).toFixed(1), unit: "L/min", notes: "Design area * discharge density + hose allowance" },
    { section: "Fire Protection Output", parameter: "Calculated System Flow (Lps)", value: ((params.flow || 0) / 60).toFixed(2), unit: "L/s", notes: "Volumetric rate per second" },
    { section: "Fire Protection Output", parameter: "Minimum Firefighting Duration", value: params.duration, unit: "minutes", notes: "Required continuous water feed duration" },
    { section: "Fire Protection Output", parameter: "Minimum Water Storage Volume", value: (params.storage || 0).toFixed(1), unit: "m³", notes: "Minimum reservoir tank size" },
    { section: "Fire Protection Output", parameter: "Total Water Weight", value: Math.round(params.storage * 1000).toLocaleString(), unit: "kg (Litres)", notes: "Water structural load weight" },
  ];

  downloadCsv("fire_sprinkler_calculation", "Fire Suppression Sizing and Water Supply Report", rows);
}

export function exportVrfToCsv(params: {
  rooms: Array<{ name: string; size: number; basis: 'area' | 'volume'; occupants: number; tons: number }>;
  diversityFactor: number;
  totalConnectedTons: number;
  coincidentTons: number;
  oduSizeHp: number;
  oduSizeTons: number;
  combinationRatio: number;
  pipingLength: number;
  refrigerantCharge: number;
}) {
  const rows: CsvRow[] = [
    { section: "VRF System Parameters", parameter: "Diversity Factor", value: params.diversityFactor, unit: "Ratio", notes: "Coincidence load adjustment" },
    { section: "VRF System Parameters", parameter: "Total Connected IDU Capacity", value: (params.totalConnectedTons || 0).toFixed(2), unit: "TR", notes: "Sum of all individual indoor unit capacities" },
    { section: "VRF System Parameters", parameter: "Coincident Design Peak Load", value: (params.coincidentTons || 0).toFixed(2), unit: "TR", notes: "Peak load on ODU after diversity filter" },
    { section: "VRF System Parameters", parameter: "Recommended Outdoor Unit Size", value: `${params.oduSizeHp} HP (${(params.oduSizeTons || 0).toFixed(1)} TR)`, unit: "HP", notes: "Nominal recommended VRF ODU size" },
    { section: "VRF System Parameters", parameter: "Actual Combination Ratio (CR)", value: `${(params.combinationRatio || 0).toFixed(1)}%`, unit: "%", notes: "Connection ratio of Connected IDU to Recommended ODU" },
    { section: "VRF System Parameters", parameter: "Total Liquid Line Piping Length", value: params.pipingLength, unit: "m", notes: "Length for additional refrigerant estimation" },
    { section: "VRF System Parameters", parameter: "Est. Additional Refrigerant Charge", value: (params.refrigerantCharge || 0).toFixed(2), unit: "kg", notes: "Calculated at 0.055 kg/m" },
  ];

  params.rooms.forEach((r) => {
    rows.push(
      { section: `Indoor Unit - ${r.name}`, parameter: `Floor Sizing Metric`, value: r.size, unit: r.basis === 'area' ? 'm²' : 'm³', notes: `Occupants: ${r.occupants}` },
      { section: `Indoor Unit - ${r.name}`, parameter: `Calculated Thermal Load`, value: (r.tons || 0).toFixed(2), unit: "TR", notes: "Required peak space cooling load" }
    );
  });

  downloadCsv("vrf_system_calculation", "Multi-Space VRF-VRV System Design Report", rows);
}


export function exportVentilationToCsv(params: {
  isMetric: boolean;
  systemType: string;
  result: any;
  zones: any[];
}) {
  const rows: CsvRow[] = [];
  
  rows.push({
    section: 'System Information',
    parameter: 'System Configuration',
    value: params.systemType.replace('_', ' ').toUpperCase(),
    unit: '-',
    notes: 'ASHRAE 62.1 Configuration'
  });

  rows.push({
    section: 'System Results',
    parameter: 'System Status',
    value: params.result?.status || 'UNKNOWN',
    unit: '-',
    notes: 'Overall Validation Status'
  });

  if (params.result?.finalDesignOutdoorAir !== undefined && params.result.finalDesignOutdoorAir !== null) {
    rows.push({
      section: 'System Results',
      parameter: 'Final Design Outdoor Air',
      value: Number(params.result.finalDesignOutdoorAir).toFixed(2),
      unit: params.isMetric ? 'L/s' : 'cfm',
      notes: 'Authoritative value for system'
    });
  }

  if (params.result?.vps !== undefined && params.result?.vps !== null) {
    rows.push({
      section: 'System Results',
      parameter: 'System Primary Airflow (Vps)',
      value: Number(params.result.vps).toFixed(2),
      unit: params.isMetric ? 'L/s' : 'cfm',
      notes: params.result.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition'
    });
  }

  if (params.result?.xs !== undefined && params.result?.xs !== null) {
    rows.push({
      section: 'System Results',
      parameter: 'System Outdoor Air Fraction (Xs)',
      value: (Number(params.result.xs) * 100).toFixed(2),
      unit: '%',
      notes: 'Vou / Vps'
    });
  }

  if (params.result?.auditTrail) {
    params.result.auditTrail.forEach((item: any) => {
      rows.push({
        section: 'System Audit Trail',
        parameter: `${item.symbol} (${item.name})`,
        value: typeof item.result === 'number' ? Number(item.result).toFixed(3) : item.result,
        unit: item.unit || '-',
        notes: `Formula: ${item.formula} | Ref: ${item.reference}`
      });
    });
  }

  if (params.result?.multiZoneResult?.auditTrail) {
    params.result.multiZoneResult.auditTrail.forEach((item: any) => {
      rows.push({
        section: 'Multi-Zone System Audit Trail',
        parameter: `${item.symbol} (${item.name})`,
        value: typeof item.result === 'number' ? Number(item.result).toFixed(3) : item.result,
        unit: item.unit || '-',
        notes: `Formula: ${item.formula} | Ref: ${item.reference}`
      });
    });
  }

  if (params.zones && params.zones.length > 0) {
    params.zones.forEach((zone: any, index: number) => {
      const zResult = params.result?.zoneResults ? params.result.zoneResults[index] : null;
      rows.push({
        section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
        parameter: 'Area',
        value: Number(zone.area).toFixed(2),
        unit: params.isMetric ? 'm²' : 'ft²',
        notes: ''
      });
      rows.push({
        section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
        parameter: 'Population',
        value: Number(zone.population).toFixed(1),
        unit: 'people',
        notes: ''
      });
      if (zResult) {
        rows.push({
          section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
          parameter: 'Zone Outdoor Airflow (Voz)',
          value: zResult.voz === null ? 'BLOCKED' : Number(zResult.voz).toFixed(2),
          unit: params.isMetric ? 'L/s' : 'cfm',
          notes: ''
        });
      }
      if (zone.vpzMin !== undefined && zone.vpzMin !== '' && zone.vpzMin !== null) {
        rows.push({
          section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
          parameter: 'Designed Minimum Primary Airflow (Vpz-min-design)',
          value: Number(zone.vpzMin).toFixed(2),
          unit: params.isMetric ? 'L/s' : 'cfm',
          notes: 'VAV minimum airflow setting'
        });
      }
      const mzZoneRes = params.result?.simplifiedSystem?.zoneResults?.[index] || params.result?.alternativeSystem?.zoneResults?.[index];
      if (mzZoneRes?.vpzMinRequired !== undefined && mzZoneRes?.vpzMinRequired !== null) {
        rows.push({
          section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
          parameter: 'Required Minimum Primary Airflow (Vpz-min-required)',
          value: Number(mzZoneRes.vpzMinRequired).toFixed(2),
          unit: params.isMetric ? 'L/s' : 'cfm',
          notes: 'ASHRAE 62.1-2022 minimum condition'
        });
        rows.push({
          section: `Zone ${index + 1}: ${zone.name || 'Unnamed'}`,
          parameter: 'VAV Minimum Compliance Status',
          value: mzZoneRes.compliance || 'UNKNOWN',
          unit: '-',
          notes: mzZoneRes.message || ''
        });
      }
    });
  }

  downloadCsv('ashrae_62_1_ventilation', 'ASHRAE 62.1 Ventilation Calculation', rows);
}

export function exportExhaustToCsv(params: {
  isMetric: boolean;
  complianceProcedure: 'prescriptive' | 'performance';
  overallStatus: string;
  rows: Array<{
    name: string;
    categoryName: string;
    quantity: number | string;
    unitType: string;
    requiredExhaust: number | string;
    designExhaust: number | string;
    status: string;
    airClass?: number | string;
    operationMode?: string;
  }>;
}) {
  const flowUnit = params.isMetric ? 'L/s' : 'cfm';
  const csvRows: CsvRow[] = [
    { section: 'Exhaust System', parameter: 'Compliance Procedure', value: params.complianceProcedure.toUpperCase(), unit: '-', notes: 'ASHRAE 62.1 Section 6.5' },
    { section: 'Exhaust System', parameter: 'Overall Status', value: params.overallStatus, unit: '-', notes: '' }
  ];

  params.rows.forEach((r, idx) => {
    const sec = `Space ${idx + 1}: ${r.name || 'Unnamed'}`;
    csvRows.push({ section: sec, parameter: 'Space Category', value: r.categoryName, unit: '-', notes: '' });
    csvRows.push({ section: sec, parameter: 'Basis Quantity', value: r.quantity, unit: r.unitType, notes: '' });
    csvRows.push({ section: sec, parameter: 'Required Exhaust', value: r.requiredExhaust, unit: flowUnit, notes: 'Prescriptive Table 6-2 rate' });
    csvRows.push({ section: sec, parameter: 'Design Exhaust', value: r.designExhaust, unit: flowUnit, notes: 'Proposed actual design airflow' });
    csvRows.push({ section: sec, parameter: 'Air Class', value: r.airClass || 'N/A', unit: '-', notes: 'ASHRAE Table 6-2/6-3' });
    csvRows.push({ section: sec, parameter: 'Operation Mode', value: r.operationMode || 'Continuous', unit: '-', notes: '' });
    csvRows.push({ section: sec, parameter: 'Compliance Status', value: r.status, unit: '-', notes: '' });
  });

  downloadCsv('commercial_exhaust_calculation', 'ASHRAE 62.1 Commercial Exhaust Calculation', csvRows);
}

export function exportStaticPressureToCsv(params: {
  isMetric: boolean;
  density: number;
  roughness: number;
  safetyFactor: number;
  criticalPathId: string;
  criticalPathName: string;
  maxPressure: number;
  designPressure: number;
  maxPathAirflow: number;
  paths: Array<{
    name: string;
    isCritical: boolean;
    sections: Array<{
      name: string;
      airflow: number;
      shape: 'rect' | 'round';
      dimensions: string;
      length: number;
      fittingLossCoeff: number;
      equipmentLoss: number;
      frictionLoss: number;
      totalLoss: number;
    }>;
  }>;
}) {
  const pressUnit = params.isMetric ? 'Pa' : 'in.wg';
  const flowUnit = params.isMetric ? 'L/s' : 'CFM';
  const lenUnit = params.isMetric ? 'm' : 'ft';
  const densityUnit = params.isMetric ? 'kg/m³' : 'lb/ft³';

  const rows: CsvRow[] = [
    { section: 'System Properties', parameter: 'Air Density', value: params.density, unit: densityUnit, notes: 'Darcy-Weisbach / Colebrook basis' },
    { section: 'System Properties', parameter: 'Duct Roughness', value: params.roughness, unit: lenUnit, notes: 'Absolute surface roughness' },
    { section: 'System Properties', parameter: 'Safety Allowance Factor', value: params.safetyFactor, unit: '%', notes: '' },
    { section: 'Critical Path Results', parameter: 'Critical Path Name', value: params.criticalPathName, unit: '-', notes: 'Governing fan duty run' },
    { section: 'Critical Path Results', parameter: 'Calculated Critical Resistance', value: params.maxPressure.toFixed(2), unit: pressUnit, notes: 'Sum of duct, fittings, and equipment' },
    { section: 'Critical Path Results', parameter: 'Total Design Static Pressure', value: params.designPressure.toFixed(2), unit: pressUnit, notes: 'Including safety factor' },
    { section: 'Critical Path Results', parameter: 'Design Airflow', value: Math.ceil(params.maxPathAirflow), unit: flowUnit, notes: 'Peak fan volumetric duty' }
  ];

  params.paths.forEach((p) => {
    const secTag = `Duct Run: ${p.name}${p.isCritical ? ' (CRITICAL PATH)' : ''}`;
    p.sections.forEach((s) => {
      rows.push({
        section: secTag,
        parameter: `Section: ${s.name}`,
        value: `${s.airflow} ${flowUnit} | ${s.dimensions} | L=${s.length}${lenUnit}`,
        unit: pressUnit,
        notes: `Friction=${s.frictionLoss.toFixed(2)}, Fitting (C=${s.fittingLossCoeff}), Eq=${s.equipmentLoss.toFixed(2)} -> Total=${s.totalLoss.toFixed(2)}`
      });
    });
  });

  downloadCsv('fan_static_pressure_calculation', 'Duct System Static Pressure and Fan Duty Sizing', rows);
}

export function exportKitchenVentilationToCsv(params: {
  isMetric: boolean;
  standard: string;
  hoodType: string;
  duty: string;
  hoodLength: number;
  hoodDepth: number;
  exhaustAirflow: number;
  muaTotalFlow: number;
  totalMuaRatio: number;
  ductArea: number;
  ductVelocity: number;
  status: string;
}) {
  const flowUnit = params.isMetric ? 'L/s' : 'CFM';
  const lenUnit = params.isMetric ? 'm' : 'ft';
  const velUnit = params.isMetric ? 'm/s' : 'FPM';
  const areaUnit = params.isMetric ? 'cm²' : 'sq in';

  const rows: CsvRow[] = [
    { section: 'Hood Parameters', parameter: 'Governing Standard', value: params.standard.toUpperCase(), unit: '-', notes: 'NFPA 96 / IMC / UL 710' },
    { section: 'Hood Parameters', parameter: 'Hood Style', value: params.hoodType, unit: '-', notes: '' },
    { section: 'Hood Parameters', parameter: 'Thermal Cooking Duty', value: params.duty.toUpperCase(), unit: '-', notes: '' },
    { section: 'Hood Parameters', parameter: 'Hood Length', value: params.hoodLength.toFixed(2), unit: lenUnit, notes: 'Including side overhang' },
    { section: 'Hood Parameters', parameter: 'Hood Depth', value: params.hoodDepth.toFixed(2), unit: lenUnit, notes: '' },
    
    { section: 'Airflow Outputs', parameter: 'Required Exhaust Airflow', value: Math.ceil(params.exhaustAirflow), unit: flowUnit, notes: 'Continuous commercial extraction' },
    { section: 'Airflow Outputs', parameter: 'Make-Up Air Flow', value: Math.round(params.muaTotalFlow), unit: flowUnit, notes: `${params.totalMuaRatio}% replacement ratio` },
    { section: 'Exhaust Ductwork', parameter: 'Minimum Exhaust Duct Area', value: Math.round(params.ductArea), unit: areaUnit, notes: `For ${params.ductVelocity} ${velUnit}` },
    { section: 'Exhaust Ductwork', parameter: 'Design Velocity', value: params.ductVelocity, unit: velUnit, notes: 'IMC grease transport minimum' },
    { section: 'Engineering Audit', parameter: 'Compliance Status', value: params.status, unit: '-', notes: '' }
  ];

  downloadCsv('commercial_kitchen_ventilation', 'Commercial Kitchen Hood Exhaust and MUA Calculation', rows);
}

export function exportAirBalanceToCsv(params: {
  isMetric: boolean;
  mode: 'room' | 'system';
  supplyAir: number;
  exhaustAir: number;
  returnAir: number;
  outdoorAir?: number;
  transferAir?: number;
  netAirflow: number;
  pressureRelationship: string;
  airChangesPerHour?: number;
}) {
  const flowUnit = params.isMetric ? 'L/s' : 'CFM';
  const rows: CsvRow[] = [
    { section: 'Air Balance Configuration', parameter: 'Analysis Mode', value: params.mode.toUpperCase(), unit: '-', notes: 'Volumetric flow diagnostic' },
    { section: 'Flow Parameters', parameter: 'Supply Airflow', value: params.supplyAir, unit: flowUnit, notes: '' },
    { section: 'Flow Parameters', parameter: 'Exhaust Airflow', value: params.exhaustAir, unit: flowUnit, notes: '' },
    { section: 'Flow Parameters', parameter: 'Return Airflow', value: params.returnAir, unit: flowUnit, notes: '' }
  ];

  if (params.outdoorAir !== undefined) {
    rows.push({ section: 'Flow Parameters', parameter: 'Outdoor Intake Airflow', value: params.outdoorAir, unit: flowUnit, notes: '' });
  }
  if (params.transferAir !== undefined) {
    rows.push({ section: 'Flow Parameters', parameter: 'Transfer Air In', value: params.transferAir, unit: flowUnit, notes: '' });
  }

  rows.push({ section: 'Balance Summary', parameter: 'Net Volumetric Flow (Q_net)', value: params.netAirflow.toFixed(1), unit: flowUnit, notes: 'Supply - (Exhaust + Return)' });
  rows.push({ section: 'Balance Summary', parameter: 'Pressurization State', value: params.pressureRelationship, unit: '-', notes: 'Positive, Negative, or Balanced' });

  if (params.airChangesPerHour !== undefined) {
    rows.push({ section: 'Ventilation Rate', parameter: 'Calculated Air Changes (ACH)', value: params.airChangesPerHour.toFixed(2), unit: '1/hr', notes: 'Based on total room/building volume' });
  }

  downloadCsv('air_balance_calculation', 'Volumetric Air Balance and Space Pressurization Report', rows);
}

export function exportDuctFittingsToCsv(params: {
  isMetric: boolean;
  velocity: number;
  airDensity: number;
  velocityPressure: number;
  selectedCategory: string;
  fittings: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    lossCoefficient: number;
    deltaP: number;
  }>;
}) {
  const velUnit = params.isMetric ? 'm/s' : 'FPM';
  const densityUnit = params.isMetric ? 'kg/m³' : 'lb/ft³';
  const pressUnit = params.isMetric ? 'Pa' : 'in.wg';

  const rows: CsvRow[] = [
    { section: 'Flow Parameters', parameter: 'Duct Air Velocity', value: params.velocity, unit: velUnit, notes: 'Design operating air velocity' },
    { section: 'Flow Parameters', parameter: 'Local Air Density', value: params.airDensity, unit: densityUnit, notes: 'Standard dry air density' },
    { section: 'Flow Parameters', parameter: 'Velocity Pressure (Pv)', value: Number(params.velocityPressure.toFixed(3)), unit: pressUnit, notes: params.isMetric ? 'Pv = 0.5 * ρ * V²' : 'Pv = (ρ/0.075) * (V/4005)²' },
    { section: 'Database Filter', parameter: 'Selected Category', value: params.selectedCategory.toUpperCase(), unit: '-', notes: 'ASHRAE Fitting Database Category' }
  ];

  params.fittings.forEach((fit) => {
    rows.push({
      section: `Fitting: ${fit.id}`,
      parameter: fit.name,
      value: `Co = ${fit.lossCoefficient.toFixed(2)} | ΔP = ${fit.deltaP.toFixed(2)} ${pressUnit}`,
      unit: pressUnit,
      notes: `${fit.category.toUpperCase()} - ${fit.description}`
    });
  });

  downloadCsv('duct_fittings_loss_analysis', 'ASHRAE Duct Fitting Loss Coefficients and Pressure Drop Report', rows);
}

export function exportSystemPerformanceToCsv(params: {
  isMetric: boolean;
  qOutdoorAir: number;
  qReturnAir: number;
  densityRatio: number;
  criticalDuctLength: number;
  ductFrictionRate: number;
  fittingLosses: number;
  equipmentPressureDrop: number;
  fanEfficiency: number;
  motorEfficiency: number;
  qSupplyStandard: number | null;
  qSupplyActual: number | null;
  totalStaticPressure: number | null;
  fanBrakeHorsepower: number | null;
  motorElectricalPower: number | null;
  status: string;
}) {
  const flowUnit = params.isMetric ? 'L/s' : 'CFM';
  const lengthUnit = params.isMetric ? 'm' : 'ft';
  const pressureUnit = params.isMetric ? 'Pa' : 'in.wg.';
  const frictionUnit = params.isMetric ? 'Pa/m' : 'in.wg./100ft';
  const powerUnit = params.isMetric ? 'kW' : 'HP';

  const rows: CsvRow[] = [
    { section: 'Airflow & Environment', parameter: 'Outdoor Air Intake', value: params.qOutdoorAir, unit: flowUnit, notes: '' },
    { section: 'Airflow & Environment', parameter: 'Return Airflow', value: params.qReturnAir, unit: flowUnit, notes: '' },
    { section: 'Airflow & Environment', parameter: 'Air Density Ratio (Eρ)', value: Number(params.densityRatio.toFixed(3)), unit: 'Ratio', notes: 'Altitude and temperature air density correction' },

    { section: 'Duct Network & Critical Path', parameter: 'Critical Duct Length', value: params.criticalDuctLength, unit: lengthUnit, notes: 'Most hydraulically restrictive run' },
    { section: 'Duct Network & Critical Path', parameter: 'Duct Friction Rate', value: params.ductFrictionRate, unit: frictionUnit, notes: '' },
    { section: 'Duct Network & Critical Path', parameter: 'Fitting Dynamic Losses', value: params.fittingLosses, unit: pressureUnit, notes: 'Fittings in critical path' },
    { section: 'Duct Network & Critical Path', parameter: 'AHU Equipment Drop', value: params.equipmentPressureDrop, unit: pressureUnit, notes: 'Internal resistance (coils, filters, dampers)' },

    { section: 'Fan & Motor Specifications', parameter: 'Fan Aerodynamic Efficiency', value: `${params.fanEfficiency}%`, unit: '%', notes: 'Impeller mechanical efficiency' },
    { section: 'Fan & Motor Specifications', parameter: 'Motor Conversion Efficiency', value: `${params.motorEfficiency}%`, unit: '%', notes: 'Electrical-to-shaft power efficiency' },

    { section: 'Operating Performance Duty Point', parameter: 'Standard Design Airflow', value: params.qSupplyStandard !== null ? Math.round(params.qSupplyStandard) : 'N/A', unit: flowUnit, notes: 'Supply flow before density adjustment' },
    { section: 'Operating Performance Duty Point', parameter: 'Actual Volumetric Airflow', value: params.qSupplyActual !== null ? Math.round(params.qSupplyActual) : 'N/A', unit: flowUnit, notes: 'Corrected for local density ratio' },
    { section: 'Operating Performance Duty Point', parameter: 'Total Static Pressure (TSP)', value: params.totalStaticPressure !== null ? params.totalStaticPressure.toFixed(2) : 'N/A', unit: pressureUnit, notes: 'Sum of duct, fittings, and equipment resistance' },
    { section: 'Operating Performance Duty Point', parameter: 'Fan Brake Horsepower', value: params.fanBrakeHorsepower !== null ? params.fanBrakeHorsepower.toFixed(2) : 'N/A', unit: powerUnit, notes: 'Required shaft mechanical power' },
    { section: 'Operating Performance Duty Point', parameter: 'Motor Electrical Duty', value: params.motorElectricalPower !== null ? params.motorElectricalPower.toFixed(2) : 'N/A', unit: 'kW', notes: 'Input electrical wire-to-air power' },
    { section: 'Engineering Verification', parameter: 'Duty Point Status', value: params.status, unit: '-', notes: 'Equipment sizing diagnostic status' }
  ];

  downloadCsv('fan_system_aerodynamic_performance', 'Fan System Aerodynamic Performance and Operating Duty Point Report', rows);
}

