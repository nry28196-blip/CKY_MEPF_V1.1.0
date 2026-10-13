import { describe, it, expect } from 'vitest';
import { extractRunStatusInfo, deriveAggregateStatus } from '../../lib/exportCollectiveProjectPdf';
import { determineComplianceStatus } from '../../components/VentilationReportsView';
import { HistoryItem } from '../../types';

describe('Step 4B — Strict Engineering Claim, Authority & Compliance Regression Suite', () => {
  it('1. PASS without an explicit compliance determination does not produce COMPLIANT', () => {
    const run: HistoryItem = {
      id: 'run-pass-no-comp',
      timestamp: '2026-10-07 10:00:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Outdoor air requirement: 42.5 L/s (Status: PASS)',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: false
          // No complianceSummary or audit trail
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.status).toBe('PASS');
    expect(statusInfo.isPass).toBe(true);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('2. PASS plus authoritative status, without an explicit compliance determination, does not produce COMPLIANT', () => {
    const run: HistoryItem = {
      id: 'run-auth-no-comp',
      timestamp: '2026-10-07 10:05:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Outdoor air requirement: 42.5 L/s (Status: PASS)',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true
          // Missing explicit compliance determination summary
        }
      }
    };

    const statusInfo = extractRunStatusInfo(run);
    expect(statusInfo.status).toBe('PASS');
    expect(statusInfo.isPass).toBe(true);
    expect(statusInfo.isAuthoritative).toBe(true);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('3. Text containing NON-COMPLIANT never produces a positive compliance result', () => {
    const runNonCompliantSummary: HistoryItem = {
      id: 'run-non-comp-1',
      timestamp: '2026-10-07 10:10:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true,
          complianceSummary: 'NON-COMPLIANT: Parameter exceeds acceptable ventilation limit'
        }
      }
    };

    const statusInfo = extractRunStatusInfo(runNonCompliantSummary);
    expect(statusInfo.hasCompliance).toBe(false);

    // Also test when embedded in audit trail
    const runNonCompAuditTrail: HistoryItem = {
      id: 'run-non-comp-2',
      timestamp: '2026-10-07 10:11:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true,
          auditTrail: [
            { step: 'Check 1', complianceSummary: 'NON-COMPLIANT (FAIL): Outside limits' }
          ]
        }
      }
    };
    expect(extractRunStatusInfo(runNonCompAuditTrail).hasCompliance).toBe(false);
  });

  it('4. FAIL never exports as PASS or VERIFIED', () => {
    const runFail: HistoryItem = {
      id: 'run-fail',
      timestamp: '2026-10-07 10:15:00',
      tab: 'mechanical',
      title: 'ASHRAE 62.1 Ventilation',
      summary: 'Ventilation requirement failed (Status: FAIL)',
      parameters: {
        lastCalculationResult: {
          status: 'FAIL',
          isAuthoritative: true,
          complianceSummary: 'COMPLIANT: Fabricated string that should be ignored on FAIL'
        }
      }
    };

    const statusInfo = extractRunStatusInfo(runFail);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isFail).toBe(true);
    expect(statusInfo.status).toBe('FAIL');
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('5. BLOCKED never exports as PASS or VERIFIED', () => {
    const runBlocked: HistoryItem = {
      id: 'run-blocked',
      timestamp: '2026-10-07 10:20:00',
      tab: 'mechanical',
      title: 'Exhaust Airflow',
      summary: 'Performance procedure blocked',
      parameters: {
        exhaustStatus: 'BLOCKED'
      }
    };

    const statusInfo = extractRunStatusInfo(runBlocked);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isBlocked).toBe(true);
    expect(statusInfo.status).toBe('BLOCKED');
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('6. INCOMPLETE never exports as PASS or VERIFIED', () => {
    const runIncomplete: HistoryItem = {
      id: 'run-incomplete',
      timestamp: '2026-10-07 10:25:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Incomplete parameters (Status: INCOMPLETE)',
      parameters: {
        lastCalculationResult: {
          status: 'INCOMPLETE'
        }
      }
    };

    const statusInfo = extractRunStatusInfo(runIncomplete);
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isIncomplete).toBe(true);
    expect(statusInfo.status).toBe('INCOMPLETE');
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('7. NOT_VERIFIED never exports as VERIFIED', () => {
    const runNotVerified: HistoryItem = {
      id: 'run-not-verified',
      timestamp: '2026-10-07 10:30:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Parameters not verified',
      parameters: {
        lastCalculationResult: {
          status: 'NOT_VERIFIED',
          isAuthoritative: true
        }
      }
    };

    const statusInfo = extractRunStatusInfo(runNotVerified);
    expect(statusInfo.status).toBe('NOT_VERIFIED');
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);
  });

  it('8. A mix of passing and failing runs never receives an overall PASS', () => {
    const runPass: HistoryItem = {
      id: 'r-pass',
      timestamp: '2026-10-07 11:00:00',
      tab: 'mechanical',
      title: 'Run 1 — Office Ventilation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true,
          complianceSummary: 'COMPLIANT: ANSI/ASHRAE 62.1-2022'
        }
      }
    };
    const runFail: HistoryItem = {
      id: 'r-fail',
      timestamp: '2026-10-07 11:05:00',
      tab: 'mechanical',
      title: 'Run 2 — Storage Exhaust',
      summary: 'Status: FAIL',
      parameters: { exhaustStatus: 'FAIL' }
    };

    const statuses = [extractRunStatusInfo(runPass), extractRunStatusInfo(runFail)];
    const aggregate = deriveAggregateStatus(statuses);
    expect(aggregate).toBe('FAIL (ATTENTION REQUIRED)');
    expect(aggregate).not.toContain('PASS');
  });

  it('9. All-pass runs lacking explicit compliance evidence do not receive an unsupported compliance claim', () => {
    const runPass1: HistoryItem = {
      id: 'r-pass-1',
      timestamp: '2026-10-07 11:10:00',
      tab: 'mechanical',
      title: 'Run 1',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: false
        }
      }
    };
    const runPass2: HistoryItem = {
      id: 'r-pass-2',
      timestamp: '2026-10-07 11:15:00',
      tab: 'mechanical',
      title: 'Run 2',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true // authoritative but without explicit compliance summary
        }
      }
    };

    const statuses = [extractRunStatusInfo(runPass1), extractRunStatusInfo(runPass2)];
    const aggregate = deriveAggregateStatus(statuses);
    // Must be neutral PASS (CALCULATIONS VALID), NOT "PASS / PRODUCTION VERIFIED"
    expect(aggregate).toBe('PASS (CALCULATIONS VALID)');
    expect(aggregate).not.toBe('PASS / PRODUCTION VERIFIED');
  });

  it('10. Report and PDF status wording agree with the same underlying result', () => {
    const verifiedCompliantRun: HistoryItem = {
      id: 'r-verified-compliant',
      timestamp: '2026-10-07 11:20:00',
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

    const statusInfo = extractRunStatusInfo(verifiedCompliantRun);
    expect(statusInfo.status).toBe('PASS');
    expect(statusInfo.isPass).toBe(true);
    expect(statusInfo.isAuthoritative).toBe(true);
    expect(statusInfo.hasCompliance).toBe(true);

    const singleRunAggregate = deriveAggregateStatus([statusInfo]);
    expect(singleRunAggregate).toBe('PASS / PRODUCTION VERIFIED');

    // VentilationReportsView determineComplianceStatus also yields COMPLIANT
    const reportCompliance = determineComplianceStatus(verifiedCompliantRun.parameters.lastCalculationResult);
    expect(reportCompliance.status).toBe('COMPLIANT');
    expect(reportCompliance.hasExplicitComplianceContract).toBe(true);
    expect(reportCompliance.hasNegativeComplianceContract).toBe(false);
  });

  it('11. Saved summary string claiming PASS cannot override contradictory structured failure status', () => {
    const contradictoryRun: HistoryItem = {
      id: 'r-contradictory',
      timestamp: '2026-10-07 11:25:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Manual Note: (Status: PASS — All Checked)',
      parameters: {
        lastCalculationResult: {
          status: 'FAIL',
          isAuthoritative: false
        }
      }
    };

    const statusInfo = extractRunStatusInfo(contradictoryRun);
    // Structured status FAIL must win over string summary
    expect(statusInfo.status).toBe('FAIL');
    expect(statusInfo.isPass).toBe(false);
    expect(statusInfo.isFail).toBe(true);
    expect(statusInfo.hasCompliance).toBe(false);

    // Report compliance also treats FAIL as non-compliant/unverified, not COMPLIANT
    const reportCompliance = determineComplianceStatus(contradictoryRun.parameters.lastCalculationResult);
    expect(reportCompliance.status).not.toBe('COMPLIANT');
    expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
  });

  it('12. Diagnostic authorityPolicy or DIAGNOSTIC compliance summary suppresses production compliance and authority', () => {
    const diagnosticRun: HistoryItem = {
      id: 'r-diagnostic',
      timestamp: '2026-10-07 11:30:00',
      tab: 'mechanical',
      title: 'Ventilation Calculation',
      summary: 'Status: PASS',
      parameters: {
        lastCalculationResult: {
          status: 'PASS',
          isAuthoritative: true,
          auditRecord: {
            authorityPolicy: 'DIAGNOSTIC'
          },
          complianceSummary: 'DIAGNOSTIC (PASS): Non-authoritative engineering diagnostic utility only.'
        }
      }
    };

    const statusInfo = extractRunStatusInfo(diagnosticRun);
    expect(statusInfo.status).toBe('PASS');
    expect(statusInfo.isPass).toBe(true);
    expect(statusInfo.isAuthoritative).toBe(false);
    expect(statusInfo.hasCompliance).toBe(false);

    // Report compliance determination must also be non-compliant/unverified
    const reportCompliance = determineComplianceStatus(diagnosticRun.parameters.lastCalculationResult);
    expect(reportCompliance.status).toBe('Compliance Not Verified');
    expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
  });

  it('13. VentilationReportsView determineComplianceStatus strictly replaces status-based inferences across all edge cases', () => {
    // A. PASS calculation with no complianceSummary or audit contract produces Compliance Not Verified
    const passNoContract = determineComplianceStatus({
      status: 'PASS',
      isAuthoritative: true
    });
    expect(passNoContract.status).toBe('Compliance Not Verified');
    expect(passNoContract.hasExplicitComplianceContract).toBe(false);

    // B. NON-COMPLIANT text anywhere produces NON-COMPLIANT
    const nonCompliantExplicit = determineComplianceStatus({
      status: 'PASS',
      isAuthoritative: true,
      complianceSummary: 'NON-COMPLIANT: Breathing zone rate below prescriptive threshold'
    });
    expect(nonCompliantExplicit.status).toBe('NON-COMPLIANT');
    expect(nonCompliantExplicit.hasExplicitComplianceContract).toBe(false);
    expect(nonCompliantExplicit.hasNegativeComplianceContract).toBe(true);

    // C. NON-COMPLIANT inside audit trail produces NON-COMPLIANT
    const nonCompliantAuditTrail = determineComplianceStatus(
      { status: 'PASS', isAuthoritative: true },
      [{ step: 'Ez calculation', complianceSummary: 'NON-COMPLIANT: Ez < 0.8' }]
    );
    expect(nonCompliantAuditTrail.status).toBe('NON-COMPLIANT');
    expect(nonCompliantAuditTrail.hasNegativeComplianceContract).toBe(true);

    // D. Fabricated COMPLIANT string with status FAIL cannot produce COMPLIANT
    const fabricatedOnFail = determineComplianceStatus({
      status: 'FAIL',
      isAuthoritative: false,
      complianceSummary: 'COMPLIANT: Falsified statement'
    });
    expect(fabricatedOnFail.status).toBe('Compliance Not Verified');
    expect(fabricatedOnFail.hasExplicitComplianceContract).toBe(false);

    // E. BLOCKED or INCOMPLETE does not leak as status string into compliance
    const blockedRun = determineComplianceStatus({
      status: 'BLOCKED'
    });
    expect(blockedRun.status).toBe('Compliance Not Verified');
    expect(blockedRun.hasExplicitComplianceContract).toBe(false);

    // F. Authoritative PASS with verified positive complianceSummary produces COMPLIANT
    const compliantRun = determineComplianceStatus({
      status: 'PASS',
      isAuthoritative: true,
      complianceSummary: 'COMPLIANT: Verified under ANSI/ASHRAE Standard 62.1-2022'
    });
    expect(compliantRun.status).toBe('COMPLIANT');
    expect(compliantRun.hasExplicitComplianceContract).toBe(true);
    expect(compliantRun.hasNegativeComplianceContract).toBe(false);
  });
});
