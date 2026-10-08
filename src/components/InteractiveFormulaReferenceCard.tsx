import React, { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { 
  BookOpen, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Info, 
  Sliders, 
  Calculator, 
  CheckCircle2, 
  ExternalLink, 
  Search,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import { TabType } from '../types';
import { 
  ENGINEERING_FORMULAS, 
  EngineeringFormula, 
  FormulaVariable, 
  getFormulasByDiscipline 
} from '../data/engineeringFormulas';

interface InteractiveFormulaReferenceCardProps {
  activeTab: TabType;
  subTab?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export default function InteractiveFormulaReferenceCard({
  activeTab,
  subTab,
  className = '',
  defaultExpanded = true
}: InteractiveFormulaReferenceCardProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeView, setActiveView] = useState<'variables' | 'sandbox'>('variables');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subTab || 'all');

  // Sync subCategory when prop changes
  React.useEffect(() => {
    if (subTab) {
      setSelectedSubCategory(subTab);
    } else {
      setSelectedSubCategory('all');
    }
  }, [subTab, activeTab]);

  // Discipline formulas
  const availableFormulas = useMemo(() => {
    // Map 'bulk' and 'cost' to appropriate formula subsets or fallback to mechanical
    const disciplineKey = (activeTab === 'bulk' || activeTab === 'cost') ? 'mechanical' : activeTab;
    const formulas = getFormulasByDiscipline(disciplineKey);
    return formulas.length > 0 ? formulas : ENGINEERING_FORMULAS;
  }, [activeTab]);

  // Available sub-categories for filtering
  const subCategories = useMemo(() => {
    const subs = Array.from(new Set(availableFormulas.map(f => f.subCategory)));
    return ['all', ...subs];
  }, [availableFormulas]);

  // Filtered formulas based on sub-category and search
  const filteredFormulas = useMemo(() => {
    return availableFormulas.filter(f => {
      const matchesSub = selectedSubCategory === 'all' || f.subCategory.toLowerCase() === selectedSubCategory.toLowerCase();
      const matchesQuery = !searchQuery || 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.equationPlain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.standardCitation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.variables.some(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSub && matchesQuery;
    });
  }, [availableFormulas, selectedSubCategory, searchQuery]);

  // Currently selected formula
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(
    filteredFormulas[0]?.id || availableFormulas[0]?.id || ''
  );

  // Keep selected formula valid when filters change
  React.useEffect(() => {
    if (!filteredFormulas.some(f => f.id === selectedFormulaId)) {
      if (filteredFormulas[0]) {
        setSelectedFormulaId(filteredFormulas[0].id);
      }
    }
  }, [filteredFormulas, selectedFormulaId]);

  const currentFormula = useMemo(() => {
    return availableFormulas.find(f => f.id === selectedFormulaId) || availableFormulas[0];
  }, [availableFormulas, selectedFormulaId]);

  // State for sandbox live parameters
  const [liveParams, setLiveParams] = useState<Record<string, number>>({});

  // Initialize live parameters when formula or unit changes
  React.useEffect(() => {
    if (!currentFormula) return;
    const initial: Record<string, number> = {};
    currentFormula.variables.forEach(v => {
      const def = isMetric ? v.defaultValueMetric : v.defaultValueImperial;
      if (def !== undefined) {
        initial[v.symbol] = def;
      }
    });
    setLiveParams(initial);
  }, [currentFormula, isMetric]);

  const handleCopyLatex = (equation: string, id: string) => {
    navigator.clipboard.writeText(equation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDisciplineTitle = (tab: TabType) => {
    switch (tab) {
      case 'mechanical': return 'Mechanical & HVAC';
      case 'electrical': return 'Electrical Power & FLC';
      case 'plumbing': return 'Plumbing & Water Systems';
      case 'fire': return 'Fire Protection & Hydraulics';
      case 'bulk': return 'Batch Engineering Aggregate';
      case 'cost': return 'Cost Estimation & Quantities';
      default: return 'Engineering Suite';
    }
  };

  const getSubCategoryLabel = (sub: string) => {
    switch (sub) {
      case 'all': return 'All Subsystems';
      case 'ventilation': return 'Ventilation (ASHRAE 62.1)';
      case 'cooling': return 'Cooling Loads';
      case 'ductSizing': return 'Duct Design';
      case 'fanDuty': return 'Fan Duty';
      case 'flc': return 'Full Load Current (FLC)';
      case 'vd': return 'Voltage Drop';
      case 'friction': return 'Pipe Friction';
      case 'sprinkler': return 'Sprinkler Demand';
      default: return sub.toUpperCase();
    }
  };

  // Live sandbox calculation evaluation
  const liveResult = useMemo(() => {
    if (!currentFormula?.calculateLive) return null;
    try {
      return currentFormula.calculateLive(liveParams, isMetric);
    } catch {
      return null;
    }
  }, [currentFormula, liveParams, isMetric]);

  if (!currentFormula) return null;

  return (
    <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${className}`}>
      {/* Top Header Card Bar */}
      <div className="bg-slate-950/70 border-b border-slate-800/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-950/80 to-sky-950/80 border border-cyan-800/50 rounded-xl text-cyan-400 shadow-md">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400 font-mono">
                {getDisciplineTitle(activeTab)}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Active Calculation Reference
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 flex items-center gap-2">
              <span>Engineering Formulas & Governing Equations</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit badge indicator */}
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            Units: <span className="text-cyan-300">{isMetric ? 'Metric (SI)' : 'Imperial (IP)'}</span>
          </span>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-all cursor-pointer"
            title={isExpanded ? "Collapse reference card" : "Expand reference card"}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Expand Reference</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Preview Bar */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          className="p-4 bg-slate-900/40 hover:bg-slate-850/50 cursor-pointer flex flex-wrap items-center justify-between gap-3 transition-colors text-xs text-slate-400"
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">{currentFormula.title}:</span>
            <code className="text-cyan-300 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {currentFormula.equationPlain}
            </code>
          </div>
          <span className="text-sky-400 text-xs font-semibold flex items-center gap-1 hover:underline">
            Click to view formula breakdown & live sandbox <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Expanded Interactive Card Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Subsystem filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Sub-category selector */}
            <div className="flex flex-wrap gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              {subCategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    selectedSubCategory === sub
                      ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950/50 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {getSubCategoryLabel(sub)}
                </button>
              ))}
            </div>

            {/* Quick search input */}
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search formulas or symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* Formula selection pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredFormulas.map(f => {
              const isSelected = f.id === selectedFormulaId;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFormulaId(f.id);
                    setSelectedVariable(null);
                  }}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/60 text-white shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 hover:bg-slate-950/80 border-slate-850 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold leading-tight">{f.title}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1 shadow-sm shadow-cyan-400/80" />}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-cyan-300 truncate">
                    {f.equationPlain}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Formula Main Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-5 shadow-inner">
            {/* Formula Header & Citation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
              <div>
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>{currentFormula.title}</span>
                </h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded">
                    {currentFormula.standardCitation}
                  </span>
                </div>
              </div>

              {/* View Switcher: Breakdown vs Live Sandbox */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveView('variables')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'variables'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Variables Breakdown</span>
                </button>
                <button
                  onClick={() => setActiveView('sandbox')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'sandbox'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Interactive Sandbox</span>
                </button>
              </div>
            </div>

            {/* LaTeX Equation Display with Copy */}
            <div className="relative group bg-slate-900/90 py-5 px-6 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center overflow-x-auto min-h-[90px]">
              <div className="text-white text-base sm:text-lg">
                <BlockMath math={currentFormula.equation} />
              </div>
              <button
                onClick={() => handleCopyLatex(currentFormula.equation, currentFormula.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Copy LaTeX Equation"
              >
                {copiedId === currentFormula.id ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Description & Practical Notes */}
            <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p>{currentFormula.description}</p>
              {currentFormula.practicalNotes && (
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-amber-300/90 flex items-start gap-2">
                  <span className="font-bold uppercase tracking-wider text-amber-400 shrink-0">Engineering Note:</span>
                  <span>{currentFormula.practicalNotes}</span>
                </div>
              )}
            </div>

            {/* VIEW 1: Interactive Variables Breakdown */}
            {activeView === 'variables' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Variables Reference ({currentFormula.variables.length})</span>
                  </h5>
                  <span className="text-[10px] text-slate-500 italic">Click any variable for deep-dive physical interpretation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentFormula.variables.map(v => {
                    const isSelected = selectedVariable === v.symbol;
                    const unit = isMetric ? v.unitMetric : v.unitImperial;

                    return (
                      <div
                        key={v.symbol}
                        onClick={() => setSelectedVariable(isSelected ? null : v.symbol)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/70 shadow-md ring-1 ring-cyan-500/40'
                            : 'bg-slate-900/50 hover:bg-slate-900/90 border-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              <InlineMath math={v.symbol} />
                            </span>
                            <span className="text-xs font-bold text-white">{v.name}</span>
                          </div>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                            {unit}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {v.description}
                        </p>

                        {v.typicalRange && (
                          <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                            <span className="font-semibold text-slate-400">Design Range:</span> {v.typicalRange}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: Interactive Sandbox ("Try It Live") */}
            {activeView === 'sandbox' && (
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Live Parameter Evaluator Sandbox</span>
                  </h5>
                  <button
                    onClick={() => {
                      const resetVals: Record<string, number> = {};
                      currentFormula.variables.forEach(v => {
                        const def = isMetric ? v.defaultValueMetric : v.defaultValueImperial;
                        if (def !== undefined) resetVals[v.symbol] = def;
                      });
                      setLiveParams(resetVals);
                    }}
                    className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Live Inputs */}
                  <div className="lg:col-span-7 space-y-4">
                    {currentFormula.variables
                      .filter(v => (isMetric ? v.defaultValueMetric : v.defaultValueImperial) !== undefined)
                      .map(v => {
                        const val = liveParams[v.symbol] ?? (isMetric ? v.defaultValueMetric : v.defaultValueImperial) ?? 0;
                        const unit = isMetric ? v.unitMetric : v.unitImperial;

                        return (
                          <div key={v.symbol} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                <span className="font-mono text-cyan-300"><InlineMath math={v.symbol} /></span>
                                <span>{v.name}</span>
                              </label>
                              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {val} {unit}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {v.min !== undefined && v.max !== undefined && (
                                <input
                                  type="range"
                                  min={v.min}
                                  max={v.max}
                                  step={v.step || 1}
                                  value={val}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    setLiveParams(prev => ({ ...prev, [v.symbol]: num }));
                                  }}
                                  className="w-full accent-cyan-400 cursor-pointer"
                                />
                              )}
                              <input
                                type="number"
                                step={v.step || 0.1}
                                value={val}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value) || 0;
                                  setLiveParams(prev => ({ ...prev, [v.symbol]: num }));
                                }}
                                className="w-24 bg-slate-950 text-white text-xs font-mono font-bold px-2 py-1 rounded border border-slate-700 text-right focus:border-cyan-400 outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Right Column: Step-by-Step Evaluation */}
                  <div className="lg:col-span-5 bg-slate-900/80 p-5 rounded-xl border border-cyan-800/40 space-y-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Live Step-by-Step Result</span>
                    </div>

                    {liveResult ? (
                      <div className="space-y-4">
                        {/* Final Result Card */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/50 text-center shadow-md">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                            Calculated Solution
                          </span>
                          <div className="text-2xl font-black font-mono text-cyan-300">
                            {liveResult.result.toLocaleString()} <span className="text-sm font-sans font-bold text-slate-400">{liveResult.resultUnit}</span>
                          </div>
                        </div>

                        {/* Steps List */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Calculation Steps:
                          </span>
                          {liveResult.steps.map((step, idx) => (
                            <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-xs space-y-1">
                              <div className="text-[11px] font-semibold text-slate-300">{step.label}</div>
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400"><InlineMath math={step.math} /></span>
                                <span className="text-emerald-400 font-bold">{step.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-6 text-center">
                        Evaluation function active for primary variables.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
