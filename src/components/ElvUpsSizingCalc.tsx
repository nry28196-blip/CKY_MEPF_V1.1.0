import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, ShieldCheck, Cpu, Bookmark, CheckCircle2, FileSpreadsheet, Server, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useLanguage } from '../lib/translations';
import PowerEquipmentTable, { PowerEquipment } from './PowerEquipmentTable';

interface ElvUpsSizingCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
}

export default function ElvUpsSizingCalc({ restoredParams, onSaveCalculation, autoCalculate = true }: ElvUpsSizingCalcProps) {
  const { t } = useLanguage();
  const [loadWatts, setLoadWatts] = useState<number>(1500);
  const [equipments, setEquipments] = useState<PowerEquipment[]>([
    { id: '1', name: 'Network Switch (PoE)', power: 400, qty: 2 },
    { id: '2', name: 'NVR / Server', power: 500, qty: 1 },
    { id: '3', name: 'Access Control Controller', power: 100, qty: 2 }
  ]);

  const [loadPf, setLoadPf] = useState<number>(0.95);
  const [backupTime, setBackupTime] = useState<number>(15); // minutes
  const [designMargin, setDesignMargin] = useState<number>(1.25); // 25% margin

  const [appliedLoadWatts, setAppliedLoadWatts] = useState<number>(1500);
  const [appliedLoadPf, setAppliedLoadPf] = useState<number>(0.95);
  const [appliedBackupTime, setAppliedBackupTime] = useState<number>(15);
  const [appliedDesignMargin, setAppliedDesignMargin] = useState<number>(1.25);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (autoCalculate) {
      setAppliedLoadWatts(loadWatts);
      setAppliedLoadPf(loadPf);
      setAppliedBackupTime(backupTime);
      setAppliedDesignMargin(designMargin);
    }
  }, [autoCalculate, loadWatts, loadPf, backupTime, designMargin]);

  // Calculations
  const calcResults = () => {
    const kva = (appliedLoadWatts / 1000) / appliedLoadPf;
    const recommendedKva = kva * appliedDesignMargin;

    // Determine standard Rack-mount UPS size (kVA)
    const standardSizes = [0.5, 0.75, 1, 1.5, 2, 2.2, 3, 5, 6, 8, 10, 15, 20];
    const standardUps = standardSizes.find(s => s >= recommendedKva) || Math.ceil(recommendedKva);

    // Estimate Rack Units (RU)
    let ru = 2;
    if (standardUps <= 3) ru = 2;
    else if (standardUps <= 6) ru = 3;
    else if (standardUps <= 10) ru = 5; // Usually 3U UPS + 2U Battery
    else ru = Math.ceil(standardUps / 2) + 2;

    // Estimate battery required (simplified capacity for ELV small systems)
    // Most small UPS systems use 12V 7Ah or 9Ah blocks.
    const inverterEff = 0.9;
    const dcBusVoltage = standardUps <= 3 ? 72 : (standardUps <= 6 ? 192 : 240); // typical DC bus
    const backupHours = appliedBackupTime / 60;
    const requiredAh = (appliedLoadWatts * backupHours) / (dcBusVoltage * inverterEff);
    const standardAhs = [7, 9, 12, 18, 26, 40];
    const stdAh = standardAhs.find(ah => ah >= requiredAh) || Math.ceil(requiredAh);

    return {
      kva,
      recommendedKva,
      standardUps,
      ru,
      dcBusVoltage,
      requiredAh,
      stdAh
    };
  };

  const results = calcResults();

  const handleApplyCalculations = () => {
    setAppliedLoadWatts(loadWatts);
    setAppliedLoadPf(loadPf);
    setAppliedBackupTime(backupTime);
    setAppliedDesignMargin(designMargin);
    triggerToast('ELV UPS Calculations updated!');
  };

  const hasPendingChanges =
    loadWatts !== appliedLoadWatts ||
    loadPf !== appliedLoadPf ||
    backupTime !== appliedBackupTime ||
    designMargin !== appliedDesignMargin;

  // Handle total change from equipment table (kW to Watts)
  const handleTotalKwChange = (total: number) => {
    setLoadWatts(total);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-slate-100">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-lg shadow-xl flex items-center space-x-2 z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}


      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shadow-md shadow-indigo-500/50" />
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">UPS for ELV Systems</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculate Uninterruptible Power Supply capacity and battery requirements for ELV systems.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-900/50 px-3 py-1.5 rounded-full font-mono">
          <Server className="h-3.5 w-3.5" />
          <span>ELV_UPS_v1.0</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-6 w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider border-b border-slate-800 pb-2">
              <Server className="h-4 w-4 mr-2 text-indigo-400" />
              ELV Load Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Load Power
                  </label>
                </div>

                <PowerEquipmentTable
                  equipmentList={equipments}
                  onChange={setEquipments}
                  onTotalChange={handleTotalKwChange}
                  unit="W"
                  headerRight={
                    <>
                      <div className="flex items-center gap-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Design Margin
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.05"
                          value={designMargin ?? ""}
                          onChange={(e) => setDesignMargin(Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 mr-[30px] ml-0">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          PF
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.01"
                          value={loadPf ?? ""}
                          onChange={(e) => setLoadPf(Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                        />
                      </div>
                    </>
                  }
                />
              </div>




            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required UPS Load</h4>
                <div className="bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-slate-700">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-light tracking-tight text-white font-mono">
                  {(results.kva || 0).toFixed(2)}
                </span>
                <span className="text-sm text-slate-500 font-bold mb-1">kVA</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-500">Design Capacity ({appliedDesignMargin}x)</span>
                <span className="text-slate-300 font-mono font-bold">{(results.recommendedKva || 0).toFixed(2)} kVA</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rec. Rack UPS</h4>
                <div className="bg-emerald-950/50 text-emerald-400 p-1.5 rounded-lg border border-emerald-900/50">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-light tracking-tight text-white font-mono">
                  {results.standardUps}
                </span>
                <span className="text-sm text-slate-500 font-bold mb-1">kVA</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-500">Estimated Space</span>
                <span className="text-emerald-400 font-bold">{results.ru} RU (Rack Units)</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Minutes of Autonomy</h4>
                <div className="bg-amber-950/50 text-amber-400 p-1.5 rounded-lg border border-amber-900/50">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="relative mt-auto">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={backupTime ?? ""}
                  onChange={(e) => setBackupTime(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Minutes</div>
              </div>
            </div>
          </div>



          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider">
              <Server className="h-4 w-4 mr-2 text-indigo-400" />
              Battery Module Sizing (Estimates)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Nominal DC Bus Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nominal DC Bus</h4>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-light tracking-tight text-white font-mono">{results.dcBusVoltage}</span>
                  <span className="text-sm text-slate-500 font-bold mb-1">V</span>
                </div>
              </div>

              {/* Required Capacity Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required Capacity</h4>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-light tracking-tight text-white font-mono">{(results.requiredAh || 0).toFixed(1)}</span>
                  <span className="text-sm text-slate-500 font-bold mb-1">Ah</span>
                </div>
              </div>

              {/* Select Standard Block Card */}
              <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Select Standard Block</h4>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                  <span className="text-4xl font-light tracking-tight text-white font-mono">{results.stdAh}</span>
                  <span className="text-sm text-indigo-400 font-bold mb-1">Ah</span>
                </div>
              </div>

            </div>

            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Most rack-mount UPS units &lt;3kVA have internal batteries. Extended backup time may require external battery modules (EBM).
                <strong className="text-slate-300"> Rack Unit (RU) estimation includes typical EBM sizes for the requested backup time.</strong>
              </p>
            </div>
          </div>


          {!autoCalculate && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleApplyCalculations}
              className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg transition-all ${hasPendingChanges
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
                  : 'bg-slate-800 text-slate-400 cursor-default'
                }`}
            >
              {hasPendingChanges ? 'Apply & Calculate' : 'Up to Date'}
            </motion.button>
          )}
        </div>

        <div className="space-y-6 w-full">
          {/* Visual Chart for Load Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider border-b border-slate-800 pb-2">
              <Zap className="h-4 w-4 mr-2 text-indigo-400" />
              UPS Load Distribution (kVA)
            </h3>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Active Load', value: parseFloat((results.kva || 0).toFixed(2)), fill: '#6366f1' },
                  { name: 'Design Margin', value: parseFloat(((results.recommendedKva - results.kva) || 0).toFixed(2)), fill: '#818cf8' },
                  { name: 'Unused Capacity', value: parseFloat(((results.standardUps - results.recommendedKva) || 0).toFixed(2)), fill: '#10b981' }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                    formatter={(value) => [`${value} kVA`, 'Capacity']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {
                      [0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#818cf8', '#10b981'][index]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
