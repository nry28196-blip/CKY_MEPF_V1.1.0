import { SourceType } from '../types';
import { Ashrae621SpaceType, Ashrae621Ez, Ashrae621ExhaustType } from '../types';

/**
 * [FUTURE / DISABLED / NOT ACTIVE]
 * ASHRAE 62.1-2025 is deferred until after the 2022 baseline has been fully validated.
 * This dataset MUST NOT be used in active production calculation paths.
 */
export const IS_621_2025_PRODUCTION_ACTIVE = false;

export const ASHRAE_621_2025_SPACE_TYPES: Ashrae621SpaceType[] = [
  { id: 'office', name: 'Office space', standard: 'ASHRAE 62.1', edition: '2025', category: 'Office', rpMetric: 2.5, raMetric: 0.3, defaultOccupancyMetric: 5.4, units: 'L/s-person, L/s-m2', exhaustRequired: false, reference: 'Table 6.2.2.1', notes: 'Not verified against current published source.', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'conference', name: 'Conference/meeting', standard: 'ASHRAE 62.1', edition: '2025', category: 'Office', rpMetric: 2.5, raMetric: 0.3, defaultOccupancyMetric: 50, units: 'L/s-person, L/s-m2', exhaustRequired: false, reference: 'Table 6.2.2.1', notes: 'Not verified against current published source.', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'retail', name: 'Retail sales', standard: 'ASHRAE 62.1', edition: '2025', category: 'Retail', rpMetric: 3.8, raMetric: 0.6, defaultOccupancyMetric: 15, units: 'L/s-person, L/s-m2', exhaustRequired: false, reference: 'Table 6.2.2.1', notes: 'Not verified against current published source.', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'classroom', name: 'Classroom (ages 9+)', standard: 'ASHRAE 62.1', edition: '2025', category: 'Education', rpMetric: 5.0, raMetric: 0.6, defaultOccupancyMetric: 35, units: 'L/s-person, L/s-m2', exhaustRequired: false, reference: 'Table 6.2.2.1', notes: 'Not verified against current published source.', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'corridor', name: 'Corridor', standard: 'ASHRAE 62.1', edition: '2025', category: 'General', rpMetric: 0, raMetric: 0.3, defaultOccupancyMetric: 0, units: 'L/s-person, L/s-m2', exhaustRequired: false, reference: 'Table 6.2.2.1', notes: 'Not verified against current published source.', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' }
];

export const ASHRAE_621_2025_EZ_VALUES: Ashrae621Ez[] = [
  { id: 'ez-1', name: 'Ceiling Supply / Ceiling Return (Cooling)', ez: 1.0, reference: 'Table 6-4', standard: 'ASHRAE 62.1', edition: '2025', configuration: 'Ceiling Supply / Ceiling Return', applicableCondition: 'Cooling', supplyArrangement: 'Ceiling', returnArrangement: 'Ceiling', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'ez-2', name: 'Ceiling Supply / Ceiling Return (Heating, >= 8C diff)', ez: 0.8, reference: 'Table 6-4', standard: 'ASHRAE 62.1', edition: '2025', configuration: 'Ceiling Supply / Ceiling Return', applicableCondition: 'Heating >= 8C diff', supplyArrangement: 'Ceiling', returnArrangement: 'Ceiling', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'ez-3', name: 'Floor Supply / Ceiling Return (Low Velocity)', ez: 1.2, reference: 'Table 6-4', standard: 'ASHRAE 62.1', edition: '2025', configuration: 'Floor Supply / Ceiling Return', applicableCondition: 'Low Velocity', supplyArrangement: 'Floor', returnArrangement: 'Ceiling', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'ez-4', name: 'Floor Supply / Ceiling Return (High Velocity)', ez: 1.0, reference: 'Table 6-4', standard: 'ASHRAE 62.1', edition: '2025', configuration: 'Floor Supply / Ceiling Return', applicableCondition: 'High Velocity', supplyArrangement: 'Floor', returnArrangement: 'Ceiling', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' }
];

export const ASHRAE_621_2025_EXHAUST_RATES: Ashrae621ExhaustType[] = [
  { id: 'toilet_public', name: 'Toilet rooms - Public', category: 'Public', standard: 'ASHRAE 62.1',
    rate: 25, unitType: 'fixture', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'toilet_private', name: 'Toilet rooms - Private', category: 'Private', standard: 'ASHRAE 62.1',
    rate: 12.5, unitType: 'fixture', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'kitchen_commercial', name: 'Commercial kitchen', category: 'Commercial', standard: 'ASHRAE 62.1',
    rate: 3.5, unitType: 'm2', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'parking_garage', name: 'Enclosed parking garage', category: 'Parking', standard: 'ASHRAE 62.1',
    rate: 3.7, unitType: 'm2', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'janitor', name: 'Janitor closet', category: 'Service', standard: 'ASHRAE 62.1',
    rate: 5.0, unitType: 'm2', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' },
  { id: 'copy_room', name: 'Copy, printing room', category: 'Office', standard: 'ASHRAE 62.1',
    rate: 2.5, unitType: 'm2', operatingCondition: 'Continuous', exhaustClass: 2, reference: 'Section 6.5.1, Table 6-2', edition: '2025', revisionState: {
    standard: 'ASHRAE 62.1',
    edition: '2025',
    baseEdition: '2025',
    publishedAddendaApplied: ["a"],
    publishedErrataApplied: ["August 27, 2026"],
    verificationDate: '2026-09-08',
    source: SourceType.UNKNOWN
  }, sourceType: SourceType.PUBLIC_REVIEW_DRAFT, verificationStatus: 'NOT_VERIFIED', verificationDate: '2026-09-07' }
];

export * from '../types';

export const ASHRAE_621_2025_AIR_QUALITY_STANDARDS = {
  filtrationRequirements: {
    minimumMERV: 8,
    pm25DesignThreshold: 12,
    ozoneNonattainmentRequired: true
  },
  exhaustClasses: [
    {
      class: 1,
      recirculationAllowed: true,
      description: "Low contaminant concentration"
    },
    {
      class: 2,
      recirculationAllowed: "limited",
      description: "Moderate contaminant concentration"
    },
    {
      class: 3,
      recirculationAllowed: false,
      description: "Significant contaminant concentration"
    },
    {
      class: 4,
      recirculationAllowed: false,
      description: "Highly objectionable/harmful"
    }
  ]
};
