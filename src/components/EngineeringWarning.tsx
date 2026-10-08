import React from 'react';
import { AlertTriangle, AlertCircle, Info, BookOpen } from 'lucide-react';
import { ValidationIssue } from '../calculations/services/ValidationService';

export type WarningSeverity = 'info' | 'warning' | 'error';

export interface EngineeringWarningProps {
  message?: string;
  children?: React.ReactNode;
  severity?: WarningSeverity;
  reference?: string;
  title?: string;
  className?: string;
  validations?: ValidationIssue[];
}

export default function EngineeringWarning({
  message,
  children,
  severity = 'warning',
  reference,
  title,
  className = '',
  validations
}: EngineeringWarningProps) {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-sky-950/20',
      border: 'border-sky-900/50',
      titleColor: 'text-sky-500',
      iconColor: 'text-sky-500',
      label: 'Engineering Note'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-950/20',
      border: 'border-amber-900/50',
      titleColor: 'text-amber-500',
      iconColor: 'text-amber-500',
      label: 'Engineering Warning'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-rose-950/20',
      border: 'border-rose-900/50',
      titleColor: 'text-rose-500',
      iconColor: 'text-rose-500',
      label: 'Validation Error'
    }
  };

  if (validations && validations.length > 0) {
    const errorCount = validations.filter(v => v.severity === 'error').length;
    const warningCount = validations.filter(v => v.severity === 'warning').length;
    const panelSeverity = errorCount > 0 ? 'error' : (warningCount > 0 ? 'warning' : 'info');
    const { bg, border } = config[panelSeverity];

    return (
      <div className={`rounded-xl p-4 shadow-sm border ${bg} ${border} animate-fade-in space-y-4 ${className}`}>
        {validations.map(issue => {
          const ItemIcon = config[issue.severity].icon;
          const itemIconColor = config[issue.severity].iconColor;
          const itemTitleColor = config[issue.severity].titleColor;
          const itemLabel = issue.title || config[issue.severity].label;
          
          return (
            <div key={issue.id} className="flex items-start">
              <ItemIcon className={`w-4 h-4 mr-3 flex-shrink-0 mt-0.5 ${itemIconColor}`} />
              <div className="flex-1">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${itemTitleColor}`}>
                  {itemLabel}
                </h4>
                <div className="text-[11px] text-slate-300 font-mono leading-relaxed">
                  {issue.message}
                </div>
                {issue.reference && (
                  <div className="mt-2 flex items-center inline-flex bg-slate-950/50 px-2 py-1 rounded border border-slate-800/60">
                    <BookOpen className="w-3 h-3 text-slate-500 mr-1.5" />
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{issue.reference}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (children || message) {
    const { icon: Icon, bg, border, titleColor, iconColor, label } = config[severity];
    const displayTitle = title || label;
    
    return (
      <div className={`rounded-xl p-4 shadow-sm border ${bg} ${border} animate-fade-in ${className}`}>
        <div className="flex items-start">
          <Icon className={`w-4 h-4 mr-3 flex-shrink-0 mt-0.5 ${iconColor}`} />
          <div className="flex-1">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${titleColor}`}>
              {displayTitle}
            </h4>
            <div className="text-[11px] text-slate-300 font-mono leading-relaxed">
              {children || message}
            </div>
            {reference && (
              <div className="mt-3 flex items-center inline-flex bg-slate-950/50 px-2.5 py-1 rounded border border-slate-800/60">
                <BookOpen className="w-3 h-3 text-slate-500 mr-1.5" />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{reference}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
