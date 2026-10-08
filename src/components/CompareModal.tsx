/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Scale, FileText, Clock, HelpCircle, Activity } from 'lucide-react';
import { HistoryItem } from '../types';
import ComparisonChart from './ComparisonChart';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
}

const parameterLabels: Record<string, string> = {
  standard: "Compliance Code Standard",
  area: "Room Area (m²)",
  volume: "Room Volume (m³)",
  estimationBasis: "Estimation Method Basis",
  occupants: "Occupants (People)",
  airflow: "Airflow (CFM)",
  frictionRate: "Friction Rate (in/100ft)",
  velocityLimit: "Velocity Limit (FPM)",
  ductHeight: "Duct Height (inches)",
  enableSplitting: "Enable Branch Splitting",
  numBranches: "Number of Branches",
  branchPercentages: "Branch Percentages",
  power: "Motor Power (kW)",
  voltage: "System Voltage (V)",
  powerFactor: "Power Factor (PF)",
  phase: "Electrical Phase Type",
  systemType: "Water Distribution System",
  designVelocity: "Design Velocity (m/s)",
  slope: "Sewer Pipe Slope (%)",
  consumptionRate: "Water Consumption (L/person/day)",
  storageDays: "Storage Water Demand (Days)",
  septicDischarge: "Daily Septic Discharge (L/person/day)",
  septicDesludgeInterval: "Septic Desludge Interval (Years)",
  sumpInflow: "Sump Peak Inflow (L/s)",
  boosterStaticHead: "Booster Static Head (meters)",
  boosterResidualPress: "Booster Residual Pressure (bar)",
  boosterFrictionPercent: "Booster Friction Allowance (%)",
  boosterEfficiency: "Booster Pump Efficiency (%)",
  transferFillTime: "Transfer Tank Fill Time (hours)",
  transferStaticHead: "Transfer Static Head (meters)",
  sumpStaticHead: "Sump Static Head (meters)",
  sprinklersCount: "Sprinklers Installed",
  hoseReelsCount: "Hose Reels Installed",
  hydrantsCount: "Hydrants Installed",
  breechingInletsCount: "Breeching Inlets Installed",
  kFactor: "Discharge Orifice K-Factor",
  residualPressure: "Residual Operating Pressure (psi/bar)",
  activeHeadsInDesignArea: "Active Heads in Remote Area",
  flowDuration: "Sump Flow Duration (minutes)",
  hoseStreamAllowance: "Hose Stream / Hydrant Allowance",
  buildingHeight: "Building Elevation Height (m)",
  standpipeSystem: "Standpipe System Class",
  pipeFrictionPercent: "System Pipe Friction (%)",
  pumpEfficiency: "Centrifugal Pump Efficiency (%)",
  subTab: "Sub-Category / Calculator Type",
  hazard: "Hazard Classification"
};

function formatValue(key: string, value: any): string {
  if (value === undefined || value === null) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  
  if (key === 'fixtures' && Array.isArray(value)) {
    return value
      .filter((f: any) => f.qty > 0)
      .map((f: any) => `${f.id.toUpperCase()}: ${f.qty}`)
      .join(', ') || 'No fixtures';
  }
  
  if (Array.isArray(value)) {
    return value.map(v => typeof v === 'number' ? `${v}%` : String(v)).join(', ');
  }
  
  if (typeof value === 'number') {
    return Number((value || 0).toFixed(2)).toString();
  }
  
  if (key === 'phase') {
    return value === 'three' ? '3-Phase' : '1-Phase';
  }

  if (key === 'standard') {
    return value === 'bs' ? 'BS STANDARD (UK)' : 'US Standard (IPC/NFPA)';
  }

  if (key === 'estimationBasis') {
    return value === 'area' ? 'Area Basis (m²)' : 'Volume Basis (m³)';
  }
  
  if (key === 'subTab') {
    if (value === 'fixtures') return 'Fixture Pipe Sizing';
    if (value === 'tanks') return 'Water / Septic Sizing';
    if (value === 'pumps') return 'Plumbing Pumps';
    if (value === 'equipment') return 'Sprinklers & Demands';
    if (value === 'sizing') return 'Water Storage';
    if (value === 'pumps-fire' || value === 'pump') return 'Fire Pump Engine';
    return String(value);
  }
  
  if (key === 'standpipeSystem') {
    if (value === 'class1') return 'Class I / Landing Valve';
    if (value === 'class2') return 'Class II / Hose Reel';
    return 'Sprinkler Only System';
  }
  
  return String(value);
}

export default function CompareModal({ isOpen, onClose, items }: CompareModalProps) {
  

  // Safeguard if we have fewer than 2 items
  const calcA = items[0];
  const calcB = items[1];

  // Get union of all parameter keys from both selected calculations
  const allKeys = Array.from(
    new Set([
      ...(calcA ? Object.keys(calcA.parameters || {}) : []),
      ...(calcB ? Object.keys(calcB.parameters || {}) : [])
    ])
  ).filter(k => k !== 'fixtures' || (calcA?.parameters?.fixtures || calcB?.parameters?.fixtures)); // skip if neither has fixtures array

  const getDisciplineLabel = (tab: string) => {
    switch (tab) {
      case 'mechanical': return 'Mechanical / HVAC';
      case 'electrical': return 'Electrical';
      case 'plumbing': return 'Plumbing system';
      case 'fire': return 'FIRE FIGHTING';
      default: return tab.toUpperCase();
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-950/50 border border-sky-500/20 text-sky-400 rounded-xl">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Side-by-Side Calculation Comparison</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Apples-to-apples performance comparison and parameter auditing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-400 hover:text-white transition-all cursor-pointer hover:border-slate-700"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 hide-scrollbar">
          
          {!calcA || !calcB ? (
            <div className="py-16 text-center space-y-3">
              <HelpCircle className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">Please select exactly 2 calculation runs from the sidebar list to compare.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Comparative Headers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calc A summary card */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-sky-500/10 border-b border-l border-sky-500/20 rounded-bl-lg text-[8px] font-mono font-bold text-sky-400">
                    CALCULATION A
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                    {getDisciplineLabel(calcA.tab)}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">{calcA.title}</h3>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    <span>{calcA.timestamp}</span>
                  </div>
                  <div className="mt-2 text-[10.5px] text-sky-400 bg-sky-950/20 border border-sky-900/40 rounded px-2.5 py-1.5 font-bold font-mono">
                    {calcA.summary}
                  </div>
                </div>

                {/* Calc B summary card */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/10 border-b border-l border-emerald-500/20 rounded-bl-lg text-[8px] font-mono font-bold text-emerald-400">
                    CALCULATION B
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                    {getDisciplineLabel(calcB.tab)}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">{calcB.title}</h3>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    <span>{calcB.timestamp}</span>
                  </div>
                  <div className="mt-2 text-[10.5px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 rounded px-2.5 py-1.5 font-bold font-mono">
                    {calcB.summary}
                  </div>
                </div>
              </div>

              {/* Variance Chart */}
              <ComparisonChart calcA={calcA} calcB={calcB} />
              
              {/* Parameter Table */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850">
                      <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40 w-1/3">
                        Parameter / Input
                      </th>
                      <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-slate-900/40 w-1/3 border-l border-slate-850">
                        Calc A (Left)
                      </th>
                      <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-slate-900/40 w-1/3 border-l border-slate-850">
                        Calc B (Right)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 font-mono text-xs">
                    {allKeys.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-[11px] text-slate-500">
                          No distinct input parameters stored for these configurations.
                        </td>
                      </tr>
                    ) : (
                      allKeys.map((key) => {
                        const valA = calcA.parameters ? calcA.parameters[key] : undefined;
                        const valB = calcB.parameters ? calcB.parameters[key] : undefined;
                        const label = parameterLabels[key] || key;

                        return (
                          <tr key={key} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-sans text-slate-400 text-[11px] font-semibold">
                              {label}
                            </td>
                            <td className="p-3 border-l border-slate-850/60 text-slate-200">
                              <span className={valA !== undefined ? 'text-sky-300 font-bold' : 'text-slate-600'}>
                                {formatValue(key, valA)}
                              </span>
                            </td>
                            <td className="p-3 border-l border-slate-850/60 text-slate-200">
                              <span className={valB !== undefined ? 'text-emerald-300 font-bold' : 'text-slate-600'}>
                                {formatValue(key, valB)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Comparison Insights */}
              <div className="p-4 bg-slate-950/25 border border-slate-850 rounded-xl flex items-start space-x-3">
                <div className="p-1.5 bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Comparison Insights</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {calcA.tab === calcB.tab ? (
                      <span>
                        Auditing two <strong className="text-sky-400 font-bold">{getDisciplineLabel(calcA.tab)}</strong> iterations. 
                        Useful for verifying load delta reductions, pipe schedule expansions, and power rating variances.
                      </span>
                    ) : (
                      <span>
                        Auditing cross-discipline calculations (<strong className="text-sky-300 font-bold">{getDisciplineLabel(calcA.tab)}</strong> vs <strong className="text-emerald-300 font-bold">{getDisciplineLabel(calcB.tab)}</strong>). 
                        Compare spatial parameters or electrical versus plumbing service load capacities.
                      </span>
                    )}
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Audit report auto-generated for dynamic civil/MEPF project records.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

                      </div>
    </div>
  );
}
