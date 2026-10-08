import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import TooltipLabel from './TooltipLabel';

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'min' | 'max'> {
  min?: number;
  max?: number;
  errorMsg?: string;
  label?: string;
  tooltip?: React.ReactNode;
  containerClassName?: string;
  isMetric?: boolean;
}

export default function ValidatedInput({ 
  min, max, errorMsg, label, tooltip, className, containerClassName = "", isMetric, value, ...props 
}: ValidatedInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const numValue = Number(value);
  const isInvalid = value !== '' && value !== undefined && value !== null && ((min !== undefined && numValue < min) || (max !== undefined && numValue > max));

  const defaultError = `ASHRAE standard range: ${min !== undefined ? min : '-∞'} to ${max !== undefined ? max : '∞'}`;
  const displayError = errorMsg || defaultError;

  return (
    <div className={`relative ${containerClassName}`}>
      {label && <TooltipLabel className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" label={label} tooltip={tooltip} />}
      <div 
        className="relative flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <input
          value={value ?? ""}
          min={min}
          max={max}
          className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border focus:outline-none transition-colors ${
            isInvalid ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-sky-500'
          }`}
          {...props}
        />
        {isInvalid && (
          <div className="absolute right-3 text-red-500">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
      </div>
      {isInvalid && showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-48 p-2 bg-red-950/90 border border-red-500 rounded-lg shadow-xl text-[10px] text-red-200 pointer-events-none">
          {displayError}
        </div>
      )}
    </div>
  );
}
