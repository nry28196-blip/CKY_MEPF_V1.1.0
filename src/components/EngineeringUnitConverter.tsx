import React, { useState } from 'react';
import { RefreshCw, X, ChevronRight, Calculator, Sliders, ArrowRightLeft } from 'lucide-react';

type CategoryType = 'airflow' | 'power' | 'pressure';

interface UnitPreset {
  name: string;
  unitA: string;
  unitB: string;
  factor: number; // Multiply Unit A by factor to get Unit B
  labelA: string;
  labelB: string;
}

interface EngineeringUnitConverterProps {
  onOpenBatchConvert?: () => void;
}

const CONVERSION_PRESETS: Record<CategoryType, UnitPreset[]> = {
  airflow: [
    { name: 'CFM to m³/h', unitA: 'CFM', unitB: 'm3h', factor: 1.69901, labelA: 'Cubic Feet per Min', labelB: 'Cubic Meters per Hour' },
    { name: 'L/s to m³/h', unitA: 'Ls', unitB: 'm3h', factor: 3.6, labelA: 'Liters per Second', labelB: 'Cubic Meters per Hour' },
    { name: 'CFM to L/s', unitA: 'CFM', unitB: 'Ls', factor: 0.471947, labelA: 'Cubic Feet per Min', labelB: 'Liters per Second' },
  ],
  power: [
    { name: 'kW to BTU/h', unitA: 'kW', unitB: 'btuh', factor: 3412.142, labelA: 'Kilowatt (kW)', labelB: 'BTU per Hour' },
    { name: 'Tons of Ref (TR) to kW', unitA: 'TR', unitB: 'kW', factor: 3.51685, labelA: 'Tons of Refrigeration', labelB: 'Kilowatt (kW)' },
    { name: 'HP to kW', unitA: 'HP', unitB: 'kW', factor: 0.7457, labelA: 'Horsepower (HP)', labelB: 'Kilowatt (kW)' },
  ],
  pressure: [
    { name: 'Pa to mmH₂O', unitA: 'Pa', unitB: 'mmh2o', factor: 0.101972, labelA: 'Pascals (Pa)', labelB: 'mm of Water Gauge' },
    { name: 'bar to PSI', unitA: 'bar', unitB: 'psi', factor: 14.5038, labelA: 'Bar', labelB: 'Pounds per Sq Inch' },
    { name: 'Pa to in. wg', unitA: 'Pa', unitB: 'inwg', factor: 0.00401463, labelA: 'Pascals (Pa)', labelB: 'Inches of Water Gauge' },
  ]
};

export default function EngineeringUnitConverter({ onOpenBatchConvert }: EngineeringUnitConverterProps = {}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('airflow');
  const [presetIndex, setPresetIndex] = useState<number>(0);
  
  const [valA, setValA] = useState<string>('100');
  const [valB, setValB] = useState<string>('');

  const currentPreset = CONVERSION_PRESETS[activeCategory][presetIndex];

  // Dual-directional calculations
  const handleAChange = (value: string) => {
    setValA(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const computed = num * currentPreset.factor;
      setValB(Number((computed || 0).toFixed(4)).toString());
    } else {
      setValB('');
    }
  };

  const handleBChange = (value: string) => {
    setValB(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const computed = num / currentPreset.factor;
      setValA(Number((computed || 0).toFixed(4)).toString());
    } else {
      setValA('');
    }
  };

  // Re-sync values when preset shifts
  const selectPreset = (cat: CategoryType, index: number) => {
    setActiveCategory(cat);
    setPresetIndex(index);
    const num = parseFloat(valA);
    if (!isNaN(num)) {
      const computed = num * CONVERSION_PRESETS[cat][index].factor;
      setValB(Number((computed || 0).toFixed(4)).toString());
    } else {
      setValB('');
    }
  };

  return (
    <div className="fixed bottom-6 right-20 sm:right-48 z-40 font-sans floating-utility-converter">
      
      {/* Collapsed Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-850 text-sky-400 border border-sky-500/30 px-3 sm:px-4 py-3 rounded-full shadow-2xl shadow-sky-950/40 hover:shadow-sky-400/20 active:scale-95 transition-all group duration-300 cursor-pointer"
          title="MEPF Dynamic Unit Converter"
        >
          <div className="relative">
            <RefreshCw className="h-4 w-4 animate-spin group-hover:rotate-180 transition-transform" style={{ animationDuration: '10s' }} />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-400 animate-ping" />
          </div>
          <span className="hidden md:inline text-xs font-bold tracking-wider uppercase text-slate-200">MEPF Converter</span>
        </button>
      )}

      {/* Expanded Converter Widget Panel */}
      {isOpen && (
        <div className="w-[340px] bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold tracking-wider uppercase text-white">Dynamic Unit Solver</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick categories select */}
          <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/40">
            {(['airflow', 'power', 'pressure'] as CategoryType[]).map((cat) => (
              <button
                key={cat}
                onClick={() => selectPreset(cat, 0)}
                className={`py-2 text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all ${
                  activeCategory === cat 
                    ? 'border-sky-500 text-sky-400 bg-sky-950/20' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4.5 space-y-4">
            
            {/* Sub-presets within category */}
            <div className="flex flex-wrap gap-1.5">
              {CONVERSION_PRESETS[activeCategory].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPreset(activeCategory, idx)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    presetIndex === idx 
                      ? 'bg-sky-950/60 border-sky-500/50 text-sky-300 font-semibold' 
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Conversions inputs */}
            <div className="space-y-3.5 pt-1">
              
              {/* Unit A Input */}
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Input Value</span>
                  <span className="text-[10px] font-mono text-sky-400 font-bold">{currentPreset.unitA}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={valA}
                    onChange={(e) => handleAChange(e.target.value)}
                    placeholder="Enter value"
                    className="w-full bg-transparent border-none text-white text-base font-mono font-black focus:outline-none p-0 invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </div>
                <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{currentPreset.labelA}</span>
              </div>

              {/* Central Swap Indicator */}
              <div className="flex items-center justify-center -my-2.5">
                <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400 shadow shadow-black">
                  <RefreshCw className="h-3 w-3" />
                </div>
              </div>

              {/* Unit B Input */}
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Output Result</span>
                  <span className="text-[10px] font-mono text-sky-400 font-bold">{currentPreset.unitB}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={valB}
                    onChange={(e) => handleBChange(e.target.value)}
                    placeholder="Result"
                    className="w-full bg-transparent border-none text-white text-base font-mono font-black focus:outline-none p-0 invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </div>
                <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{currentPreset.labelB}</span>
              </div>

            </div>

            {/* Quick Conversion Constant Footnote */}
            <div className="text-[9px] font-mono text-slate-500 bg-slate-950/30 p-2 rounded border border-slate-850 text-center">
              Constant multiplier factor: 1 {currentPreset.unitA} = {currentPreset.factor} {currentPreset.unitB}
            </div>

            {/* Link to Batch Unit Converter Modal */}
            {onOpenBatchConvert && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBatchConvert();
                }}
                className="w-full py-2 px-3 bg-gradient-to-r from-indigo-950/80 to-blue-950/80 hover:from-indigo-900/90 hover:to-blue-900/90 border border-indigo-700/60 hover:border-indigo-500/80 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Batch Unit Converter</span>
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
