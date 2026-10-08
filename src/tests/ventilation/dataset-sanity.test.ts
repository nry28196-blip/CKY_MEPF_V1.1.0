import { describe, it, expect } from 'vitest';
import { ASHRAE_621_2019_SPACE_TYPES, ASHRAE_621_2019_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2019/data';
import { ASHRAE_621_2022_SPACE_TYPES, ASHRAE_621_2022_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2022/data';
import { ASHRAE_621_2025_SPACE_TYPES, ASHRAE_621_2025_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2025/data';
import { ASHRAE_621_2019_EZ_VALUES } from '../../data/ventilation/ashrae621/2019/data';
import { ASHRAE_621_2022_EZ_VALUES } from '../../data/ventilation/ashrae621/2022/data';
import { ASHRAE_621_2025_EZ_VALUES } from '../../data/ventilation/ashrae621/2025/data';


describe('Dataset Sanity Test (Prompt 5C)', () => {
  const allSpaceTypes = [
    ...ASHRAE_621_2019_SPACE_TYPES,
    ...ASHRAE_621_2022_SPACE_TYPES,
    ...ASHRAE_621_2025_SPACE_TYPES
  ];
  
  const allEzValues = [
    ...ASHRAE_621_2019_EZ_VALUES,
    ...ASHRAE_621_2022_EZ_VALUES,
    ...ASHRAE_621_2025_EZ_VALUES
  ];

  const allExhaustRates = [
    ...ASHRAE_621_2019_EXHAUST_RATES,
    ...ASHRAE_621_2022_EXHAUST_RATES,
    ...ASHRAE_621_2025_EXHAUST_RATES
  ];

  const validSourceTypes = [
    'ASHRAE_PUBLISHED', 'ASHRAE_PUBLISHED_ADDENDUM', 'ASHRAE_PUBLISHED_ERRATA',
    'PROJECT_SPECIFICATION', 'ADOPTED_CODE', 'PUBLIC_REVIEW_DRAFT', 'UNKNOWN'
  ];

  const validVerificationStatuses = ['VERIFIED', 'NOT_VERIFIED', 'INVALID'];

  const checkItem = (item: any, expectedStandard: string) => {
    // 1. sourceType is a valid SourceType
    expect(validSourceTypes).toContain(item.sourceType);
    // 2. verificationStatus is a valid VerificationStatus
    expect(validVerificationStatuses).toContain(item.verificationStatus);
    // 3. revisionState.source is a valid SourceType
    if (item.revisionState) {
      expect(validSourceTypes).toContain(item.revisionState.source);
      // 4. source fields do not contain verification statuses
      expect(['VERIFIED', 'NOT_VERIFIED', 'INVALID']).not.toContain(item.revisionState.source);
    }
    // 4. source fields do not contain verification statuses
    expect(['VERIFIED', 'NOT_VERIFIED', 'INVALID']).not.toContain(item.sourceType);

    // 5. edition is one of supported editions
    expect(['2019', '2022', '2025']).toContain(item.edition);
    // 6. revisionState edition matches record edition
    if (item.revisionState) {
        expect(item.revisionState.edition).toBe(item.edition);
    }
    // 7. standard matches expected standard
    if (item.standard) { expect(item.standard).toBe(expectedStandard); }

    // 9. no legacy "UNVERIFIED_DRAFT" values remain
    expect(item.sourceType).not.toBe('UNVERIFIED_DRAFT');
    if (item.revisionState) expect(item.revisionState.source).not.toBe('UNVERIFIED_DRAFT');
    
    // 10. no "NOT_VERIFIED" value exists in a source field
    expect(item.sourceType).not.toBe('NOT_VERIFIED');
    if (item.revisionState) expect(item.revisionState.source).not.toBe('NOT_VERIFIED');

    // 8. NOT_VERIFIED records cannot silently become VERIFIED
    // The prompt says "current 2025 dataset remains explicitly unverified".
    if (item.edition === '2025' && item.sourceType !== 'ASHRAE_PUBLISHED') {
        expect(item.verificationStatus).toBe('NOT_VERIFIED');
    }
  };

  it('verifies Space Types dataset integrity', () => {
    for (const st of allSpaceTypes) {
      checkItem(st, 'ASHRAE 62.1');
    }
  });

  it('verifies Ez Values dataset integrity', () => {
    for (const ez of allEzValues) {
      checkItem(ez, 'ASHRAE 62.1');
    }
  });

  it('verifies Exhaust Rates dataset integrity', () => {
    for (const ex of allExhaustRates) {
      checkItem(ex, 'ASHRAE 62.1');
    }
  });
});
