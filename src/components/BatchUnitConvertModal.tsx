import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Copy,
  Check,
  Search,
  Sliders,
  X,
  ArrowRight,
  Download,
  BookOpen,
  Wind,
  Droplet,
  Flame,
  Maximize2,
  Thermometer,
  Zap,
  RotateCcw,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  BATCH_PARAMETERS,
  BATCH_PRESETS,
  BatchParameterDefinition,
  DisciplineCategory,
  convertSingleParameter
} from '../lib/batchUnitConversions';

interface BatchUnitConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDirection?: 'imp_to_met' | 'met_to_imp';
}

export default function BatchUnitConvertModal({
  isOpen,
  onClose,
  initialDirection = 'imp_to_met'
}: BatchUnitConvertModalProps) {
  // Conversion Direction: 'imp_to_met' (Imperial -> Metric) or 'met_to_imp' (Metric -> Imperial)
  const [direction, setDirection] = useState<'imp_to_met' | 'met_to_imp'>(initialDirection);
  
  // Selected parameter IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(BATCH_PARAMETERS.map(p => p.id));
  });

  // Current user-supplied values for each parameter (keyed by parameter id)
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    BATCH_PARAMETERS.forEach(p => {
      init[p.id] = initialDirection === 'imp_to_met' ? p.imperialDefault : p.metricDefault;
    });
    return init;
  });

  // Search & discipline category filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<DisciplineCategory | 'all'>('all');

  // Copy feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyAllSuccess, setCopyAllSuccess] = useState<boolean>(false);
  const [conversionPulse, setConversionPulse] = useState<boolean>(false);

  // Sync default values when direction shifts
  const handleToggleDirection = () => {
    const nextDir = direction === 'imp_to_met' ? 'met_to_imp' : 'imp_to_met';
    setDirection(nextDir);

    // Convert all current values in-place so user inputs transition seamlessly
    setValues(prev => {
      const next: Record<string, number> = {};
      BATCH_PARAMETERS.forEach(param => {
        const currentVal = prev[param.id] ?? (direction === 'imp_to_met' ? param.imperialDefault : param.metricDefault);
        const converted = convertSingleParameter(param, currentVal, direction);
        next[param.id] = converted;
      });
      return next;
    });

    triggerPulse();
  };

  // Trigger pulse feedback animation
  const triggerPulse = () => {
    setConversionPulse(true);
    setTimeout(() => setConversionPulse(false), 500);
  };

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to standards baseline
  const handleResetToDefaults = () => {
    const resetValues: Record<string, number> = {};
    BATCH_PARAMETERS.forEach(p => {
      resetValues[p.id] = direction === 'imp_to_met' ? p.imperialDefault : p.metricDefault;
    });
    setValues(resetValues);
    setSelectedIds(new Set(BATCH_PARAMETERS.map(p => p.id)));
    triggerPulse();
  };

  // Presets handler
  const handleApplyPreset = (presetId: string) => {
    const found = BATCH_PRESETS.find(p => p.id === presetId);
    if (!found) return;
    setSelectedIds(new Set(found.parameterIds));
    triggerPulse();
  };

  // Checkbox toggles
  const handleToggleParameter = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(BATCH_PARAMETERS.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Value change for an individual parameter
  const handleValueChange = (id: string, rawVal: string) => {
    const num = parseFloat(rawVal);
    setValues(prev => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num
    }));
  };

  // Filtered parameters based on search and category
  const filteredParameters = useMemo(() => {
    return BATCH_PARAMETERS.filter(param => {
      const matchesCategory = activeCategory === 'all' || param.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        param.name.toLowerCase().includes(q) ||
        param.description.toLowerCase().includes(q) ||
        param.imperialUnit.toLowerCase().includes(q) ||
        param.metricUnit.toLowerCase().includes(q) ||
        param.categoryLabel.toLowerCase().includes(q) ||
        (param.codeReference && param.codeReference.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Compute all conversions
  const conversionResults = useMemo(() => {
    const results: Record<string, number> = {};
    BATCH_PARAMETERS.forEach(param => {
      const val = values[param.id] ?? (direction === 'imp_to_met' ? param.imperialDefault : param.metricDefault);
      results[param.id] = convertSingleParameter(param, val, direction);
    });
    return results;
  }, [values, direction]);

  // Copy single parameter result
  const handleCopySingle = (param: BatchParameterDefinition) => {
    const srcVal = values[param.id] ?? (direction === 'imp_to_met' ? param.imperialDefault : param.metricDefault);
    const srcUnit = direction === 'imp_to_met' ? param.imperialUnit : param.metricUnit;
    const tgtVal = conversionResults[param.id];
    const tgtUnit = direction === 'imp_to_met' ? param.metricUnit : param.imperialUnit;

    const text = `${param.name}: ${srcVal} ${srcUnit} = ${tgtVal} ${tgtUnit}`;
    navigator.clipboard.writeText(text);
    setCopiedId(param.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Copy all converted parameters as formatted Markdown table
  const handleCopyAll = () => {
    const selectedParams = BATCH_PARAMETERS.filter(p => selectedIds.has(p.id));
    if (selectedParams.length === 0) return;

    const srcSys = direction === 'imp_to_met' ? 'Imperial (US)' : 'Metric (SI)';
    const tgtSys = direction === 'imp_to_met' ? 'Metric (SI)' : 'Imperial (US)';

    let md = `### CKY_MEPF Batch Unit Conversion Report\n`;
    md += `**Direction:** ${srcSys} → ${tgtSys}\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `| Parameter | Source (${srcSys}) | Target (${tgtSys}) | Code Reference |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    selectedParams.forEach(param => {
      const srcVal = values[param.id] ?? (direction === 'imp_to_met' ? param.imperialDefault : param.metricDefault);
      const srcUnit = direction === 'imp_to_met' ? param.imperialUnit : param.metricUnit;
      const tgtVal = conversionResults[param.id];
      const tgtUnit = direction === 'imp_to_met' ? param.metricUnit : param.imperialUnit;
      md += `| ${param.name} | ${srcVal} ${srcUnit} | **${tgtVal} ${tgtUnit}** | ${param.codeReference || 'NIST SP 811'} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopyAllSuccess(true);
    setTimeout(() => setCopyAllSuccess(false), 2200);
  };

  // Category Icon helper
  const getCategoryIcon = (cat: DisciplineCategory) => {
    switch (cat) {
      case 'hvac_air': return <Wind className="w-3.5 h-3.5 text-sky-400" />;
      case 'hydronics': return <Droplet className="w-3.5 h-3.5 text-blue-400" />;
      case 'thermal': return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'dimensions': return <Maximize2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'temperature': return <Thermometer className="w-3.5 h-3.5 text-rose-400" />;
      case 'power': return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-unit-title"
        className="w-full max-w-5xl bg-[#090F22] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
      >
        {/* ============================================================== */}
        {/* MODAL HEADER                                                   */}
        {/* ============================================================== */}
        <div className="p-5 border-b border-slate-800 bg-[#0B132B] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-950/50">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="batch-unit-title" className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Batch Unit Converter
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
                  Universal MEP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simultaneously convert multiple input parameters between Metric and Imperial engineering systems
              </p>
            </div>
          </div>

          {/* Direction Toggle Card */}
          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (direction !== 'imp_to_met') handleToggleDirection();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  direction === 'imp_to_met'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Imperial → Metric
              </button>
              <button
                type="button"
                onClick={() => {
                  if (direction !== 'met_to_imp') handleToggleDirection();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  direction === 'met_to_imp'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Metric → Imperial
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CONTROLS BAR: PRESETS, CATEGORY TABS & SEARCH                  */}
        {/* ============================================================== */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 space-y-3 shrink-0">
          
          {/* Row 1: Presets & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Quick Presets */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0">Presets:</span>
              {BATCH_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-colors shrink-0 cursor-pointer font-medium"
                  title={preset.description}
                >
                  {preset.name.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search parameter, unit..."
                className="w-full bg-slate-900/90 border border-slate-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

          </div>

          {/* Row 2: Category Filters & Selection Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-850">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                All ({BATCH_PARAMETERS.length})
              </button>
              <button
                onClick={() => setActiveCategory('hvac_air')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'hvac_air'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Wind className="w-3 h-3 text-sky-400" />
                Air
              </button>
              <button
                onClick={() => setActiveCategory('hydronics')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'hydronics'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Droplet className="w-3 h-3 text-blue-400" />
                Hydronics
              </button>
              <button
                onClick={() => setActiveCategory('thermal')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'thermal'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                Thermal
              </button>
              <button
                onClick={() => setActiveCategory('dimensions')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'dimensions'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Maximize2 className="w-3 h-3 text-purple-400" />
                Geometry
              </button>
              <button
                onClick={() => setActiveCategory('temperature')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'temperature'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Thermometer className="w-3 h-3 text-rose-400" />
                Temp
              </button>
              <button
                onClick={() => setActiveCategory('power')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === 'power'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                Power
              </button>
            </div>

            {/* Select/Deselect Shortcuts */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-mono text-slate-400">
                Selected: <strong className="text-cyan-400">{selectedIds.size}</strong> of {BATCH_PARAMETERS.length}
              </span>
              <div className="h-3 w-[1px] bg-slate-800" />
              <button
                onClick={handleSelectAll}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={handleDeselectAll}
                className="text-[11px] text-slate-400 hover:text-slate-300 underline cursor-pointer"
              >
                Clear
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={handleResetToDefaults}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Reset to default engineering baseline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

          </div>

        </div>

        {/* ============================================================== */}
        {/* PARAMETERS LIST (SCROLLABLE WORKSPACE)                          */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredParameters.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              No matching engineering parameters found for "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredParameters.map(param => {
                const isSelected = selectedIds.has(param.id);
                const currentVal = values[param.id] ?? (direction === 'imp_to_met' ? param.imperialDefault : param.metricDefault);
                const convertedVal = conversionResults[param.id];
                const sourceUnit = direction === 'imp_to_met' ? param.imperialUnit : param.metricUnit;
                const targetUnit = direction === 'imp_to_met' ? param.metricUnit : param.imperialUnit;
                const isCopied = copiedId === param.id;

                return (
                  <div
                    key={param.id}
                    className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900/90 border-slate-700 shadow-md shadow-black/40 ring-1 ring-cyan-500/20'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-90'
                    } ${conversionPulse && isSelected ? 'scale-[1.006] transition-transform' : ''}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      
                      {/* Left: Parameter Info & Checkbox */}
                      <div className="flex items-start gap-3 min-w-[280px] lg:max-w-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleParameter(param.id)}
                          className="mt-0.5 text-cyan-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {param.name}
                            </span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300">
                              {getCategoryIcon(param.category)}
                              {param.categoryLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {param.description}
                          </p>
                          {param.codeReference && (
                            <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                              Basis: {param.codeReference}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Interactive Values Row */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap lg:flex-nowrap justify-between lg:justify-end flex-1">
                        
                        {/* Source Input */}
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-cyan-500 transition-colors w-40 sm:w-44 shrink-0">
                          <input
                            type="number"
                            step="any"
                            disabled={!isSelected}
                            value={currentVal}
                            onChange={e => handleValueChange(param.id, e.target.value)}
                            className="w-full bg-transparent text-white font-mono font-bold text-xs px-2.5 py-1.5 focus:outline-none disabled:text-slate-600 text-right"
                          />
                          <span className="bg-slate-900 border-l border-slate-800 px-2.5 py-1.5 text-[11px] font-mono text-cyan-300 font-bold shrink-0 min-w-[54px] text-center select-none">
                            {sourceUnit}
                          </span>
                        </div>

                        {/* Conversion Arrow Indicator */}
                        <div className="flex items-center justify-center p-1 rounded-full text-slate-500 shrink-0">
                          <ArrowRight className="w-4 h-4 text-cyan-400" />
                        </div>

                        {/* Converted Output Display */}
                        <div className="flex items-center justify-between bg-slate-950/80 border border-emerald-900/60 rounded-lg overflow-hidden w-44 sm:w-52 px-2.5 py-1.5 shrink-0 shadow-inner">
                          <span className="font-mono text-emerald-300 font-black text-sm tracking-tight overflow-x-auto hide-scrollbar">
                            {convertedVal}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 rounded border border-emerald-800/80 shrink-0 ml-2">
                            {targetUnit}
                          </span>
                        </div>

                        {/* Action: Copy Single Result */}
                        <button
                          type="button"
                          onClick={() => handleCopySingle(param)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                            isCopied
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                          }`}
                          title="Copy result to clipboard"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* MODAL FOOTER & BATCH ACTION CONTROLS                           */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0B132B] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-mono text-[11px] leading-tight">
              Aligned with ANSI/ASHRAE Fundamentals & NIST SP 811 standards
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            
            {/* Copy All Converted Results Button */}
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                copyAllSuccess
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border-slate-750 disabled:opacity-50'
              }`}
              title="Copy all selected converted parameters as a Markdown table"
            >
              {copyAllSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Report Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy Report ({selectedIds.size})</span>
                </>
              )}
            </button>

            {/* Recalculate / Sync All Parameters Button */}
            <button
              type="button"
              onClick={() => {
                triggerPulse();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-cyan-950/60 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Convert All Selected</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
