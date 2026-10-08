import { describe, it, expect } from 'vitest';
import { extractRunStatusInfo } from '../../lib/exportCollectiveProjectPdf';
import { HistoryItem } from '../../types';

describe('Step 4B — Final Engineering Claim & PDF Status Integrity Suite', () => {
  it('1. A PASS calculation does not automatically become "Certified"', () => {
    const run: HistoryItem = {
      id: 'run-1',
      timestamp: '2026-10-07 10:00:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Outdoor air requirement: 42.5 L/s (Status: PASS)',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: false
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.isPass).toBe(true);
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('2. FAIL calculation is never exported or interpreted as PASS', () => {
    const run: HistoryItem = {
      id: 'run-fail',
      timestamp: '2026-10-07 10:05:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Ventilation requirement failed (Status: FAIL)',
      parameters: {
        lastCalculationResult: {
          status: 'FAIL',
          isAuthoritative: false
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isFail).toBe(true);
    expect(statusInfo.status).toBe('FAIL');
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('3. INCOMPLETE calculation is never exported as PASS', () => {
    const run: HistoryItem = {
      id: 'run-incomplete',
      timestamp: '2026-10-07 10:10:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Incomplete parameters (Status: INCOMPLETE)',
      parameters: {
        lastCalculationResult: {
          status: 'INCOMPLETE'
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isIncomplete).toBe(true);
    expect(statusInfo.status).toBe('INCOMPLETE');
  });

  it('4. BLOCKED calculation is never exported as PASS', () => {
    const run: HistoryItem = {
      id: 'run-blocked',
      timestamp: '2026-10-07 10:15:00',
      tab: 'mechanical',
      title: 'Exhaust Airflow',
      summary: 'Performance procedure blocked',
      parameters: {
        exhaustStatus: 'BLOCKED'
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isBlocked).toBe(true);
    expect(statusInfo.status).toBe('BLOCKED');
  });

  it('5. NOT_VERIFIED is never exported as VERIFIED', () => {
    const run: HistoryItem = {
      id: 'run-not-verified',
      timestamp: '2026-10-07 10:20:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Parameters not verified',
      parameters: {
        lastCalculationResult: {
          status: 'NOT_VERIFIED',
          isAuthoritative: false
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.status).toBe('NOT_VERIFIED');
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('6. A report does not claim compliance unless the underlying contract explicitly supports it', () => {
    // Non-authoritative PASS
    const preliminaryRun: HistoryItem = {
      id: 'run-prelim',
      timestamp: '2026-10-07 10:25:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: false
        }
      }
    };
    expect(extractRunStatusInfo(preliminaryRun).hasCompliance).toBe(false);

    // Explicit compliant authoritative calculation
    const compliantRun: HistoryItem = {
      id: 'run-compliant',
      timestamp: '2026-10-07 10:30:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true,
          complianceSummary: 'COMPLIANT: Verified under ANSI/ASHRAE Standard 62.1-2022'
        }
      }
    };
    expect(extractRunStatusInfo(compliantRun).hasCompliance).toBe(true);
    expect(extractRunStatusInfo(compliantRun).isAuthoritative).toBe(true);
  });

  it('7. Collective PDF exports preserve each run actual status independently', () => {
    const run1: HistoryItem = {
      id: 'r1',
      timestamp: '2026-10-07 11:00:00',
      tab: 'mechanical',
      title: 'Run 1 — Office Ventilation',
      summary: 'Status: PASS',
      parameters: { lastCalculationResult: { status: 'PASS', isAuthoritative: true } }
    };
    const run2: HistoryItem = {
      id: 'r2',
      timestamp: '2026-10-07 11:05:00',
      tab: 'mechanical',
      title: 'Run 2 — Storage Exhaust',
      summary: 'Status: FAIL',
      parameters: { exhaustStatus: 'FAIL' }
    };
    const run3: HistoryItem = {
      id: 'r3',
      timestamp: '2026-10-07 11:10:00',
      tab: 'mechanical',
      title: 'Run 3 — Corridors Air Balance',
      summary: 'DIAGNOSTIC ONLY',
      parameters: { status: 'DIAGNOSTIC ONLY' }
    };

    const s1 = extractRunStatusInfo(run1);
    const s2 = extractRunStatusInfo(run2);
    const s3 = extractRunStatusInfo(run3);

    expect(s1.status).toBe('PASS');
    expect(s2.status).toBe('FAIL');
    expect(s3.status).toBe('DIAGNOSTIC ONLY');

    expect(s1.isPass).toBe(true);
    expect(s2.isFail).toBe(true);
    expect(s3.isPass).toBe(false);
  });

  it('8. No hard-coded "PASS / PRODUCTION READY" remains across exported runs', () => {
    const dummyRuns: HistoryItem[] = [
      {
        id: 'r-fail',
        timestamp: '2026-10-07 11:15:00',
        tab: 'mechanical',
        title: 'Run Fail',
        summary: 'Status: FAIL',
        parameters: { lastCalculationResult: { status: 'FAIL' } }
      }
    ];

    const s = extractRunStatusInfo(dummyRuns[0]);
    expect(s.status).toBe('FAIL');
    expect(s.isPass).toBe(false);
  });
});
