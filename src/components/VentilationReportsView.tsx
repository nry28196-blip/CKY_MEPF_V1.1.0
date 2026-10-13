import React from 'react';
import { FileText, Download, Printer, ShieldCheck, CheckCircle2, AlertCircle, AlertTriangle, Activity, Wind, Info } from 'lucide-react';
import AuditTrailTable from './AuditTrailTable';
import { exportVentilationToCsv } from '../lib/exportCsv';
import { exportElementToPdf } from '../lib/exportPdf';
import { useUnit } from '../lib/UnitContext';

interface VentilationReportsViewProps {
  engineResult?: any;
  zones?: any[];
  systemType?: string;
  auditTrails?: any[];
}

import {
  isAuthoritativeProductionRun,
  evaluateComplianceDetermination,
  extractComplianceCandidates,
  ComplianceEvaluation
} from '../lib/complianceHelper';
import {
  isExplicitNegativeCompliance,
  isExplicitPositiveCompliance,
  normalizeComplianceText,
  parseComplianceString,
  parseComplianceSummary
} from '../lib/complianceUtils';

export {
  isExplicitNegativeCompliance,
  isExplicitPositiveCompliance,
  isAuthoritativeProductionRun,
  normalizeComplianceText,
  parseComplianceString,
  parseComplianceSummary
};

export interface ComplianceDetermination {
  status: 'COMPLIANT' | 'NON-COMPLIANT' | 'Compliance Not Verified';
  color: string;
  subtext: string;
  hasExplicitComplianceContract: boolean;
  hasNegativeComplianceContract: boolean;
}

export function determineComplianceStatus(
  engineResult?: any,
  auditTrails: any[] = []
): ComplianceDetermination {
  // 1. Gather compliance summary candidates from result and audit trail records
  const candidates: string[] = [];
  const addCandidate = (val: unknown) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      candidates.push(val.trim());
    }
  };

  addCandidate(engineResult?.complianceSummary);
  addCandidate(engineResult?.complianceNotes);
  addCandidate(engineResult?.auditRecord?.complianceSummary);
  addCandidate(engineResult?.auditRecord?.finalResult?.complianceSummary);

  if (Array.isArray(engineResult?.auditRecord?.complianceNotes)) {
    engineResult.auditRecord.complianceNotes.forEach(addCandidate);
  }

  if (Array.isArray(engineResult?.auditTrail)) {
    engineResult.auditTrail.forEach((item: any) => {
      addCandidate(item?.complianceSummary);
      if (Array.isArray(item?.complianceNotes)) {
        item.complianceNotes.forEach(addCandidate);
      } else {
        addCandidate(item?.complianceNotes);
      }
    });
  }

  if (Array.isArray(engineResult?.auditRecord?.auditTrail)) {
    engineResult.auditRecord.auditTrail.forEach((item: any) => {
      addCandidate(item?.complianceSummary);
      if (Array.isArray(item?.complianceNotes)) {
        item.complianceNotes.forEach(addCandidate);
      } else {
        addCandidate(item?.complianceNotes);
      }
    });
  }

  if (Array.isArray(auditTrails)) {
    auditTrails.forEach((item: any) => {
      addCandidate(item?.complianceSummary);
      if (Array.isArray(item?.complianceNotes)) {
        item.complianceNotes.forEach(addCandidate);
      } else {
        addCandidate(item?.complianceNotes);
      }
    });
  }

  // 2. Parse candidates using the canonical parseComplianceSummary utility
  const parsedItems = candidates.map(c => ({
    raw: c,
    parsed: parseComplianceSummary(c)
  }));

  const negativeCandidate = parsedItems.find(item => item.parsed.isNegative);
  const positiveCandidate = parsedItems.find(item => item.parsed.isPositive);

  // 3. Delegate to canonical evaluation contract to enforce authority, structured determination, and pass check
  const evalResult: ComplianceEvaluation = evaluateComplianceDetermination(engineResult, auditTrails);
  const calculationStatus: string = engineResult?.status || 'INCOMPLETE';
  const isPass = calculationStatus === 'PASS';

  // Explicit negative compliance strictly takes precedence
  if (evalResult.status === 'NON-COMPLIANT' || negativeCandidate) {
    return {
      status: 'NON-COMPLIANT',
      color: 'text-red-400',
      subtext: negativeCandidate?.raw || evalResult.primaryEvidenceText || 'Explicit non-compliance in audit contract',
      hasExplicitComplianceContract: false,
      hasNegativeComplianceContract: true
    };
  }

  // PASS does NOT automatically render as COMPLIANT without explicit evidence
  if (evalResult.status === 'COMPLIANT') {
    return {
      status: 'COMPLIANT',
      color: 'text-emerald-400',
      subtext: positiveCandidate?.raw || evalResult.primaryEvidenceText || 'Verified per Table 6-1 VRP',
      hasExplicitComplianceContract: true,
      hasNegativeComplianceContract: false
    };
  }

  // Fallback / Unverified: calculation PASS without explicit contract remains Compliance Not Verified
  return {
    status: 'Compliance Not Verified',
    color: isPass ? 'text-amber-400' : 'text-slate-400',
    subtext: isPass
      ? 'Calculation PASS — Verification required'
      : 'Compliance not verified',
    hasExplicitComplianceContract: false,
    hasNegativeComplianceContract: false
  };
}

export default function VentilationReportsView({
  engineResult,
  zones = [],
  systemType = 'single',
  auditTrails = []
}: VentilationReportsViewProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  // 1. Calculation Status
  const calculationStatus: string = engineResult?.status || 'INCOMPLETE';
  const isPass = calculationStatus === 'PASS';
  const isFail = calculationStatus === 'FAIL';
  const isBlocked = calculationStatus === 'BLOCKED';
  const isIncomplete = calculationStatus === 'INCOMPLETE';
  const isNotVerified = calculationStatus === 'NOT_VERIFIED';

  let calcStatusColor = 'text-slate-400';
  let calcStatusSub = 'Inputs incomplete';
  if (isPass) {
    calcStatusColor = 'text-emerald-400';
    calcStatusSub = 'VRP calculation solved';
  } else if (isFail) {
    calcStatusColor = 'text-red-400';
    calcStatusSub = 'Thresholds exceeded';
  } else if (isBlocked) {
    calcStatusColor = 'text-rose-400';
    calcStatusSub = 'Prerequisites blocked';
  } else if (isNotVerified) {
    calcStatusColor = 'text-fuchsia-400';
    calcStatusSub = 'Unverified run';
  }

  // 2. Real Authority Status from result / audit contract
  // Strictly require authorityPolicy === 'AUTHORITATIVE_PRODUCTION' alongside a 'PASS' status.
  // DIAGNOSTIC mode or missing policies result in 'Authority Not Verified'.
  const auditAuthorityPolicy =
    engineResult?.auditRecord?.authorityPolicy ??
    engineResult?.authorityPolicy;

  const isProductionAuthority =
    isPass &&
    auditAuthorityPolicy === 'AUTHORITATIVE_PRODUCTION' &&
    isAuthoritativeProductionRun(engineResult);

  let authorityText = 'Preliminary / Pending Calculation';
  let authorityColor = 'text-amber-400';
  if (isProductionAuthority) {
    authorityText = 'Authoritative Production';
    authorityColor = 'text-emerald-400';
  } else if (isPass) {
    // PASS status with DIAGNOSTIC mode, missing authority policy, or unverified authority
    authorityText = 'Authority Not Verified';
    authorityColor = 'text-amber-400';
  } else if (isFail) {
    authorityText = 'Non-Authoritative (Failed)';
    authorityColor = 'text-red-400';
  } else if (isBlocked) {
    authorityText = 'Blocked / Unverified';
    authorityColor = 'text-rose-400';
  } else if (isNotVerified) {
    authorityText = 'Unverified Run';
    authorityColor = 'text-fuchsia-400';
  } else if (auditAuthorityPolicy === 'DIAGNOSTIC' || !auditAuthorityPolicy) {
    authorityText = 'Authority Not Verified';
    authorityColor = 'text-amber-400';
  }

  // 3. Real Compliance Determination from explicit result contract & audit trail
  const compliance = determineComplianceStatus(engineResult, auditTrails);

  // Extract primary compliance summary from result or audit trail records
  const allAuditRecords = [
    ...(Array.isArray(engineResult?.auditTrail) ? engineResult.auditTrail : []),
    ...(Array.isArray(engineResult?.auditRecord?.auditTrail) ? engineResult.auditRecord.auditTrail : []),
    ...(Array.isArray(auditTrails) ? auditTrails : [])
  ];

  const auditTrailSummaryText = allAuditRecords.find(
    (item: any) => typeof item?.complianceSummary === 'string' && item.complianceSummary.trim().length > 0
  )?.complianceSummary || '';

  const primaryComplianceSummary =
    (typeof engineResult?.complianceSummary === 'string' ? engineResult.complianceSummary : null) ||
    (typeof engineResult?.auditRecord?.finalResult?.complianceSummary === 'string'
      ? engineResult.auditRecord.finalResult.complianceSummary
      : null) ||
    (typeof engineResult?.auditRecord?.complianceSummary === 'string'
      ? engineResult.auditRecord.complianceSummary
      : null) ||
    auditTrailSummaryText;

  const parsedComplianceSummary = parseComplianceSummary(primaryComplianceSummary);

  const finalAirflow = typeof engineResult?.finalDesignOutdoorAir === 'number'
    ? engineResult.finalDesignOutdoorAir
    : null;

  return (
    <div id="ventilation-report-document" className="space-y-6">
      {/* Report Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded">
                Ventilation Submittal Report
              </span>
              <span className="text-xs text-slate-500 font-mono">Doc ID: CKY-MEPF-VENT-62.1</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              ASHRAE 62.1-2022 Ventilation Calculation Report
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ventilation Rate Procedure (VRP) calculation trace, atmospheric density corrections, and engineering audit verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => exportVentilationToCsv({ isMetric, systemType, result: engineResult, zones })}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Export CSV
            </button>
            <button
              onClick={() => exportElementToPdf('ventilation-report-document', 'ASHRAE_62_1_Ventilation_Report.pdf')}
              className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Metadata summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-5 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Standard Basis</span>
            <span className="text-white font-bold">ANSI/ASHRAE 62.1-2022</span>
            <span className="text-[10px] text-cyan-400 block mt-0.5">Addendum j applied</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Calculation Status</span>
            <span className={`font-bold flex items-center gap-1.5 ${calcStatusColor}`}>
              <Activity className="w-3.5 h-3.5" />
              {calculationStatus.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{calcStatusSub}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Engine Authority</span>
            <span className={`font-bold flex items-center gap-1.5 ${authorityColor}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {authorityText}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Section 6.2 VRP</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Compliance Determination</span>
            <span className={`font-bold flex items-center gap-1.5 ${compliance.color}`}>
              {compliance.hasExplicitComplianceContract ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : compliance.hasNegativeComplianceContract ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {compliance.status}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{compliance.subtext}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 col-span-2 md:col-span-3 lg:col-span-1">
            <span className="text-[10px] text-slate-500 uppercase block">Total Required Outdoor Air</span>
            <span className="text-cyan-400 font-bold text-sm">
              {finalAirflow !== null ? `${finalAirflow.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : 'Not calculated'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Corrected for Eρ</span>
          </div>
        </div>

        {/* Explicit Compliance Determination Banner & Callout */}
        {!compliance.hasExplicitComplianceContract && !compliance.hasNegativeComplianceContract && (
          <div className="mt-4 p-3.5 bg-amber-950/40 rounded-lg border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">
                Compliance Not Verified
              </div>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                {isPass
                  ? 'Calculation PASS solved the mathematical equations, but explicit compliance determination evidence or authoritative production sign-off is pending. Calculation PASS alone does not constitute compliance.'
                  : 'Calculation inputs are incomplete or unverified. Standards compliance cannot be determined.'}
              </p>
            </div>
          </div>
        )}

        {compliance.hasNegativeComplianceContract && (
          <div className="mt-4 p-3.5 bg-red-950/40 rounded-lg border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-300">
                Non-Compliant Engineering Determination
              </div>
              <p className="text-[11px] text-red-300/80 mt-0.5 leading-relaxed">
                {compliance.subtext || 'The calculation or audit trail records indicate non-compliance with prescriptive ASHRAE 62.1 requirements.'}
              </p>
            </div>
          </div>
        )}

        {compliance.hasExplicitComplianceContract && (
          <div className="mt-4 p-3.5 bg-emerald-950/40 rounded-lg border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-300">
                Authoritative Compliance Verified
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed">
                {compliance.subtext || 'Verified per ANSI/ASHRAE 62.1-2022 Table 6-1 VRP under authoritative production policy.'}
              </p>
            </div>
          </div>
        )}

        {/* Explicit Audit Contract Determination Summary */}
        {primaryComplianceSummary && (
          <div className="mt-3 p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                Governing Audit Contract Determination
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                parsedComplianceSummary.isNegative
                  ? 'bg-red-950/60 border-red-800/60 text-red-400'
                  : parsedComplianceSummary.isPositive
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
              }`}>
                {parsedComplianceSummary.isNegative
                  ? 'Non-Compliant'
                  : parsedComplianceSummary.isPositive
                  ? 'Compliance Evidence'
                  : 'Compliance Not Verified'}
              </span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
              {primaryComplianceSummary}
            </p>
          </div>
        )}
      </div>

      {/* Engineering Standards and Scope Statement */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">
          <Info className="w-4 h-4" />
          Engineering Scope & Standards Compliance Traceability
        </div>
        <p className="leading-relaxed text-slate-400">
          This calculation report documents outdoor air ventilation requirements derived under the prescriptive Ventilation Rate Procedure (VRP)
          stipulated in <strong className="text-white">ANSI/ASHRAE Standard 62.1-2022</strong> including published <strong className="text-white">Addendum j</strong> local air density correction.
          All breathing-zone rates are grounded in Table 6-1 space classifications, Table 6-4 zone air distribution effectiveness (<span className="text-cyan-300 font-mono">Ez</span>), and Normative Appendix D psychrometric calculations.
        </p>
      </div>

      {/* Comprehensive Audit Trail Log */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          Mathematical Audit Trail & Governing Equation Trace
        </h3>
        <AuditTrailTable title="Engine Step-By-Step Audit Trail" trail={auditTrails} />
      </div>
    </div>
  );
}
