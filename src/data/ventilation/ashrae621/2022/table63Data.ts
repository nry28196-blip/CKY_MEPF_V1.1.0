/**
 * ASHRAE 62.1-2022 Table 6-3 Production Dataset
 * Standard: ANSI/ASHRAE Standard 62.1-2022 Section 6.5.1 and Table 6-3
 * Reference Basis: ANSI/ASHRAE Standard 62.1-2022 + Addendum x
 * Source: ANSI/ASHRAE Standard 62.1-2022 Published Standard, Section 6.5.1 & Table 6-3 "Airstreams or Sources"
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * 1. This file is the production dataset. It MUST NOT import from authoritativeTable63.ts.
 * 2. Table 6-3 provides required Air Class classification for listed airstreams/sources.
 * 3. Table 6-3 is NOT a second numeric exhaust-rate table. Do NOT invent numeric exhaust rates.
 */

import { Ashrae621Table63Source, SourceType } from '../types';

export const ASHRAE_621_2022_TABLE_6_3_SOURCES: Ashrae621Table63Source[] = [
  {
    id: 'kitchen_grease_hoods',
    name: 'Kitchen grease hoods',
    description: 'Commercial kitchen grease hoods (Type I hoods) discharging grease vapors, smoke, and cooking effluent',
    airClass: 4,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Exhaust airflow shall be designed in accordance with ANSI/ASHRAE Standard 154 (Section 6.5.1.2.3). Air Class 4 prohibits recirculation or transfer to other spaces.',
    specialStandardReference: 'ANSI/ASHRAE Standard 154',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'ANSI/ASHRAE Standard 154',
        organization: 'ASHRAE',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Exhaust airflow shall be designed in accordance with ANSI/ASHRAE Standard 154 (Section 6.5.1.2.3).'
      }
    }
  },
  {
    id: 'kitchen_hoods_non_grease',
    name: 'Kitchen hoods other than grease hoods',
    description: 'Commercial kitchen hoods other than grease hoods (Type II hoods) discharging steam, vapor, heat, or non-grease fumes',
    airClass: 3,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Exhaust airflow shall be designed in accordance with ANSI/ASHRAE Standard 154 (Section 6.5.1.2.3). Air Class 3 permits recirculation only within the space of origin.',
    specialStandardReference: 'ANSI/ASHRAE Standard 154',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 3,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'ANSI/ASHRAE Standard 154',
        organization: 'ASHRAE',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Exhaust airflow shall be designed in accordance with ANSI/ASHRAE Standard 154 (Section 6.5.1.2.3).'
      }
    }
  },
  {
    id: 'diazo_printing_discharge',
    name: 'Diazo printing equipment discharge',
    description: 'Diazo printing and reproduction equipment exhaust discharge containing ammonia or solvent vapors',
    airClass: 4,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Direct discharge required outdoors without recirculation or transfer.',
    specialStandardReference: 'Manufacturer / EHS containment specifications',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'Manufacturer / EHS containment specifications',
        organization: 'Manufacturer / EHS',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Direct discharge required outdoors without recirculation or transfer per manufacturer and EHS containment specifications.'
      }
    }
  },
  {
    id: 'hydraulic_elevator_machine_room',
    name: 'Hydraulic elevator machine room',
    description: 'Hydraulic elevator machine rooms housing hydraulic fluid reservoirs, pumps, and control valves',
    airClass: 2,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Air Class 2 classification. Recirculation to other Class 2 spaces permitted, but prohibited to Class 1 spaces.',
    specialStandardReference: 'ASME A17.1 / Elevator engineering specifications',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 2,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'ASME A17.1 / Elevator engineering specifications',
        organization: 'ASME',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Ventilation and elevator machinery safety governed by ASME A17.1 / Elevator engineering specifications.'
      }
    }
  },
  {
    id: 'laboratory_hoods',
    name: 'Laboratory hoods',
    description: 'Laboratory chemical fume hoods, biological containment hoods, and localized bench containment exhaust',
    airClass: 4,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Exhaust systems shall comply with ANSI/AIHA/ASSE Z9.5 and NFPA 45. Air Class 4 prohibits any recirculation or transfer.',
    specialStandardReference: 'ANSI/AIHA Z9.5 / NFPA 45',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'ANSI/AIHA Z9.5 / NFPA 45',
        organization: 'ANSI/AIHA / NFPA',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Exhaust systems shall comply with ANSI/AIHA/ASSE Z9.5 and NFPA 45.'
      }
    }
  },
  {
    id: 'paint_spray_booths',
    name: 'Paint spray booths',
    description: 'Paint spray booths, spray rooms, and finishing enclosures discharging flammable or solvent aerosols',
    airClass: 4,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Also listed in Table 6-2 (numeric rates governed by OSHA 1910.107 / NFPA 33). Table 6-3 classifies airstream as Air Class 4.',
    specialStandardReference: 'OSHA 1910.107 / NFPA 33',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'OSHA 1910.107 / NFPA 33',
        organization: 'OSHA / NFPA',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Also listed in Table 6-2 (numeric rates governed by OSHA 1910.107 / NFPA 33). Table 6-3 classifies airstream as Air Class 4.'
      }
    }
  },
  {
    id: 'refrigerating_machinery',
    name: 'Refrigerating machinery rooms',
    description: 'Refrigerating machinery rooms housing mechanical refrigeration compressors, pressure vessels, and piping',
    airClass: 3,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    referenceSection: '6.5.1',
    referenceTable: 'Table 6-3',
    reference: 'Section 6.5.1, Table 6-3',
    referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
    sourceType: SourceType.ASHRAE_PUBLISHED,
    verificationStatus: 'VERIFIED',
    verificationDate: '2026-09-22',
    applicableAddenda: ['Addendum x'],
    notes: 'Also listed in Table 6-2 (emergency and continuous ventilation rates governed by ANSI/ASHRAE Standard 15). Table 6-3 classifies airstream as Air Class 3.',
    specialStandardReference: 'ANSI/ASHRAE Standard 15',
    metadataSourceType: 'STANDARD_TABLE',
    revisionState: {
      standard: 'ASHRAE 62.1',
      edition: '2022',
      baseEdition: '2022',
      publishedAddendaApplied: ['Addendum x'],
      publishedErrataApplied: [],
      verificationDate: '2026-09-22',
      source: SourceType.ASHRAE_PUBLISHED
    },
    provenance: {
      airClass: {
        value: 3,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      reference: {
        value: 'Section 6.5.1, Table 6-3',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        revision: '2022',
        verificationDate: '2026-09-22'
      },
      supplementaryGuidance: {
        reference: 'ANSI/ASHRAE Standard 15',
        organization: 'ASHRAE',
        role: 'SUPPLEMENTARY_GUIDANCE',
        notes: 'Emergency and continuous ventilation rates governed by ANSI/ASHRAE Standard 15.'
      }
    }
  }
];
