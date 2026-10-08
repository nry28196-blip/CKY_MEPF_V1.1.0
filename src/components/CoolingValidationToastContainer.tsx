import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  X,
  Wrench,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { AshraeValidationViolation } from '../validation/CoolingAshraeDesignValidator';

export interface ToastItem {
  id: string;
  violation: AshraeValidationViolation;
  timestamp: number;
}

interface CoolingValidationToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onApplyFix?: (field: string, recommendedValue: number) => void;
}

export default function CoolingValidationToastContainer({
  toasts,
  onDismiss,
  onDismissAll,
  onApplyFix
}: CoolingValidationToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      aria-label="ASHRAE design range notifications"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {toasts.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 pointer-events-auto text-xs font-mono shadow-lg">
          <span className="text-amber-400 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{toasts.length} ASHRAE Code Threshold Alerts</span>
          </span>
          <button
            type="button"
            onClick={onDismissAll}
            className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
          >
            Dismiss All
          </button>
        </div>
      )}

      {toasts.slice(0, 3).map((item) => {
        const v = item.violation;
        const isError = v.severity === 'error';

        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto p-4 rounded-2xl backdrop-blur-xl shadow-2xl border transition-all duration-300 animate-in slide-in-from-right-4 fade-in ${
              isError
                ? 'bg-rose-950/90 border-rose-600/80 shadow-rose-950/50 text-rose-100'
                : 'bg-[#0E1528]/95 border-amber-500/70 shadow-amber-950/40 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              
              {/* Icon */}
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isError 
                  ? 'bg-rose-900/60 border border-rose-500/50 text-rose-300' 
                  : 'bg-amber-950/80 border border-amber-600/50 text-amber-400'
              }`}>
                {isError ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isError
                      ? 'bg-rose-900/80 text-rose-200 border border-rose-700/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                  }`}>
                    {v.standardReference}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Type: <strong className="text-white">{v.buildingType}</strong>
                  </span>
                </div>

                <h5 className="text-xs font-bold text-white tracking-wide">
                  {v.parameter} Outside Standard Design Range
                </h5>

                <p className="text-[11px] text-slate-300 leading-snug">
                  {v.message}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                  <span className="text-slate-400">
                    Allowed: <strong className="text-emerald-400">{v.allowedRange}</strong>
                  </span>
                  <span className="text-slate-400">
                    Current: <strong className={isError ? 'text-rose-400' : 'text-amber-400'}>{v.currentValue} {v.unit}</strong>
                  </span>
                </div>

                {/* Quick Fix Button (if provided) */}
                {onApplyFix && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onApplyFix(v.field, v.recommendedValue)}
                      className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 bg-slate-900 hover:bg-slate-850 hover:text-white text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Wrench className="w-3 h-3 text-cyan-400" />
                      <span>Snap to ASHRAE Standard ({v.recommendedValue} {v.unit})</span>
                      <ChevronRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          </div>
        );
      })}
    </div>
  );
}
