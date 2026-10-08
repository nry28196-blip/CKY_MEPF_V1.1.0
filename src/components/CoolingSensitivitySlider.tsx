import React, { useState } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Sun,
  ShieldCheck
} from 'lucide-react';

interface CoolingSensitivitySliderProps {
  sensitivity: number; // 0.50 to 2.00 (1.00 = 100% baseline)
  onSensitivityChange: (newSensitivity: number) => void;
  baselineTons: number;
  activeTons: number;
  baselineWatts: number;
  activeWatts: number;
  // Optional granular coefficient overrides
  wallUValue?: number;
  onWallUValueChange?: (val: number) => void;
  roofUValue?: number;
  onRoofUValueChange?: (val: number) => void;
  windowUValue?: number;
  onWindowUValueChange?: (val: number) => void;
  windowShgc?: number;
  onWindowShgcChange?: (val: number) => void;
  lightingWpm2?: number;
  onLightingChange?: (val: number) => void;
  equipmentWatts?: number;
  onEquipmentChange?: (val: number) => void;
}

// Commercial standard chiller nominal sizes in Tons of Refrigeration (TR)
const STANDARD_CHILLER_SIZES = [
  2, 2.5, 3, 4, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500
];

function getRecommendedChillerSize(tons: number): { nominalSize: number; loadingPercent: number } {
  if (tons <= 0 || isNaN(tons)) return { nominalSize: 0, loadingPercent: 0 };
  const found = STANDARD_CHILLER_SIZES.find(size => size >= tons);
  const nominalSize = found ?? Math.ceil(tons / 50) * 50;
  const loadingPercent = Math.min(100, (tons / nominalSize) * 100);
  return { nominalSize, loadingPercent };
}

export default function CoolingSensitivitySlider({
  sensitivity,
  onSensitivityChange,
  baselineTons,
  activeTons,
  baselineWatts,
  activeWatts,
  wallUValue = 2.0,
  onWallUValueChange,
  roofUValue = 0.5,
  onRoofUValueChange,
  windowUValue = 3.0,
  onWindowUValueChange,
  windowShgc = 0.6,
  onWindowShgcChange,
  lightingWpm2 = 12,
  onLightingChange,
  equipmentWatts = 500,
  onEquipmentChange
}: CoolingSensitivitySliderProps) {
  const [showGranular, setShowGranular] = useState<boolean>(false);

  const deltaTons = activeTons - baselineTons;
  const deltaPercent = baselineTons > 0 ? (deltaTons / baselineTons) * 100 : 0;
  
  const baselineChiller = getRecommendedChillerSize(baselineTons);
  const activeChiller = getRecommendedChillerSize(activeTons);
  const chillerSizeChanged = activeChiller.nominalSize !== baselineChiller.nominalSize && baselineTons > 0;

  // Preset scenarios
  const presets = [
    { label: 'High-Eff (0.75×)', value: 0.75, desc: 'Passive / Low-e Glazing / LED' },
    { label: 'Baseline (1.00×)', value: 1.00, desc: 'ASHRAE 90.1 / Standard Envelope' },
    { label: 'High Solar (1.25×)', value: 1.25, desc: 'Unshaded Facade / High Glazing' },
    { label: 'Peak Stress (1.50×)', value: 1.50, desc: 'High Internal Loads & Heat Gain' }
  ];

  // Visual status pill
  const getRegimeBadge = () => {
    if (sensitivity < 0.95) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
          <TrendingDown className="w-3 h-3" />
          High-Efficiency Envelope ({deltaPercent.toFixed(1)}% TR)
        </span>
      );
    }
    if (sensitivity > 1.05) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
          <TrendingUp className="w-3 h-3" />
          Elevated Thermal Stress (+{deltaPercent.toFixed(1)}% TR)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
        <ShieldCheck className="w-3 h-3" />
        Design Standard Baseline (1.00×)
      </span>
    );
  };

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Heat Gain Sensitivity Slider
              </h4>
              {getRegimeBadge()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live coefficient scaling to observe instantaneous chiller tonnage response
            </p>
          </div>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={() => onSensitivityChange(1.00)}
          disabled={sensitivity === 1.00}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 transition-colors self-start sm:self-auto cursor-pointer"
          title="Reset to 1.00x baseline standard"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset 1.0×</span>
        </button>
      </div>

      {/* Main Sensitivity Slider Row */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span>Heat Gain Multiplier Factor:</span>
            <span className="text-cyan-400 font-mono font-black text-sm">
              {(sensitivity).toFixed(2)}×
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ({Math.round(sensitivity * 100)}%)
            </span>
          </span>

          <span className="text-[10px] font-mono text-slate-400">
            Range: 0.50× (Low Load) – 2.00× (Peak Stress)
          </span>
        </div>

        {/* Custom Range Slider Track */}
        <div className="relative flex items-center">
          <input
            type="range"
            min="0.50"
            max="2.00"
            step="0.01"
            value={sensitivity}
            onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 border border-slate-800"
            aria-label="Heat gain sensitivity factor slider"
          />
        </div>

        {/* Tick markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 select-none">
          <span onClick={() => onSensitivityChange(0.50)} className="hover:text-cyan-400 cursor-pointer">0.50× (Min)</span>
          <span onClick={() => onSensitivityChange(0.75)} className="hover:text-cyan-400 cursor-pointer">0.75×</span>
          <span onClick={() => onSensitivityChange(1.00)} className="hover:text-cyan-400 cursor-pointer font-bold text-cyan-400">1.00× (Base)</span>
          <span onClick={() => onSensitivityChange(1.25)} className="hover:text-cyan-400 cursor-pointer">1.25×</span>
          <span onClick={() => onSensitivityChange(1.50)} className="hover:text-cyan-400 cursor-pointer">1.50×</span>
          <span onClick={() => onSensitivityChange(2.00)} className="hover:text-cyan-400 cursor-pointer">2.00× (Max)</span>
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold mr-1">Presets:</span>
        {presets.map((p) => {
          const isActive = Math.abs(sensitivity - p.value) < 0.005;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onSensitivityChange(p.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800'
              }`}
              title={p.desc}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Real-Time Chiller Tonnage Impact Card */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
            Real-Time Chiller Tonnage Impact
          </span>
          <span className="text-[10px] font-mono text-cyan-400">
            Live Dynamic Response
          </span>
        </div>

        {/* Metrics Comparison Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          
          {/* 1. Baseline Capacity */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[9px] font-mono uppercase text-slate-500 block mb-0.5">
              Baseline Load (1.0×)
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-slate-300">
              {(baselineTons || 0).toFixed(2)} <span className="text-xs font-normal text-slate-400">TR</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
              {Math.round(baselineWatts || 0).toLocaleString()} W
            </span>
          </div>

          {/* 2. Active Sensitivity Capacity */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            sensitivity !== 1.00
              ? 'bg-cyan-950/30 border-cyan-700/60 ring-1 ring-cyan-500/30'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <span className="text-[9px] font-mono uppercase text-cyan-400 block mb-0.5 font-bold">
              Adjusted Chiller Load
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-white">
              {(activeTons || 0).toFixed(2)} <span className="text-xs font-normal text-slate-400">TR</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 block mt-0.5">
              {Math.round(activeWatts || 0).toLocaleString()} W
            </span>
          </div>

          {/* 3. Tonnage Delta */}
          <div className={`p-2.5 rounded-lg border ${
            deltaTons > 0.05
              ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
              : deltaTons < -0.05
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <span className="text-[9px] font-mono uppercase block mb-0.5 opacity-80">
              Load Variance (Δ)
            </span>
            <span className="text-base sm:text-lg font-mono font-black block">
              {deltaTons >= 0 ? `+${deltaTons.toFixed(2)}` : deltaTons.toFixed(2)} <span className="text-xs font-normal">TR</span>
            </span>
            <span className="text-[10px] font-mono block mt-0.5 font-bold">
              {deltaPercent >= 0 ? `+${deltaPercent.toFixed(1)}%` : `${deltaPercent.toFixed(1)}%`}
            </span>
          </div>

          {/* 4. Commercial Chiller Equipment Recommendation */}
          <div className={`p-2.5 rounded-lg border ${
            chillerSizeChanged
              ? 'bg-purple-950/40 border-purple-700/70 text-purple-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <span className="text-[9px] font-mono uppercase block mb-0.5 text-slate-400">
              Nominal Chiller Unit
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-cyan-300 block">
              {activeChiller.nominalSize} <span className="text-xs font-normal text-slate-400">TR Unit</span>
            </span>
            <span className="text-[10px] font-mono block mt-0.5 text-slate-400">
              {activeChiller.loadingPercent.toFixed(0)}% Loading Duty
            </span>
          </div>

        </div>

        {/* Chiller Frame Shift Notice */}
        {chillerSizeChanged && (
          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/60 flex items-center justify-between text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Equipment Frame Shift:</strong> Sensitivity adjustment moved required chiller frame from <strong>{baselineChiller.nominalSize} TR</strong> to <strong>{activeChiller.nominalSize} TR</strong>.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Granular Coefficient Sub-Sliders */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowGranular(!showGranular)}
          className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fine-Tune Individual Heat Gain Coefficients (U-Values, SHGC, Lighting)</span>
          </span>
          {showGranular ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGranular && (
          <div className="mt-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-200">
            <p className="text-[11px] text-slate-400">
              Adjust base parameters directly. The Master Sensitivity Slider proportionally scales these coefficients in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Wall U-Value */}
              {onWallUValueChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Wall U-Value:</span>
                    <span className="text-white font-bold">{wallUValue.toFixed(2)} W/(m²·K)</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={wallUValue}
                    onChange={(e) => onWallUValueChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.5 (Insulated)</span>
                    <span>2.0 (Base)</span>
                    <span>4.0 (Masonry)</span>
                  </div>
                </div>
              )}

              {/* Roof U-Value */}
              {onRoofUValueChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Roof U-Value:</span>
                    <span className="text-white font-bold">{roofUValue.toFixed(2)} W/(m²·K)</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={roofUValue}
                    onChange={(e) => onRoofUValueChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.1 (High-R)</span>
                    <span>0.5 (Base)</span>
                    <span>1.5 (Metal)</span>
                  </div>
                </div>
              )}

              {/* Window U-Value */}
              {onWindowUValueChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Window U-Value:</span>
                    <span className="text-white font-bold">{windowUValue.toFixed(2)} W/(m²·K)</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="6.0"
                    step="0.1"
                    value={windowUValue}
                    onChange={(e) => onWindowUValueChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>1.0 (Triple Low-e)</span>
                    <span>3.0 (Double)</span>
                    <span>6.0 (Single)</span>
                  </div>
                </div>
              )}

              {/* Window SHGC */}
              {onWindowShgcChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Solar SHGC:</span>
                    <span className="text-white font-bold">{windowShgc.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.85"
                    step="0.05"
                    value={windowShgc}
                    onChange={(e) => onWindowShgcChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.15 (Tinted Solar)</span>
                    <span>0.60 (Standard)</span>
                    <span>0.85 (Clear)</span>
                  </div>
                </div>
              )}

              {/* Lighting W/m² */}
              {onLightingChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Lighting Power:</span>
                    <span className="text-white font-bold">{lightingWpm2.toFixed(1)} W/m²</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="1"
                    value={lightingWpm2}
                    onChange={(e) => onLightingChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>4 (Modern LED)</span>
                    <span>12 (Base)</span>
                    <span>25 (Fluorescent)</span>
                  </div>
                </div>
              )}

              {/* Equipment Watts */}
              {onEquipmentChange && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Equipment Heat Dissipation:</span>
                    <span className="text-white font-bold">{equipmentWatts} W</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2500"
                    step="50"
                    value={equipmentWatts}
                    onChange={(e) => onEquipmentChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>100 (Minimal)</span>
                    <span>500 (Base)</span>
                    <span>2500 (Server/IT)</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
