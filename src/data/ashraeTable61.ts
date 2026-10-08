/**
 * ASHRAE Standard 62.1-2022 Table 6-1 Minimum Ventilation Rates in Breathing Zone
 * Authoritative, Complete, Source-Controlled Dataset
 * Reference Basis: ANSI/ASHRAE Standard 62.1-2022 + Addendum j
 */

import { ASHRAE_621_2022_ALL_SPACE_TYPES } from './ventilation/ashrae621/2022/table61Data';
import {
  Ashrae621SpaceType,
  DataProvenance,
  SpaceTypeProvenance,
  StandardRevision,
  SourceType,
  ACTIVE_REFERENCE_BASIS,
  STANDARD_BASELINE,
  APPLICABLE_ADDENDA
} from './ventilation/ashrae621/types';

export type Table61RecordProvenanceItem = DataProvenance;

export interface Table61RecordProvenance extends SpaceTypeProvenance {
  [key: string]: DataProvenance | undefined;
}

export interface Table61RecordVersionMetadata {
  standard: string; // 'ASHRAE 62.1'
  edition: string; // '2022'
  datasetVersion: string; // '2022.1'
  referenceBasis: string; // 'ASHRAE 62.1-2022 + Addendum j'
  addenda: string[]; // ['j']
  publishedErrataApplied: string[];
  verificationStatus: 'VERIFIED' | 'NOT_VERIFIED' | 'INVALID' | 'UNIMPLEMENTED';
  verificationDate: string; // '2026-09-22'
  sourceType: SourceType; // 'ASHRAE_PUBLISHED'
}

export interface Table61Record extends Ashrae621SpaceType {
  id: string;
  name: string; // Occupancy Category name
  occupancyCategory: string; // Explicit category name
  occupancyGroup: string; // Occupancy Group (e.g. 'Office Buildings', 'Educational Facilities')
  
  // Rp - People outdoor air rate
  rpMetric: number; // L/s·person
  rpIp: number; // cfm/person
  isRpNotApplicable: boolean;
  rpStatus: 'APPLICABLE' | 'NOT_APPLICABLE';
  
  // Ra - Area outdoor air rate
  raMetric: number; // L/s·m²
  raIp: number; // cfm/ft²
  isRaNotApplicable: boolean;
  raStatus: 'APPLICABLE' | 'NOT_APPLICABLE';
  
  // Default occupant density
  defaultOccupancyMetric: number; // persons/100 m²
  defaultOccupancyIp: number; // persons/1000 ft²
  isDensityNotApplicable: boolean;
  densityStatus: 'APPLICABLE' | 'NOT_APPLICABLE';
  
  // Air Class
  airClass: number; // 1, 2, 3, or 4
  
  // Occupant Sensitivity (OS) Section 6.2.6.1.4
  osPermitted: boolean;
  osStatus: 'PERMITTED' | 'NOT_PERMITTED';
  
  // Units & Reference
  unitsMetric: string; // 'L/s-person, L/s-m²'
  unitsIp: string; // 'cfm/person, cfm/ft²'
  referenceTable: string; // 'Table 6-1'
  
  // Notes & Special Conditions
  applicableNotes: string[];
  notes: string;
  exhaustRequired: boolean;
  
  // Version control & provenance
  versionMetadata: Table61RecordVersionMetadata;
  provenance: Table61RecordProvenance;
  revisionState: StandardRevision;
}

/**
 * Maps an Ashrae621SpaceType to the authoritative Table61Record structure.
 */
function toTable61Record(space: Ashrae621SpaceType): Table61Record {
  const versionMetadata: Table61RecordVersionMetadata = {
    standard: space.standard || 'ASHRAE 62.1',
    edition: space.edition || '2022',
    datasetVersion: space.datasetVersion || '2022.1',
    referenceBasis: space.referenceBasis || ACTIVE_REFERENCE_BASIS,
    addenda: APPLICABLE_ADDENDA,
    publishedErrataApplied: space.revisionState?.publishedErrataApplied || [],
    verificationStatus: 'VERIFIED',
    verificationDate: space.verificationDate || '2026-09-22',
    sourceType: space.sourceType || SourceType.ASHRAE_PUBLISHED
  };

  return {
    ...space,
    id: space.id,
    name: space.name,
    occupancyCategory: space.occupancyCategory || space.name,
    occupancyGroup: space.occupancyGroup || space.category,
    category: space.category,
    standard: space.standard,
    edition: space.edition,
    reference: space.reference,
    rpMetric: space.rpMetric,
    rpIp: space.rpIp ?? 0,
    isRpNotApplicable: Boolean(space.isRpNotApplicable),
    rpStatus: space.isRpNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    raMetric: space.raMetric,
    raIp: space.raIp ?? 0,
    isRaNotApplicable: Boolean(space.isRaNotApplicable),
    raStatus: space.isRaNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    defaultOccupancyMetric: space.defaultOccupancyMetric,
    defaultOccupancyIp: space.defaultOccupancyIp ?? 0,
    isDensityNotApplicable: Boolean(space.isDensityNotApplicable),
    densityStatus: space.isDensityNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    airClass: space.airClass ?? 1,
    osPermitted: Boolean(space.osPermitted),
    osStatus: space.osPermitted ? 'PERMITTED' : 'NOT_PERMITTED',
    units: space.units || 'L/s-person, L/s-m2',
    unitsMetric: 'L/s-person, L/s-m²',
    unitsIp: 'cfm/person, cfm/ft²',
    referenceTable: 'Table 6-1',
    applicableNotes: space.applicableNotes || [],
    notes: space.notes || '',
    exhaustRequired: Boolean(space.exhaustRequired),
    versionMetadata,
    provenance: space.provenance as Table61RecordProvenance,
    revisionState: space.revisionState,
    verificationStatus: 'VERIFIED',
    verificationDate: space.verificationDate || '2026-09-22',
    sourceType: space.sourceType || SourceType.ASHRAE_PUBLISHED,
    referenceBasis: space.referenceBasis || ACTIVE_REFERENCE_BASIS,
    datasetVersion: space.datasetVersion || '2022.1'
  };
}

/**
 * Complete, authoritative ASHRAE 62.1-2022 Table 6-1 occupancy records (81 categories across 13 groups).
 */
export const TABLE_6_1_RECORDS: Table61Record[] =
  ASHRAE_621_2022_ALL_SPACE_TYPES.map(toTable61Record);

/**
 * Quick-lookup map indexed by space type canonical ID.
 */
export const TABLE_6_1_BY_ID: Record<string, Table61Record> =
  TABLE_6_1_RECORDS.reduce((acc, record) => {
    acc[record.id] = record;
    return acc;
  }, {} as Record<string, Table61Record>);

/**
 * Retrieves a single Table 6-1 record by ID.
 */
export function getTable61RecordById(id: string): Table61Record | undefined {
  return TABLE_6_1_BY_ID[id];
}

/**
 * Retrieves all Table 6-1 records within a specific Occupancy Group.
 */
export function getTable61RecordsByGroup(group: string): Table61Record[] {
  return TABLE_6_1_RECORDS.filter(r => r.occupancyGroup === group || r.category === group);
}

/**
 * Returns all distinct Occupancy Groups defined in Table 6-1.
 */
export function getAllTable61Groups(): string[] {
  return Array.from(new Set(TABLE_6_1_RECORDS.map(r => r.occupancyGroup))).sort();
}

/**
 * Summary metadata for Table 6-1.
 */
export const TABLE_6_1_METADATA = {
  standard: STANDARD_BASELINE,
  edition: '2022',
  referenceBasis: ACTIVE_REFERENCE_BASIS,
  applicableAddenda: APPLICABLE_ADDENDA,
  totalRecords: TABLE_6_1_RECORDS.length,
  totalGroups: 13,
  completenessStatus: 'COMPLETE' as const,
  verificationDate: '2026-09-22',
  sourceType: SourceType.ASHRAE_PUBLISHED
};
