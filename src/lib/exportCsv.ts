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
}) {
  const rows: CsvRow[] = [
    { section: "Space Parameters", parameter: "Estimation Basis", value: params.basis.toUpperCase(), unit: "N/A", notes: "Primary sizing metric" },
    { section: "Space Parameters", parameter: "Floor Area", value: params.area, unit: "m²", notes: "" },
    { section: "Space Parameters", parameter: "Room Volume", value: params.volume, unit: "m³", notes: "" },
    { section: "Space Parameters", parameter: "Occupants Count", value: params.occupants, unit: "Persons", notes: "Sensible & Latent load contribution" },
    
    { section: "Cooling Load Output", parameter: "Required Cooling Capacity", value: (params.tons || 0).toFixed(2), unit: "TR (Tons of Refrigeration)", notes: "Standard HVAC unit of measure" },
    { section: "Cooling Load Output", parameter: "Thermal Power Output", value: Math.round(params.btu), unit: "BTU/hr", notes: "" },
    { section: "Cooling Load Output", parameter: "Electric Power Requirement", value: Math.round(params.watts), unit: "W (Thermal)", notes: "Heat transfer rating" },
  ];

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
