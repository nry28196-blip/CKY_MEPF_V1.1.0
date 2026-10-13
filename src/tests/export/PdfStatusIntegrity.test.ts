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
          isAuthoritative: true,
          auditRecord: {
            authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
            finalResult: { isAuthoritative: true }
          }
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
          complianceDetermination: 'COMPLIANT',
          auditRecord: {
            authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
            complianceDetermination: 'COMPLIANT',
            finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
          },
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

    // F. Authoritative PASS with verified positive compliance produces COMPLIANT
    const compliantRun = determineComplianceStatus({
      status: 'PASS',
      isAuthoritative: true,
      complianceDetermination: 'COMPLIANT',
      auditRecord: {
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        complianceDetermination: 'COMPLIANT',
        finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
      },
      complianceSummary: 'COMPLIANT: Verified under ANSI/ASHRAE Standard 62.1-2022'
    });
    expect(compliantRun.status).toBe('COMPLIANT');
    expect(compliantRun.hasExplicitComplianceContract).toBe(true);
    expect(compliantRun.hasNegativeComplianceContract).toBe(false);
  });

  describe('Step 4C — Strict Authority Policy & Unified Compliance Parsing', () => {
    it('14. Missing authorityPolicy cannot produce production authority', () => {
      const runMissingPolicy: HistoryItem = {
        id: 'r-missing-policy',
        timestamp: '2026-10-07 12:00:00',
        tab: 'mechanical',
        title: 'Run with Omitted Policy',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            // authorityPolicy is completely omitted
            complianceSummary: 'COMPLIANT: Prescriptive values meet Standard 62.1'
          }
        }
      };

      const statusInfo = extractRunStatusInfo(runMissingPolicy);
      expect(statusInfo.status).toBe('PASS');
      expect(statusInfo.isPass).toBe(true);
      // Missing authority policy fails safe:
      expect(statusInfo.isAuthoritative).toBe(false);
      expect(statusInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(runMissingPolicy.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('Compliance Not Verified');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });

    it('15. DIAGNOSTIC authorityPolicy cannot produce production authority or compliance', () => {
      const runDiag: HistoryItem = {
        id: 'r-diag-policy',
        timestamp: '2026-10-07 12:05:00',
        tab: 'mechanical',
        title: 'Diagnostic Utility Run',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'DIAGNOSTIC',
              finalResult: { isAuthoritative: false }
            },
            complianceSummary: 'COMPLIANT: Diagnostic check passed'
          }
        }
      };

      const statusInfo = extractRunStatusInfo(runDiag);
      expect(statusInfo.isAuthoritative).toBe(false);
      expect(statusInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(runDiag.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('Compliance Not Verified');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });

    it('16. Explicit AUTHORITATIVE_PRODUCTION with a valid PASS follows the actual audit contract', () => {
      const validAuthRun: HistoryItem = {
        id: 'r-valid-auth',
        timestamp: '2026-10-07 12:10:00',
        tab: 'mechanical',
        title: 'ASHRAE 62.1 VRP Compliant Run',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            isApprovedForEngineeringUse: true,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              isApprovedForEngineeringUse: true,
              complianceDetermination: 'COMPLIANT',
              finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
            },
            complianceSummary: 'COMPLIANT: Verified per Table 6-1 VRP under ANSI/ASHRAE 62.1-2022'
          }
        }
      };

      const statusInfo = extractRunStatusInfo(validAuthRun);
      expect(statusInfo.status).toBe('PASS');
      expect(statusInfo.isPass).toBe(true);
      expect(statusInfo.isAuthoritative).toBe(true);
      expect(statusInfo.hasCompliance).toBe(true);

      const reportCompliance = determineComplianceStatus(validAuthRun.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('COMPLIANT');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(true);
      expect(reportCompliance.hasNegativeComplianceContract).toBe(false);
    });

    it('17. FAIL, BLOCKED, INCOMPLETE, and NOT_VERIFIED cannot produce production authority or positive compliance', () => {
      const nonPassStatuses = ['FAIL', 'BLOCKED', 'INCOMPLETE', 'NOT_VERIFIED'];

      nonPassStatuses.forEach(st => {
        const item: HistoryItem = {
          id: `r-nonpass-${st}`,
          timestamp: '2026-10-07 12:15:00',
          tab: 'mechanical',
          title: `Run with status ${st}`,
          summary: `Status: ${st}`,
          parameters: {
            lastCalculationResult: {
              status: st,
              isAuthoritative: true,
              auditRecord: {
                authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
                finalResult: { isAuthoritative: true }
              },
              complianceSummary: 'COMPLIANT: Falsified statement on non-PASS'
            }
          }
        };

        const statusInfo = extractRunStatusInfo(item);
        expect(statusInfo.isPass).toBe(false);
        expect(statusInfo.isAuthoritative).toBe(false);
        expect(statusInfo.hasCompliance).toBe(false);

        const reportCompliance = determineComplianceStatus(item.parameters.lastCalculationResult);
        expect(reportCompliance.status).not.toBe('COMPLIANT');
        expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
      });
    });

    it('18. Negative variations NOT-COMPLIANT and NOT IN COMPLIANCE cannot produce positive compliance', () => {
      const negativeTexts = [
        'NOT-COMPLIANT: Zone 1 airflow insufficient',
        'NOT IN COMPLIANCE with Table 6-1',
        'NON COMPLIANT with minimum outdoor air',
        'OUT OF COMPLIANCE: Standard thresholds exceeded'
      ];

      negativeTexts.forEach(text => {
        const item: HistoryItem = {
          id: 'r-neg-var',
          timestamp: '2026-10-07 12:20:00',
          tab: 'mechanical',
          title: 'Negative Compliance Variation',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              auditRecord: {
                authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
                finalResult: { isAuthoritative: true }
              },
              complianceSummary: text
            }
          }
        };

        const statusInfo = extractRunStatusInfo(item);
        expect(statusInfo.hasCompliance).toBe(false);

        const reportCompliance = determineComplianceStatus(item.parameters.lastCalculationResult);
        expect(reportCompliance.status).toBe('NON-COMPLIANT');
        expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
        expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
      });
    });

    it('19. Conflicting positive and negative evidence cannot produce COMPLIANT', () => {
      const conflictingItem: HistoryItem = {
        id: 'r-conflict',
        timestamp: '2026-10-07 12:25:00',
        tab: 'mechanical',
        title: 'Conflicting Run',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              finalResult: { isAuthoritative: true }
            },
            // Positive direct summary, but negative embedded note in audit trail
            complianceSummary: 'COMPLIANT: Overall system calculated',
            auditTrail: [
              { step: 'Zone 2', complianceSummary: 'NON-COMPLIANT: Exhaust rate insufficient' }
            ]
          }
        }
      };

      const statusInfo = extractRunStatusInfo(conflictingItem);
      expect(statusInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(
        conflictingItem.parameters.lastCalculationResult,
        conflictingItem.parameters.lastCalculationResult.auditTrail
      );
      // Negative takes precedence
      expect(reportCompliance.status).toBe('NON-COMPLIANT');
      expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });

    it('20. Evidence stored in supported nested audit-record fields is interpreted consistently', () => {
      const nestedAuditItem: HistoryItem = {
        id: 'r-nested-audit',
        timestamp: '2026-10-07 12:30:00',
        tab: 'mechanical',
        title: 'Nested Audit Record Run',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              isApprovedForEngineeringUse: true,
              complianceDetermination: 'COMPLIANT',
              finalResult: {
                isAuthoritative: true,
                complianceDetermination: 'COMPLIANT',
                complianceSummary: 'COMPLIANT: Verified in auditRecord.finalResult'
              }
            }
          }
        }
      };

      const statusInfo = extractRunStatusInfo(nestedAuditItem);
      expect(statusInfo.isPass).toBe(true);
      expect(statusInfo.isAuthoritative).toBe(true);
      expect(statusInfo.hasCompliance).toBe(true);

      const reportCompliance = determineComplianceStatus(nestedAuditItem.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('COMPLIANT');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(true);
    });

    it('21. Report and PDF agree for identical input results across all states', () => {
      const testCases = [
        {
          name: 'Authoritative Compliant',
          calc: {
            status: 'PASS',
            isAuthoritative: true,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              complianceDetermination: 'COMPLIANT',
              finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
            },
            complianceSummary: 'COMPLIANT: Standard 62.1 verified'
          },
          expectedPass: true,
          expectedAuth: true,
          expectedCompliance: true,
          expectedReportStatus: 'COMPLIANT'
        },
        {
          name: 'Authoritative without compliance',
          calc: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              finalResult: { isAuthoritative: true }
            }
          },
          expectedPass: true,
          expectedAuth: true,
          expectedCompliance: false,
          expectedReportStatus: 'Compliance Not Verified'
        },
        {
          name: 'Diagnostic PASS',
          calc: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'DIAGNOSTIC'
            },
            complianceSummary: 'DIAGNOSTIC: Non-authoritative'
          },
          expectedPass: true,
          expectedAuth: false,
          expectedCompliance: false,
          expectedReportStatus: 'Compliance Not Verified'
        },
        {
          name: 'Non-Compliant PASS',
          calc: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              finalResult: { isAuthoritative: true }
            },
            complianceSummary: 'NOT-COMPLIANT: Limits exceeded'
          },
          expectedPass: true,
          expectedAuth: true,
          expectedCompliance: false,
          expectedReportStatus: 'NON-COMPLIANT'
        }
      ];

      testCases.forEach(tc => {
        const item: HistoryItem = {
          id: `agree-${tc.name}`,
          timestamp: '2026-10-07 12:35:00',
          tab: 'mechanical',
          title: tc.name,
          summary: 'Status: PASS',
          parameters: { lastCalculationResult: tc.calc }
        };

        const pdfInfo = extractRunStatusInfo(item);
        const reportInfo = determineComplianceStatus(tc.calc);

        expect(pdfInfo.isPass).toBe(tc.expectedPass);
        expect(pdfInfo.isAuthoritative).toBe(tc.expectedAuth);
        expect(pdfInfo.hasCompliance).toBe(tc.expectedCompliance);
        expect(reportInfo.status).toBe(tc.expectedReportStatus);

        // Consistency: if PDF says hasCompliance=true, report MUST say COMPLIANT
        if (pdfInfo.hasCompliance) {
          expect(reportInfo.status).toBe('COMPLIANT');
        } else {
          expect(reportInfo.status).not.toBe('COMPLIANT');
        }
      });
    });

    it('22. Aggregate production verification requires explicit authority and compliance for every run', () => {
      const run1AuthComp: HistoryItem = {
        id: 'r1',
        timestamp: '2026-10-07 12:40:00',
        tab: 'mechanical',
        title: 'Run 1',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              complianceDetermination: 'COMPLIANT',
              finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
            },
            complianceSummary: 'COMPLIANT: Verified'
          }
        }
      };

      const run2PassNoAuth: HistoryItem = {
        id: 'r2',
        timestamp: '2026-10-07 12:41:00',
        tab: 'mechanical',
        title: 'Run 2',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: false
          }
        }
      };

      // Both runs passed, but only run 1 is authoritative + compliant
      const statuses = [extractRunStatusInfo(run1AuthComp), extractRunStatusInfo(run2PassNoAuth)];
      const agg = deriveAggregateStatus(statuses);
      expect(agg).toBe('PASS (CALCULATIONS VALID)');
      expect(agg).not.toBe('PASS / PRODUCTION VERIFIED');

      // Now with run2 also authoritative and compliant
      const run2AuthComp: HistoryItem = {
        ...run2PassNoAuth,
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              complianceDetermination: 'COMPLIANT',
              finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
            },
            complianceSummary: 'COMPLIANT: Verified'
          }
        }
      };

      const allAuthCompStatuses = [extractRunStatusInfo(run1AuthComp), extractRunStatusInfo(run2AuthComp)];
      const aggVerified = deriveAggregateStatus(allAuthCompStatuses);
    });
  });

  describe('Phase 3 — Explicit Structured Compliance Contract Hardening & Negative Regression Suite', () => {
    it('23. (Req 1 & 10) PASS with free-text COMPLIANT but no structured compliance determination fails closed to NOT_VERIFIED', () => {
      const freeTextOnlyRun: HistoryItem = {
        id: 'r-freetext-only',
        timestamp: '2026-10-07 13:00:00',
        tab: 'mechanical',
        title: 'Free-text compliance only',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              finalResult: { isAuthoritative: true }
              // NO complianceDetermination field
            },
            // Free text summary claiming compliant
            complianceSummary: 'COMPLIANT: Verified per Table 6-1 VRP'
          }
        }
      };

      const pdfInfo = extractRunStatusInfo(freeTextOnlyRun);
      expect(pdfInfo.isPass).toBe(true);
      expect(pdfInfo.isAuthoritative).toBe(true);
      // Free text alone MUST NEVER grant positive compliance:
      expect(pdfInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(freeTextOnlyRun.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('Compliance Not Verified');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);

      const agg = deriveAggregateStatus([pdfInfo]);
      expect(agg).toBe('PASS (CALCULATIONS VALID)');
      expect(agg).not.toBe('PASS / PRODUCTION VERIFIED');
    });

    it('24. (Req 2) NOT YET COMPLIANT and NOT FULLY COMPLIANT text are recognized as explicit negative evidence', () => {
      const partialComplianceTexts = [
        'NOT YET COMPLIANT: Airflow rate below minimum Table 6-1 threshold',
        'NOT FULLY COMPLIANT: Distribution effectiveness Ez not established',
        'NOT CURRENTLY COMPLIANT: Outdoor air intake obstructed'
      ];

      partialComplianceTexts.forEach(txt => {
        const item: HistoryItem = {
          id: `r-partial-${txt.slice(0, 10)}`,
          timestamp: '2026-10-07 13:05:00',
          tab: 'mechanical',
          title: 'Partial compliance test',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              complianceDetermination: 'COMPLIANT', // Falsified positive structured field
              complianceSummary: txt
            }
          }
        };

        const pdfInfo = extractRunStatusInfo(item);
        // Explicit negative text strictly overrides positive structured field
        expect(pdfInfo.hasCompliance).toBe(false);

        const reportCompliance = determineComplianceStatus(item.parameters.lastCalculationResult);
        expect(reportCompliance.status).toBe('NON-COMPLIANT');
        expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
        expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
      });
    });

    it('25. (Req 3) NON-COMPLIANT, NON COMPLIANT, and NON_COMPLIANT evidence strictly prevent positive compliance', () => {
      const nonCompliantVariations = [
        'NON-COMPLIANT: Primary air fraction too low',
        'NON COMPLIANT: Secondary recirculation exceeds limit',
        'NON_COMPLIANT: Standard ventilation not met'
      ];

      nonCompliantVariations.forEach(phrase => {
        const item: HistoryItem = {
          id: `r-noncomp-${phrase.slice(0, 12)}`,
          timestamp: '2026-10-07 13:10:00',
          tab: 'mechanical',
          title: 'Non-compliant test',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              complianceSummary: phrase
            }
          }
        };

        const pdfInfo = extractRunStatusInfo(item);
        expect(pdfInfo.hasCompliance).toBe(false);

        const reportCompliance = determineComplianceStatus(item.parameters.lastCalculationResult);
        expect(reportCompliance.status).toBe('NON-COMPLIANT');
        expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
      });
    });

    it('26. (Req 4) Positive summary evidence contradicted by a negative audit-trail entry fails safe to NON-COMPLIANT', () => {
      const contradictedRun: HistoryItem = {
        id: 'r-contradicted',
        timestamp: '2026-10-07 13:15:00',
        tab: 'mechanical',
        title: 'Contradicted audit trail test',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            complianceDetermination: 'COMPLIANT',
            complianceSummary: 'COMPLIANT: System level calculation solved',
            auditTrail: [
              { step: 'Zone 1', complianceSummary: 'COMPLIANT: Zone 1 satisfied' },
              { step: 'Zone 2', complianceSummary: 'NOT IN COMPLIANCE: Zone 2 airflow deficient' }
            ]
          }
        }
      };

      const pdfInfo = extractRunStatusInfo(contradictedRun);
      expect(pdfInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(
        contradictedRun.parameters.lastCalculationResult,
        contradictedRun.parameters.lastCalculationResult.auditTrail
      );
      // Negative audit-trail entry takes absolute precedence
      expect(reportCompliance.status).toBe('NON-COMPLIANT');
      expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });

    it('27. (Req 5) Diagnostic authority attempting to claim compliance fails closed to NOT_VERIFIED', () => {
      const diagClaimant: HistoryItem = {
        id: 'r-diag-claimant',
        timestamp: '2026-10-07 13:20:00',
        tab: 'mechanical',
        title: 'Diagnostic claimant',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: false,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'DIAGNOSTIC',
              complianceDetermination: 'COMPLIANT',
              finalResult: { isAuthoritative: false, complianceDetermination: 'COMPLIANT' }
            },
            complianceSummary: 'COMPLIANT: Diagnostic run verified'
          }
        }
      };

      const pdfInfo = extractRunStatusInfo(diagClaimant);
      expect(pdfInfo.isAuthoritative).toBe(false);
      expect(pdfInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(diagClaimant.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('Compliance Not Verified');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });

    it('28. (Req 6) Non-PASS statuses (FAIL, BLOCKED, INCOMPLETE, NOT_VERIFIED) with fabricated compliance cannot produce COMPLIANT', () => {
      const statuses = ['FAIL', 'BLOCKED', 'INCOMPLETE', 'NOT_VERIFIED'];

      statuses.forEach(st => {
        const item: HistoryItem = {
          id: `r-fake-${st}`,
          timestamp: '2026-10-07 13:25:00',
          tab: 'mechanical',
          title: `Fabricated ${st}`,
          summary: `Status: ${st}`,
          parameters: {
            lastCalculationResult: {
              status: st,
              isAuthoritative: true,
              complianceDetermination: 'COMPLIANT',
              auditRecord: {
                authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
                complianceDetermination: 'COMPLIANT',
                finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
              },
              complianceSummary: 'COMPLIANT: Fabricated positive note'
            }
          }
        };

        const pdfInfo = extractRunStatusInfo(item);
        expect(pdfInfo.isPass).toBe(false);
        expect(pdfInfo.isAuthoritative).toBe(false);
        expect(pdfInfo.hasCompliance).toBe(false);

        const reportCompliance = determineComplianceStatus(item.parameters.lastCalculationResult);
        expect(reportCompliance.status).not.toBe('COMPLIANT');
        expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
      });
    });

    it('29. (Req 7) Missing or contradictory structured compliance fields fail closed to NOT_VERIFIED or NON_COMPLIANT', () => {
      // Contradictory: result says COMPLIANT but auditRecord says NON_COMPLIANT
      const contradictoryItem: HistoryItem = {
        id: 'r-contra-fields',
        timestamp: '2026-10-07 13:30:00',
        tab: 'mechanical',
        title: 'Contradictory fields',
        summary: 'Status: PASS',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            complianceDetermination: 'COMPLIANT',
            auditRecord: {
              authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
              complianceDetermination: 'NON_COMPLIANT',
              finalResult: { isAuthoritative: true, complianceDetermination: 'NON_COMPLIANT' }
            }
          }
        }
      };

      const pdfInfo = extractRunStatusInfo(contradictoryItem);
      expect(pdfInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(contradictoryItem.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('NON-COMPLIANT');
      expect(reportCompliance.hasNegativeComplianceContract).toBe(true);
    });

    it('30. (Req 8) Consistent results across Application Header logic, Ventilation Reports, PDF rows, and PDF aggregate', () => {
      const runs: HistoryItem[] = [
        {
          id: 'h-1',
          timestamp: '2026-10-07 13:35:00',
          tab: 'mechanical',
          title: 'Run 1 — Compliant',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              complianceDetermination: 'COMPLIANT',
              auditRecord: {
                authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
                complianceDetermination: 'COMPLIANT',
                finalResult: { isAuthoritative: true, complianceDetermination: 'COMPLIANT' }
              },
              complianceSummary: 'COMPLIANT: Table 6-1 verified'
            }
          }
        },
        {
          id: 'h-2',
          timestamp: '2026-10-07 13:36:00',
          tab: 'mechanical',
          title: 'Run 2 — Non-Compliant',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              complianceSummary: 'NON-COMPLIANT: Insufficient outdoor air'
            }
          }
        },
        {
          id: 'h-3',
          timestamp: '2026-10-07 13:37:00',
          tab: 'mechanical',
          title: 'Run 3 — Pass Unverified',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: false
            }
          }
        }
      ];

      // Row 1: Fully verified compliant
      const row1Pdf = extractRunStatusInfo(runs[0]);
      const row1Rep = determineComplianceStatus(runs[0].parameters.lastCalculationResult);
      expect(row1Pdf.hasCompliance).toBe(true);
      expect(row1Rep.status).toBe('COMPLIANT');

      // Row 2: Non-compliant
      const row2Pdf = extractRunStatusInfo(runs[1]);
      const row2Rep = determineComplianceStatus(runs[1].parameters.lastCalculationResult);
      expect(row2Pdf.hasCompliance).toBe(false);
      expect(row2Rep.status).toBe('NON-COMPLIANT');

      // Row 3: Unverified pass
      const row3Pdf = extractRunStatusInfo(runs[2]);
      const row3Rep = determineComplianceStatus(runs[2].parameters.lastCalculationResult);
      expect(row3Pdf.hasCompliance).toBe(false);
      expect(row3Rep.status).toBe('Compliance Not Verified');

      // Aggregate status for the mixed batch
      const agg = deriveAggregateStatus([row1Pdf, row2Pdf, row3Pdf]);
      expect(agg).not.toBe('PASS / PRODUCTION VERIFIED');
    });

    it('31. (Req 9) All-pass runs without explicit compliance evidence remain neutral (PASS CALCULATIONS VALID) rather than production-verified', () => {
      const runsAllPassUnverified: HistoryItem[] = [
        {
          id: 'p-1',
          timestamp: '2026-10-07 13:40:00',
          tab: 'mechanical',
          title: 'Pass 1',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              auditRecord: { authorityPolicy: 'AUTHORITATIVE_PRODUCTION', finalResult: { isAuthoritative: true } }
            }
          }
        },
        {
          id: 'p-2',
          timestamp: '2026-10-07 13:41:00',
          tab: 'mechanical',
          title: 'Pass 2',
          summary: 'Status: PASS',
          parameters: {
            lastCalculationResult: {
              status: 'PASS',
              isAuthoritative: true,
              auditRecord: { authorityPolicy: 'AUTHORITATIVE_PRODUCTION', finalResult: { isAuthoritative: true } }
            }
          }
        }
      ];

      const statuses = runsAllPassUnverified.map(extractRunStatusInfo);
      expect(statuses.every(s => s.isPass)).toBe(true);
      expect(statuses.every(s => s.isAuthoritative)).toBe(true);
      expect(statuses.every(s => s.hasCompliance)).toBe(false);

      const agg = deriveAggregateStatus(statuses);
      expect(agg).toBe('PASS (CALCULATIONS VALID)');
      expect(agg).not.toBe('PASS / PRODUCTION VERIFIED');
    });

    it('32. (Req 10) Legacy saved records without the new structured field fail closed to NOT_VERIFIED', () => {
      const legacyRun: HistoryItem = {
        id: 'legacy-run-001',
        timestamp: '2026-09-01 08:00:00',
        tab: 'mechanical',
        title: 'Legacy Saved Run',
        summary: 'Legacy export data (Status: PASS)',
        parameters: {
          lastCalculationResult: {
            status: 'PASS',
            isAuthoritative: true,
            // Legacy schema: has complianceSummary string but NO complianceDetermination
            complianceSummary: 'COMPLIANT: Legacy run without machine-readable contract field'
          }
        }
      };

      const pdfInfo = extractRunStatusInfo(legacyRun);
      expect(pdfInfo.isPass).toBe(true);
      // Must fail closed:
      expect(pdfInfo.hasCompliance).toBe(false);

      const reportCompliance = determineComplianceStatus(legacyRun.parameters.lastCalculationResult);
      expect(reportCompliance.status).toBe('Compliance Not Verified');
      expect(reportCompliance.hasExplicitComplianceContract).toBe(false);
    });
  });
});
