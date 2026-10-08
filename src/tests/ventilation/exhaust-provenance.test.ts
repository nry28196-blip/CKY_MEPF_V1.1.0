import { SourceType } from '../../data/ventilation/ashrae621/types';
import { describe, it, expect } from 'vitest';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { Ashrae621ExhaustType } from '../../data/ventilation/ashrae621/types';
import { ASHRAE_621_2022_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2022/data';
import { ASHRAE_621_2019_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2019/data';
import { ASHRAE_621_2025_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2025/data';

const createFixture2022 = (overrides: Partial<Ashrae621ExhaustType> = {}): Ashrae621ExhaustType => ({
  id: 'fixture-01',
  name: 'Test Synthetic Exhaust Fixture - ASHRAE 62.1-2022 Section 6.5.1 Table 6-2',
  category: 'Educational Facilities',
  operatingCondition: 'Continuous',
  rate: 25,
  rateIp: 50,
  continuousRate: 25,
  continuousRateIp: 50,
  unitType: 'fixture',
  airClass: 1,
  exhaustClass: 1,
  standard: 'ASHRAE 62.1',
  edition: '2022',
  referenceSection: '6.5.1',
  referenceTable: 'Table 6-2',
  reference: 'Section 6.5.1, Table 6-2',
  referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
  sourceType: SourceType.ASHRAE_PUBLISHED,
  verificationStatus: 'VERIFIED',
  revisionState: {
    source: SourceType.ASHRAE_PUBLISHED,
    standard: 'ASHRAE 62.1',
    edition: '2022',
    baseEdition: '2022',
    publishedAddendaApplied: ['Addendum x'],
    publishedErrataApplied: [],
    verificationDate: '2026-09-22'
  },
  verificationDate: '2026-09-22',
  ...overrides
});

describe('ASHRAE 62.1-2022 Exhaust Provenance & Safety Validation', () => {

  it('A. VERIFIED 2022 ASHRAE exhaust source => PASS when design exhaust >= required exhaust', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022(),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('PASS');
    expect(res.requiredExhaust).toBe(50);
  });

  it('B. VERIFIED 2022 ASHRAE exhaust source + design exhaust < required exhaust => FAIL', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022(),
      qty: 2,
      designExhaust: 40
    });
    expect(res.status).toBe('FAIL');
    expect(res.requiredExhaust).toBe(50);
  });

  it('C. VERIFIED 2022 ASHRAE exhaust source + missing design exhaust => INCOMPLETE', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022(),
      qty: 2,
      designExhaust: null
    });
    expect(res.status).toBe('INCOMPLETE');
  });

  it('D. NOT_VERIFIED exhaust source => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ verificationStatus: 'NOT_VERIFIED' }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('E. PUBLIC_REVIEW_DRAFT exhaust source => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ sourceType: SourceType.PUBLIC_REVIEW_DRAFT }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('F. UNKNOWN exhaust source => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ sourceType: SourceType.UNKNOWN }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('G. PROJECT_SPECIFICATION => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ sourceType: SourceType.PROJECT_SPECIFICATION }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('H. ADOPTED_CODE => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ sourceType: SourceType.ADOPTED_CODE }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('I. standard mismatch => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ standard: 'ASHRAE 62.2' }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('J. edition mismatch (expected 2022, record is 2019) => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ edition: '2019' }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('K. edition mismatch (expected 2022, record is 2025) => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ edition: '2025' }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('L. revision mismatch => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({
        revisionState: {
          source: SourceType.ASHRAE_PUBLISHED,
          standard: 'ASHRAE 62.1',
          edition: '2019',
          baseEdition: '2019',
          publishedAddendaApplied: [],
          publishedErrataApplied: [],
          verificationDate: '2022-01-01'
        }
      }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('M. missing reference => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ reference: '' }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('N. invalid/missing verificationDate for VERIFIED source => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ verificationDate: undefined }),
      qty: 2,
      designExhaust: 60
    });
    expect(res.status).toBe('BLOCKED');
  });

  it('O. invalid quantity => FAIL', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022(),
      qty: -5,
      designExhaust: 60
    });
    expect(res.status).toBe('FAIL');
  });

  it('P. missing quantity => INCOMPLETE', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022(),
      qty: null,
      designExhaust: 60
    });
    expect(res.status).toBe('INCOMPLETE');
  });

  it('Q. Air Class and exhaustClass internal divergence => BLOCKED', () => {
    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: createFixture2022({ airClass: 2, exhaustClass: 3 }),
      qty: 1,
      designExhaust: 50
    });
    expect(res.status).toBe('BLOCKED');
    expect(res.complianceNotes.some(n => n.includes('diverges'))).toBe(true);
  });

  describe('PRODUCTION 2022 EXHAUST VERIFICATION SAFETY TEST', () => {
    it('all 2022 production exhaust records are VERIFIED and valid', () => {
      expect(ASHRAE_621_2022_EXHAUST_RATES.length).toBeGreaterThanOrEqual(25);
      ASHRAE_621_2022_EXHAUST_RATES.forEach(record => {
        expect(record.verificationStatus).toBe('VERIFIED');
        expect(record.standard).toBe('ASHRAE 62.1');
        expect(record.edition).toBe('2022');
        expect(record.airClass).toBe(record.exhaustClass);
      });
    });

    it('2019 production exhaust record passed to 2022 calculation engine MUST BE BLOCKED', () => {
      const rec2019 = ASHRAE_621_2019_EXHAUST_RATES[0];
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: rec2019,
        qty: 10,
        designExhaust: 1000
      });
      expect(res.status).toBe('BLOCKED');
    });

    it('2025 production exhaust record passed to 2022 calculation engine MUST BE BLOCKED', () => {
      const rec2025 = ASHRAE_621_2025_EXHAUST_RATES[0];
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: rec2025,
        qty: 10,
        designExhaust: 1000
      });
      expect(res.status).toBe('BLOCKED');
    });
  });

  // [FUTURE 2025 - DISABLED] Isolate future 2025 tests so they cannot be counted in 2022 acceptance suite
  describe.skip('[FUTURE 2025 - DISABLED / DEFERRED]', () => {
    it('placeholder future 2025 exhaust test - deferred until 2025 baseline activation', () => {
      // Intentionally skipped to ensure 2025 tests cannot affect 2022 acceptance suite
      expect(true).toBe(true);
    });
  });
});
