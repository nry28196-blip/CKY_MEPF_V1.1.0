import React from 'react';
import { 
  Construction, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Layers, 
  Compass, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

interface NotYetImplementedModuleCardProps {
  system: string;
  subordinate: string;
  module: string;
  standard?: string;
  customDescription?: string;
  plannedFeatures?: string[];
  fallbackModuleId?: string;
  fallbackModuleLabel?: string;
  onNavigateFallback?: () => void;
}

export default function NotYetImplementedModuleCard({
  system,
  subordinate,
  module,
  standard,
  customDescription,
  plannedFeatures,
  fallbackModuleId,
  fallbackModuleLabel,
  onNavigateFallback
}: NotYetImplementedModuleCardProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in font-sans">
      {/* Top Banner Notice */}
      <div className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-xl flex items-start text-xs text-amber-300">
        <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold text-amber-200 uppercase tracking-wide">
            Module Under Formal Engineering Specification
          </p>
          <p className="text-amber-300/90 leading-relaxed">
            The mathematical engine, code compliance data, and verification tests for{' '}
            <strong className="text-white">{module}</strong> are currently being authored and calibrated.
            In compliance with strict engineering integrity guidelines, unrelated or preliminary calculation tools are not substituted in place of this module.
          </p>
        </div>
      </div>

      {/* Main Module Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/5 via-indigo-500/5 to-transparent pointer-events-none rounded-full blur-3xl -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                {system}
              </span>
              <span className="text-slate-600 font-mono text-xs">/</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                {subordinate}
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{module}</span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 align-middle">
                Under Specification
              </span>
            </h2>

            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              {customDescription || `Analytical calculation and engineering schedules for ${module} compliant with recognized MEP international standards.`}
            </p>
          </div>

          {standard && (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl shrink-0 md:max-w-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-1">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Target Reference Standard</span>
              </div>
              <p className="text-xs font-mono text-cyan-300 font-semibold">{standard}</p>
            </div>
          )}
        </div>

        {/* Planned Capabilities Section */}
        {plannedFeatures && plannedFeatures.length > 0 && (
          <div className="pt-6 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Construction className="w-4 h-4 text-amber-400" />
              <span>Planned Engineering Capabilities</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plannedFeatures.map((feat, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-xs text-slate-300 leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Guidance and Navigation Action */}
        {fallbackModuleLabel && onNavigateFallback && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 rounded-b-2xl">
            <div className="text-xs text-slate-400">
              Active engineering tools are currently available in the sibling module:
            </div>
            
            <button
              type="button"
              onClick={onNavigateFallback}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              <span>Switch to {fallbackModuleLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
