import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, HelpCircle } from 'lucide-react';

export type EngineeringStatus =
  | 'READY'
  | 'CALCULATED'
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'BLOCKED'
  | 'NOT_VERIFIED'
  | 'INCOMPLETE'
  | 'NOT_APPLICABLE'
  | 'NOT_READY_FOR_ENGINEERING_USE'
  | 'NOT_YET_IMPLEMENTED';

interface Props {
  status: EngineeringStatus;
  message?: string;
  className?: string;
}

export default function EngineeringStatusHeader({ status, message, className = '' }: Props) {
  let bgColor = 'bg-slate-900';
  let borderColor = 'border-slate-800';
  let textColor = 'text-slate-400';
  let Icon = HelpCircle;

  switch (status) {
    case 'PASS':
      bgColor = 'bg-emerald-950/20';
      borderColor = 'border-emerald-500/50';
      textColor = 'text-emerald-400';
      Icon = CheckCircle2;
      break;
    case 'WARNING':
      bgColor = 'bg-amber-950/20';
      borderColor = 'border-amber-500/50';
      textColor = 'text-amber-400';
      Icon = AlertTriangle;
      break;

    case 'NOT_VERIFIED':
      bgColor = 'bg-fuchsia-950/20';
      borderColor = 'border-fuchsia-500/50';
      textColor = 'text-fuchsia-400';
      Icon = AlertTriangle;
      break;
    case 'FAIL':
      bgColor = 'bg-red-950/20';
      borderColor = 'border-red-500/50';
      textColor = 'text-red-400';
      Icon = XCircle;
      break;
    case 'BLOCKED':
      bgColor = 'bg-rose-950/20';
      borderColor = 'border-rose-500/50';
      textColor = 'text-rose-400';
      Icon = AlertTriangle;
      break;
    case 'NOT_YET_IMPLEMENTED':
      bgColor = 'bg-amber-950/20';
      borderColor = 'border-amber-500/50';
      textColor = 'text-amber-400';
      Icon = Info;
      break;
    case 'INCOMPLETE':
    case 'NOT_APPLICABLE':
    case 'NOT_READY_FOR_ENGINEERING_USE':
      bgColor = 'bg-slate-900/50';
      borderColor = 'border-slate-700/50';
      textColor = 'text-slate-400';
      Icon = Info;
      break;
    case 'READY':
    case 'CALCULATED':
    default:
      bgColor = 'bg-sky-950/20';
      borderColor = 'border-sky-500/50';
      textColor = 'text-sky-400';
      Icon = Info;
      break;
  }

  return (
    <div className={`flex items-center space-x-3 px-4 py-3 rounded-md border ${bgColor} ${borderColor} ${className}`}>
      <Icon className={`h-5 w-5 ${textColor}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>
          {status.replace('_', ' ')}
        </span>
        {message && (
          <span className={`text-[13px] ${textColor} opacity-90`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
