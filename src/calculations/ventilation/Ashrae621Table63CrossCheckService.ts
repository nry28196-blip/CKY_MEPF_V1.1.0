/**
 * Ashrae621Table63CrossCheckService
 * 
 * Independent audit and cross-check service for ASHRAE 62.1-2022 Table 6-3 "Airstreams or Sources".
 * Compares production Table 6-3 dataset against the independent reference fixture AUTHORITATIVE_TABLE_6_3.
 * 
 * Strict architectural rule:
 * - Authoritative fixture does NOT import production data.
 * - Production dataset does NOT import authoritative fixture.
 * - Completeness is verified by auditing every field across every record against the authoritative fixture.
 */

import { Ashrae621Table63Source } from '../../data/ventilation/ashrae621/types';
import {
  AUTHORITATIVE_TABLE_6_3,
  AUTHORITATIVE_TABLE_6_3_COUNT,
  AUTHORITATIVE_TABLE_6_3_REFERENCE_BASIS,
  AuthoritativeTable63Record
} from '../../data/ventilation/ashrae621/2022/authoritativeTable63';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

export interface Table63Discrepancy {
  id: string;
  name: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  severity: 'ERROR' | 'WARNING';
  description: string;
}

export interface Table63AuditReport {
  referenceBasis: string;
  standard: string;
  edition: string;
  totalExpectedRecords: number;
  totalActualRecords: number;
  missingRecords: string[];
  extraRecords: string[];
  duplicateRecords: string[];
  discrepancies: Table63Discrepancy[];
  discrepanciesCount: number;
  completenessStatus: 'COMPLETE' | 'SUBSET' | 'INCOMPLETE';
  isCompliant: boolean;
  recordsVerified: number;
  auditSummary: string;
  auditTimestamp: string;
}

export class Ashrae621Table63CrossCheckService {
  // Count derived directly from authoritative fixture, not hardcoded
  static get EXPECTED_TOTAL_RECORDS(): number {
    return AUTHORITATIVE_TABLE_6_3.length;
  }
  static readonly EXPECTED_REFERENCE_BASIS = AUTHORITATIVE_TABLE_6_3_REFERENCE_BASIS;

  /**
   * Run independent audit of Table 6-3 dataset against authoritative fixture.
   * Compares all required fields:
   * - id, name, description, airClass, standard, edition
   * - reference, referenceSection, referenceTable, referenceBasis
   * - sourceType, verificationStatus, verificationDate
   * - applicableAddenda, notes, specialStandardReference
   * - metadataSourceType
   * - revisionState (standard, edition, baseEdition, publishedAddendaApplied, publishedErrataApplied, source)
   */
  static auditDataset(liveData?: Ashrae621Table63Source[]): Table63AuditReport {
    const dataset = liveData || StandardDataProvider.getProduction621Table63Sources();
    const authoritativeMap = new Map<string, AuthoritativeTable63Record>();
    AUTHORITATIVE_TABLE_6_3.forEach(rec => authoritativeMap.set(rec.id, rec));

    const actualIds = dataset.map(d => d.id);
    const seenIds = new Set<string>();
    const duplicateRecords: string[] = [];
    actualIds.forEach(id => {
      if (seenIds.has(id)) {
        duplicateRecords.push(id);
      } else {
        seenIds.add(id);
      }
    });

    const missingRecords: string[] = [];
    authoritativeMap.forEach((_, id) => {
      if (!seenIds.has(id)) {
        missingRecords.push(id);
      }
    });

    const extraRecords: string[] = [];
    dataset.forEach(rec => {
      if (!authoritativeMap.has(rec.id) && !extraRecords.includes(rec.id)) {
        extraRecords.push(rec.id);
      }
    });

    const discrepancies: Table63Discrepancy[] = [];

    // Helper for array equality
    const arraysEqual = (a?: readonly string[] | string[], b?: readonly string[] | string[]): boolean => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      return a.every((val, idx) => val === b[idx]);
    };

    // 1. Audit each actual record against authoritative counterpart across all fields
    dataset.forEach(actual => {
      const auth = authoritativeMap.get(actual.id);
      if (!auth) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'record_membership',
          expectedValue: 'Present in Table 6-3 authoritative fixture',
          actualValue: 'Extra / Unrecognized record',
          severity: 'ERROR',
          description: `Record '${actual.id}' is not in authoritative ASHRAE 62.1-2022 Table 6-3.`
        });
        return;
      }

      // Air Class check (CRITICAL)
      if (actual.airClass !== auth.airClass) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'airClass',
          expectedValue: auth.airClass,
          actualValue: actual.airClass,
          severity: 'ERROR',
          description: `Air Class mismatch for '${actual.id}': expected Class ${auth.airClass}, got Class ${actual.airClass}.`
        });
      }

      // Name / Category check
      if (actual.name !== auth.name) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'name',
          expectedValue: auth.name,
          actualValue: actual.name,
          severity: 'ERROR',
          description: `Name mismatch for '${actual.id}': expected '${auth.name}', got '${actual.name}'.`
        });
      }

      // Description check
      if (actual.description !== auth.description) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'description',
          expectedValue: auth.description,
          actualValue: actual.description,
          severity: 'ERROR',
          description: `Description mismatch for '${actual.id}': expected '${auth.description}', got '${actual.description}'.`
        });
      }

      // Standard check
      if (actual.standard !== auth.standard) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'standard',
          expectedValue: auth.standard,
          actualValue: actual.standard,
          severity: 'ERROR',
          description: `Standard mismatch for '${actual.id}': expected '${auth.standard}', got '${actual.standard}'.`
        });
      }

      // Edition check (CRITICAL: must be 2022)
      if (actual.edition !== auth.edition) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'edition',
          expectedValue: auth.edition,
          actualValue: actual.edition,
          severity: 'ERROR',
          description: `Edition mismatch for '${actual.id}': expected '${auth.edition}', got '${actual.edition}'.`
        });
      }

      // Reference string check
      if (actual.reference !== auth.reference) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'reference',
          expectedValue: auth.reference,
          actualValue: actual.reference,
          severity: 'ERROR',
          description: `Reference mismatch for '${actual.id}': expected '${auth.reference}', got '${actual.reference}'.`
        });
      }

      // Reference Section check
      if (actual.referenceSection !== auth.referenceSection) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceSection',
          expectedValue: auth.referenceSection,
          actualValue: actual.referenceSection,
          severity: 'ERROR',
          description: `Reference section mismatch for '${actual.id}': expected '${auth.referenceSection}', got '${actual.referenceSection}'.`
        });
      }

      // Reference Table check
      if (actual.referenceTable !== auth.referenceTable) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceTable',
          expectedValue: auth.referenceTable,
          actualValue: actual.referenceTable,
          severity: 'ERROR',
          description: `Reference table mismatch for '${actual.id}': expected '${auth.referenceTable}', got '${actual.referenceTable}'.`
        });
      }

      // Reference Basis check
      if (actual.referenceBasis !== auth.referenceBasis) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'referenceBasis',
          expectedValue: auth.referenceBasis,
          actualValue: actual.referenceBasis,
          severity: 'ERROR',
          description: `Reference basis mismatch for '${actual.id}': expected '${auth.referenceBasis}', got '${actual.referenceBasis}'.`
        });
      }

      // SourceType check
      if (actual.sourceType !== auth.sourceType) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'sourceType',
          expectedValue: auth.sourceType,
          actualValue: actual.sourceType,
          severity: 'ERROR',
          description: `SourceType mismatch for '${actual.id}': expected '${auth.sourceType}', got '${actual.sourceType}'.`
        });
      }

      // Verification Status check (CRITICAL)
      if (actual.verificationStatus !== auth.verificationStatus) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'verificationStatus',
          expectedValue: auth.verificationStatus,
          actualValue: actual.verificationStatus,
          severity: 'ERROR',
          description: `Verification status mismatch for '${actual.id}': expected '${auth.verificationStatus}', got '${actual.verificationStatus}'.`
        });
      }

      // Verification Date check
      if (auth.verificationDate && actual.verificationDate !== auth.verificationDate) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'verificationDate',
          expectedValue: auth.verificationDate,
          actualValue: actual.verificationDate,
          severity: 'ERROR',
          description: `Verification date mismatch for '${actual.id}': expected '${auth.verificationDate}', got '${actual.verificationDate}'.`
        });
      }

      // Applicable Addenda check
      if (!arraysEqual(actual.applicableAddenda, auth.applicableAddenda)) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'applicableAddenda',
          expectedValue: JSON.stringify(auth.applicableAddenda),
          actualValue: JSON.stringify(actual.applicableAddenda),
          severity: 'ERROR',
          description: `Applicable addenda mismatch for '${actual.id}': expected ${JSON.stringify(auth.applicableAddenda)}, got ${JSON.stringify(actual.applicableAddenda)}.`
        });
      }

      // Notes check
      if ((auth.notes || actual.notes) && actual.notes !== auth.notes) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'notes',
          expectedValue: auth.notes,
          actualValue: actual.notes,
          severity: 'ERROR',
          description: `Notes mismatch for '${actual.id}': expected '${auth.notes}', got '${actual.notes}'.`
        });
      }

      // Special Standard Reference check where applicable
      if ((auth.specialStandardReference || actual.specialStandardReference) && actual.specialStandardReference !== auth.specialStandardReference) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'specialStandardReference',
          expectedValue: auth.specialStandardReference,
          actualValue: actual.specialStandardReference,
          severity: 'ERROR',
          description: `Special standard reference mismatch for '${actual.id}': expected '${auth.specialStandardReference}', got '${actual.specialStandardReference}'.`
        });
      }

      // Metadata SourceType check
      if (auth.metadataSourceType && actual.metadataSourceType !== auth.metadataSourceType) {
        discrepancies.push({
          id: actual.id,
          name: actual.name,
          field: 'metadataSourceType',
          expectedValue: auth.metadataSourceType,
          actualValue: actual.metadataSourceType,
          severity: 'ERROR',
          description: `Metadata sourceType mismatch for '${actual.id}': expected '${auth.metadataSourceType}', got '${actual.metadataSourceType}'.`
        });
      }

      // Revision State check (if present in authoritative)
      if (auth.revisionState) {
        if (!actual.revisionState) {
          discrepancies.push({
            id: actual.id,
            name: actual.name,
            field: 'revisionState',
            expectedValue: 'Defined revisionState',
            actualValue: 'Missing revisionState',
            severity: 'ERROR',
            description: `Revision state missing for '${actual.id}'.`
          });
        } else {
          if (actual.revisionState.standard !== auth.revisionState.standard) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.standard',
              expectedValue: auth.revisionState.standard,
              actualValue: actual.revisionState.standard,
              severity: 'ERROR',
              description: `revisionState.standard mismatch for '${actual.id}': expected '${auth.revisionState.standard}', got '${actual.revisionState.standard}'.`
            });
          }
          if (actual.revisionState.edition !== auth.revisionState.edition) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.edition',
              expectedValue: auth.revisionState.edition,
              actualValue: actual.revisionState.edition,
              severity: 'ERROR',
              description: `revisionState.edition mismatch for '${actual.id}': expected '${auth.revisionState.edition}', got '${actual.revisionState.edition}'.`
            });
          }
          if (actual.revisionState.baseEdition !== auth.revisionState.baseEdition) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.baseEdition',
              expectedValue: auth.revisionState.baseEdition,
              actualValue: actual.revisionState.baseEdition,
              severity: 'ERROR',
              description: `revisionState.baseEdition mismatch for '${actual.id}': expected '${auth.revisionState.baseEdition}', got '${actual.revisionState.baseEdition}'.`
            });
          }
          if (!arraysEqual(actual.revisionState.publishedAddendaApplied, auth.revisionState.publishedAddendaApplied)) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.publishedAddendaApplied',
              expectedValue: JSON.stringify(auth.revisionState.publishedAddendaApplied),
              actualValue: JSON.stringify(actual.revisionState.publishedAddendaApplied),
              severity: 'ERROR',
              description: `revisionState.publishedAddendaApplied mismatch for '${actual.id}'.`
            });
          }
          if (!arraysEqual(actual.revisionState.publishedErrataApplied, auth.revisionState.publishedErrataApplied)) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.publishedErrataApplied',
              expectedValue: JSON.stringify(auth.revisionState.publishedErrataApplied),
              actualValue: JSON.stringify(actual.revisionState.publishedErrataApplied),
              severity: 'ERROR',
              description: `revisionState.publishedErrataApplied mismatch for '${actual.id}'.`
            });
          }
          if (actual.revisionState.source !== auth.revisionState.source) {
            discrepancies.push({
              id: actual.id,
              name: actual.name,
              field: 'revisionState.source',
              expectedValue: auth.revisionState.source,
              actualValue: actual.revisionState.source,
              severity: 'ERROR',
              description: `revisionState.source mismatch for '${actual.id}': expected '${auth.revisionState.source}', got '${actual.revisionState.source}'.`
            });
          }
        }
      }
    });

    // 2. Add discrepancies for duplicate records
    duplicateRecords.forEach(dupId => {
      discrepancies.push({
        id: dupId,
        name: dupId,
        field: 'duplicate_record',
        expectedValue: 'Unique ID',
        actualValue: 'Duplicate ID',
        severity: 'ERROR',
        description: `Duplicate record ID '${dupId}' found in dataset.`
      });
    });

    // 3. Add discrepancies for missing records
    missingRecords.forEach(missId => {
      const auth = authoritativeMap.get(missId)!;
      discrepancies.push({
        id: missId,
        name: auth.name,
        field: 'missing_record',
        expectedValue: `Present in Table 6-3 (${auth.name})`,
        actualValue: 'Missing',
        severity: 'ERROR',
        description: `Authoritative Table 6-3 record '${missId}' (${auth.name}) is missing from dataset.`
      });
    });

    // Determine completeness status
    let completenessStatus: 'COMPLETE' | 'SUBSET' | 'INCOMPLETE' = 'COMPLETE';
    if (missingRecords.length > 0 && extraRecords.length === 0 && duplicateRecords.length === 0 && discrepancies.length === missingRecords.length) {
      completenessStatus = 'SUBSET';
    } else if (missingRecords.length > 0 || extraRecords.length > 0 || duplicateRecords.length > 0 || discrepancies.length > 0) {
      completenessStatus = 'INCOMPLETE';
    } else if (dataset.length === authoritativeMap.size && discrepancies.length === 0) {
      completenessStatus = 'COMPLETE';
    }

    const isCompliant = discrepancies.length === 0 &&
      missingRecords.length === 0 &&
      extraRecords.length === 0 &&
      duplicateRecords.length === 0 &&
      dataset.length === authoritativeMap.size;

    const recordsVerified = isCompliant ? dataset.length : 0;
    const auditSummary = discrepancies.length === 0
      ? '0 discrepancies across all audited fields.'
      : `${discrepancies.length} discrepancies found across audited fields.`;

    return {
      referenceBasis: AUTHORITATIVE_TABLE_6_3_REFERENCE_BASIS,
      standard: 'ASHRAE 62.1',
      edition: '2022',
      totalExpectedRecords: authoritativeMap.size,
      totalActualRecords: dataset.length,
      missingRecords,
      extraRecords,
      duplicateRecords,
      discrepancies,
      discrepanciesCount: discrepancies.length,
      completenessStatus,
      isCompliant,
      recordsVerified,
      auditSummary,
      auditTimestamp: new Date().toISOString()
    };
  }
}
