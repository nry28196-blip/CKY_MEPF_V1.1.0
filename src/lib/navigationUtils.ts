/**
 * Navigation utility functions and standardized metadata for Mechanical / HVAC
 * systems, subordinates, and modules.
 */

export type VentilationSubMode = 'calculation' | 'exhaust' | 'balance' | 'reports';

export interface ModuleMetadata {
  label: string;
  pageTitle: string;
}

export interface SubSystemModuleItem {
  id: string;
  label: string;
}

export const SUBORDINATE_LABELS: Record<string, string> = {
  cooling: 'Cooling Load',
  ventilation: 'Ventilation',
  psychrometrics: 'Psychrometrics',
  ductSizing: 'Duct Design',
  fanDuty: 'Fan Selection',
  kitchenHood: 'Kitchen Hood',
  heatRecovery: 'Heat Recovery'
};

export const DEFAULT_MECHANICAL_MODULES: Record<string, string> = {
  cooling: 'estimate',
  ventilation: 'calculation',
  psychrometrics: 'properties',
  ductSizing: 'equal_friction',
  fanDuty: 'pressure',
  kitchenHood: 'capture',
  heatRecovery: 'hrv_sizing'
};

export const MECHANICAL_MODULE_METADATA: Record<string, Record<string, ModuleMetadata>> = {
  cooling: {
    estimate: { label: 'Load Estimate', pageTitle: 'Cooling Load Estimate' },
    vrf: { label: 'VRF Analysis', pageTitle: 'Multi-Space VRF System Analysis' },
    schedules: { label: 'Equipment Schedules', pageTitle: 'Cooling & VRF Equipment Schedules' },
    reports: { label: 'Reports', pageTitle: 'Cooling Compliance & Audit Report' }
  },
  ventilation: {
    calculation: { label: 'Calculation', pageTitle: 'Ventilation Calculator' },
    exhaust: { label: 'Exhaust', pageTitle: 'Commercial Exhaust Calculator' },
    balance: { label: 'Air Balance', pageTitle: 'Air Balance & Pressurization' },
    reports: { label: 'Reports', pageTitle: 'Ventilation Compliance Report & Audit' }
  },
  psychrometrics: {
    properties: { label: 'Psychrometric State', pageTitle: 'Psychrometric State Analysis' },
    comfort: { label: 'Thermodynamics & Enthalpy', pageTitle: 'Thermodynamics & Moist Air Enthalpy' },
    references: { label: 'Formulas & References', pageTitle: 'Psychrometric Formulas & Reference Library' }
  },
  ductSizing: {
    equal_friction: { label: 'Equal Friction', pageTitle: 'Duct Sizing (Equal Friction Method)' },
    static_regain: { label: 'Static Regain', pageTitle: 'Static Regain Duct Sizing' },
    fittings: { label: 'Fittings Loss', pageTitle: 'Duct Fittings & Dynamic Loss Coefficients' },
    critical_path: { label: 'Critical Path', pageTitle: 'Critical Path & Index Run Static Pressure' }
  },
  fanDuty: {
    pressure: { label: 'Static Pressure', pageTitle: 'Total External Static Pressure (TSP)' },
    fan_curve: { label: 'Fan Curve', pageTitle: 'Fan Performance Curve & Operating Point' },
    selection: { label: 'Motor Selection', pageTitle: 'Fan Motor Selection & Electrical BHP' },
    reports: { label: 'Reports', pageTitle: 'Fan Duty Submittal & Schedule Report' }
  },
  kitchenHood: {
    capture: { label: 'Capture & Containment', pageTitle: 'Kitchen Hood Capture & Containment' },
    grease: { label: 'Grease Filters', pageTitle: 'Grease Extraction & Filter Guidelines' },
    mua: { label: 'Make-Up Air', pageTitle: 'Kitchen Make-Up Air (MUA) Balance' }
  },
  heatRecovery: {
    hrv_sizing: { label: 'HRV / ERV Sizing', pageTitle: 'HRV / ERV Heat Recovery Sizing' },
    aerodynamics: { label: 'Aerodynamic Performance', pageTitle: 'Heat Recovery Aerodynamic Performance' },
    efficiency: { label: 'Energy Effectiveness', pageTitle: 'Thermal & Latent Energy Effectiveness' },
    reports: { label: 'Reports', pageTitle: 'Heat Recovery Energy Audit Report' }
  }
};

/**
 * Module definitions for each subordinate system across MEP disciplines.
 */
export const SUB_SYSTEM_MODULES: Record<string, SubSystemModuleItem[]> = {
  cooling: [
    { id: 'estimate', label: 'Load Estimate' },
    { id: 'vrf', label: 'VRF Analysis' },
    { id: 'schedules', label: 'Equipment Schedules' },
    { id: 'reports', label: 'Reports' }
  ],
  ventilation: [
    { id: 'calculation', label: 'Calculation' },
    { id: 'exhaust', label: 'Exhaust' },
    { id: 'balance', label: 'Air Balance' },
    { id: 'reports', label: 'Reports' }
  ],
  psychrometrics: [
    { id: 'properties', label: 'Psychrometric State' },
    { id: 'comfort', label: 'Thermodynamics & Enthalpy' },
    { id: 'references', label: 'Formulas & References' }
  ],
  ductSizing: [
    { id: 'equal_friction', label: 'Equal Friction' },
    { id: 'static_regain', label: 'Static Regain' },
    { id: 'fittings', label: 'Fittings Loss' },
    { id: 'critical_path', label: 'Critical Path' }
  ],
  fanDuty: [
    { id: 'pressure', label: 'Static Pressure' },
    { id: 'fan_curve', label: 'Fan Curve' },
    { id: 'selection', label: 'Motor Selection' },
    { id: 'reports', label: 'Reports' }
  ],
  kitchenHood: [
    { id: 'capture', label: 'Capture & Containment' },
    { id: 'grease', label: 'Grease Filters' },
    { id: 'mua', label: 'Make-Up Air' }
  ],
  heatRecovery: [
    { id: 'hrv_sizing', label: 'HRV / ERV Sizing' },
    { id: 'aerodynamics', label: 'Aerodynamic Performance' },
    { id: 'efficiency', label: 'Energy Effectiveness' },
    { id: 'reports', label: 'Reports' }
  ],
  plumbing: [
    { id: 'fixtures', label: 'Fixtures & Units' },
    { id: 'tanks', label: 'Storage Tanks' },
    { id: 'pumps', label: 'Booster Pumps' },
    { id: 'reports', label: 'Reports' }
  ],
  fire: [
    { id: 'equipment', label: 'Sprinklers' },
    { id: 'sizing', label: 'Hydraulic Sizing' },
    { id: 'pumps', label: 'Fire Pumps' },
    { id: 'reports', label: 'Reports' }
  ],
  electrical: [
    { id: 'flc', label: 'Motor FLC' },
    { id: 'vd', label: 'Voltage Drop' },
    { id: 'ups', label: 'UPS Sizing' },
    { id: 'elv', label: 'ELV Battery' }
  ],
  bulk: [
    { id: 'duct', label: 'Duct Sizing' },
    { id: 'cooling', label: 'Cooling Load' },
    { id: 'flc', label: 'Electrical FLC' },
    { id: 'pipe', label: 'Pipe Sizing' }
  ]
};

/**
 * Resolves the currently active module identifier for a given Mechanical subordinate.
 */
export function resolveActiveMechanicalModule(
  subId: string,
  mechanicalModules?: Record<string, string>,
  ventilationSubMode?: VentilationSubMode
): string {
  if (subId === 'ventilation') {
    return ventilationSubMode || mechanicalModules?.ventilation || 'calculation';
  }
  return mechanicalModules?.[subId] || DEFAULT_MECHANICAL_MODULES[subId] || 'estimate';
}

/**
 * Returns formatted breadcrumb path string reflecting Level 1, 2, and 3,
 * strictly pulling labels from MECHANICAL_MODULE_METADATA and SUB_SYSTEM_MODULES.
 */
export function getMechanicalBreadcrumbs(
  subId: string,
  moduleId: string,
  subordinateLabelFallback?: string
): string {
  const subLabel = subordinateLabelFallback || SUBORDINATE_LABELS[subId] || 'Cooling Load';
  const metaLabel = MECHANICAL_MODULE_METADATA[subId]?.[moduleId]?.label;
  const subModuleLabel = SUB_SYSTEM_MODULES[subId]?.find(m => m.id === moduleId)?.label;
  const moduleLabel = metaLabel || subModuleLabel || moduleId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `Mechanical / HVAC / ${subLabel} / ${moduleLabel}`;
}

/**
 * Returns precise page title reflecting the currently active module identifier,
 * strictly resolving titles from MECHANICAL_MODULE_METADATA.
 */
export function getMechanicalPageTitle(
  subId: string,
  moduleId: string,
  subordinateLabelFallback?: string
): string {
  const metaTitle = MECHANICAL_MODULE_METADATA[subId]?.[moduleId]?.pageTitle;
  if (metaTitle) {
    return metaTitle;
  }
  const defaultModId = DEFAULT_MECHANICAL_MODULES[subId] || 'estimate';
  const defaultMetaTitle = MECHANICAL_MODULE_METADATA[subId]?.[defaultModId]?.pageTitle;
  if (defaultMetaTitle) {
    return defaultMetaTitle;
  }
  const subLabel = subordinateLabelFallback || SUBORDINATE_LABELS[subId] || 'Mechanical';
  const subModuleLabel = SUB_SYSTEM_MODULES[subId]?.find(m => m.id === moduleId)?.label;
  if (subModuleLabel) {
    return `${subLabel} - ${subModuleLabel}`;
  }
  const modLabel = moduleId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `${subLabel} - ${modLabel}`;
}
