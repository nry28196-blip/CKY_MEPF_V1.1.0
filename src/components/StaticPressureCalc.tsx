import React, { useState, useEffect } from 'react';
import { Settings, Wind, Plus, Trash2, Activity, ShieldAlert, GitBranch, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import { ASHRAE_FITTINGS_DB } from '../calculations/duct/FittingsDatabase';
import { CriticalPathService, PathInput, DuctSection } from '../calculations/duct/CriticalPathService';
import TooltipLabel from './TooltipLabel';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';
import { exportStaticPressureToCsv } from '../lib/exportCsv';

export default function StaticPressureCalc() {
  const { unitSystem } = useUnit();

  useEffect(() => {
    scrollWorkspaceToTop();
  }, []);
  const isMetric = unitSystem === 'metric';

  const flowUnit = isMetric ? 'L/s' : 'CFM';
  const lenUnit = isMetric ? 'm' : 'ft';
  const dimUnit = isMetric ? 'mm' : 'in';
  const pressUnit = isMetric ? 'Pa' : 'in.wg';
  const densityUnit = isMetric ? 'kg/m³' : 'lb/ft³';
  
  const [roughness, setRoughness] = useState<number>(isMetric ? 0.09 : 0.0003); // Galv steel
  const [density, setDensity] = useState<number>(isMetric ? 1.204 : 0.075);
  const [safetyFactor, setSafetyFactor] = useState<number>(10);
  const [fittingSelectorOpen, setFittingSelectorOpen] = useState<{pathId: string, sectionId: string} | null>(null);
  
  const [paths, setPaths] = useState<PathInput[]>([
    {
      id: 'path-1',
      name: 'Main Run (Index Path)',
      sections: [
        {
          id: 'sec-1',
          name: 'Main Supply Duct',
          airflow: isMetric ? 1000 : 2118,
          width: isMetric ? 600 : 24,
          height: isMetric ? 400 : 16,
          length: isMetric ? 15 : 50,
          fittingLossCoeff: 1.5,
          equipmentLoss: isMetric ? 125 : 0.5 // e.g. Coil + Filter
        },
        {
          id: 'sec-2',
          name: 'Branch to Terminal',
          airflow: isMetric ? 250 : 530,
          width: isMetric ? 300 : 12,
          height: isMetric ? 200 : 8,
          length: isMetric ? 10 : 33,
          fittingLossCoeff: 2.2,
          equipmentLoss: isMetric ? 25 : 0.1 // e.g. Diffuser
        }
      ]
    }
  ]);

  const addPath = () => {
    setPaths([
      ...paths,
      {
        id: Math.random().toString(),
        name: `Path ${paths.length + 1}`,
        sections: []
      }
    ]);
  };

  const removePath = (id: string) => {
    if (paths.length > 1) {
      setPaths(paths.filter(p => p.id !== id));
    }
  };

  const addSection = (pathId: string) => {
    setPaths(paths.map(p => {
      if (p.id === pathId) {
        return {
          ...p,
          sections: [
            ...p.sections,
            {
              id: Math.random().toString(),
              name: `Section ${p.sections.length + 1}`,
              airflow: isMetric ? 500 : 1000,
              diameter: isMetric ? 300 : 12,
              length: isMetric ? 10 : 33,
              fittingLossCoeff: 0,
              equipmentLoss: 0
            }
          ]
        };
      }
      return p;
    }));
  };

  const removeSection = (pathId: string, secId: string) => {
    setPaths(paths.map(p => {
      if (p.id === pathId) {
        return { ...p, sections: p.sections.filter(s => s.id !== secId) };
      }
      return p;
    }));
  };

  const updateSection = (pathId: string, secId: string, field: keyof DuctSection, value: any) => {
    setPaths(paths.map(p => {
      if (p.id === pathId) {
        return {
          ...p,
          sections: p.sections.map(s => {
            if (s.id === secId) {
              // If changing to diameter, clear w/h
              if (field === 'diameter') return { ...s, diameter: value, width: undefined, height: undefined };
              // If changing w/h, clear diameter
              if (field === 'width' || field === 'height') return { ...s, [field]: value, diameter: undefined };
              
              return { ...s, [field]: value };
            }
            return s;
          })
        };
      }
      return p;
    }));
  };

  const result = CriticalPathService.calculatePaths(paths, roughness, density, isMetric);
  const criticalPath = result.paths.find(p => p.pathId === result.criticalPathId);
  const designPressure = result.maxPressure * (1 + safetyFactor / 100);
  
  // Design airflow is the sum of airflow leaving the fan, which typically is the airflow in the very first section of the critical path (if it's a trunk).
  // But for simple calc, we'll just ask the user or take the max airflow in any section.
  const designAirflow = criticalPath && criticalPath.sections.length > 0 ? criticalPath.sections[0].friction.airflow : 0;
  // Actually, the section input has the airflow, let's just find the max airflow across all sections in the critical path.
  let maxPathAirflow = 0;
  if (criticalPath) {
    criticalPath.sections.forEach(s => {
       // Wait, we didn't store airflow in the result. It's in the input.
       const secInput = paths.find(p => p.id === criticalPath.pathId)?.sections.find(sx => sx.id === s.sectionId);
       if (secInput && secInput.airflow > maxPathAirflow) maxPathAirflow = secInput.airflow;
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-xl flex items-start text-xs text-amber-400">
         <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
         <p>
           <strong>Engineering Calculation Aid:</strong> Uses Darcy-Weisbach and Colebrook-White equations for accurate duct friction based on actual air density. 
           Do not add pressure drops of parallel branches. Identify the critical (highest pressure drop) path to size the fan.
         </p>
      </div>
      
      {/* Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
          <Settings className="w-4 h-4 mr-2 text-indigo-400" />
          System Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <TooltipLabel label={`Air Density (${densityUnit})`} className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" />
            <input type="number" min="0" step="0.01" value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm border border-slate-800 focus:border-indigo-500" />
          </div>
          <div>
            <TooltipLabel label={`Duct Roughness (${isMetric ? 'mm' : 'ft'})`} className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" />
            <input type="number" min="0" step="0.001" value={roughness} onChange={(e) => setRoughness(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm border border-slate-800 focus:border-indigo-500" />
          </div>
          <div>
            <TooltipLabel label="Safety Factor (%)" className="text-[10px] font-bold text-slate-400 uppercase mb-1.5" />
            <input type="number" min="0" value={safetyFactor} onChange={(e) => setSafetyFactor(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm border border-slate-800 focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {/* Paths */}
      <div className="space-y-6">
        {paths.map((path, pIdx) => {
          const isCritical = path.id === result.criticalPathId;
          const pathRes = result.paths.find(r => r.pathId === path.id);
          
          return (
            <div key={path.id} className={`bg-slate-900 border rounded-xl p-5 shadow-lg ${isCritical ? 'border-indigo-500/50 shadow-indigo-900/20' : 'border-slate-800'}`}>
              <div className="flex justify-between items-center mb-5 border-b border-slate-800/60 pb-3">
                <div className="flex items-center">
                  <GitBranch className={`w-4 h-4 mr-2 ${isCritical ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <input 
                    type="text" 
                    value={path.name}
                    onChange={(e) => setPaths(paths.map(p => p.id === path.id ? { ...p, name: e.target.value } : p))}
                    className="bg-transparent text-white font-semibold text-sm border-none focus:ring-0 p-0 w-64"
                  />
                  {isCritical && <span className="ml-3 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] uppercase font-bold rounded">Critical Path</span>}
                </div>
                <button onClick={() => removePath(path.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                {path.sections.map((sec, sIdx) => {
                  const secRes = pathRes?.sections.find(s => s.sectionId === sec.id);
                  
                  return (
                    <div key={sec.id} className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-lg relative">
                      <button onClick={() => removeSection(path.id, sec.id)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      
                      <input 
                        type="text" 
                        value={sec.name}
                        onChange={(e) => updateSection(path.id, sec.id, 'name', e.target.value)}
                        className="bg-transparent text-white text-xs font-bold border-none focus:ring-0 p-0 mb-3 w-48"
                      />
                      
                      {(() => {
                        const isSecFlowNegative = sec.airflow < 0;
                        const isSecFlowZero = sec.airflow === 0;
                        const isSecFlowError = isSecFlowNegative || isSecFlowZero;
                        const isSecWidthOversized = sec.width !== undefined && (sec.width > (isMetric ? 2400 : 96));
                        const isSecAspectOversized = sec.width !== undefined && sec.height !== undefined && sec.height > 0 && (sec.width / sec.height > 4.0);
                        const isSecDiamOversized = sec.diameter !== undefined && (sec.diameter > (isMetric ? 2400 : 96));
                        const isSecDuctOversized = isSecWidthOversized || isSecAspectOversized || isSecDiamOversized;

                        return (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Flow ({flowUnit})</label>
                                <input 
                                  type="number" 
                                  value={sec.airflow} 
                                  onChange={(e) => updateSection(path.id, sec.id, 'airflow', Number(e.target.value))} 
                                  className={`w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border font-mono transition-colors ${
                                    isSecFlowError
                                      ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500'
                                      : 'border-slate-700 focus:border-sky-500'
                                  }`} 
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Shape</label>
                                <select 
                                  value={sec.diameter !== undefined ? 'round' : 'rect'}
                                  onChange={(e) => {
                                    if (e.target.value === 'round') updateSection(path.id, sec.id, 'diameter', isMetric ? 300 : 12);
                                    else { updateSection(path.id, sec.id, 'width', isMetric ? 400 : 16); updateSection(path.id, sec.id, 'height', isMetric ? 300 : 12); }
                                  }}
                                  className="w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border border-slate-700"
                                >
                                  <option value="rect">Rect</option>
                                  <option value="round">Round</option>
                                </select>
                              </div>
                              {sec.diameter !== undefined ? (
                                <div className="col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase">Diameter ({dimUnit})</label>
                                  <input 
                                    type="number" 
                                    value={sec.diameter} 
                                    onChange={(e) => updateSection(path.id, sec.id, 'diameter', Number(e.target.value))} 
                                    className={`w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border font-mono transition-colors ${
                                      isSecDiamOversized
                                        ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500'
                                        : 'border-slate-700 focus:border-sky-500'
                                    }`} 
                                  />
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-[9px] text-slate-500 uppercase">W ({dimUnit})</label>
                                    <input 
                                      type="number" 
                                      value={sec.width} 
                                      onChange={(e) => updateSection(path.id, sec.id, 'width', Number(e.target.value))} 
                                      className={`w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border font-mono transition-colors ${
                                        isSecWidthOversized || isSecAspectOversized
                                          ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500'
                                          : 'border-slate-700 focus:border-sky-500'
                                      }`} 
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-slate-500 uppercase">H ({dimUnit})</label>
                                    <input 
                                      type="number" 
                                      value={sec.height} 
                                      onChange={(e) => updateSection(path.id, sec.id, 'height', Number(e.target.value))} 
                                      className={`w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border font-mono transition-colors ${
                                        isSecAspectOversized
                                          ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500'
                                          : 'border-slate-700 focus:border-sky-500'
                                      }`} 
                                    />
                                  </div>
                                </>
                              )}
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Len ({lenUnit})</label>
                                <input type="number" min="0" value={sec.length} onChange={(e) => updateSection(path.id, sec.id, 'length', Number(e.target.value))} className="w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border border-slate-700" />
                              </div>
                              <div className="relative">
                                <label className="block text-[9px] text-slate-500 uppercase">Fittings (ΣC)</label>
                                <div className="flex space-x-1">
                                  <input type="number" min="0" step="0.1" value={sec.fittingLossCoeff} onChange={(e) => updateSection(path.id, sec.id, 'fittingLossCoeff', Number(e.target.value))} className="w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border border-slate-700" />
                                  <button onClick={() => setFittingSelectorOpen({pathId: path.id, sectionId: sec.id})} className="bg-sky-900/50 hover:bg-sky-800 text-sky-400 px-2 rounded border border-sky-700/50 flex items-center justify-center">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Equip ({pressUnit})</label>
                                <input type="number" min="0" step="1" value={sec.equipmentLoss} onChange={(e) => updateSection(path.id, sec.id, 'equipmentLoss', Number(e.target.value))} className="w-full bg-slate-900 text-white rounded px-2 py-1.5 text-xs border border-slate-700" />
                              </div>
                            </div>

                            {/* Section Level Error Alerts */}
                            {(isSecFlowError || isSecDuctOversized) && (
                              <div className="mt-2 text-[10px] font-mono flex flex-wrap gap-2 text-red-400 bg-red-950/30 p-1.5 rounded border border-red-900/40">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  {isSecFlowNegative && <div>Engineering Error: Negative airflow ({sec.airflow} {flowUnit}) is invalid.</div>}
                                  {isSecFlowZero && <div>Engineering Error: Airflow cannot be zero.</div>}
                                  {isSecWidthOversized && <div>Oversized Duct: Width ({sec.width}{dimUnit}) exceeds standard fabrication threshold ({isMetric ? '2,400 mm' : '96"'})</div>}
                                  {isSecAspectOversized && !isSecWidthOversized && <div>Oversized Duct: Aspect ratio ({((sec.width || 0) / (sec.height || 1)).toFixed(1)}:1) exceeds SMACNA 4:1 limit.</div>}
                                  {isSecDiamOversized && <div>Oversized Duct: Diameter ({sec.diameter}{dimUnit}) exceeds fabrication limit.</div>}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {secRes && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-4 text-[10px] font-mono text-slate-400">
                          <span>Vel: {Math.round(secRes.friction.velocity)} {isMetric ? 'm/s' : 'FPM'}</span>
                          <span>Pv: {(secRes.friction.velocityPressure || 0).toFixed(2)} {pressUnit}</span>
                          <span>ΔP Str: {(secRes.friction.pressureDrop || 0).toFixed(2)} {pressUnit}</span>
                          <span>ΔP Fit: {(secRes.fittingLoss || 0).toFixed(2)} {pressUnit}</span>
                          <span className="text-white font-bold">Total: {(secRes.total || 0).toFixed(2)} {pressUnit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <button onClick={() => addSection(path.id)} className="text-xs text-sky-400 hover:text-sky-300 flex items-center px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Add Section
                </button>
              </div>

              {pathRes && (
                <div className="mt-4 bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Path Total Pressure</span>
                  <span className={`text-lg font-mono font-bold ${isCritical ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {(pathRes.totalPressure || 0).toFixed(2)} <span className="text-[10px]">{pressUnit}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addPath} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center">
          <Plus className="w-4 h-4 mr-2" /> Add Parallel Path
        </button>
      </div>

      {/* Results */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center">
            <Activity className="w-4 h-4 mr-2 text-emerald-400" />
            Fan Duty Selection
          </h3>
          <button
            type="button"
            id="export-static-pressure-csv-btn"
            onClick={() => {
              exportStaticPressureToCsv({
                isMetric,
                density,
                roughness,
                safetyFactor,
                criticalPathId: result.criticalPathId,
                criticalPathName: criticalPath?.name || 'Main Run',
                maxPressure: result.maxPressure,
                designPressure,
                maxPathAirflow,
                paths: paths.map(p => {
                  const pRes = result.paths.find(r => r.pathId === p.id);
                  return {
                    name: p.name,
                    isCritical: p.id === result.criticalPathId,
                    sections: p.sections.map(s => {
                      const sRes = pRes?.sections.find(sx => sx.sectionId === s.id);
                      return {
                        name: s.name,
                        airflow: s.airflow,
                        shape: s.diameter !== undefined ? 'round' : 'rect',
                        dimensions: s.diameter !== undefined ? `Ø${s.diameter}${dimUnit}` : `${s.width}x${s.height}${dimUnit}`,
                        length: s.length,
                        fittingLossCoeff: s.fittingLossCoeff,
                        equipmentLoss: s.equipmentLoss,
                        frictionLoss: sRes?.frictionLoss || 0,
                        totalLoss: sRes?.totalLoss || 0
                      };
                    })
                  };
                })
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Export static pressure calculation and duct run schedule to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/50 p-6 rounded-xl border border-emerald-900/30 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 z-10">Design Static Pressure</p>
            <p className="text-5xl font-black text-white font-mono tracking-tight drop-shadow-md z-10">
              {(designPressure || 0).toFixed(2)}
            </p>
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mt-1 z-10">{pressUnit}</p>
            
            <div className="mt-4 pt-4 border-t border-slate-800/60 z-10 space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Critical Path SP</span>
                <span className="font-mono">{(result.maxPressure || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Safety Allowance</span>
                <span className="font-mono">+ {safetyFactor}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800/50 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Design Airflow (Max Path Flow)</p>
            <p className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
              {Math.ceil(maxPathAirflow).toLocaleString()}
              <span className="text-sm font-bold text-slate-500 ml-2">{flowUnit}</span>
            </p>
            <p className="text-[10px] text-amber-400 mt-4 leading-relaxed">
              Final fan selection must be checked against the manufacturer's fan curve at actual density conditions.
            </p>
          </div>
        </div>
      </div>

      {fittingSelectorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center">
                <GitBranch className="w-4 h-4 mr-2 text-sky-400" />
                Select ASHRAE Fitting
              </h3>
              <button onClick={() => setFittingSelectorOpen(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-2 p-2">
                {ASHRAE_FITTINGS_DB.map(fit => (
                  <button 
                    key={fit.id}
                    onClick={() => {
                      const path = paths.find(p => p.id === fittingSelectorOpen.pathId);
                      if (path) {
                        const sec = path.sections.find(s => s.id === fittingSelectorOpen.sectionId);
                        if (sec) {
                          updateSection(path.id, sec.id, 'fittingLossCoeff', Number(((sec.fittingLossCoeff + fit.lossCoefficient) || 0).toFixed(2)));
                        }
                      }
                      setFittingSelectorOpen(null);
                    }}
                    className="flex justify-between items-center text-left bg-slate-950 hover:bg-slate-800 p-3 rounded-lg border border-slate-800 hover:border-sky-500/50 transition-colors"
                  >
                    <div>
                      <span className="block text-xs font-bold text-white mb-0.5">{fit.name}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">{fit.id} | {fit.description}</span>
                    </div>
                    <div className="text-sky-400 font-mono font-bold text-sm bg-sky-950/30 px-2 py-1 rounded">
                      C = {fit.lossCoefficient}
                    </div>
                  </button>
                ))}
              </div>
            </div>
                    </div>
        </div>
      )}
    </div>
  );
}
