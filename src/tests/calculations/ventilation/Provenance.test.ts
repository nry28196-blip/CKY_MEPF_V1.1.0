import { describe, it, expect } from 'vitest';
import { DataProvenanceValidationService } from '../../../calculations/ventilation/DataProvenanceValidationService';

describe('Data Provenance Validation', () => {
  it('SOURCE-BASED 62.1-2022 TEST: VERIFIED + UNKNOWN provenance is rejected', () => {
    const invalidSpaceType = {
        standard: 'ASHRAE 62.1', edition: '2022',
        sourceType: 'UNKNOWN' as any, verificationStatus: 'VERIFIED' as any,
        verificationDate: '2026-09-08',
        reference: 'Table 6.2.2.1',
        revisionState: { source: 'UNKNOWN', verificationDate: '2026-09-08', standard: 'ASHRAE 62.1', edition: '2022' }
    };
    const res = DataProvenanceValidationService.validateSpaceTypeData(invalidSpaceType as any, 'ASHRAE 62.1', '2022');
    expect(res.valid).toBe(false);
    expect(res.reasons).toContain('Invalid Source Type for VERIFIED data');
  });

  it('SOURCE-BASED 62.1-2022 TEST: Correct VERIFIED provenance passes', () => {
    const validSpaceType = {
        standard: 'ASHRAE 62.1', edition: '2022',
        sourceType: 'ASHRAE_PUBLISHED' as any, verificationStatus: 'VERIFIED' as any,
        verificationDate: '2026-09-08',
        reference: 'Table 6.2.2.1',
        revisionState: { source: 'ASHRAE_PUBLISHED', verificationDate: '2026-09-08', standard: 'ASHRAE 62.1', edition: '2022', publishedErrataApplied: [] }
    };
    const res = DataProvenanceValidationService.validateSpaceTypeData(validSpaceType as any, 'ASHRAE 62.1', '2022');
    expect(res.valid).toBe(true);
  });
});
