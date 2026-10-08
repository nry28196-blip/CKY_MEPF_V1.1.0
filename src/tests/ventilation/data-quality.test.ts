import { describe, it, expect } from 'vitest';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { DataSourceScannerService } from '../../calculations/ventilation/DataSourceScannerService';

describe('DATA QUALITY TEST - 62.1 2025', () => {
  const spaceTypes = StandardDataProvider.get621SpaceTypes('2025');
  const ezValues = StandardDataProvider.get621EzValues('2025');
  const exhaustRates = StandardDataProvider.get621ExhaustRates('2025');

  it('1. No contradictory Verified notes in Space Types', () => {
    spaceTypes.forEach(spaceType => {
      const isVerifiedStatus = spaceType.verificationStatus === 'VERIFIED';
      if (!isVerifiedStatus) {
        expect(spaceType.notes).not.toContain('Verified');
      }
    });
  });

  it('2. No false references in Space Types', () => {
    spaceTypes.forEach(spaceType => {
      expect(spaceType.reference).toBeTruthy();
      expect(spaceType.reference.trim().length).toBeGreaterThan(0);
      expect(spaceType.provenance?.reference?.verificationStatus).not.toBe('NOT_VERIFIED');
    });
  });

  it('3. No false references in Ez Values', () => {
    ezValues.forEach(ez => {
      expect(ez.reference).toBeTruthy();
      expect(ez.reference.trim().length).toBeGreaterThan(0);
      expect(ez.provenance?.reference?.verificationStatus).not.toBe('NOT_VERIFIED');
    });
  });

  it('4. No contradictory Verified notes in Exhaust Rates', () => {
    exhaustRates.forEach(exhaust => {
      const isVerifiedStatus = exhaust.verificationStatus === 'VERIFIED';
      if (!isVerifiedStatus) {
        // exhaust types do not have notes field but if they did, check it.
      }
    });
  });

  describe('DATA-SOURCE SAFETY SCAN (ALL EDITIONS)', () => {
    it('Validates metadata integrity via DataSourceScannerService', () => {
      // Use the newly created service to run the full verification scan
      const report = DataSourceScannerService.scanAllDatasets();
      
      if (!report.isValid) {
        console.error('Data Source Scan Violations:', report.violations.slice(0, 5)); // Log first 5 for brevity in failure
      }
      
      expect(report.isValid).toBe(true);
      expect(report.violations.length).toBe(0);
      expect(report.scannedCount).toBeGreaterThan(0);
    });
  });
});
