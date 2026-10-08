import React, { useState } from 'react';
import { Activity, BookOpen, Calculator, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export interface AuditTrailStep {
  inputs?: Record<string, number | string>;
  symbol?: string;
  name: string;
  formula?: string;
  value?: string | number;
  result?: string | number;
  unit?: string;
  reference?: string;
  revision?: string;
  status?: 'PASS' | 'FAIL' | 'VERIFIED' | 'ESTIMATED' | 'DERIVED' | string;
}

export interface AuditTrailTableProps {
  title?: string;
  codeReference?: string;
  trail: AuditTrailStep[];
  className?: string;
  defaultExpanded?: boolean;
}

export default function AuditTrailTable({
  title = 'Engineering Audit Trail',
  codeReference,
  trail,
  className = '',
  defaultExpanded = true
}: AuditTrailTableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PASS':
      case 'VERIFIED':
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case 'NOT_VERIFIED':
        return <AlertTriangle className="w-3 h-3 text-fuchsia-400" />;
      case 'FAIL':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'ESTIMATED':
      case 'DERIVED':
        return <Info className="w-3 h-3 text-sky-400" />;
      default:
        return <Activity className="w-3 h-3 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PASS':
      case 'VERIFIED':
        return 'text-emerald-400';
      case 'NOT_VERIFIED':
        return 'text-fuchsia-400';
      case 'FAIL':
        return 'text-red-400';
      case 'ESTIMATED':
      case 'DERIVED':
        return 'text-sky-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className={`bg-slate-950/50 rounded-lg border border-slate-800/50 overflow-hidden ${className}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-slate-900/80 px-4 py-3 border-b border-slate-800/50 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center">
          <Activity className="w-4 h-4 text-sky-400 mr-2.5" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{title}</span>
          {codeReference && (
            <div className="ml-4 flex items-center inline-flex bg-slate-950/50 px-2 py-0.5 rounded border border-slate-700/50">
              <BookOpen className="w-3 h-3 text-slate-500 mr-1.5" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{codeReference}</span>
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-0 animate-in slide-in-from-top-2 duration-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/30 border-b border-slate-800/50">
                <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Parameter</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Formula / Ref</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">Computed Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {trail.map((v, i) => (
                <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col">
                      {v.symbol && (
                        <span className="text-[11px] font-mono font-bold text-sky-400 mb-0.5">{v.symbol}</span>
                      )}
                      <span className="text-[10px] text-slate-300 leading-tight">{v.name}</span>
                      {v.status && (
                        <div className="mt-1.5 flex items-center bg-slate-900/50 px-1.5 py-0.5 rounded w-fit border border-slate-700/50">
                           {getStatusIcon(v.status)}
                           <span className={`ml-1.5 text-[9px] font-bold uppercase tracking-wider ${getStatusColor(v.status)}`}>{v.status}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col space-y-1">
                      {v.formula ? (
                        <><div className="flex items-start">
                          <Calculator className="w-3 h-3 text-slate-500 mr-1.5 mt-0.5 flex-shrink-0" />
                          <span className="text-[10px] font-mono text-slate-400 leading-tight">{v.formula}</span>
                        </div>
                        {v.inputs && Object.keys(v.inputs).length > 0 && (
                          <div className="mt-1 pl-5">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Inputs:</span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                              {Object.entries(v.inputs).map(([key, val]) => (
                                <div key={key} className="text-[9px] font-mono text-slate-400">
                                  <span className="text-slate-500">{key}:</span> {typeof val === 'number' ? val.toFixed(2) : val}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}</>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Given/Empirical</span>
                      )}
                      {(v.reference || v.revision) && (
                        <div className="flex flex-col mt-1 space-y-0.5 pl-5 border-l border-slate-700 ml-1.5">
                          {v.reference && (
                            <span className="text-[9px] text-slate-500 tracking-wider">Ref: {v.reference}</span>
                          )}
                          {v.revision && (
                             <span className="text-[9px] text-slate-500 tracking-wider">Rev: {v.revision}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="inline-flex items-baseline justify-end space-x-1.5 bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60">
                      <span className="text-[12px] font-mono font-bold text-white tracking-tight">{v.value !== undefined ? v.value : (v.result !== undefined && typeof v.result === 'number' ? v.result.toFixed(2) : v.result)}</span>
                      {v.unit && (
                        <span className="text-[9px] font-bold text-sky-500/70 uppercase tracking-wider">{v.unit}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
