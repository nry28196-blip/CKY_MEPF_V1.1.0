import React, { useState } from 'react';
import { Zap, AlertTriangle, Info } from 'lucide-react';
import TooltipLabel from './TooltipLabel';
import InputAlert from './InputAlert';
import AuditTrailTable from './AuditTrailTable';

export default function VoltageDropCalc() {
  const [voltage, setVoltage] = useState(400);
  const [phase, setPhase] = useState<'single'|'three'>('three');
  const [current, setCurrent] = useState(100);
  const [length, setLength] = useState(50);
  const [cableResistance, setCableResistance] = useState(0.8); // ohms/km
  const [cableReactance, setCableReactance] = useState(0.08); // ohms/km
  const [powerFactor, setPowerFactor] = useState(0.85);

  const calculateVoltageDrop = () => {
    // Phase multiplier
    const multiplier = phase === 'single' ? 2 : Math.sqrt(3);
    
    // Z = R * cos(phi) + X * sin(phi)
    const acos = Math.acos(powerFactor);
    const sinPhi = Math.sin(acos);
    
    const impedance = (cableResistance * powerFactor) + (cableReactance * sinPhi);
    
    // VD = (multiplier * I * L * Z) / 1000
    // length is in meters, so /1000 converts to km
    const vd = (multiplier * current * length * impedance) / 1000;
    
    const percentage = (vd / voltage) * 100;
    
    return {
      vd,
      percentage
    };
  };

  const results = calculateVoltageDrop();
  const isHighDrop = results.percentage > 3;
  const isDangerDrop = results.percentage > 5;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-800 space-y-6">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2">Voltage Drop Calculator</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="System Voltage (V)" tooltip="Line-to-Line voltage for 3-phase, or Line-to-Neutral for 1-phase." />
                <input type="number" value={voltage} onChange={e => setVoltage(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Phase" tooltip="Determines the formula multiplier: 2 for 1-phase, √3 (1.732) for 3-phase." />
                <select value={phase} onChange={e => setPhase(e.target.value as any)} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none">
                  <option value="single">Single Phase</option>
                  <option value="three">Three Phase</option>
                </select>
              </div>
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Load Current (A)" tooltip="The continuous design load current flowing through the cable." />
                <input type="number" value={current} onChange={e => setCurrent(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Cable Length (m)" tooltip="One-way physical length of the cable run from source to load." />
                <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Resistance (Ω/km)" tooltip="AC resistance of the cable at operating temperature. Found in manufacturer datasheets." />
                <input type="number" step="0.01" value={cableResistance} onChange={e => setCableResistance(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Reactance (Ω/km)" tooltip="Inductive reactance of the cable. Crucial for larger cables (usually > 16mm²) where AC skin effect and induction matter." />
                <input type="number" step="0.01" value={cableReactance} onChange={e => setCableReactance(Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 outline-none" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Calculation Results</h4>
            
            <div className="space-y-4">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Voltage Drop</span>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-black font-mono leading-none ${isDangerDrop ? 'text-red-500' : isHighDrop ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(results.vd || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500 font-bold mb-1">V</span>
                </div>
              </div>
              
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Percentage Drop</span>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold font-mono leading-none ${isDangerDrop ? 'text-red-500' : isHighDrop ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(results.percentage || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500 font-bold mb-1">%</span>
                </div>
                {isDangerDrop && (
                  <div className="mt-2">
                    <InputAlert type="error" message="Voltage drop exceeds 5% maximum limit (NEC/IEC typical)." />
                  </div>
                )}
                {!isDangerDrop && isHighDrop && (
                  <div className="mt-2">
                    <InputAlert type="warning" message="Voltage drop exceeds 3% recommended for branch circuits." />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
          {/* Audit Trail */}
          <div className="mt-6 w-full">
            <AuditTrailTable
              title="Voltage Drop Calculation Audit"
              codeReference="NEC / IEC"
              trail={[
                { symbol: 'V', name: 'System Voltage', value: voltage, unit: 'V' },
                { symbol: 'I', name: 'Load Current', value: current, unit: 'A' },
                { symbol: 'L', name: 'Cable Length', value: length, unit: 'm' },
                { symbol: 'R', name: 'Resistance', value: cableResistance, unit: 'Ω/km' },
                { symbol: 'X', name: 'Reactance', value: cableReactance, unit: 'Ω/km' },
                { symbol: 'PF', name: 'Power Factor', value: powerFactor, unit: '' },
                { symbol: 'M', name: 'Phase Multiplier', value: phase === 'single' ? 2 : 1.732, unit: '' },
                { symbol: 'Z', name: 'Effective Impedance', formula: 'R×cos(φ) + X×sin(φ)', value: (((cableResistance * powerFactor) + (cableReactance * Math.sin(Math.acos(powerFactor)))) || 0).toFixed(4), unit: 'Ω/km' },
                { symbol: 'Vd', name: 'Voltage Drop', formula: '(M × I × L × Z) / 1000', value: (results.vd || 0).toFixed(2), unit: 'V', reference: 'Standard Equation' },
                { symbol: '%Vd', name: 'Percentage Drop', formula: '(Vd / V) × 100', value: (results.percentage || 0).toFixed(2), unit: '%' }
              ]}
            />
          </div>

      </div>
    </div>
  );
}
