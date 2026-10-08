/**
 * Ashrae621ExhaustCrossCheckService
 * 
 * Independent audit and cross-check service for ASHRAE 62.1-2022 Table 6-2 Prescriptive Exhaust.
 * Compares production dataset against the independent reference fixture AUTHORITATIVE_EXHAUST_TABLE_6_2.
 * 
 * Strict architectural rule:
 * - Authoritative fixture does NOT import production data.
 * - Production dataset does NOT import authoritative fixture.
 * - This service acts as the independent verification layer.
 */

import {
  Ashrae621ExhaustType,
  DatasetCompletenessStatus
} from '../../data/ventilation/ashrae621/types';
import {
  AUTHORITATIVE_EXHAUST_TABLE_6_2,
  AUTHORITATIVE_EXHAUST_COUNT,
  AUTHORITATIVE_EXHAUST_REFERENCE_BASIS,
  AuthoritativeExhaustRecord
} from '../../data/ventilation/ashrae621/2022/authoritativeExhaust';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

export interface ExhaustDiscrepancy {
  id: string;
  name: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  severity: 'ERROR' | 'WARNING';
  description: string;
}

export interface ExhaustAuditReport {
  referenceBasis: string;
  standard: string;
  edition: string;
  totalExpectedRecords: number;
  totalActualRecords: number;
  missingCategories: string[];
  extraCategories: string[];
  duplicateCategories: string[];
  discrepancies: ExhaustDiscrepancy[];
  discrepanciesCount: number;
  completenessStatus: DatasetCompletenessStatus;
  isCompliant: boolean;
  categoriesVerified: number;
  auditTimestamp: string;
}

export class Ashrae621ExhaustCrossCheckService {
  static readonly EXPECTED_TOTAL_CATEGORIES = AUTHORITATIVE_EXHAUST_COUNT;
  static readonly EXPECTED_REFERENCE_BASIS = AUTHORITATIVE_EXHAUST_REFERENCE_BASIS;

  /**
   * Run independent audit of exhaust dataset against authoritative fixture.
   * If no dataset is supplied, defaults to active production dataset from StandardDataProvider.
   */
  static auditDataset(liveData?: Ashrae621ExhaustType[]): ExhaustAuditReport {
    const dataset = liveData || StandardDataProvider.getProduction621ExhaustRates();
    const authoritativeMap = new Map<string, AuthoritativeExhaustRecord>();
    AUTHORITATIVE_EXHAUST_TABLE_6_2.forEach(rec => authoritativeMap.set(rec.id, rec));

    const actualIds = dataset.map(d => d.id);
    const seenIds = new Set<string>();
    const duplicateCategories: string[] = [];
    actualIds.forEach(id => {
      if (seenIds.has(id)) {
        duplicateCategories.push(id);
      } else {
        seenIds.add(id);
      }
    });

    const missingCategories: string[] = [];
    authoritativeMap.forEach((_, id) => {
      if (!seenIds.has(id)) {
        missingCategories.push(id);
      }
    });

    const extraCategories: string[] = [];
    dataset.forEach(rec => {
      if (!authoritativeMap.has(rec.id) && !extraCategories.includes(rec.id)) {
        extraCategories.push(rec.id);
      }
    });

    const discrepancies: ExhaustDiscrepancy[] = [];

    // 1. Audit each actual record against authoritative counterpart
    dataset.forEach(actual => {
      const auth = authoritativeMap.get(actual.id);
      if (!auth) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'category_membership',
          expectedValue: 'Present in Table 6-2',
          actualValue: 'Non-standard / Extra Category',
          severity: 'ERROR',
          description: `Category "${actual.id}" is not present in authoritative ASHRAE 62.1-2022 Table 6-2.`
        });
        return;
      }

      // Air Class vs Exhaust Class internal consistency
      if (actual.airClass !== undefined && actual.exhaustClass !== undefined) {
        if (actual.airClass !== actual.exhaustClass) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'airClass_exhaustClass_divergence',
            expectedValue: actual.airClass,
            actualValue: actual.exhaustClass,
            severity: 'ERROR',
            description: `Internal divergence: airClass (${actual.airClass}) !== exhaustClass (${actual.exhaustClass}).`
          });
        }
      }

      // Air Class check
      const actualAirClass = actual.airClass ?? actual.exhaustClass;
      if (actualAirClass !== auth.airClass) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'airClass',
          expectedValue: auth.airClass,
          actualValue: actualAirClass,
          severity: 'ERROR',
          description: `Air Class mismatch: expected ${auth.airClass}, got ${actualAirClass}.`
        });
      }

      // exhaustClass check
      if (actual.exhaustClass !== auth.exhaustClass) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'exhaustClass',
          expectedValue: auth.exhaustClass,
          actualValue: actual.exhaustClass,
          severity: 'ERROR',
          description: `exhaustClass mismatch: expected ${auth.exhaustClass}, got ${actual.exhaustClass}.`
        });
      }

      // Unit Type check
      if (actual.unitType !== auth.unitType) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'unitType',
          expectedValue: auth.unitType,
          actualValue: actual.unitType,
          severity: 'ERROR',
          description: `Unit type mismatch: expected ${auth.unitType}, got ${actual.unitType}.`
        });
      }

      // Rate (Metric)
      if (auth.rate === null) {
        if (actual.rate !== null) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'rate',
            expectedValue: null,
            actualValue: actual.rate,
            severity: 'ERROR',
            description: `Special standard space should have null prescriptive rate, got ${actual.rate}.`
          });
        }
      } else {
        if (actual.rate === null || Math.abs(actual.rate - auth.rate) > 0.001) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'rate',
            expectedValue: auth.rate,
            actualValue: actual.rate,
            severity: 'ERROR',
            description: `Prescriptive metric rate mismatch: expected ${auth.rate}, got ${actual.rate}.`
          });
        }
      }

      // Rate (IP)
      if (auth.rateIp === null) {
        if (actual.rateIp !== null && actual.rateIp !== undefined) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'rateIp',
            expectedValue: null,
            actualValue: actual.rateIp,
            severity: 'ERROR',
            description: `Special standard space should have null IP rate, got ${actual.rateIp}.`
          });
        }
      } else {
        if (actual.rateIp === null || actual.rateIp === undefined || Math.abs(actual.rateIp - auth.rateIp) > 0.001) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'rateIp',
            expectedValue: auth.rateIp,
            actualValue: actual.rateIp,
            severity: 'ERROR',
            description: `Prescriptive IP rate mismatch: expected ${auth.rateIp}, got ${actual.rateIp}.`
          });
        }
      }

      // Continuous Rate
      if (auth.continuousRate !== null) {
        if (actual.continuousRate === null || actual.continuousRate === undefined || Math.abs(actual.continuousRate - auth.continuousRate) > 0.001) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'continuousRate',
            expectedValue: auth.continuousRate,
            actualValue: actual.continuousRate,
            severity: 'ERROR',
            description: `Continuous rate mismatch: expected ${auth.continuousRate}, got ${actual.continuousRate}.`
          });
        }
      }

      // Intermittent Rate
      if (auth.intermittentRate === null) {
        if (actual.intermittentRate !== null && actual.intermittentRate !== undefined) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'intermittentRate',
            expectedValue: null,
            actualValue: actual.intermittentRate,
            severity: 'ERROR',
            description: `Space does not permit intermittent rate, got ${actual.intermittentRate}.`
          });
        }
      } else {
        if (actual.intermittentRate === null || actual.intermittentRate === undefined || Math.abs(actual.intermittentRate - auth.intermittentRate) > 0.001) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'intermittentRate',
            expectedValue: auth.intermittentRate,
            actualValue: actual.intermittentRate,
            severity: 'ERROR',
            description: `Intermittent rate mismatch: expected ${auth.intermittentRate}, got ${actual.intermittentRate}.`
          });
        }
      }

      // Operating Condition
      if (actual.operatingCondition !== auth.operatingCondition) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'operatingCondition',
          expectedValue: auth.operatingCondition,
          actualValue: actual.operatingCondition,
          severity: 'ERROR',
          description: `Operating condition mismatch: expected "${auth.operatingCondition}", got "${actual.operatingCondition}".`
        });
      }

      // Special Standard flag & reference
      if (Boolean(actual.isSpecialStandard) !== auth.isSpecialStandard) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'isSpecialStandard',
          expectedValue: auth.isSpecialStandard,
          actualValue: actual.isSpecialStandard,
          severity: 'ERROR',
          description: `isSpecialStandard flag mismatch: expected ${auth.isSpecialStandard}, got ${actual.isSpecialStandard}.`
        });
      }
      if (auth.isSpecialStandard && actual.specialStandardReference !== auth.specialStandardReference) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'specialStandardReference',
          expectedValue: auth.specialStandardReference,
          actualValue: actual.specialStandardReference,
          severity: 'ERROR',
          description: `Special standard reference mismatch: expected "${auth.specialStandardReference}", got "${actual.specialStandardReference}".`
        });
      }

      // Rate Status
      if (actual.rateStatus && actual.rateStatus !== auth.rateStatus) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'rateStatus',
          expectedValue: auth.rateStatus,
          actualValue: actual.rateStatus,
          severity: 'ERROR',
          description: `Rate status mismatch: expected ${auth.rateStatus}, got ${actual.rateStatus}.`
        });
      }

      // Reference Section & Table
      if (actual.referenceSection && actual.referenceSection !== auth.referenceSection) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceSection',
          expectedValue: auth.referenceSection,
          actualValue: actual.referenceSection,
          severity: 'ERROR',
          description: `Reference section mismatch: expected ${auth.referenceSection}, got ${actual.referenceSection}.`
        });
      }
      if (actual.referenceTable && actual.referenceTable !== auth.referenceTable) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceTable',
          expectedValue: auth.referenceTable,
          actualValue: actual.referenceTable,
          severity: 'ERROR',
          description: `Reference table mismatch: expected ${auth.referenceTable}, got ${actual.referenceTable}.`
        });
      }

      // Reference string (e.g. must not be 'Table 6.5.1')
      if (actual.reference && actual.reference.includes('6.5.1') && !actual.reference.includes('Table 6-2')) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'reference',
          expectedValue: auth.reference,
          actualValue: actual.reference,
          severity: 'ERROR',
          description: `Erroneous legacy reference "${actual.reference}". Must reference Section 6.5.1, Table 6-2.`
        });
      }

      // Reference Basis
      if (actual.referenceBasis && actual.referenceBasis !== auth.referenceBasis) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceBasis',
          expectedValue: auth.referenceBasis,
          actualValue: actual.referenceBasis,
          severity: 'ERROR',
          description: `Reference basis mismatch: expected "${auth.referenceBasis}", got "${actual.referenceBasis}".`
        });
      }

      // Exceptions & notes
      if (auth.exceptions && actual.exceptions !== auth.exceptions) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'exceptions',
          expectedValue: auth.exceptions,
          actualValue: actual.exceptions,
          severity: 'WARNING',
          description: `Exception text divergence for "${actual.id}".`
        });
      }

      // Provenance / Verification Status
      if (actual.verificationStatus !== 'VERIFIED') {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'verificationStatus',
          expectedValue: 'VERIFIED',
          actualValue: actual.verificationStatus,
          severity: 'ERROR',
          description: `Unverified record: verificationStatus is "${actual.verificationStatus}".`
        });
      }
    });

    // 2. Derive Completeness Status
    let completenessStatus: DatasetCompletenessStatus = 'COMPLETE';

    if (missingCategories.length > 0) {
      if (extraCategories.length === 0 && discrepancies.length === 0 && duplicateCategories.length === 0) {
        completenessStatus = 'SUBSET';
      } else {
        completenessStatus = 'INCOMPLETE';
      }
    } else if (extraCategories.length > 0 || duplicateCategories.length > 0 || discrepancies.filter(d => d.severity === 'ERROR').length > 0) {
      completenessStatus = 'INCOMPLETE';
    }

    const hasUnverified = dataset.some(d => d.verificationStatus !== 'VERIFIED');
    if (hasUnverified && completenessStatus !== 'INCOMPLETE') {
      completenessStatus = 'NOT_VERIFIED';
    }

    const errorDiscrepancies = discrepancies.filter(d => d.severity === 'ERROR');
    const isCompliant = completenessStatus === 'COMPLETE' && errorDiscrepancies.length === 0 && duplicateCategories.length === 0;

    return {
      referenceBasis: AUTHORITATIVE_EXHAUST_REFERENCE_BASIS,
      standard: 'ASHRAE 62.1',
      edition: '2022',
      totalExpectedRecords: AUTHORITATIVE_EXHAUST_COUNT,
      totalActualRecords: dataset.length,
      missingCategories,
      extraCategories,
      duplicateCategories,
      discrepancies,
      discrepanciesCount: discrepancies.length,
      completenessStatus,
      isCompliant,
      categoriesVerified: dataset.length - extraCategories.length,
      auditTimestamp: '2026-09-23T07:28:00Z'
    };
  }
}
