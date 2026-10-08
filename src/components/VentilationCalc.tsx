import React, { useState, useEffect } from 'react';
import { BookOpen, Wind, Activity, FileText, Layers, Gauge, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import VentilationReferenceModal from './VentilationReferenceModal';
import KitchenVentilationCalc from './KitchenVentilationCalc';
import ResidentialVentilationCalc from './ResidentialVentilationCalc';
import Ashrae621VentilationCalc from './Ashrae621VentilationCalc';
import Ashrae621ExhaustCalc from './Ashrae621ExhaustCalc';
import AirBalanceCalc from './AirBalanceCalc';
import SystemPerformanceCalc from './SystemPerformanceCalc';
import VentilationReportsView from './VentilationReportsView';

export type VentilationSubMode = 'calculation' | 'exhaust' | 'balance' | 'heat_recovery' | 'reports';

interface VentilationCalcProps {
  onVentilationChange?: (flow: number, details?: any) => void;
  governingStandard?: string;
  activeSubMode?: VentilationSubMode;
  onSubModeChange?: (mode: VentilationSubMode) => void;
}

export default function VentilationCalc({
  onVentilationChange,
  governingStandard = 'ASHRAE 62.1-2022',
  activeSubMode,
  onSubModeChange
}: VentilationCalcProps) {
  const isResidentialStandard = governingStandard.includes('62.2');
  const [internalMode, setInternalMode] = useState<VentilationSubMode>('calculation');
  const [lastEngineResult, setLastEngineResult] = useState<any>(null);

  const currentMode = activeSubMode ?? internalMode;

  const handleModeSelect = (mode: VentilationSubMode) => {
    if (onSubModeChange) {
      onSubModeChange(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const [isRefModalOpen, setIsRefModalOpen] = useState(false);

  const handleCalculationChange = (flow: number, details?: any) => {
    setLastEngineResult(details);
    if (onVentilationChange) {
      onVentilationChange(flow, details);
    }
  };

  const getActiveBaseline = () => {
    switch (currentMode) {
      case 'exhaust':
        return 'ASHRAE 62.1-2022 + Addendum x [PRESCRIPTIVE EXHAUST CALCULATION - TABLE 6-2]';
      case 'balance':
        return 'Volumetric Air-Balance Diagnostic Utility [NON-AUTHORITATIVE DIAGNOSTIC]';
      case 'heat_recovery':
        return 'Fan & Duct Aerodynamic Performance / Heat Recovery Estimator [NON-AUTHORITATIVE DIAGNOSTIC]';
      case 'reports':
        return 'ASHRAE 62.1-2022 Ventilation Submittal Documentation & Audit Trail';
      case 'calculation':
      default:
        return 'ASHRAE 62.1-2022 + Addendum j [VENTILATION RATE PROCEDURE]';
    }
  };

  return (
    <div className="space-y-5">
      <VentilationReferenceModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} />

      {/* TOP SUB-SYSTEM PANEL (SECTION 4) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 pl-1 shrink-0">
              VENTILATION SYSTEMS
            </span>
            <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'calculation' as VentilationSubMode, label: 'Calculation' },
                { id: 'exhaust' as VentilationSubMode, label: 'Exhaust' },
                { id: 'balance' as VentilationSubMode, label: 'Air Balance' },
                { id: 'heat_recovery' as VentilationSubMode, label: 'Heat Recovery' },
                { id: 'reports' as VentilationSubMode, label: 'Reports' }
              ].map(item => {
                const isActive = currentMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleModeSelect(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsRefModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-800 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ASHRAE Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-System Active Page Rendering */}
      <div>
        {currentMode === 'calculation' && (
          <Ashrae621VentilationCalc onVentilationChange={handleCalculationChange} edition="2022" />
        )}
        {currentMode === 'exhaust' && (
          <Ashrae621ExhaustCalc />
        )}
        {currentMode === 'balance' && (
          <AirBalanceCalc />
        )}
        {currentMode === 'heat_recovery' && (
          <SystemPerformanceCalc />
        )}
        {currentMode === 'reports' && (
          <VentilationReportsView
            engineResult={lastEngineResult}
            auditTrails={lastEngineResult?.auditTrail || []}
          />
        )}
      </div>
    </div>
  );
}
