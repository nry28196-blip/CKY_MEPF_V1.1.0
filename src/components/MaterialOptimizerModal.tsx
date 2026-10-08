import React from 'react';
import { X, TrendingDown, DollarSign, Droplet, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SelectedFitting, FITTING_TYPES } from './PlumbingCalc';

interface MaterialOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  peakFlowLps: number;
  designVelocity: number;
  appliedPipeLength: number;
  appliedElevationChange: number;
  appliedAvailablePressure: number;
  appliedRequiredResidual: number;
  appliedFittings: SelectedFitting[];
  onSelectMaterial: (material: 'pvc' | 'copper' | 'steel') => void;
}

export default function MaterialOptimizerModal({
  isOpen,
  onClose,
  peakFlowLps,
  designVelocity,
  appliedPipeLength,
  appliedElevationChange,
  appliedAvailablePressure,
  appliedRequiredResidual,
  appliedFittings,
  onSelectMaterial
}: MaterialOptimizerModalProps) {
  

  const materials: { id: 'pvc'|'copper'|'steel', name: string, cFactor: number, costIndex: number, desc: string }[] = [
    { id: 'pvc', name: 'PVC / CPVC', cFactor: 150, costIndex: 1, desc: 'Lowest friction, lowest cost. Ideal for general cold water.' },
    { id: 'copper', name: 'Copper', cFactor: 140, costIndex: 3, desc: 'Moderate friction, high cost. Best for hot water & longevity.' },
    { id: 'steel', name: 'Steel / Galv.', cFactor: 120, costIndex: 2, desc: 'Highest friction, medium cost. Very durable but prone to scaling.' }
  ];

  const q_m3s = peakFlowLps / 1000;
  const sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200];
  const minVelocityDiaMm = Math.sqrt((4 * q_m3s) / (Math.PI * designVelocity)) * 1000;

  const getMaterialResult = (cFactor: number) => {
    for (const dia of sizes) {
      if (dia < minVelocityDiaMm) continue; 
      const d_m = dia / 1000;
      let equivFittings = 0;
      for (const fit of appliedFittings) {
        const type = FITTING_TYPES.find(t => t.id === fit.typeId);
        if (type) equivFittings += (fit.qty * type.ratio * d_m);
      }
      const totalLength = appliedPipeLength + equivFittings;
      const Hf = 10.67 * Math.pow(q_m3s, 1.85) / (Math.pow(cFactor, 1.85) * Math.pow(d_m, 4.87));
      const frictionLossM = Hf * totalLength;
      
      const totalHeadLossM = frictionLossM + appliedElevationChange;
      const totalHeadLossBar = totalHeadLossM / 10.197;
      
      const residualBar = appliedAvailablePressure - totalHeadLossBar;
      if (residualBar >= appliedRequiredResidual) {
        return {
          size: dia,
          frictionLossBar: ((frictionLossM / 10.197) || 0).toFixed(2),
          elevationLossBar: ((appliedElevationChange / 10.197) || 0).toFixed(2),
          residualBar: (residualBar || 0).toFixed(2),
          failed: false
        };
      }
    }
    
    // Failed to find size
    const maxDia = sizes[sizes.length - 1];
    const d_m = maxDia / 1000;
    let equivFittings = 0;
    for (const fit of appliedFittings) {
      const type = FITTING_TYPES.find(t => t.id === fit.typeId);
      if (type) equivFittings += (fit.qty * type.ratio * d_m);
    }
    const totalLength = appliedPipeLength + equivFittings;
    const Hf = 10.67 * Math.pow(q_m3s, 1.85) / (Math.pow(cFactor, 1.85) * Math.pow(d_m, 4.87));
    const totalHeadLossBar = (Hf * totalLength + appliedElevationChange) / 10.197;
    return {
      size: maxDia,
      frictionLossBar: ((Hf * totalLength / 10.197) || 0).toFixed(2),
      elevationLossBar: ((appliedElevationChange / 10.197) || 0).toFixed(2),
      residualBar: ((appliedAvailablePressure - totalHeadLossBar) || 0).toFixed(2),
      failed: true
    };
  };

  const results = materials.map(mat => {
    return {
      ...mat,
      result: getMaterialResult(mat.cFactor)
    };
  });
  
  // Find optimal (lowest cost index that doesn't fail, ties broken by smallest pipe size, then lowest friction)
  const validResults = results.filter(r => !r.result.failed);
  
  let optimalId = '';
  if (validResults.length > 0) {
    validResults.sort((a, b) => {
      if (a.result.size !== b.result.size) return a.result.size - b.result.size; // smaller pipe is cheaper
      if (a.costIndex !== b.costIndex) return a.costIndex - b.costIndex;
      return b.cFactor - a.cFactor; // higher C factor is better
    });
    optimalId = validResults[0].id;
  }
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Material Optimizer</h2>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Compare Head Loss & Budget</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs text-slate-300">
            <p>
              This tool simulates the exact hydraulic pressure constraints against different standard pipe materials. 
              Higher C-factors mean smoother pipes (less friction loss), which can sometimes allow you to downsize the pipe diameter and save money while still meeting the <strong className="text-white">Required Residual Pressure ({appliedRequiredResidual} bar)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map(mat => {
              const isOptimal = mat.id === optimalId;
              return (
                <div key={mat.id} className={`bg-slate-950 border rounded-xl overflow-hidden relative transition-colors ${
                  isOptimal ? 'border-indigo-500 ring-1 ring-indigo-500/50' : mat.result.failed ? 'border-red-900/50 opacity-80' : 'border-slate-800'
                }`}>
                  {isOptimal && (
                    <div className="absolute top-0 left-0 right-0 bg-indigo-600/90 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Recommended
                    </div>
                  )}
                  {mat.result.failed && (
                    <div className="absolute top-0 left-0 right-0 bg-red-950/80 text-red-400 text-[10px] font-bold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1 border-b border-red-900">
                      <AlertTriangle className="w-3 h-3" /> Insufficient Pressure
                    </div>
                  )}
                  
                  <div className={`p-4 ${isOptimal || mat.result.failed ? 'pt-8' : ''}`}>
                    <h3 className="text-lg font-bold text-white mb-1">{mat.name}</h3>
                    <p className="text-[10px] text-slate-400 leading-tight h-8 mb-3">{mat.desc}</p>
                    
                    <div className="flex gap-1 mb-4">
                      {Array.from({length: 3}).map((_, i) => (
                        <DollarSign key={i} className={`w-4 h-4 ${i < mat.costIndex ? 'text-emerald-400' : 'text-slate-800'}`} />
                      ))}
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">C-Factor</span>
                        <span className="text-xs text-white font-mono">{mat.cFactor}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Req. Size</span>
                        <span className={`text-xs font-mono font-bold ${mat.result.failed ? 'text-red-400' : 'text-cyan-400'}`}>DN{mat.result.size}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Friction Loss</span>
                        <span className="text-xs text-orange-400 font-mono">-{mat.result.frictionLossBar} bar</span>
                      </div>
                      {mat.result.elevationLossBar && Number(mat.result.elevationLossBar) !== 0 && (
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Elevation {Number(mat.result.elevationLossBar) < 0 ? 'Gain' : 'Loss'}</span>
                          <span className={`text-xs font-mono ${Number(mat.result.elevationLossBar) < 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                            {Number(mat.result.elevationLossBar) < 0 ? '+' : '-'}{(Math.abs(Number(mat.result.elevationLossBar)) || 0).toFixed(2)} bar
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Residual</span>
                        <span className={`text-xs font-mono font-bold ${mat.result.failed || Number(mat.result.residualBar) < appliedRequiredResidual ? 'text-red-400' : 'text-emerald-400'}`}>
                          {mat.result.residualBar} bar
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectMaterial(mat.id);
                        onClose();
                      }}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                        isOptimal 
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Use {mat.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
                      </div>
    </div>
  );
}
