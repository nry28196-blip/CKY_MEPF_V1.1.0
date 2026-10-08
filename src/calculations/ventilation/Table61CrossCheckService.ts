import {
  Ashrae621SpaceType,
  DatasetCompletenessStatus,
  ACTIVE_REFERENCE_BASIS,
  STANDARD_BASELINE
} from '../../data/ventilation/ashrae621/types';
import {
  AUTHORITATIVE_TABLE_6_1,
  AUTHORITATIVE_GROUPS,
  AUTHORITATIVE_COUNT,
  AuthoritativeTable61Record
} from '../../data/ventilation/ashrae621/2022/authoritativeTable61';

export interface FieldDiscrepancy {
  spaceId: string;
  spaceName: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  severity: 'ERROR' | 'WARNING';
  description: string;
}

export interface CrossCheckItemResult {
  parameter: 'Rp' | 'Ra' | 'OccupantDensity';
  publishedIp: number;
  publishedSi: number;
  calculatedSi: number;
  variancePercent: number;
  isDiscrepancy: boolean;
  note: string;
}

export interface SpaceTypeCrossCheckResult {
  id: string;
  name: string;
  group: string;
  checks: CrossCheckItemResult[];
  hasDiscrepancies: boolean;
}

export interface Table61AuditReport {
  referenceBasis: string;
  totalRecords: number;
  requiredRecordsCount: number;
  completenessStatus: DatasetCompletenessStatus;
  occupancyGroupsCount: number;
  occupancyGroups: string[];
  discrepanciesCount: number;
  results: SpaceTypeCrossCheckResult[];
  fieldDiscrepancies?: FieldDiscrepancy[];
  isCompliant?: boolean;
}

export interface Table61IndependentAuditReport {
  referenceBasis: string;
  standard: string;
  edition: string;
  totalExpectedCategories: number;
  totalActualCategories: number;
  missingCategories: string[];
  extraCategories: string[];
  duplicateCategories: string[];
  valueDiscrepancies: FieldDiscrepancy[];
  discrepanciesCount: number;
  isCompliant: boolean;
  completenessStatus: DatasetCompletenessStatus;
  occupancyGroupsCount: number;
  occupancyGroups: string[];
  auditTimestamp: string;
  results: SpaceTypeCrossCheckResult[];
}

export class Table61CrossCheckService {
  // Conversion factors
  static readonly CFM_TO_LPS = 0.471947443;
  static readonly SQFT_TO_SQM = 0.09290304;
  static readonly CFM_PER_SQFT_TO_LPS_PER_SQM = 0.471947443 / 0.09290304; // ~5.08001
  static readonly DENSITY_IP_TO_SI_FACTOR = 100 / (1000 * 0.09290304); // ~1.076391

  static readonly EXPECTED_TOTAL_CATEGORIES = AUTHORITATIVE_COUNT; // 81
  static readonly EXPECTED_GROUPS = [...AUTHORITATIVE_GROUPS]; // 13 groups

  /**
   * Cross-checks a single Table 6-1 space type for numerical consistency between SI and IP.
   */
  static crossCheckRecord(space: Ashrae621SpaceType): SpaceTypeCrossCheckResult {
    const checks: CrossCheckItemResult[] = [];

    // 1. Rp Check: L/s·person vs cfm/person
    if (space.rpIp !== undefined && !space.isRpNotApplicable) {
      const calculatedSiRp = Number((space.rpIp * this.CFM_TO_LPS).toFixed(3));
      const variance = space.rpMetric !== 0 
        ? Math.abs((space.rpMetric - calculatedSiRp) / space.rpMetric) * 100 
        : 0;
      
      const isExpectedNominal = variance < 15; // ASHRAE nominal rounding is within ~7%
      checks.push({
        parameter: 'Rp',
        publishedIp: space.rpIp,
        publishedSi: space.rpMetric,
        calculatedSi: calculatedSiRp,
        variancePercent: Number(variance.toFixed(2)),
        isDiscrepancy: !isExpectedNominal,
        note: isExpectedNominal
          ? `Standard ASHRAE Table 6-1 nominal rounded value (published SI: ${space.rpMetric}, converted: ${calculatedSiRp} L/s·person)`
          : `Discrepancy detected: published SI ${space.rpMetric} differs noticeably from converted ${calculatedSiRp} L/s·person`
      });
    }

    // 2. Ra Check: L/s·m² vs cfm/ft²
    if (space.raIp !== undefined && !space.isRaNotApplicable) {
      const calculatedSiRa = Number((space.raIp * this.CFM_PER_SQFT_TO_LPS_PER_SQM).toFixed(3));
      const variance = space.raMetric !== 0
        ? Math.abs((space.raMetric - calculatedSiRa) / space.raMetric) * 100
        : 0;
      
      const isExpectedNominal = variance < 10;
      checks.push({
        parameter: 'Ra',
        publishedIp: space.raIp,
        publishedSi: space.raMetric,
        calculatedSi: calculatedSiRa,
        variancePercent: Number(variance.toFixed(2)),
        isDiscrepancy: !isExpectedNominal,
        note: isExpectedNominal
          ? `Standard ASHRAE Table 6-1 nominal rounded value (published SI: ${space.raMetric}, converted: ${calculatedSiRa} L/s·m²)`
          : `Discrepancy detected: published SI ${space.raMetric} differs noticeably from converted ${calculatedSiRa} L/s·m²`
      });
    }

    // 3. Occupant Density Check: #/100 m² vs #/1000 ft²
    if (space.defaultOccupancyIp !== undefined && !space.isDensityNotApplicable) {
      const calculatedSiDensity = Number((space.defaultOccupancyIp * this.DENSITY_IP_TO_SI_FACTOR).toFixed(2));
      const variance = space.defaultOccupancyMetric !== 0
        ? Math.abs((space.defaultOccupancyMetric - calculatedSiDensity) / space.defaultOccupancyMetric) * 100
        : 0;
      
      const isDirectNominal = space.defaultOccupancyMetric === space.defaultOccupancyIp;
      checks.push({
        parameter: 'OccupantDensity',
        publishedIp: space.defaultOccupancyIp,
        publishedSi: space.defaultOccupancyMetric,
        calculatedSi: calculatedSiDensity,
        variancePercent: Number(variance.toFixed(2)),
        isDiscrepancy: !isDirectNominal && variance > 12,
        note: isDirectNominal
          ? `Published SI uses intentional ASHRAE Table 6-1 nominal equivalence (#/100 m² = ${space.defaultOccupancyMetric}, physical equivalent: ${calculatedSiDensity} #/100 m²)`
          : `Density variance: published ${space.defaultOccupancyMetric} vs converted ${calculatedSiDensity}`
      });
    }

    const hasDiscrepancies = checks.some(c => c.isDiscrepancy);

    return {
      id: space.id,
      name: space.name,
      group: space.category || space.occupancyGroup || 'Unknown',
      checks,
      hasDiscrepancies
    };
  }

  /**
   * Compares the live spaceTypes dataset against the independent authoritative Table 6-1 fixture.
   * Detects:
   *  - Missing occupancy categories
   *  - Extra/non-standard categories
   *  - Duplicate categories
   *  - Value discrepancies (Rp, Ra, Occupant Density, Air Class, OS, Notes)
   */
  static auditAgainstAuthoritative(
    spaceTypes: Ashrae621SpaceType[],
    fixture: readonly AuthoritativeTable61Record[] = AUTHORITATIVE_TABLE_6_1
  ): Table61IndependentAuditReport {
    const missingCategories: string[] = [];
    const extraCategories: string[] = [];
    const duplicateCategories: string[] = [];
    const valueDiscrepancies: FieldDiscrepancy[] = [];

    // Map live dataset
    const liveById = new Map<string, Ashrae621SpaceType>();
    const seenIds = new Set<string>();

    for (const space of spaceTypes) {
      if (seenIds.has(space.id)) {
        duplicateCategories.push(space.id);
      } else {
        seenIds.add(space.id);
        liveById.set(space.id, space);
      }
    }

    // Build authoritative lookup maps
    const fixtureById = new Map<string, AuthoritativeTable61Record>();
    const fixtureByName = new Map<string, AuthoritativeTable61Record>();

    for (const auth of fixture) {
      fixtureById.set(auth.id, auth);
      fixtureByName.set(auth.standardCategory.toLowerCase(), auth);
    }

    // 1. Check coverage from authoritative fixture -> live
    for (const auth of fixture) {
      const live = liveById.get(auth.id);
      if (!live) {
        // Try fallback by name
        const matchByName = spaceTypes.find(
          s => s.name.trim().toLowerCase() === auth.standardCategory.trim().toLowerCase()
        );
        if (!matchByName) {
          missingCategories.push(`${auth.occupancyGroup}: ${auth.standardCategory} (id: ${auth.id})`);
        }
      }
    }

    // 2. Check for extra categories in live -> authoritative
    for (const space of spaceTypes) {
      const auth = fixtureById.get(space.id) || fixtureByName.get(space.name.trim().toLowerCase());
      if (!auth) {
        extraCategories.push(`${space.occupancyGroup || space.category}: ${space.name} (id: ${space.id})`);
      }
    }

    // 3. Value-by-value audit on matching records
    for (const auth of fixture) {
      const live = liveById.get(auth.id) || spaceTypes.find(
        s => s.name.trim().toLowerCase() === auth.standardCategory.trim().toLowerCase()
      );
      if (!live) continue;

      const spaceId = live.id;
      const spaceName = live.name;

      // Rp check SI
      if (auth.isRpNotApplicable) {
        if (!live.isRpNotApplicable || live.rpMetric !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'rpMetric',
            expectedValue: 0,
            actualValue: live.rpMetric,
            severity: 'ERROR',
            description: `Rp is not applicable in Table 6-1 for ${auth.standardCategory}, but live record has ${live.rpMetric}`
          });
        }
      } else {
        if (Math.abs(live.rpMetric - auth.rpMetric) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'rpMetric',
            expectedValue: auth.rpMetric,
            actualValue: live.rpMetric,
            severity: 'ERROR',
            description: `Expected Rp (SI) = ${auth.rpMetric} L/s·person, but live dataset has ${live.rpMetric}`
          });
        }
      }

      // Rp check IP
      if (auth.isRpNotApplicable) {
        if (live.rpIp && live.rpIp !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'rpIp',
            expectedValue: 0,
            actualValue: live.rpIp,
            severity: 'ERROR',
            description: `Rp is not applicable in Table 6-1 for ${auth.standardCategory}, but live record has rpIp = ${live.rpIp}`
          });
        }
      } else if (live.rpIp !== undefined) {
        if (Math.abs(live.rpIp - auth.rpIp) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'rpIp',
            expectedValue: auth.rpIp,
            actualValue: live.rpIp,
            severity: 'ERROR',
            description: `Expected Rp (I-P) = ${auth.rpIp} cfm/person, but live dataset has ${live.rpIp}`
          });
        }
      }

      // Ra check SI
      if (auth.isRaNotApplicable) {
        if (!live.isRaNotApplicable || live.raMetric !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'raMetric',
            expectedValue: 0,
            actualValue: live.raMetric,
            severity: 'ERROR',
            description: `Ra is not applicable in Table 6-1 for ${auth.standardCategory}, but live record has ${live.raMetric}`
          });
        }
      } else {
        if (Math.abs(live.raMetric - auth.raMetric) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'raMetric',
            expectedValue: auth.raMetric,
            actualValue: live.raMetric,
            severity: 'ERROR',
            description: `Expected Ra (SI) = ${auth.raMetric} L/s·m², but live dataset has ${live.raMetric}`
          });
        }
      }

      // Ra check IP
      if (auth.isRaNotApplicable) {
        if (live.raIp && live.raIp !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'raIp',
            expectedValue: 0,
            actualValue: live.raIp,
            severity: 'ERROR',
            description: `Ra is not applicable in Table 6-1 for ${auth.standardCategory}, but live record has raIp = ${live.raIp}`
          });
        }
      } else if (live.raIp !== undefined) {
        if (Math.abs(live.raIp - auth.raIp) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'raIp',
            expectedValue: auth.raIp,
            actualValue: live.raIp,
            severity: 'ERROR',
            description: `Expected Ra (I-P) = ${auth.raIp} cfm/ft², but live dataset has ${live.raIp}`
          });
        }
      }

      // Occupant Density Check SI
      if (auth.isDensityNotApplicable) {
        if (!live.isDensityNotApplicable || live.defaultOccupancyMetric !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'defaultOccupancyMetric',
            expectedValue: 0,
            actualValue: live.defaultOccupancyMetric,
            severity: 'ERROR',
            description: `Occupant density is not applicable for ${auth.standardCategory}, but live dataset has ${live.defaultOccupancyMetric}`
          });
        }
      } else {
        if (Math.abs(live.defaultOccupancyMetric - auth.defaultOccupancyMetric) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'defaultOccupancyMetric',
            expectedValue: auth.defaultOccupancyMetric,
            actualValue: live.defaultOccupancyMetric,
            severity: 'ERROR',
            description: `Expected occupant density (SI) = ${auth.defaultOccupancyMetric} #/100 m², but live dataset has ${live.defaultOccupancyMetric}`
          });
        }
      }

      // Occupant Density Check IP
      if (auth.isDensityNotApplicable) {
        if (live.defaultOccupancyIp && live.defaultOccupancyIp !== 0) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'defaultOccupancyIp',
            expectedValue: 0,
            actualValue: live.defaultOccupancyIp,
            severity: 'ERROR',
            description: `Occupant density is not applicable for ${auth.standardCategory}, but live dataset has defaultOccupancyIp = ${live.defaultOccupancyIp}`
          });
        }
      } else if (live.defaultOccupancyIp !== undefined) {
        if (Math.abs(live.defaultOccupancyIp - auth.defaultOccupancyIp) > 0.001) {
          valueDiscrepancies.push({
            spaceId,
            spaceName,
            field: 'defaultOccupancyIp',
            expectedValue: auth.defaultOccupancyIp,
            actualValue: live.defaultOccupancyIp,
            severity: 'ERROR',
            description: `Expected occupant density (I-P) = ${auth.defaultOccupancyIp} #/1000 ft², but live dataset has ${live.defaultOccupancyIp}`
          });
        }
      }

      // Air Class check
      if (live.airClass !== auth.airClass) {
        valueDiscrepancies.push({
          spaceId,
          spaceName,
          field: 'airClass',
          expectedValue: auth.airClass,
          actualValue: live.airClass,
          severity: 'ERROR',
          description: `Expected Air Class = ${auth.airClass}, but live dataset has ${live.airClass}`
        });
      }

      // Occupant Sensitivity (OS) check per Section 6.2.6.1.4
      const liveOs = Boolean(live.osPermitted);
      if (liveOs !== auth.osPermitted) {
        valueDiscrepancies.push({
          spaceId,
          spaceName,
          field: 'osPermitted',
          expectedValue: auth.osPermitted,
          actualValue: liveOs,
          severity: 'ERROR',
          description: `Expected OS Permitted = ${auth.osPermitted}, but live dataset has ${liveOs}`
        });
      }

      // Footnotes check
      if (auth.applicableNotes.length > 0) {
        const liveNotes = live.applicableNotes || [];
        for (const note of auth.applicableNotes) {
          if (!liveNotes.includes(note)) {
            valueDiscrepancies.push({
              spaceId,
              spaceName,
              field: 'applicableNotes',
              expectedValue: auth.applicableNotes,
              actualValue: liveNotes,
              severity: 'WARNING',
              description: `Expected note ${note} applicable to ${auth.standardCategory}`
            });
          }
        }
      }
    }

    const conversionResults = spaceTypes.map(s => this.crossCheckRecord(s));
    const occupancyGroups = Array.from(new Set(spaceTypes.map(s => s.occupancyGroup || s.category))).sort();

    const isCompliant =
      missingCategories.length === 0 &&
      extraCategories.length === 0 &&
      duplicateCategories.length === 0 &&
      valueDiscrepancies.filter(d => d.severity === 'ERROR').length === 0;

    const completenessStatus: DatasetCompletenessStatus = isCompliant
      ? 'COMPLETE'
      : spaceTypes.length > 5
      ? 'SUBSET'
      : 'INCOMPLETE';

    return {
      referenceBasis: ACTIVE_REFERENCE_BASIS,
      standard: STANDARD_BASELINE,
      edition: '2022',
      totalExpectedCategories: fixture.length,
      totalActualCategories: spaceTypes.length,
      missingCategories,
      extraCategories,
      duplicateCategories,
      valueDiscrepancies,
      discrepanciesCount: valueDiscrepancies.length + missingCategories.length + extraCategories.length + duplicateCategories.length,
      isCompliant,
      completenessStatus,
      occupancyGroupsCount: occupancyGroups.length,
      occupancyGroups,
      auditTimestamp: new Date().toISOString(),
      results: conversionResults
    };
  }

  /**
   * Evaluates dataset completeness status against the authoritative fixture.
   */
  static getCompletenessStatus(spaceTypes: Ashrae621SpaceType[]): DatasetCompletenessStatus {
    const report = this.auditAgainstAuthoritative(spaceTypes);
    return report.completenessStatus;
  }

  /**
   * Audits the entire dataset and generates an auditable, source-controlled report.
   */
  static auditEntireDataset(spaceTypes: Ashrae621SpaceType[]): Table61AuditReport {
    const independentReport = this.auditAgainstAuthoritative(spaceTypes);
    const conversionResults = independentReport.results;

    // Discrepancies count includes both conversion discrepancies and authoritative discrepancies
    const conversionDiscrepancies = conversionResults.filter(r => r.hasDiscrepancies).length;
    const totalDiscrepancies = conversionDiscrepancies + independentReport.valueDiscrepancies.filter(d => d.severity === 'ERROR').length +
      independentReport.missingCategories.length + independentReport.extraCategories.length;

    return {
      referenceBasis: ACTIVE_REFERENCE_BASIS,
      totalRecords: spaceTypes.length,
      requiredRecordsCount: AUTHORITATIVE_COUNT,
      completenessStatus: independentReport.completenessStatus,
      occupancyGroupsCount: independentReport.occupancyGroupsCount,
      occupancyGroups: independentReport.occupancyGroups,
      discrepanciesCount: totalDiscrepancies,
      results: conversionResults,
      fieldDiscrepancies: independentReport.valueDiscrepancies,
      isCompliant: independentReport.isCompliant
    };
  }
}
