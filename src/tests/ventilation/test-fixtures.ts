import { AshraeEdition, Ashrae621SpaceType, Ashrae621Ez, Ashrae621ExhaustType, SourceType, StandardRevision } from '../../data/ventilation/ashrae621/types';

export interface MalformedStandardRevision extends Omit<StandardRevision, 'verificationDate'> {
  verificationDate?: unknown;
}

export interface MalformedAshrae621SpaceType extends Omit<Ashrae621SpaceType, 'revisionState' | 'verificationDate'> {
  revisionState: MalformedStandardRevision;
  verificationDate?: unknown;
}

export interface MalformedAshrae621Ez extends Omit<Ashrae621Ez, 'revisionState' | 'verificationDate'> {
  revisionState: MalformedStandardRevision;
  verificationDate?: unknown;
}

export interface MalformedAshrae621ExhaustType extends Omit<Ashrae621ExhaustType, 'revisionState' | 'verificationDate'> {
  revisionState: MalformedStandardRevision;
  verificationDate?: unknown;
}

export function withMalformedSpaceType(
  space: Ashrae621SpaceType,
  mutator: (malformed: MalformedAshrae621SpaceType) => void
): Ashrae621SpaceType {
  const clone = JSON.parse(JSON.stringify(space));
  mutator(clone);
  return clone as unknown as Ashrae621SpaceType;
}

export function withMalformedEz(
  ez: Ashrae621Ez,
  mutator: (malformed: MalformedAshrae621Ez) => void
): Ashrae621Ez {
  const clone = JSON.parse(JSON.stringify(ez));
  mutator(clone);
  return clone as unknown as Ashrae621Ez;
}

export function withMalformedExhaust(
  ex: Ashrae621ExhaustType,
  mutator: (malformed: MalformedAshrae621ExhaustType) => void
): Ashrae621ExhaustType {
  const clone = JSON.parse(JSON.stringify(ex));
  mutator(clone);
  return clone as unknown as Ashrae621ExhaustType;
}

export function createSyntheticVerifiedSpaceType(edition: AshraeEdition): Ashrae621SpaceType {
  return {
    id: `synthetic-office-${edition}`,
    name: 'Synthetic Verified Office',
    category: 'Test',
    standard: 'ASHRAE 62.1',
    edition: edition,
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    revisionState: {
      source: SourceType.ASHRAE_PUBLISHED,
      standard: 'ASHRAE 62.1',
      edition: edition,
      baseEdition: edition,
      publishedAddendaApplied: [],
      publishedErrataApplied: [],
      verificationDate: '2025-01-01'
    },
    verificationDate: '2025-01-01',
    reference: 'Synthetic Test Data',
    units: 'Test',
    exhaustRequired: false,
    notes: 'Test',
    rpMetric: 2.5,
    raMetric: 0.3,
    defaultOccupancyMetric: 5.4,
    provenance: {
      rp: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 2.5, revision: edition },
      ra: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 0.3, revision: edition },
      defaultOccupancy: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 5.4, revision: edition },
      reference: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'Synthetic Test Data', revision: edition }
    }
  };
}

export function createSyntheticVerifiedExhaust(edition: AshraeEdition): Ashrae621ExhaustType {
  return {
    id: `synthetic-exhaust-${edition}`,
    name: 'Synthetic Verified Exhaust',
    category: 'Test',
    operatingCondition: 'Test',    
    standard: 'ASHRAE 62.1',
    edition: edition,
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    revisionState: {
      source: SourceType.ASHRAE_PUBLISHED,
      standard: 'ASHRAE 62.1',
      edition: edition,
      baseEdition: edition,
      publishedAddendaApplied: [],
      publishedErrataApplied: [],
      verificationDate: '2025-01-01'
    },
    verificationDate: '2025-01-01',
    reference: 'Synthetic Test Data',
    rate: 25,
    unitType: 'fixture',
    exhaustClass: 2,
    provenance: {
      rate: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 25, revision: edition },
      unitType: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'fixture', revision: edition },
      exhaustClass: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 2, revision: edition },
      operatingCondition: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'Test', revision: edition },
      reference: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'Synthetic Test Data', revision: edition }
    }
  };
}

export function createSyntheticVerifiedEz(edition: AshraeEdition): Ashrae621Ez {
  return {
    id: `synthetic-ez-${edition}`,
    name: 'Synthetic Verified Ez',
    standard: 'ASHRAE 62.1',
    edition: edition,
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    revisionState: {
      source: SourceType.ASHRAE_PUBLISHED,
      standard: 'ASHRAE 62.1',
      edition: edition,
      baseEdition: edition,
      publishedAddendaApplied: [],
      publishedErrataApplied: [],
      verificationDate: '2025-01-01'
    },
    verificationDate: '2025-01-01',
    reference: 'Synthetic Test Data',
    ez: 1.0,
    configuration: 'Test',
    applicableCondition: 'Test',
    supplyArrangement: 'Test',
    returnArrangement: 'Test',
    provenance: {
      ez: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 1.0, revision: edition },
      applicability: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'Test', revision: edition },
      reference: { sourceType: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: edition, verificationStatus: 'VERIFIED', verificationDate: '2025-01-01', reference: 'Synthetic Test Data', value: 'Synthetic Test Data', revision: edition }
    }
  };
}
