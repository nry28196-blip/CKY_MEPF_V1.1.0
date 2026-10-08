import { Ashrae621SpaceType, SourceType, VerificationStatus } from '../types';

export interface Table61SpaceTypeSpec {
  id: string;
  name: string; // Table 6-1 Occupancy Category
  group: string; // Table 6-1 Occupancy Group
  rpMetric: number; // L/s-person
  rpIp: number; // cfm/person
  isRpNotApplicable?: boolean;
  raMetric: number; // L/s-m2
  raIp: number; // cfm/ft2
  isRaNotApplicable?: boolean;
  defaultOccupancyMetric: number; // #/100 m2
  defaultOccupancyIp: number; // #/1000 ft2
  isDensityNotApplicable?: boolean;
  airClass: number; // 1, 2, 3, or 4
  osPermitted?: boolean; // Occupant Sensitivity (OS) permitted per Table 6-1 / 6.2.6.1.4
  notes?: string;
  applicableNotes?: string[];
  sourceNoteCondition?: string;
  expectedOccupancyIndicator?: string;
  co2DeltaC?: number | string | null;
  verificationStatus?: VerificationStatus;
}

export function createTable61SpaceType(spec: Table61SpaceTypeSpec): Ashrae621SpaceType {
  const verificationDate = '2026-09-22';
  const status: VerificationStatus = spec.verificationStatus ?? 'VERIFIED';
  const isVerified = status === 'VERIFIED';
  const sourceType = isVerified ? SourceType.ASHRAE_PUBLISHED : SourceType.PUBLIC_REVIEW_DRAFT;

  return {
    id: spec.id,
    name: spec.name,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    category: spec.group,
    occupancyGroup: spec.group,
    occupancyCategory: spec.name,
    rpMetric: spec.rpMetric,
    rpIp: spec.rpIp,
    rpStatus: spec.isRpNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    isRpNotApplicable: !!spec.isRpNotApplicable,
    raMetric: spec.raMetric,
    raIp: spec.raIp,
    raStatus: spec.isRaNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    isRaNotApplicable: !!spec.isRaNotApplicable,
    defaultOccupancyMetric: spec.defaultOccupancyMetric,
    defaultOccupancyIp: spec.defaultOccupancyIp,
    densityUnitMetric: '#/100 m²',
    densityUnitIp: '#/1000 ft²',
    densityStatus: spec.isDensityNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
    isDensityNotApplicable: !!spec.isDensityNotApplicable,
    airClass: spec.airClass,
    osPermitted: !!spec.osPermitted,
    osStatus: spec.osPermitted ? 'PERMITTED' : 'NOT_PERMITTED',
    units: 'L/s-person, L/s-m2',
    exhaustRequired: false,
    reference: 'Table 6-1',
    notes: spec.notes || `Table 6-1 ${spec.group} - ${spec.name}`,
    applicableNotes: spec.applicableNotes || [],
    sourceStandard: 'ANSI/ASHRAE Standard 62.1-2022',
    sourceTable: 'Table 6-1',
    sourceNoteCondition: spec.sourceNoteCondition || '—',
    expectedOccupancyIndicator: spec.expectedOccupancyIndicator || (spec.isDensityNotApplicable ? 'Transient/Unoccupied' : 'Occupied'),
    co2DeltaC: spec.co2DeltaC ?? null,
    datasetVersion: '2022.1',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum j',
    addenda: ['j'],
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['j'],
      publishedErrataApplied: [],
      verificationDate,
      source: sourceType
    },
    sourceType,
    verificationStatus: status,
    verificationDate,
    provenance: {
      rp: {
        value: spec.rpMetric,
        unit: 'L/s-person',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      ra: {
        value: spec.raMetric,
        unit: 'L/s-m2',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      defaultOccupancy: {
        value: spec.defaultOccupancyMetric,
        unit: '#/100 m²',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      airClass: {
        value: spec.airClass,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      osPermitted: {
        value: !!spec.osPermitted,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1 / 6.2.6.1.4',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      reference: {
        value: 'Table 6-1',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      rpIp: {
        value: spec.rpIp,
        unit: 'cfm/person',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      raIp: {
        value: spec.raIp,
        unit: 'cfm/ft2',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      },
      defaultOccupancyIp: {
        value: spec.defaultOccupancyIp,
        unit: '#/1000 ft²',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Table 6-1',
        sourceType,
        verificationStatus: status,
        revision: '2022',
        verificationDate
      }
    }
  };
}
