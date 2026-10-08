import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { BookOpen } from 'lucide-react';

export interface FormulaDef {
  id: string;
  title: string;
  description: string;
  equation: string;
  variables: { symbol: string; meaning: string }[];
}

interface FormulaVisualizerProps {
  category: string;
  formulas: FormulaDef[];
}

export default function FormulaVisualizer({ category, formulas }: FormulaVisualizerProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-bold uppercase tracking-tight text-white">{category} Equations</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Underlying engineering formulas and mathematical models.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {formulas.map(f => (
          <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider">{f.title}</h3>
            <p className="text-xs text-slate-400 mb-4">{f.description}</p>
            
            <div className="bg-slate-950 py-4 px-6 rounded-xl border border-slate-850 overflow-x-auto flex justify-center mb-5 text-sm sm:text-base">
              <BlockMath math={f.equation} />
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Variables Reference</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {f.variables.map(v => (
                  <div key={v.symbol} className="flex items-center space-x-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-sky-400 font-bold whitespace-nowrap"><InlineMath math={v.symbol} /></span>
                    <span className="text-xs text-slate-300 leading-tight">{v.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
