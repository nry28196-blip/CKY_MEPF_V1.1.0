import { jsPDF } from 'jspdf';
import { ProjectContainer, HistoryItem } from '../types';
import {
  evaluateComplianceDetermination,
  isAuthoritativeProductionRun
} from './complianceHelper';

export interface RunStatusInfo {
  status: string;
  isPass: boolean;
  isFail: boolean;
  isBlocked: boolean;
  isIncomplete: boolean;
  isAuthoritative: boolean;
  hasCompliance: boolean;
  complianceStatus: string;
  isNonCompliant: boolean;
  isComplianceVerified: boolean;
  rowStatusText: string;
}

/**
 * Extracts the honest engineering validation/run status from a HistoryItem.
 */
export function extractRunStatusInfo(run: HistoryItem): RunStatusInfo {
  const params = run.parameters || {};
  const lastCalc = params.lastCalculationResult;
  const exhaustStatus = params.exhaustStatus;

  // 1. Check if an explicit calculation result status is stored in parameters
  let rawStatus: string | undefined = undefined;
  if (lastCalc && typeof lastCalc.status === 'string') {
    rawStatus = lastCalc.status.toUpperCase();
  } else if (typeof exhaustStatus === 'string') {
    rawStatus = exhaustStatus.toUpperCase();
  } else if (typeof params.status === 'string') {
    rawStatus = params.status.toUpperCase();
  }

  // 2. If not found in parameters, check the summary string
  if (!rawStatus && typeof run.summary === 'string') {
    const sumUpper = run.summary.toUpperCase();
    if (sumUpper.includes('STATUS: PASS') || sumUpper.includes('AUDIT STATUS: PASS')) {
      rawStatus = 'PASS';
    } else if (sumUpper.includes('STATUS: FAIL') || sumUpper.includes('AUDIT STATUS: FAIL')) {
      rawStatus = 'FAIL';
    } else if (sumUpper.includes('STATUS: BLOCKED') || sumUpper.includes('AUDIT STATUS: BLOCKED')) {
      rawStatus = 'BLOCKED';
    } else if (sumUpper.includes('STATUS: INCOMPLETE') || sumUpper.includes('AUDIT STATUS: INCOMPLETE')) {
      rawStatus = 'INCOMPLETE';
    } else if (sumUpper.includes('STATUS: NOT_VERIFIED') || sumUpper.includes('AUDIT STATUS: NOT_VERIFIED') || sumUpper.includes('NOT VERIFIED')) {
      rawStatus = 'NOT_VERIFIED';
    } else if (sumUpper.includes('DIAGNOSTIC ONLY') || sumUpper.includes('SIMPLIFIED MODEL')) {
      rawStatus = 'DIAGNOSTIC ONLY';
    }
  }

  const status = rawStatus || 'RECORDED';
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';
  const isBlocked = status === 'BLOCKED';
  const isIncomplete = status === 'INCOMPLETE';

  // Construct effective evaluation object from lastCalc or parameters
  const effectiveResult = lastCalc || {
    status,
    isAuthoritative: Boolean(params.isAuthoritative),
    isApprovedForEngineeringUse: Boolean(params.isApprovedForEngineeringUse),
    authorityPolicy: params.authorityPolicy,
    complianceSummary: typeof params.complianceSummary === 'string' ? params.complianceSummary : undefined,
    complianceDetermination: params.complianceDetermination,
    auditTrail: Array.isArray(params.auditTrail) ? params.auditTrail : undefined,
    auditRecord: params.auditRecord
  };

  // Real authority from calculation result contract
  // Strictly requires PASS and explicit AUTHORITATIVE_PRODUCTION policy
  const isAuthoritative = isPass && isAuthoritativeProductionRun(effectiveResult);

  // Real compliance determination via unified helper
  const complianceEval = evaluateComplianceDetermination(effectiveResult);
  const complianceStatus = complianceEval.status; // 'COMPLIANT' | 'NON-COMPLIANT' | 'Compliance Not Verified'
  const isNonCompliant = complianceStatus === 'NON-COMPLIANT';
  const isComplianceVerified = complianceStatus === 'COMPLIANT' && complianceEval.hasExplicitComplianceContract;
  const hasCompliance = Boolean(
    isPass &&
    isAuthoritative &&
    isComplianceVerified
  );

  let rowStatusText = status;
  if (isPass) {
    if (isNonCompliant) {
      rowStatusText = 'PASS / NON-COMPLIANT';
    } else if (hasCompliance) {
      rowStatusText = 'PASS (VERIFIED)';
    } else {
      rowStatusText = 'PASS (UNVERIFIED)';
    }
  } else if (isFail) {
    rowStatusText = isNonCompliant ? 'FAIL (NON-COMPLIANT)' : 'FAIL';
  } else if (isBlocked) {
    rowStatusText = 'BLOCKED';
  } else if (isIncomplete) {
    rowStatusText = 'INCOMPLETE';
  } else if (status === 'NOT_VERIFIED') {
    rowStatusText = 'NOT VERIFIED';
  }

  return {
    status,
    isPass,
    isFail,
    isBlocked,
    isIncomplete,
    isAuthoritative,
    hasCompliance,
    complianceStatus,
    isNonCompliant,
    isComplianceVerified,
    rowStatusText
  };
}

export interface ComplianceAttentionItem {
  index: number;
  runId: string;
  discipline: string;
  title: string;
  calculationStatus: string;
  complianceFlag: 'NON_COMPLIANT' | 'NOT_VERIFIED';
  statusText: string;
  details: string;
}

export interface CollectiveComplianceSummary {
  totalRuns: number;
  compliantCount: number;
  nonCompliantCount: number;
  notVerifiedCount: number;
  hasNonCompliant: boolean;
  hasNotVerified: boolean;
  hasAttentionItems: boolean;
  attentionItems: ComplianceAttentionItem[];
}

/**
 * Extracts a concise audit finding or reason string for a flagged run.
 */
export function extractAttentionDetails(run: HistoryItem, statusInfo: RunStatusInfo): string {
  const params = run.parameters || {};
  const lastCalc = params.lastCalculationResult;
  const complianceSummary = typeof lastCalc?.complianceSummary === 'string'
    ? lastCalc.complianceSummary
    : (typeof params.complianceSummary === 'string' ? params.complianceSummary : '');

  if (statusInfo.isNonCompliant || statusInfo.complianceStatus === 'NON-COMPLIANT') {
    if (complianceSummary && (complianceSummary.toLowerCase().includes('non-compliant') || complianceSummary.toLowerCase().includes('not approved'))) {
      return complianceSummary.length > 55 ? complianceSummary.slice(0, 52) + '...' : complianceSummary;
    }
    if (statusInfo.isFail) {
      return 'Calculation failed engineering validation limits / out of spec';
    }
    return 'Explicit NON-COMPLIANT determination recorded';
  }

  if (statusInfo.status === 'NOT_VERIFIED') {
    return 'Calculation validation NOT_VERIFIED — unverified inputs';
  }
  if (statusInfo.isBlocked) {
    return 'Calculation BLOCKED by invalid or non-physical parameters';
  }
  if (statusInfo.isIncomplete) {
    return 'Calculation INCOMPLETE — mandatory design parameters required';
  }
  if (statusInfo.isPass && !statusInfo.isAuthoritative) {
    return 'Preliminary calculation — pending engineering sign-off';
  }
  if (statusInfo.isPass && !statusInfo.hasCompliance) {
    return 'Calculation valid but explicit compliance contract not verified';
  }

  return 'Compliance status pending authoritative verification';
}

/**
 * Aggregates all calculation runs, separating authoritative compliant records
 * from runs carrying NON_COMPLIANT or NOT_VERIFIED flags that require executive attention.
 */
export function aggregateComplianceFlags(runs: HistoryItem[]): CollectiveComplianceSummary {
  const attentionItems: ComplianceAttentionItem[] = [];
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let notVerifiedCount = 0;

  runs.forEach((run, index) => {
    const statusInfo = extractRunStatusInfo(run);
    const isNonCompliant = statusInfo.isNonCompliant ||
      statusInfo.complianceStatus === 'NON-COMPLIANT' ||
      statusInfo.status === 'FAIL' ||
      statusInfo.rowStatusText.includes('NON-COMPLIANT');

    if (isNonCompliant) {
      nonCompliantCount++;
      attentionItems.push({
        index: index + 1,
        runId: run.id,
        discipline: (run.tab || 'MEP').toUpperCase(),
        title: run.title,
        calculationStatus: statusInfo.status,
        complianceFlag: 'NON_COMPLIANT',
        statusText: statusInfo.rowStatusText,
        details: extractAttentionDetails(run, statusInfo)
      });
    } else {
      const isUnverified = statusInfo.status === 'NOT_VERIFIED' ||
        statusInfo.complianceStatus === 'Compliance Not Verified' ||
        !statusInfo.hasCompliance ||
        statusInfo.isBlocked ||
        statusInfo.isIncomplete ||
        statusInfo.rowStatusText.includes('UNVERIFIED') ||
        statusInfo.rowStatusText === 'NOT VERIFIED';

      if (isUnverified) {
        notVerifiedCount++;
        attentionItems.push({
          index: index + 1,
          runId: run.id,
          discipline: (run.tab || 'MEP').toUpperCase(),
          title: run.title,
          calculationStatus: statusInfo.status,
          complianceFlag: 'NOT_VERIFIED',
          statusText: statusInfo.rowStatusText,
          details: extractAttentionDetails(run, statusInfo)
        });
      } else {
        compliantCount++;
      }
    }
  });

  return {
    totalRuns: runs.length,
    compliantCount,
    nonCompliantCount,
    notVerifiedCount,
    hasNonCompliant: nonCompliantCount > 0,
    hasNotVerified: notVerifiedCount > 0,
    hasAttentionItems: attentionItems.length > 0,
    attentionItems
  };
}

/**
 * Derives the honest collective aggregate status from a list of runs.
 * Gated strictly on real contract states:
 * - Any FAIL/BLOCKED/INCOMPLETE/NOT_VERIFIED prevents an aggregate PASS.
 * - Any NON-COMPLIANT finding yields NON-COMPLIANT (ATTENTION REQUIRED); a known compliance failure is never obscured under PASS (CALCULATIONS VALID).
 * - PASS / PRODUCTION VERIFIED requires that ALL runs are PASS, authoritative, and compliant.
 * - Otherwise falls back to neutral PASS (CALCULATIONS VALID) or MULTI-RUN INVENTORY.
 */
export function deriveAggregateStatus(runStatuses: ReturnType<typeof extractRunStatusInfo>[]): string {
  if (runStatuses.length === 0) {
    return 'EMPTY (NO RUNS)';
  }
  const hasFail = runStatuses.some(r => r.isFail);
  const hasBlocked = runStatuses.some(r => r.isBlocked);
  const hasNonCompliant = runStatuses.some(r => r.isNonCompliant || r.complianceStatus === 'NON-COMPLIANT');
  const hasIncomplete = runStatuses.some(r => r.isIncomplete);
  const hasNotVerified = runStatuses.some(r => r.status === 'NOT_VERIFIED');
  const allPass = runStatuses.every(r => r.isPass);

  // Deterministic precedence:
  // 1. Calculation numeric/boundary failures
  if (hasFail) {
    return 'FAIL (ATTENTION REQUIRED)';
  }
  // 2. Calculation blocked by invalid or non-physical parameters
  if (hasBlocked) {
    return 'BLOCKED';
  }
  // 3. Known explicit regulatory non-compliance violation (must NEVER be obscured under PASS CALCULATIONS VALID)
  if (hasNonCompliant) {
    return 'NON-COMPLIANT (ATTENTION REQUIRED)';
  }
  // 4. Missing inputs or incomplete calculations
  if (hasIncomplete) {
    return 'INCOMPLETE';
  }
  // 5. Unverified calculation runs
  if (hasNotVerified) {
    return 'NOT VERIFIED';
  }
  // 6. All calculations passed
  if (allPass) {
    const allAuthAndCompliant = runStatuses.every(r => r.isAuthoritative && r.hasCompliance);
    return allAuthAndCompliant ? 'PASS / PRODUCTION VERIFIED' : 'PASS (CALCULATIONS VALID)';
  }

  return 'MULTI-RUN INVENTORY';
}

export function exportCollectiveProjectPdf(project: ProjectContainer, runs: HistoryItem[]): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Aggregate status derivation without inventing a global false PASS
  const runStatuses = runs.map(extractRunStatusInfo);
  const overallStatusText = deriveAggregateStatus(runStatuses);

  // -------------------------------------------------------------
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // -------------------------------------------------------------

  // Top Accent Bar
  pdf.setFillColor(8, 145, 178); // Cyan-600
  pdf.rect(0, 0, pageWidth, 5, 'F');

  // Header Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139); // Slate-500
  pdf.text('CKY_MEPF MULTI-DISCIPLINARY ENGINEERING SUITE', margin, 14);

  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42); // Slate-900
  pdf.text('COLLECTIVE MEP ENGINEERING SUBMITTAL', margin, 23);

  pdf.setFontSize(11);
  pdf.setTextColor(8, 145, 178);
  pdf.text(`PROJECT CONTAINER: ${project.name.toUpperCase()}`, margin, 30);

  // Metadata Card Box
  pdf.setFillColor(248, 250, 252); // Slate-50
  pdf.setDrawColor(203, 213, 225); // Slate-300
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, 35, contentWidth, 34, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  pdf.text('PROJECT METADATA & AHJ SUBMITTAL BASIS', margin + 4, 41);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);

  const col1X = margin + 4;
  const col2X = margin + 65;
  const col3X = margin + 125;

  pdf.text(`Project Number: ${project.projectNumber || 'MEP-2026-001'}`, col1X, 48);
  pdf.text(`Client / Developer: ${project.client || 'General Client'}`, col1X, 54);
  pdf.text(`Location: ${project.location || 'Site Location'}`, col1X, 60);

  pdf.text(`Lead Engineer: ${project.engineer || 'Lead MEP Engineer'}`, col2X, 48);
  pdf.text(`Created Date: ${project.createdAt}`, col2X, 54);
  pdf.text(`Submittal Date: ${new Date().toLocaleDateString()}`, col2X, 60);

  pdf.text(`Total Runs: ${runs.length} Calculations`, col3X, 48);
  pdf.text(`Status: ${overallStatusText}`, col3X, 54);
  pdf.text(`Revision: Rev 0 (Issued for AHJ Review)`, col3X, 60);

  // Description if available
  let startY = 74;
  if (project.description) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const splitDesc = pdf.splitTextToSize(`Project Scope: ${project.description}`, contentWidth);
    pdf.text(splitDesc, margin, startY);
    startY += splitDesc.length * 4 + 4;
  }

  // -------------------------------------------------------------
  // EXECUTIVE COMPLIANCE & STATUS ATTENTION AUDIT SUMMARY TABLE
  // Prominently aggregates & highlights all NON_COMPLIANT and NOT_VERIFIED runs
  // -------------------------------------------------------------
  const complianceSummary = aggregateComplianceFlags(runs);

  // Section Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);

  if (complianceSummary.hasNonCompliant) {
    pdf.setTextColor(185, 28, 28); // Red-700
    pdf.text('COMPLIANCE & VERIFICATION AUDIT — ATTENTION REQUIRED', margin, startY);
  } else if (complianceSummary.hasNotVerified) {
    pdf.setTextColor(180, 83, 9); // Amber-700
    pdf.text('COMPLIANCE & VERIFICATION AUDIT — PENDING ENGINEERING SIGN-OFF', margin, startY);
  } else {
    pdf.setTextColor(22, 101, 52); // Emerald-800
    pdf.text('COMPLIANCE & VERIFICATION AUDIT — ALL RUNS VERIFIED', margin, startY);
  }
  startY += 4.5;

  if (complianceSummary.hasAttentionItems) {
    // Executive Metrics Banner Callout
    const isAlert = complianceSummary.hasNonCompliant;
    pdf.setFillColor(isAlert ? 254 : 255, isAlert ? 242 : 251, isAlert ? 242 : 235);
    pdf.setDrawColor(isAlert ? 248 : 251, isAlert ? 113 : 191, isAlert ? 113 : 36);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, startY, contentWidth, 7.5, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(isAlert ? 153 : 146, isAlert ? 27 : 64, isAlert ? 27 : 14);
    pdf.text(
      `EXECUTIVE ATTENTION: ${complianceSummary.nonCompliantCount} Non-Compliant  •  ${complianceSummary.notVerifiedCount} Unverified  •  ${complianceSummary.compliantCount} Compliant of ${complianceSummary.totalRuns} Total Runs`,
      margin + 3,
      startY + 5
    );
    startY += 9;

    // Summary Table Header
    pdf.setFillColor(isAlert ? 153 : 180, isAlert ? 27 : 83, isAlert ? 27 : 9);
    pdf.rect(margin, startY, contentWidth, 6, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text('#', margin + 2, startY + 4.2);
    pdf.text('DISCIPLINE', margin + 8, startY + 4.2);
    pdf.text('CALCULATION TITLE', margin + 30, startY + 4.2);
    pdf.text('CALC STATUS', margin + 80, startY + 4.2);
    pdf.text('AUDIT FLAG', margin + 110, startY + 4.2);
    pdf.text('AUDIT FINDING & SUBMITTAL ACTION', margin + 140, startY + 4.2);
    startY += 6;

    // Highlighted Summary Rows
    complianceSummary.attentionItems.forEach((item) => {
      const isItemNonComp = item.complianceFlag === 'NON_COMPLIANT';
      pdf.setFillColor(isItemNonComp ? 254 : 255, isItemNonComp ? 242 : 251, isItemNonComp ? 242 : 235);
      pdf.setDrawColor(isItemNonComp ? 252 : 253, isItemNonComp ? 165 : 230, isItemNonComp ? 165 : 138);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, startY, contentWidth, 6.5, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(51, 65, 85);
      pdf.text(String(item.index), margin + 2, startY + 4.5);

      pdf.setFont('helvetica', 'bold');
      if (item.discipline === 'MECHANICAL') pdf.setTextColor(2, 132, 199);
      else if (item.discipline === 'PLUMBING') pdf.setTextColor(14, 165, 233);
      else if (item.discipline === 'ELECTRICAL') pdf.setTextColor(234, 88, 12);
      else if (item.discipline === 'FIRE') pdf.setTextColor(225, 29, 72);
      else pdf.setTextColor(100, 116, 139);
      pdf.text(item.discipline, margin + 8, startY + 4.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
      const titleTrunc = item.title.length > 26 ? item.title.slice(0, 24) + '...' : item.title;
      pdf.text(titleTrunc, margin + 30, startY + 4.5);

      pdf.setTextColor(51, 65, 85);
      pdf.text(item.calculationStatus, margin + 80, startY + 4.5);

      pdf.setFont('helvetica', 'bold');
      if (isItemNonComp) {
        pdf.setTextColor(185, 28, 28);
        pdf.text('NON-COMPLIANT', margin + 110, startY + 4.5);
      } else {
        pdf.setTextColor(180, 83, 9);
        pdf.text('NOT VERIFIED', margin + 110, startY + 4.5);
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      const detailsTrunc = item.details.length > 30 ? item.details.slice(0, 28) + '...' : item.details;
      pdf.text(detailsTrunc, margin + 140, startY + 4.5);

      startY += 6.5;
    });

    startY += 4;
  } else if (runs.length > 0) {
    // All runs compliant
    pdf.setFillColor(240, 253, 244); // Emerald-50
    pdf.setDrawColor(134, 239, 172); // Emerald-300
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, startY, contentWidth, 7.5, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(22, 101, 52);
    pdf.text(
      `✓ ALL RUNS COMPLIANT: 0 Non-Compliant flags  •  0 Unverified flags (${complianceSummary.totalRuns} of ${complianceSummary.totalRuns} calculations verified)`,
      margin + 3,
      startY + 5
    );
    startY += 11;
  }

  // -------------------------------------------------------------
  // CONSOLIDATED MEP CALCULATIONS INVENTORY
  // -------------------------------------------------------------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('CONSOLIDATED MEP CALCULATIONS INVENTORY', margin, startY);
  startY += 5;

  const drawInventoryTableHeader = (y: number) => {
    pdf.setFillColor(15, 23, 42); // Slate-900
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('#', margin + 2, y + 4.8);
    pdf.text('DISCIPLINE', margin + 10, y + 4.8);
    pdf.text('CALCULATION TITLE', margin + 40, y + 4.8);
    pdf.text('KEY SIZING / OUTPUT', margin + 105, y + 4.8);
    pdf.text('STATUS', margin + 162, y + 4.8);
  };

  drawInventoryTableHeader(startY);
  startY += 7;

  // Table Rows
  if (runs.length === 0) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, startY, contentWidth, 12, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No saved calculation runs have been added to this project container yet.', margin + 4, startY + 7);
    startY += 14;
  } else {
    runs.forEach((run, index) => {
      // Check for overflow before drawing row
      if (startY + 8 > pageHeight - 25) {
        pdf.addPage();
        pdf.setFillColor(8, 145, 178);
        pdf.rect(0, 0, pageWidth, 4, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`PROJECT: ${project.name.toUpperCase()} (INVENTORY CONTINUED)`, margin, 12);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 14, pageWidth - margin, 14);
        startY = 18;
        drawInventoryTableHeader(startY);
        startY += 7;
      }
      const isAlt = index % 2 === 1;
      pdf.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, startY, contentWidth, 8, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);

      pdf.text(String(index + 1), margin + 2, startY + 5.2);

      // Discipline badge color
      pdf.setFont('helvetica', 'bold');
      if (run.tab === 'mechanical') pdf.setTextColor(2, 132, 199); // Sky-600
      else if (run.tab === 'plumbing') pdf.setTextColor(14, 165, 233);
      else if (run.tab === 'electrical') pdf.setTextColor(234, 88, 12);
      else if (run.tab === 'fire') pdf.setTextColor(225, 29, 72);
      else pdf.setTextColor(100, 116, 139);

      pdf.text((run.tab || 'MEP').toUpperCase(), margin + 10, startY + 5.2);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
      const titleTrunc = run.title.length > 34 ? run.title.slice(0, 32) + '...' : run.title;
      pdf.text(titleTrunc, margin + 40, startY + 5.2);

      pdf.setTextColor(71, 85, 105);
      const summaryTrunc = run.summary.length > 38 ? run.summary.slice(0, 36) + '...' : run.summary;
      pdf.text(summaryTrunc, margin + 105, startY + 5.2);

      // Status Badge derived per run
      const runStatus = extractRunStatusInfo(run);
      pdf.setFont('helvetica', 'bold');
      if (runStatus.isPass) {
        if (runStatus.isNonCompliant) {
          pdf.setTextColor(185, 28, 28); // Red-700
          pdf.text('PASS / NON-COMPLIANT', margin + 154, startY + 5.2);
        } else if (runStatus.isAuthoritative && runStatus.hasCompliance) {
          pdf.setTextColor(22, 101, 52); // Emerald-800
          pdf.text('PASS (VERIFIED)', margin + 160, startY + 5.2);
        } else {
          pdf.setTextColor(180, 83, 9); // Amber-700
          pdf.text('PASS (UNVERIFIED)', margin + 156, startY + 5.2);
        }
      } else if (runStatus.isFail) {
        pdf.setTextColor(185, 28, 28); // Red-700
        pdf.text('FAIL', margin + 160, startY + 5.2);
      } else if (runStatus.isBlocked) {
        pdf.setTextColor(194, 65, 12); // Orange-700
        pdf.text('BLOCKED', margin + 160, startY + 5.2);
      } else if (runStatus.isIncomplete) {
        pdf.setTextColor(180, 83, 9); // Amber-700
        pdf.text('INCOMPLETE', margin + 160, startY + 5.2);
      } else if (runStatus.status === 'NOT_VERIFIED') {
        pdf.setTextColor(192, 38, 211); // Fuchsia-600
        pdf.text('NOT VERIFIED', margin + 160, startY + 5.2);
      } else {
        pdf.setTextColor(100, 116, 139); // Slate-500
        pdf.text(runStatus.status.slice(0, 12), margin + 160, startY + 5.2);
      }

      startY += 8;
    });
  }

  // Summary Metrics Banner
  startY += 6;
  if (startY < pageHeight - 40) {
    pdf.setFillColor(240, 253, 250); // Emerald-50
    pdf.setDrawColor(153, 246, 228); // Emerald-200
    pdf.roundedRect(margin, startY, contentWidth, 20, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 118, 110); // Emerald-700
    pdf.text('ENGINEERING QUALITY ASSURANCE & SUBMITTAL BASIS', margin + 4, startY + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(
      'Calculations grouped in this project container are governed by applicable ASHRAE, IPC, NFPA, and NEC standard criteria.',
      margin + 4,
      startY + 11
    );
    pdf.text(
      'Each calculation record preserves its individual validation status, audit trail, and authority level.',
      margin + 4,
      startY + 15.5
    );
  }

  // Page 1 Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Generated by CKY_MEPF Engineering Suite • Page 1 of ${Math.max(1, 1 + Math.ceil(runs.length / 2))}`, margin, pageHeight - 7);
  pdf.text('Confidential Engineering Submittal', pageWidth - margin - 50, pageHeight - 7);

  // -------------------------------------------------------------
  // DETAILED CALCULATION SHEETS (2 RUNS PER PAGE)
  // -------------------------------------------------------------
  for (let i = 0; i < runs.length; i += 2) {
    pdf.addPage();
    const currentPage = 2 + Math.floor(i / 2);
    const totalPages = 1 + Math.ceil(runs.length / 2);

    // Top Accent Bar
    pdf.setFillColor(8, 145, 178);
    pdf.rect(0, 0, pageWidth, 4, 'F');

    // Page Running Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`PROJECT: ${project.name.toUpperCase()} (REF: ${project.projectNumber || 'MEP'})`, margin, 12);
    pdf.text('DETAILED ENGINEERING CALCULATION TRACES', pageWidth - margin - 75, 12);

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 14, pageWidth - margin, 14);

    let cardY = 18;
    const runsOnPage = runs.slice(i, i + 2);

    runsOnPage.forEach((run, subIndex) => {
      const cardHeight = 120;
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, 'FD');

      // Card Header Banner
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, cardY, contentWidth, 10, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`CALCULATION #${i + subIndex + 1}: ${run.title}`, margin + 4, cardY + 6.5);

      pdf.setFontSize(7.5);
      pdf.setTextColor(2, 132, 199);
      pdf.text(`DISCIPLINE: ${run.tab.toUpperCase()}`, pageWidth - margin - 35, cardY + 6.5);

      // Metadata Row
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Saved Timestamp: ${run.timestamp}`, margin + 4, cardY + 15);
      pdf.text(`Run ID: ${run.id}`, margin + 70, cardY + 15);
      pdf.text('Governing Code: ASHRAE / IPC / NFPA / NEC', margin + 125, cardY + 15);

      // Sizing Summary Box
      pdf.setFillColor(240, 253, 250);
      pdf.setDrawColor(153, 246, 228);
      pdf.roundedRect(margin + 4, cardY + 18, contentWidth - 8, 14, 1.5, 1.5, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 118, 110);
      pdf.text('Engineering Sizing Output Summary:', margin + 7, cardY + 23);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(run.summary, margin + 7, cardY + 28);

      // Parameters Breakdown Table
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text('Input Parameters & Governing Coefficients:', margin + 4, cardY + 38);

      let paramY = cardY + 44;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);

      const params = run.parameters || {};
      const paramKeys = Object.keys(params).slice(0, 10);

      if (paramKeys.length === 0) {
        pdf.text('Standard engineering inputs applied.', margin + 6, paramY);
      } else {
        const leftColKeys = paramKeys.slice(0, 5);
        const rightColKeys = paramKeys.slice(5, 10);

        leftColKeys.forEach(k => {
          const val = typeof params[k] === 'object' ? JSON.stringify(params[k]).slice(0, 24) : String(params[k]);
          pdf.text(`• ${k}: ${val}`, margin + 6, paramY);
          paramY += 4.5;
        });

        let rightParamY = cardY + 44;
        rightColKeys.forEach(k => {
          const val = typeof params[k] === 'object' ? JSON.stringify(params[k]).slice(0, 24) : String(params[k]);
          pdf.text(`• ${k}: ${val}`, margin + 95, rightParamY);
          rightParamY += 4.5;
        });
      }

      // Notes if available
      if (run.notes) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Engineering Notes: ${run.notes}`, margin + 4, cardY + 95);
      }

      // Compliance Status Bar at Bottom of Card
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, cardY + cardHeight - 12, contentWidth, 12, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, cardY + cardHeight - 12, margin + contentWidth, cardY + cardHeight - 12);

      const cardRunStatus = extractRunStatusInfo(run);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);

      if (cardRunStatus.isNonCompliant) {
        pdf.setTextColor(185, 28, 28);
        pdf.text('✕ COMPLIANCE DETERMINATION: NON-COMPLIANT', margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.hasCompliance) {
        pdf.setTextColor(22, 101, 52);
        pdf.text('✓ COMPLIANCE DETERMINATION: COMPLIANT', margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.isPass) {
        pdf.setTextColor(cardRunStatus.isAuthoritative ? 22 : 180, cardRunStatus.isAuthoritative ? 101 : 83, cardRunStatus.isAuthoritative ? 52 : 9);
        pdf.text(cardRunStatus.isAuthoritative
          ? '• CALCULATION STATUS: PASS (AUTHORITATIVE PRODUCTION — UNVERIFIED COMPLIANCE)'
          : '• CALCULATION STATUS: PASS (PRELIMINARY / NON-VERIFIED AUTHORITY)',
          margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.isFail) {
        pdf.setTextColor(185, 28, 28);
        pdf.text('✕ CALCULATION STATUS: FAIL (NON-COMPLIANT / OUT OF SPEC)', margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.isBlocked) {
        pdf.setTextColor(194, 65, 12);
        pdf.text('⚠ CALCULATION STATUS: BLOCKED (PARAMETERS UNVERIFIED)', margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.isIncomplete) {
        pdf.setTextColor(180, 83, 9);
        pdf.text('⚠ CALCULATION STATUS: INCOMPLETE (PARAMETERS REQUIRED)', margin + 4, cardY + cardHeight - 4.5);
      } else if (cardRunStatus.status === 'NOT_VERIFIED') {
        pdf.setTextColor(192, 38, 211);
        pdf.text('⚠ CALCULATION STATUS: NOT VERIFIED (UNVERIFIED TABLES/INPUTS)', margin + 4, cardY + cardHeight - 4.5);
      } else {
        pdf.setTextColor(71, 85, 105);
        pdf.text(`• CALCULATION STATUS: ${cardRunStatus.status.toUpperCase()}`, margin + 4, cardY + cardHeight - 4.5);
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Trace ID: ' + run.id.slice(0, 18), pageWidth - margin - 45, cardY + cardHeight - 4.5);

      cardY += cardHeight + 8;
    });

    // Running Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Project Submittal: ${project.name} • Page ${currentPage} of ${totalPages}`, margin, pageHeight - 7);
    pdf.text('CKY_MEPF Engineering Suite', pageWidth - margin - 40, pageHeight - 7);
  }

  // Trigger download in browser environment
  const safeFilename = `${(project.name || 'MEP_Project').replace(/[^a-zA-Z0-9_-]/g, '_')}_Submittal_Package.pdf`;
  if (typeof window !== 'undefined' && typeof pdf.save === 'function') {
    try {
      pdf.save(safeFilename);
    } catch {
      // In tests or mock environments without download prompts
    }
  }

  return pdf;
}
