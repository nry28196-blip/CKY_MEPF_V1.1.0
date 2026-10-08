import { SourceType, VerificationStatus } from '../../data/ventilation/ashrae621/types';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

export interface ScanViolation {
  recordId?: string;
  recordName?: string;
  dataset: string;
  edition: string;
  field: string;
  invalidValue: any;
  message: string;
}

export interface ScanReport {
  isValid: boolean;
  violations: ScanViolation[];
  scannedCount: number;
}

export class DataSourceScannerService {
  static readonly VALID_SOURCE_TYPES: SourceType[] = [
    SourceType.ASHRAE_PUBLISHED, SourceType.ASHRAE_PUBLISHED_ADDENDUM, SourceType.ASHRAE_PUBLISHED_ERRATA,
    SourceType.PROJECT_SPECIFICATION, SourceType.ADOPTED_CODE, SourceType.PUBLIC_REVIEW_DRAFT, SourceType.UNKNOWN
  ];

  static readonly VALID_VERIFICATION_STATUSES: VerificationStatus[] = [
    'VERIFIED', 'NOT_VERIFIED', 'INVALID'
  ];

  /**
   * Scans all records across all supported editions (2019, 2022, 2025)
   * to verify metadata integrity, ensuring no legacy statuses exist in source fields.
   */
  static scanAllDatasets(): ScanReport {
    const report: ScanReport = {
      isValid: true,
      violations: [],
      scannedCount: 0
    };

    const editions: ('2019' | '2022' | '2025')[] = ['2019', '2022', '2025'];

    for (const edition of editions) {
      const spaceTypes = StandardDataProvider.get621SpaceTypes(edition);
      for (const st of spaceTypes) {
        this.scanRecord(st, 'SpaceType', edition, report);
      }

      const ezValues = StandardDataProvider.get621EzValues(edition);
      for (const ez of ezValues) {
        this.scanRecord(ez, 'EzValue', edition, report);
      }

      const exhaustRates = StandardDataProvider.get621ExhaustRates(edition);
      for (const ex of exhaustRates) {
        this.scanRecord(ex, 'ExhaustRate', edition, report);
      }
    }

    report.isValid = report.violations.length === 0;
    return report;
  }

  private static scanRecord(record: any, dataset: string, edition: string, report: ScanReport) {
    report.scannedCount++;

    const addViolation = (field: string, invalidValue: any, message: string) => {
      report.violations.push({
        recordId: record.id,
        recordName: record.name || record.configuration || 'Unknown',
        dataset,
        edition,
        field,
        invalidValue,
        message
      });
    };

    // 1. Check Root fields
    if (!this.VALID_SOURCE_TYPES.includes(record.sourceType)) {
      addViolation('sourceType', record.sourceType, 'Invalid SourceType');
    }
    if (!this.VALID_VERIFICATION_STATUSES.includes(record.verificationStatus)) {
      addViolation('verificationStatus', record.verificationStatus, 'Invalid VerificationStatus');
    }
    if (record.standard !== 'ASHRAE 62.1') {
      addViolation('standard', record.standard, 'Invalid standard');
    }
    if (record.edition !== edition) {
      addViolation('edition', record.edition, 'Edition mismatch');
    }

    // 2. Check Revision State
    if (record.revisionState) {
      if (!this.VALID_SOURCE_TYPES.includes(record.revisionState.source)) {
        addViolation('revisionState.source', record.revisionState.source, 'Invalid SourceType in revisionState');
      }
      
      // Explicit checks for legacy/obsolete string values mixing statuses into sources
      if (record.revisionState.source === 'UNVERIFIED_DRAFT' || 
          record.revisionState.source === 'VERIFIED' || 
          record.revisionState.source === 'NOT_VERIFIED' || 
          record.revisionState.source === 'INVALID') {
        addViolation('revisionState.source', record.revisionState.source, 'Legacy or status string found in source field');
      }
      if (record.revisionState.edition !== edition) {
        addViolation('revisionState.edition', record.revisionState.edition, 'Revision edition mismatch');
      }
      if (record.revisionState.standard !== 'ASHRAE 62.1') {
        addViolation('revisionState.standard', record.revisionState.standard, 'Revision standard mismatch');
      }
    }

    // 3. Check Granular Provenance 
    if (record.provenance) {
      Object.entries(record.provenance).forEach(([key, provItem]: [string, any]) => {
        if (!provItem) return;
        
        if (!this.VALID_SOURCE_TYPES.includes(provItem.sourceType)) {
          addViolation(`provenance.${key}.sourceType`, provItem.sourceType, 'Invalid SourceType in provenance');
        }
        
        // Explicit legacy checks on provenance source
        if (provItem.sourceType === 'UNVERIFIED_DRAFT' || 
            provItem.sourceType === 'VERIFIED' || 
            provItem.sourceType === 'NOT_VERIFIED' || 
            provItem.sourceType === 'INVALID') {
          addViolation(`provenance.${key}.sourceType`, provItem.sourceType, 'Legacy or status string found in provenance source field');
        }

        if (!this.VALID_VERIFICATION_STATUSES.includes(provItem.verificationStatus)) {
          addViolation(`provenance.${key}.verificationStatus`, provItem.verificationStatus, 'Invalid VerificationStatus in provenance');
        }
        if (provItem.standard !== 'ASHRAE 62.1') {
          addViolation(`provenance.${key}.standard`, provItem.standard, 'Invalid standard in provenance');
        }
        if (provItem.edition !== edition) {
          addViolation(`provenance.${key}.edition`, provItem.edition, 'Edition mismatch in provenance');
        }
      });
    }
  }
}
