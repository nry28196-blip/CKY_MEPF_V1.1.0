import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface TooltipLabelProps {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
  status?: 'success' | 'warning' | 'error' | null;
}

export default function TooltipLabel({ label, tooltip, className = '', status = null }: TooltipLabelProps) {
  const StatusIcon = status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1.5" /> :
                     status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-1.5" /> :
                     status === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-rose-500 ml-1.5" /> : null;

  if (!tooltip) {
    return (
      <div className="flex items-center mb-1.5">
        <label className={className.replace('mb-1.5', '').replace('mb-2', '').trim()}>{label}</label>
        {StatusIcon}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 mb-1.5 group relative w-fit">
      <div className="flex items-center">
        <label className={className.replace('mb-1.5', '').replace('mb-2', '').trim()}>{label}</label>
        {StatusIcon}
      </div>
      <div className="cursor-help text-slate-500 hover:text-sky-400 transition-colors">
        <Info className="w-3 h-3" />
      </div>
      <div className="absolute bottom-full left-0 mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-slate-800 text-slate-200 text-[10px] sm:text-xs rounded-lg shadow-xl border border-slate-700 p-2.5 z-50 pointer-events-none translate-y-1 group-hover:translate-y-0">
        {tooltip}
        <div className="absolute top-full left-4 border-[5px] border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}
