export interface ZoneVentilationData {
  /** Unique identifier for the zone */
  id: string;
  /** User-defined name for the zone */
  name: string;
  /** ASHRAE 62.1 space type identifier */
  spaceTypeId: string;
  /** Floor area of the zone */
  area: number;
  /** Number of occupants in the zone */
  occupants: number;
  
  // -- Calculated Parameters --
  /** Breathing zone outdoor airflow (Vbz) */
  vbz: number;
  /** Zone air distribution effectiveness (Ez) */
  ez: number;
  /** Zone outdoor airflow (Voz) */
  voz: number;
  
  // -- Multi-Zone Specific Parameters --
  /** Air volume control mode ('CV' or 'VAV') */
  dMode?: 'CV' | 'VAV';
  /** Zone primary airflow (Vpz) at analyzed design condition */
  vpz?: number;
  /** Designed minimum primary airflow (Vpz-min-design) for VAV */
  vpzMinDesign?: number;
  /** Calculated required minimum primary airflow (Vpz-min-required: 1.5*Voz for Simplified, Voz for Alternative single supply) */
  vpzMinRequired?: number;
  /** Designed minimum discharge airflow (Vdz-min-design) for secondary recirculation systems */
  vdzMinDesign?: number;
  /** Zone minimum airflow compliance status */
  complianceStatus?: 'PASS' | 'FAIL' | 'INCOMPLETE';
  /** Primary air fraction (Ep) - Default 1.0 for single-duct */
  ep?: number;
  /** Secondary recirculation fraction (Er) - Default 0.0 for single-duct */
  er?: number;
  /** Primary outdoor air fraction (Zp = Voz / Vpz) */
  zp?: number;
}

export interface SystemOutdoorAirRequirements {
  /** Identifier for the ventilation system */
  systemId: string;
  /** Classification of the system */
  systemType: 'single' | 'multi' | '100_oa';
  /** Air volume distribution control */
  airDistributionType?: 'CV' | 'VAV';
  
  // -- Aggregate Parameters --
  /** System primary airflow at analyzed design condition (explicit for VAV, sum of Vpz for CV) */
  vps: number;
  /** Design basis description for Vps ("Highest expected system primary airflow at analyzed design condition") */
  vpsDesignBasis?: string;
  /** Documented design condition (e.g. 'Cooling design', 'Heating design', 'Occupancy design', 'Other engineering design condition') */
  designCondition?: string;
  /** Uncorrected outdoor air intake (Vou) */
  vou: number;
  /** System uncorrected outdoor air fraction (Xs = Vou / Vps) */
  xs: number;
  
  // -- Efficiency & Intake --
  /** Design zone outdoor air fraction (Zd = max Zp of all zones) */
  zd: number;
  /** System ventilation efficiency (Ev) */
  ev: number;
  /** Total system outdoor air intake required (Vot) */
  vot: number;
  /** Actual system outdoor air intake (density corrected) */
  votActual?: number;
}

export interface LocalExhaustRequirements {
  /** Identifier for the space/room requiring exhaust */
  roomId: string;
  /** Code-defined exhaust category */
  categoryName: string;
  /** Quantity (can represent area or unit count based on unitType) */
  quantity: number;
  /** Type of unit driving the calculation */
  unitType: 'per_unit' | 'per_area' | 'custom' | 'none';
  /** Total required exhaust airflow for the space */
  requiredExhaust: number | null;
  /** Operational requirement (e.g., Continuous, Intermittent) */
  operatingMode: string;
}


export interface VentilationSpaceType {
  id: string;
  name: string;
  standard: string;
  edition: string;
  category: string;
  rpImp: number; // CFM/person
  raImp: number; // CFM/ft2
  rpMetric: number; // L/s/person
  raMetric: number; // L/s/m2
  defaultOccupancyImp: number; // people/1000 ft2
  defaultOccupancyMetric: number; // people/100 m2
  exhaustRequired: boolean;
  exhaustCategory?: string;
  notes?: string;
  reference?: string;
}
