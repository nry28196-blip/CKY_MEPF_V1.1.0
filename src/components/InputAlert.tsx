import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface InputAlertProps {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export default function InputAlert({ type, message }: InputAlertProps) {
  const styles = {
    error: 'bg-red-950/20 border-red-900/50 text-red-400',
    warning: 'bg-amber-950/20 border-amber-900/50 text-amber-400',
    info: 'bg-sky-950/20 border-sky-900/50 text-sky-400'
  };

  const icons = {
    error: <XCircle className="w-3 h-3 mr-1.5 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-3 h-3 mr-1.5 shrink-0 mt-0.5" />,
    info: <Info className="w-3 h-3 mr-1.5 shrink-0 mt-0.5" />
  };

  return (
    <div className={`mt-1.5 flex items-start text-[10px] font-mono leading-tight px-2 py-1.5 rounded border animate-in fade-in zoom-in-95 duration-200 ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
    </div>
  );
}
