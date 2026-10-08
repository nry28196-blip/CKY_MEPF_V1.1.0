import React from 'react';
import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationItem {
  id: string;
  severity: ValidationSeverity;
  message: string;
}

interface ValidationBannerProps {
  validations: ValidationItem[];
}

export default function ValidationBanner({ validations }: ValidationBannerProps) {
  if (!validations || validations.length === 0) return null;

  const errors = validations.filter(v => v.severity === 'error');
  const warnings = validations.filter(v => v.severity === 'warning');
  const infos = validations.filter(v => v.severity === 'info');

  return (
    <div className="space-y-2 mb-4 animate-fade-in">
      {errors.length > 0 && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Validation Errors</h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map(err => (
              <li key={err.id} className="text-[11px] text-red-200/80">{err.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Compliance Warnings</h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map(warn => (
              <li key={warn.id} className="text-[11px] text-amber-200/80">{warn.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {infos.length > 0 && (
        <div className="bg-sky-950/40 border border-sky-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Design Notes</h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {infos.map(info => (
              <li key={info.id} className="text-[11px] text-sky-200/80">{info.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
