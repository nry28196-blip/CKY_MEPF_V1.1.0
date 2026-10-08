
export type AshraeEdition = '2019' | '2022' | '2025';

export type VerificationStatus = 'VERIFIED' | 'NOT_VERIFIED' | 'INVALID' | 'UNIMPLEMENTED';

export type DatasetCompletenessStatus = 'COMPLETE' | 'SUBSET' | 'INCOMPLETE' | 'NOT_VERIFIED';

// Reference Basis constants per Section 1
export const STANDARD_BASELINE = "ASHRAE 62.1-2022";
export const APPLICABLE_ADDENDA: string[] = ["j"];
export const ACTIVE_REFERENCE_BASIS = "ASHRAE 62.1-2022 + Addendum j";

export enum SourceType {
  ASHRAE_PUBLISHED = 'ASHRAE_PUBLISHED',
  ASHRAE_PUBLISHED_ADDENDUM = 'ASHRAE_PUBLISHED_ADDENDUM',
  ASHRAE_PUBLISHED_ERRATA = 'ASHRAE_PUBLISHED_ERRATA',
  PROJECT_SPECIFICATION = 'PROJECT_SPECIFICATION',
  ADOPTED_CODE = 'ADOPTED_CODE',
  PUBLIC_REVIEW_DRAFT = 'PUBLIC_REVIEW_DRAFT',
  USER_OVERRIDE = 'USER_OVERRIDE',
  UNKNOWN = 'UNKNOWN'
}

export interface StandardRevision {
    standard: string;
    edition: AshraeEdition;
    baseEdition: AshraeEdition;
    publishedAddendaApplied: string[];
    publishedErrataApplied: string[];
    verificationDate?: string;
    source: SourceType;
}

export interface Ashrae621SpaceType {
  id: string;
  name: string; // Occupancy Category
  standard: string;
  edition: string;
  category: string; // Occupancy Group (retained for backward compatibility)
  occupancyGroup?: string; // Explicit group name
  occupancyCategory?: string; // Explicit category name

  // Rp - People Outdoor Air Rate
  rpMetric: number; // L/s-person
  rpIp?: number; // cfm/person
  rpStatus?: 'APPLICABLE' | 'NOT_APPLICABLE';
  isRpNotApplicable?: boolean;

  // Ra - Area Outdoor Air Rate
  raMetric: number; // L/s-m2
  raIp?: number; // cfm/ft2
  raStatus?: 'APPLICABLE' | 'NOT_APPLICABLE';
  isRaNotApplicable?: boolean;

  // Default Occupant Density
  defaultOccupancyMetric: number; // persons/100 m2
  defaultOccupancyIp?: number; // persons/1000 ft2
  densityUnitMetric?: string; // e.g. '#/100 m²'
  densityUnitIp?: string; // e.g. '#/1000 ft²'
  densityStatus?: 'APPLICABLE' | 'NOT_APPLICABLE';
  isDensityNotApplicable?: boolean;

  airClass?: number; // Air Class per Table 6-1 (1, 2, 3, or 4)
  osPermitted?: boolean; // Occupant Sensitivity (OS) permitted per Table 6-1 / Section 6.2.6.1.4
  osStatus?: 'PERMITTED' | 'NOT_PERMITTED';
  units: string;
  exhaustRequired: boolean;
  reference: string;
  notes: string;

  // Table 6-1 Audit & Metadata fields
  applicableNotes?: string[];
  sourceStandard?: string;
  sourceTable?: string;
  sourceNoteCondition?: string;
  expectedOccupancyIndicator?: string;
  co2DeltaC?: number | string | null;
  datasetVersion?: string;
  referenceBasis?: string;
  addenda?: string[];

  revisionState: StandardRevision;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  verificationDate?: string;
  provenance?: SpaceTypeProvenance;
}

export interface Ashrae621Ez {
  id: string;
  name: string;
  standard: string;
  edition: string;
  configuration: string;
  applicableCondition: string;
  supplyArrangement: string;
  returnArrangement: string;
  ez: number;
  reference: string;
  revisionState: StandardRevision;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  verificationDate?: string;
  provenance?: EzProvenance;

  // ASHRAE 62.1-2022 Table 6-4 configuration attributes
  distributionCategory?: 'ceiling' | 'floor' | 'makeup' | 'personalized' | 'unidirectional' | 'override';
  supplyLocation?: 'ceiling' | 'floor' | 'breathing_zone' | 'other';
  supplyAirCondition?: 'cool' | 'warm' | 'isothermal' | 'any';
  returnLocation?: 'ceiling' | 'floor' | 'other';
  spaceTempRelationship?: 'cooling' | 'heating_gte_8c' | 'heating_lt_8c' | 'none';
  supplyJetVelocityCondition?: string;
  verticalThrowCondition?: string;
  returnAirHeightCondition?: string;
  isWellMixed?: boolean;
  isStratified?: boolean;
  isPersonalized?: boolean;
  additionalQualifyingConditions?: string;
  isManualOverride?: boolean;
  manualOverrideBasis?: string;
  manualJustification?: string;
}

export interface Ashrae621ExhaustType {
  id: string;
  name: string;
  category: string;
  rate: number | null;
  rateIp?: number | null;
  continuousRate?: number | null;
  continuousRateIp?: number | null;
  intermittentRate?: number | null;
  intermittentRateIp?: number | null;
  unitType: 'fixture' | 'm2' | 'room' | 'equipment' | 'showerhead' | 'special';
  operatingCondition: string;
  airClass?: number;
  exhaustClass: number; // Retained as alias for airClass
  standard: string;
  edition: string;
  reference: string;
  referenceSection?: string;
  referenceTable?: string;
  referenceBasis?: string;
  isSpecialStandard?: boolean;
  specialStandardReference?: string;
  rateStatus?: 'PRESCRIPTIVE' | 'SPECIAL_REQUIREMENT';
  notes?: string;
  exceptions?: string;
  combustionCondition?: string;
  applicableAddenda?: string[];
  revisionState: StandardRevision;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  verificationDate?: string;
  provenance?: ExhaustProvenance;
}

export type Table63MetadataSourceType = 'STANDARD_TABLE' | 'SUPPLEMENTARY_GUIDANCE';

export interface Table63SupplementaryGuidance {
  reference: string;
  organization?: string;
  role: 'SUPPLEMENTARY_GUIDANCE' | 'SPECIAL_REQUIREMENT_CONTEXT';
  notes?: string;
}

export interface Table63SourceProvenance {
  airClass: DataProvenance;
  reference: DataProvenance;
  supplementaryGuidance?: Table63SupplementaryGuidance;
}

export interface Ashrae621Table63Source {
  id: string;
  name: string;
  description: string;
  airClass: 1 | 2 | 3 | 4;
  standard: 'ASHRAE 62.1';
  edition: string;
  reference: string;
  referenceSection: string;
  referenceTable: string;
  referenceBasis: string;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  verificationDate?: string;
  applicableAddenda: string[];
  notes?: string;
  specialStandardReference?: string;
  revisionState?: StandardRevision;
  metadataSourceType?: Table63MetadataSourceType;
  provenance?: Table63SourceProvenance;
}

export interface Ashrae621FiltrationRequirements {
  minimumMERV: number;
  pm25DesignThreshold: number;
  ozoneNonattainmentRequired: boolean;
}

export interface Ashrae621ExhaustClass {
  class: number;
  recirculationAllowed: boolean | 'limited';
  description: string;
}

export interface Ashrae621AirQualityStandards {
  filtrationRequirements: Ashrae621FiltrationRequirements;
  exhaustClasses: Ashrae621ExhaustClass[];
}

export interface DataProvenance {
  value: number | string | boolean
  unit?: string;
  standard: string;
  edition: string;
  reference: string;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  revision: string;
  verificationDate?: string;
}

export interface SpaceTypeProvenance {
  rp?: DataProvenance;
  ra?: DataProvenance;
  defaultOccupancy?: DataProvenance;
  airClass?: DataProvenance;
  reference?: DataProvenance;
  osPermitted?: DataProvenance;
  rpIp?: DataProvenance;
  raIp?: DataProvenance;
  defaultOccupancyIp?: DataProvenance;
}

export interface ExhaustProvenance {
  rate?: DataProvenance;
  rateIp?: DataProvenance;
  unitType?: DataProvenance;
  airClass?: DataProvenance;
  exhaustClass?: DataProvenance;
  operatingCondition?: DataProvenance;
  reference?: DataProvenance;
  referenceSection?: DataProvenance;
  referenceTable?: DataProvenance;
}

export interface EzProvenance {
  ez?: DataProvenance;
  applicability?: DataProvenance;
  reference?: DataProvenance;
}

// Active scope identifier for production engineering
export const ACTIVE_62_1_2022_SCOPE = "ANSI/ASHRAE Standard 62.1-2022 + Addendum j";

export { 
  type CalculationProductionStatus,
  type SupportedCalculationPath,
  type BlockedCalculationPath,
  type ScopeValidationResult,
  type ProductionCalculationScope,
  VENTILATION_SUPPORTED_PATHS,
  VENTILATION_BLOCKED_PATHS,
  VENTILATION_PRODUCTION_SCOPE,
  ProductionScopeService
} from '../../../calculations/scope/ProductionCalculationScope';

import { 
  ProductionCalculationScope, 
  VENTILATION_PRODUCTION_SCOPE 
} from '../../../calculations/scope/ProductionCalculationScope';

export interface ProductionStandardBasis extends ProductionCalculationScope {
  activeScopeIdentifier: string;
}

export const ASHRAE_62_1_PRODUCTION_BASIS: ProductionStandardBasis = {
  ...VENTILATION_PRODUCTION_SCOPE,
  activeScopeIdentifier: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum j (Exhaust: Addendum x)'
};

export type {
  PersonalizedVentilationPrerequisites,
  StratifiedSystemPrerequisites,
  StratifiedVentilationPrerequisites
} from '../../../calculations/ventilation/EzSelectionService';
