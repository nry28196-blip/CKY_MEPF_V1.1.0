import React, { useState, useEffect } from 'react';
import { Wind, Activity, CheckCircle2, AlertTriangle, ChefHat, BookOpen, Calculator, Info, ThermometerSun, Maximize, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import TooltipLabel from './TooltipLabel';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import AuditTrailTable from './AuditTrailTable';
import { exportKitchenVentilationToCsv } from '../lib/exportCsv';
import { 
  KitchenVentilationService, 
  KitchenVentilationInput, 
  KitchenVentilationResult, 
  KitchenHoodStandard, 
  KitchenHoodType, 
  KitchenThermalDuty,
  KITCHEN_DIAGNOSTIC_NOTICE 
} from '../calculations/ventilation/KitchenVentilationService';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

export type KitchenModuleSection = 'capture' | 'grease' | 'mua';

interface KitchenVentilationCalcProps {
  activeSection?: KitchenModuleSection;
  onSectionChange?: (sec: KitchenModuleSection) => void;
}

export default function KitchenVentilationCalc({
  activeSection = 'capture',
  onSectionChange
}: KitchenVentilationCalcProps) {
  const { t } = useLanguage();
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  useEffect(() => {
    if (activeSection === 'capture') {
      scrollWorkspaceToTop();
    } else {
      const el = document.getElementById(`kitchen-${activeSection}-section`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection]);

  const [hoodStandard, setHoodStandard] = useState<KitchenHoodStandard>('unlisted');
  
  // Base Parameters
  const [hoodType, setHoodType] = useState<KitchenHoodType>('wall');
  const [duty, setDuty] = useState<KitchenThermalDuty>('medium');
  const [equipmentLength, setEquipmentLength] = useState<number>(isMetric ? 3 : 10);
  const [overhang, setOverhang] = useState<number>(isMetric ? 0.3 : 1.0);
  
  // Performance (C&C) Parameters
  const [captureVelocity, setCaptureVelocity] = useState<number>(isMetric ? 0.4 : 80); // 80 FPM or 0.4 m/s
  const [hoodDepth, setHoodDepth] = useState<number>(isMetric ? 1.2 : 4); // 4 ft or 1.2m
  
  // Listed Parameters (UL 710)
  const [listedFlowPerLength, setListedFlowPerLength] = useState<number>(isMetric ? 300 : 200);

  // Localized MUA Breakdown (% of Exhaust)
  const [muaTransfer, setMuaTransfer] = useState<number>(20);
  const [muaCeiling, setMuaCeiling] = useState<number>(40);
  const [muaPerimeter, setMuaPerimeter] = useState<number>(20);
  const [muaInternal, setMuaInternal] = useState<number>(0);

  const [ductVelocity, setDuctVelocity] = useState<number>(isMetric ? 7.6 : 1500);

  const lenUnit = isMetric ? 'm' : 'ft';
  const flowUnit = isMetric ? 'L/s' : 'CFM';
  const velUnit = isMetric ? 'm/s' : 'FPM';
  const areaUnit = isMetric ? 'cm²' : 'sq.in';

  const totalMuaRatio = muaTransfer + muaCeiling + muaPerimeter + muaInternal;

  const input: KitchenVentilationInput = {
    hoodStandard,
    hoodType,
    duty,
    equipmentLength,
    overhang,
    hoodDepth,
    captureVelocity,
    listedFlowPerLength,
    ductVelocity,
    muaTransfer,
    muaCeiling,
    muaPerimeter,
    muaInternal,
    isMetric
  };

  const result: KitchenVentilationResult = KitchenVentilationService.calculate(input);

  const exhaustAirflow = result.exhaustAirflow ?? 0;
  const hoodLength = result.hoodLength ?? 0;
  const faceVelocity = result.faceVelocity ?? 0;
  const ductArea = result.ductArea ?? 0;

  const muaTotalFlow = exhaustAirflow * (totalMuaRatio / 100);
  const muaTransferFlow = exhaustAirflow * (muaTransfer / 100);
  const muaCeilingFlow = exhaustAirflow * (muaCeiling / 100);
  const muaPerimeterFlow = exhaustAirflow * (muaPerimeter / 100);
  const muaInternalFlow = exhaustAirflow * (muaInternal / 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Utility Basis: Commercial Kitchen Hood Sizing Diagnostic (Non-ASHRAE 62.1 Path)
        </div>
      </div>

      <EngineeringStatusHeader 
        status="NOT_READY_FOR_ENGINEERING_USE" 
        message="Engineering Diagnostic Utility: Commercial kitchen exhaust estimation based on IMC 507 / ASHRAE 154 guidelines. Not an official code compliance determination or engineering sign-off."
        className="mb-4"
      />

      {result.reasons.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Invalid Diagnostic Parameter(s):</p>
          {result.reasons.map((r, i) => (
            <p key={i} className="text-xs text-rose-300 font-mono">• {r}</p>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-300 font-mono">• {w}</p>
          ))}
        </div>
      )}

      <div 
        id="kitchen-capture-section"
        className={`bg-slate-900 border rounded-xl p-5 shadow-lg transition-all ${
          activeSection === 'capture' ? 'border-rose-500/70 ring-1 ring-rose-500/30' : 'border-slate-800'
        }`}
      >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <ChefHat className="w-4 h-4 mr-2 text-rose-400" />
              Kitchen Hood Parameters & Capture Velocity
            </h3>
            {activeSection === 'capture' && (
              <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2 py-0.5 rounded">
                Active Module: Capture & Containment
              </span>
            )}
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
            <button 
              onClick={() => setHoodStandard('unlisted')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${hoodStandard === 'unlisted' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Unlisted (IMC 507)
            </button>
            <button 
              onClick={() => setHoodStandard('listed')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${hoodStandard === 'listed' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Listed (UL 710)
            </button>
            <button 
              onClick={() => setHoodStandard('performance')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${hoodStandard === 'performance' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Capture Velocity (Diagnostic)
            </button>
          </div>

          <div className="space-y-4">
            {(hoodStandard === 'unlisted' || hoodStandard === 'performance') && (
              <div>
                <TooltipLabel label="Cooking Equipment Duty" className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
                <select 
                  value={duty} 
                  onChange={(e) => setDuty(e.target.value as any)}
                  className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm focus:outline-none border border-slate-800 focus:border-rose-500"
                >
                  <option value="light">Light Duty (Ovens, Steamers)</option>
                  <option value="medium">Medium Duty (Fryers, Griddles)</option>
                  <option value="heavy">Heavy Duty (Charbroilers, Woks)</option>
                  <option value="extra">Extra-Heavy Duty (Solid Fuel)</option>
                </select>
              </div>
            )}
            
            <div>
              <TooltipLabel label="Hood Configuration" className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
              <select 
                value={hoodType} 
                onChange={(e) => setHoodType(e.target.value as any)}
                className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm focus:outline-none border border-slate-800 focus:border-rose-500"
              >
                <option value="wall">Wall-Mounted Canopy</option>
                <option value="single_island">Single Island Canopy</option>
                <option value="double_island">Double Island Canopy</option>
                <option value="backshelf">Backshelf / Pass-over</option>
                <option value="eyebrow">Eyebrow</option>
              </select>
            </div>
            
            {hoodStandard === 'listed' && (
              <div className="pt-2 border-t border-slate-800/60">
                 <TooltipLabel label={`Listed Extraction Rate (${isMetric ? 'L/s per m' : 'CFM per ft'})`} className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
                 <input 
                   type="number" min="0" step="10" 
                   value={listedFlowPerLength} 
                   onChange={e => setListedFlowPerLength(Number(e.target.value))}
                   className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-mono border border-slate-800 focus:border-rose-500"
                 />
                 <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">From Manufacturer Data</p>
              </div>
            )}

            {hoodStandard === 'performance' && (
              <div className="pt-2 border-t border-slate-800/60">
                 <TooltipLabel label={`Target Capture Velocity (${velUnit})`} className="block text-[10px] font-bold text-rose-400 mb-1.5 uppercase" />
                 <input 
                   type="number" min="0" step={isMetric ? 0.05 : 10} 
                   value={captureVelocity} 
                   onChange={e => setCaptureVelocity(Number(e.target.value))}
                   className="w-full bg-rose-950/20 text-rose-200 rounded-lg px-4 py-2 text-sm font-mono border border-rose-900/50 focus:border-rose-500"
                 />
                 <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">Typically 50-150 FPM (0.25-0.75 m/s)</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
              <div>
                <TooltipLabel label={`Eq. Length (${lenUnit})`} className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
                <input 
                  type="number" min="0.1" step="0.1" 
                  value={equipmentLength} 
                  onChange={e => setEquipmentLength(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm font-mono border border-slate-800 focus:border-rose-500"
                />
              </div>
              <div>
                <TooltipLabel label={`Side Overhang (${lenUnit})`} className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
                <input 
                  type="number" min="0" step="0.05" 
                  value={overhang} 
                  onChange={e => setOverhang(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm font-mono border border-slate-800 focus:border-rose-500"
                />
              </div>
              <div className="col-span-2">
                <TooltipLabel label={`Hood Depth (${lenUnit})`} className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
                <input 
                  type="number" min="0.1" step="0.1" 
                  value={hoodDepth} 
                  onChange={e => setHoodDepth(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm font-mono border border-slate-800 focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      <div 
        id="kitchen-mua-section"
        className={`bg-slate-900 border rounded-xl p-5 shadow-lg transition-all ${
          activeSection === 'mua' ? 'border-sky-500/70 ring-1 ring-sky-500/30' : 'border-slate-800'
        }`}
      >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center">
               <Wind className="w-4 h-4 mr-2 text-sky-400" />
               Localized Make-Up Air (MUA) Balance
            </h3>
            {activeSection === 'mua' && (
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-800/60 px-2 py-0.5 rounded">
                Active Module: Make-Up Air
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Total MUA Ratio</span>
               <span className={`text-xs font-bold font-mono ${totalMuaRatio > 95 ? 'text-red-400' : totalMuaRatio < 75 ? 'text-amber-400' : 'text-sky-400'}`}>
                 {totalMuaRatio}%
               </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-1 uppercase tracking-wide">
                  <span>Transfer Air (Dining)</span>
                  <span className="font-mono text-slate-400">{muaTransfer}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={muaTransfer} 
                  onChange={e => setMuaTransfer(Number(e.target.value))}
                  className="w-full accent-slate-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-1 uppercase tracking-wide">
                  <span>Ceiling Supply (Diffusers)</span>
                  <span className="font-mono text-sky-400">{muaCeiling}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={muaCeiling} 
                  onChange={e => setMuaCeiling(Number(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-1 uppercase tracking-wide">
                  <span>Front Face / Perimeter</span>
                  <span className="font-mono text-indigo-400">{muaPerimeter}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={muaPerimeter} 
                  onChange={e => setMuaPerimeter(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-1 uppercase tracking-wide">
                  <span>Internal Short-Circuit</span>
                  <span className="font-mono text-amber-500">{muaInternal}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={muaInternal} 
                  onChange={e => setMuaInternal(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800/60">
              <TooltipLabel label={`Target Duct Velocity (${velUnit})`} className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" />
              <input 
                type="number" min="1" step={isMetric ? 0.1 : 50} 
                value={ductVelocity} 
                onChange={e => setDuctVelocity(Number(e.target.value))}
                className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-mono border border-slate-800 focus:border-sky-500"
              />
            </div>
          </div>
              </div>
<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg h-full">
        
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-rose-400" />
              Kitchen Exhaust Results
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="export-kitchen-csv-btn"
                onClick={() => {
                  exportKitchenVentilationToCsv({
                    isMetric,
                    standard: hoodStandard,
                    hoodType,
                    duty,
                    hoodLength,
                    hoodDepth,
                    exhaustAirflow,
                    muaTotalFlow,
                    totalMuaRatio,
                    ductArea,
                    ductVelocity,
                    status: result.status
                  });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white rounded border border-slate-800 hover:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Export kitchen ventilation calculation to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                <span>Export CSV</span>
              </button>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border border-slate-800 px-2 py-1 rounded bg-slate-950">
                L: {(hoodLength || 0).toFixed(2)} {lenUnit}
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border border-slate-800 px-2 py-1 rounded bg-slate-950">
                D: {(hoodDepth || 0).toFixed(2)} {lenUnit}
              </span>
            </div>
          </div>
 
          {result.status !== 'PASS' ? (
            <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl flex flex-col items-center justify-center text-center">
               <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
               <h4 className="text-sm font-bold text-red-400 uppercase">Calculation Blocked / Invalid</h4>
               <div className="text-xs text-red-300 mt-2 space-y-1">
                 {result.reasons.map((r, i) => (
                   <p key={i}>• {r}</p>
                 ))}
               </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-950/50 p-6 rounded-xl border border-rose-900/30 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 z-10">Required Exhaust</p>
                  <p className="text-5xl font-black text-white font-mono tracking-tight drop-shadow-md z-10">
                    {Math.ceil(exhaustAirflow).toLocaleString()}
                  </p>
                  <p className="text-sm font-bold text-rose-400 uppercase tracking-widest mt-1 z-10">{flowUnit}</p>
                </div>
                
                <div className="bg-slate-950/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-bl from-sky-500/5 to-transparent" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 z-10 text-center pt-6">Make-Up Air ({totalMuaRatio}%)</p>
                  <p className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md z-10 text-center mb-4">
                    {Math.round(muaTotalFlow).toLocaleString()}
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-widest ml-1">{flowUnit}</span>
                  </p>
                  
                  <div className="flex-grow flex flex-col justify-end space-y-2 z-10 text-[10px] font-mono w-full px-4 pb-4">
                     <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                        <span className="text-slate-500">Transfer ({muaTransfer}%)</span>
                        <span className="text-slate-300">{Math.round(muaTransferFlow).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                        <span className="text-sky-500/70">Ceiling ({muaCeiling}%)</span>
                        <span className="text-sky-300">{Math.round(muaCeilingFlow).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                        <span className="text-indigo-500/70">Front/Perimeter ({muaPerimeter}%)</span>
                        <span className="text-indigo-300">{Math.round(muaPerimeterFlow).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-amber-500/70">Internal ({muaInternal}%)</span>
                        <span className="text-amber-300">{Math.round(muaInternalFlow).toLocaleString()}</span>
                     </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Minimum Duct Area</h4>
                   <div className="flex items-end">
                     <span className="text-2xl font-black text-slate-200 font-mono leading-none">{Math.round(ductArea).toLocaleString()}</span>
                     <span className="text-xs font-bold text-slate-500 uppercase ml-2 mb-0.5">{areaUnit}</span>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2">Required cross-section to maintain {ductVelocity} {velUnit}</p>
                </div>
                <div 
                  id="kitchen-grease-section"
                  className={`border rounded-lg p-4 transition-all ${
                    activeSection === 'grease' ? 'bg-amber-950/20 border-amber-500/70 ring-1 ring-amber-500/40' : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                   <div className="flex items-center justify-between mb-2">
                     <h4 className="text-[10px] font-bold text-slate-300 uppercase">
                       Grease Filter & Exhaust Guidelines
                     </h4>
                     {activeSection === 'grease' && (
                       <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                         Active Module: Grease Filters
                       </span>
                     )}
                   </div>
                   <ul className="text-[9px] text-slate-400 space-y-1.5 list-disc list-inside">
                     <li className="text-amber-300 font-semibold">Duct velocity min 500 FPM (2.54 m/s) per IMC to prevent grease deposition.</li>
                     <li>Type I commercial hood grease filters: UL 1046 / NFPA 96 listed baffle filters required.</li>
                     {muaInternal > 10 && <li className="text-amber-400">High internal MUA (&gt;10%) may interfere with thermal plume capture.</li>}
                     {totalMuaRatio < 80 && <li className="text-amber-400">Low total MUA may cause negative building pressure.</li>}
                     {faceVelocity < (isMetric ? 0.25 : 50) && <li className="text-amber-400">Low face velocity may result in poor spill containment.</li>}
                   </ul>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}