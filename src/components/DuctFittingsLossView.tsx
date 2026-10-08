import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  Search, 
  BookOpen, 
  Layers, 
  Wind, 
  Sliders, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { ASHRAE_FITTINGS_DB, DuctFitting } from '../calculations/duct/FittingsDatabase';
import { useUnit } from '../lib/UnitContext';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import TooltipLabel from './TooltipLabel';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

export default function DuctFittingsLossView() {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [velocity, setVelocity] = useState<number>(isMetric ? 6.0 : 1200); // m/s or FPM
  const [airDensity, setAirDensity] = useState<number>(isMetric ? 1.204 : 0.075); // kg/m³ or lb/ft³
  const [copiedId, setCopiedId] = useState<string | null>(null);

  React.useEffect(() => {
    scrollWorkspaceToTop();
  }, []);

  const velUnit = isMetric ? 'm/s' : 'FPM';
  const densityUnit = isMetric ? 'kg/m³' : 'lb/ft³';
  const pressUnit = isMetric ? 'Pa' : 'in.wg';

  // Dynamic velocity pressure:
  // Metric: Pv = 0.5 * rho * V^2 (Pa)
  // Imperial: Pv = rho/0.075 * (V / 4005)^2 (in.wg)
  const velocityPressure = useMemo(() => {
    if (isMetric) {
      return 0.5 * airDensity * (velocity * velocity);
    } else {
      const standardRatio = airDensity / 0.075;
      const vRatio = velocity / 4005;
      return standardRatio * (vRatio * vRatio);
    }
  }, [velocity, airDensity, isMetric]);

  const categories = [
    { id: 'all', label: 'All Fittings' },
    { id: 'elbows', label: 'Elbows & Bends' },
    { id: 'tees', label: 'Tees & Takeoffs' },
    { id: 'transitions', label: 'Expansions & Reducers' },
    { id: 'entries_exits', label: 'Hoods, Entries & Exits' }
  ];

  const filteredFittings = useMemo(() => {
    return ASHRAE_FITTINGS_DB.filter(fit => {
      const matchesCat = selectedCategory === 'all' || fit.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        fit.id.toLowerCase().includes(q) ||
        fit.name.toLowerCase().includes(q) ||
        fit.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in font-sans">
      <EngineeringStatusHeader
        status="READY"
        message="ASHRAE Fitting Reference Database: Loss coefficients (Co) per ASHRAE Duct Fitting Database (DFDB) and ASHRAE Fundamentals Chapter 21."
      />

      {/* Control Panel: Operating Velocity & Air Density */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span>Duct Velocity Pressure (Pv) & Dynamic Head Evaluation</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Input system air velocity to calculate fitting pressure drop: ΔP = C₀ · Pᵥ
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400">Velocity Pressure (Pᵥ):</span>
            <span className="text-sm font-mono font-bold text-cyan-300">
              {velocityPressure.toFixed(2)} {pressUnit}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <div>
            <TooltipLabel 
              label={`Duct Air Velocity (${velUnit})`} 
              className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" 
            />
            <input 
              type="number" 
              min="0" 
              step={isMetric ? 0.1 : 50} 
              value={velocity} 
              onChange={(e) => setVelocity(Number(e.target.value))} 
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm font-mono border border-slate-800 focus:border-cyan-500 outline-none" 
            />
          </div>

          <div>
            <TooltipLabel 
              label={`Local Air Density (${densityUnit})`} 
              className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" 
            />
            <input 
              type="number" 
              min="0.1" 
              step="0.005" 
              value={airDensity} 
              onChange={(e) => setAirDensity(Number(e.target.value))} 
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm font-mono border border-slate-800 focus:border-cyan-500 outline-none" 
            />
          </div>

          <div>
            <TooltipLabel 
              label="Search Fittings / Codes" 
              className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" 
            />
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search CR3-1, elbow, tee..." 
                className="w-full bg-slate-950 text-white rounded-lg pl-8 pr-3 py-2 text-xs border border-slate-800 focus:border-cyan-500 outline-none placeholder:text-slate-500" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Fittings List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFittings.map(fit => {
          const deltaP = fit.lossCoefficient * velocityPressure;

          return (
            <div 
              key={fit.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    {fit.id}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                    {fit.category}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white mb-1 leading-snug">
                  {fit.name}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {fit.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Loss Coeff (C₀):</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/60">
                    {fit.lossCoefficient.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Pressure Drop (ΔP):</span>
                  <span className="font-mono font-black text-cyan-300 text-sm">
                    {deltaP.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">{pressUnit}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(fit.id, `${fit.name} (${fit.id}): Co = ${fit.lossCoefficient}, ΔP = ${deltaP.toFixed(2)} ${pressUnit}`)}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-850 rounded border border-slate-800 cursor-pointer transition-colors"
                >
                  {copiedId === fit.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy Engineering Citation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
