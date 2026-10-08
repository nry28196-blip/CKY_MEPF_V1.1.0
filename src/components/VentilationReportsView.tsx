import React from 'react';
import { FileText, Download, Printer, ShieldCheck, CheckCircle2, Wind, Layers, Info } from 'lucide-react';
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

export default function VentilationReportsView({
  engineResult,
  zones = [],
  systemType = 'single',
  auditTrails = []
}: VentilationReportsViewProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  const status = engineResult?.status || 'INCOMPLETE';
  const isAuthoritative = Boolean(engineResult?.isAuthoritative);
  const isPass = status === 'PASS';
  const hasCompliance = Boolean(
    engineResult?.complianceSummary?.includes('COMPLIANT') ||
    engineResult?.auditTrail?.some((t: any) => t?.complianceSummary?.includes('COMPLIANT')) ||
    (isPass && isAuthoritative)
  );

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Standard Basis</span>
            <span className="text-white font-bold">ANSI/ASHRAE 62.1-2022</span>
            <span className="text-[10px] text-cyan-400 block mt-0.5">Addendum j applied</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Engine Authority</span>
            <span className={`font-bold flex items-center gap-1.5 ${
              isPass && isAuthoritative ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {isPass && isAuthoritative
                ? 'Authoritative Production'
                : isPass
                  ? 'Authority Not Verified'
                  : 'Preliminary / Pending Calculation'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Section 6.2 VRP</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Compliance State</span>
            <span className={`font-bold flex items-center gap-1.5 ${
              hasCompliance ? 'text-emerald-400' : status === 'FAIL' ? 'text-red-400' : 'text-amber-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {hasCompliance ? 'PASS (Compliant)' : `Status: ${status}`}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Table 6-1 VRP</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Total Required Outdoor Air</span>
            <span className="text-cyan-400 font-bold text-sm">
              {finalAirflow !== null ? `${finalAirflow.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : 'Not calculated'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Corrected for Eρ</span>
          </div>
        </div>
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
