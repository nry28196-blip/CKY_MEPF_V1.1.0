import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Settings, ShieldCheck, Cpu, Bookmark, CheckCircle2, FileSpreadsheet, BatteryCharging } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useLanguage } from '../lib/translations';
import PowerEquipmentTable, { PowerEquipment } from './PowerEquipmentTable';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';

interface UpsSizingCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
}

export default function UpsSizingCalc({ restoredParams, onSaveCalculation, autoCalculate = true }: UpsSizingCalcProps) {
  const { t } = useLanguage();

  const [loadKw, setLoadKw] = useState<number>(10);
  const [inputMode, setInputMode] = useState<'single' | 'multiple'>('single');
  const [equipments, setEquipments] = useState<PowerEquipment[]>([
    { id: '1', name: 'Main Chiller', power: 10, qty: 1 }
  ]);
  const [loadPf, setLoadPf] = useState<number>(0.9);
  const [backupTime, setBackupTime] = useState<number>(30); // minutes
  const [batteryVoltage, setBatteryVoltage] = useState<number>(12); // V per block (typically 12)
  const [dcBusVoltage, setDcBusVoltage] = useState<number>(240); // DC Bus
  const [inverterEff, setInverterEff] = useState<number>(0.94);
  const [designMargin, setDesignMargin] = useState<number>(1.25); // 25% margin

  const [appliedLoadKw, setAppliedLoadKw] = useState<number>(10);
  const [appliedLoadPf, setAppliedLoadPf] = useState<number>(0.9);
  const [appliedBackupTime, setAppliedBackupTime] = useState<number>(30);
  const [appliedBatteryVoltage, setAppliedBatteryVoltage] = useState<number>(12);
  const [appliedDcBusVoltage, setAppliedDcBusVoltage] = useState<number>(240);
  const [appliedInverterEff, setAppliedInverterEff] = useState<number>(0.94);
  const [appliedDesignMargin, setAppliedDesignMargin] = useState<number>(1.25);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (autoCalculate) {
      setAppliedLoadKw(loadKw);
      setAppliedLoadPf(loadPf);
      setAppliedBackupTime(backupTime);
      setAppliedBatteryVoltage(batteryVoltage);
      setAppliedDcBusVoltage(dcBusVoltage);
      setAppliedInverterEff(inverterEff);
      setAppliedDesignMargin(designMargin);
    }
  }, [autoCalculate, loadKw, loadPf, backupTime, batteryVoltage, dcBusVoltage, inverterEff, designMargin]);

  // Calculations
  const calcResults = () => {
    const kva = appliedLoadKw / appliedLoadPf;
    const recommendedKva = kva * appliedDesignMargin;
    
    // Determine standard UPS size (kVA)
    const standardSizes = [1, 2, 3, 5, 6, 10, 15, 20, 30, 40, 60, 80, 100, 120, 160, 200, 250, 300, 400, 500];
    const standardUps = standardSizes.find(s => s >= recommendedKva) || recommendedKva;

    // Battery calculation
    const backupHours = appliedBackupTime / 60;
    // Ah = (Load kW * 1000 * hours) / (DC Bus Voltage * Efficiency)
    // Actually, more precisely Ah = (UPS Output kW * 1000 * backup hours) / (Vdc * Inverter Efficiency)
    const requiredAh = (appliedLoadKw * 1000 * backupHours) / (appliedDcBusVoltage * appliedInverterEff);
    
    // Standard Ah blocks
    const standardAhs = [7, 9, 12, 18, 26, 40, 65, 100, 120, 150, 200, 250];
    const stdAh = standardAhs.find(ah => ah >= requiredAh) || Math.ceil(requiredAh);

    // Number of batteries per string
    const blocksPerString = appliedDcBusVoltage / appliedBatteryVoltage;

    return {
      kva,
      recommendedKva,
      standardUps,
      requiredAh,
      stdAh,
      blocksPerString
    };
  };

  const results = calcResults();

  const handleApplyCalculations = () => {
    setAppliedLoadKw(loadKw);
    setAppliedLoadPf(loadPf);
    setAppliedBackupTime(backupTime);
    setAppliedBatteryVoltage(batteryVoltage);
    setAppliedDcBusVoltage(dcBusVoltage);
    setAppliedInverterEff(inverterEff);
    setAppliedDesignMargin(designMargin);
    triggerToast('UPS Calculations updated!');
  };

  const hasPendingChanges = !autoCalculate && (
    loadKw !== appliedLoadKw ||
    loadPf !== appliedLoadPf ||
    backupTime !== appliedBackupTime ||
    batteryVoltage !== appliedBatteryVoltage ||
    dcBusVoltage !== appliedDcBusVoltage ||
    inverterEff !== appliedInverterEff ||
    designMargin !== appliedDesignMargin
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-amber-500/50 text-amber-400 px-4 py-3 rounded-lg shadow-xl shadow-amber-950/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shadow-md shadow-amber-500/50" />
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">UPS & Battery Sizing</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculate Uninterruptible Power Supply capacity and battery requirements.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 rounded-full font-mono">
          <BatteryCharging className="h-3.5 w-3.5" />
          <span>UPS_ENGINE_v1.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden google-pro-gradient-border">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider">
              <Settings className="h-4 w-4 mr-2 text-amber-400" />
              Load & UPS Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Load Power (kW)
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded text-[10px] font-bold uppercase w-fit">
                    <button
                      type="button"
                      onClick={() => setInputMode('single')}
                      className={`px-2 py-1 rounded transition-all ${inputMode === 'single' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('multiple')}
                      className={`px-2 py-1 rounded transition-all ${inputMode === 'multiple' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      List
                    </button>
                  </div>
                </div>

                {inputMode === 'single' ? (
                  <div className="relative">
                    <input
                      type="number"
                    min="0.1"
                    max="10000"
                      value={loadKw ?? ""}
                      onChange={(e) => setLoadKw(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                    />
                  </div>
                ) : (
                  <PowerEquipmentTable 
                    equipmentList={equipments} 
                    onChange={setEquipments} 
                    onTotalChange={setLoadKw} 
                  />
                )}
              </div>

              <div>
                <TooltipLabel 
                  label="Load Power Factor"
                  tooltip={t("powerFactorTooltip")}
                  className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1" 
                />
                <div className="relative">
                  <input
                    type="number"
                    value={loadPf ?? ""}
                    onChange={(e) => setLoadPf(Number(e.target.value))}
                    step="0.01"
                    min="0.5"
                    max="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <TooltipLabel 
                  label="Design Margin (e.g. 1.25 for 25%)"
                  tooltip={t("safetyFactorTooltip")}
                  className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1" 
                />
                <div className="relative">
                  <input
                    type="number"
                    value={designMargin ?? ""}
                    onChange={(e) => setDesignMargin(Number(e.target.value))}
                    step="0.05"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider">
              <BatteryCharging className="h-4 w-4 mr-2 text-emerald-400" />
              Battery Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <TooltipLabel 
                  label="Backup Time (Minutes)"
                  tooltip={t("autonomyTooltip")}
                  className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1" 
                />
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={backupTime ?? ""}
                    onChange={(e) => setBackupTime(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    DC Bus (V)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                    min="12"
                    max="1000"
                      value={dcBusVoltage ?? ""}
                      onChange={(e) => setDcBusVoltage(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Inv. Efficiency
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                    min="0.5"
                    max="1"
                      value={inverterEff ?? ""}
                      onChange={(e) => setInverterEff(Number(e.target.value))}
                      step="0.01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {!autoCalculate && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleApplyCalculations}
              className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg transition-all ${
                hasPendingChanges 
                  ? 'bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-500' 
                  : 'bg-slate-800 text-slate-400 cursor-default'
              }`}
            >
              {hasPendingChanges ? 'Apply & Calculate' : 'Up to Date'}
            </motion.button>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          {/* Results Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required UPS Load</h4>
                <div className="bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-slate-700">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-light tracking-tight text-white font-mono">
                  {(results.kva || 0).toFixed(1)}
                </span>
                <span className="text-sm text-slate-500 font-bold mb-1">kVA</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-500">Design Capacity ({appliedDesignMargin}x)</span>
                <span className="text-slate-300 font-mono font-bold">{(results.recommendedKva || 0).toFixed(1)} kVA</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rec. Standard UPS Size</h4>
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
                <span className="text-slate-500">Industry Standard Rating</span>
                <span className="text-emerald-400 font-bold">Optimal</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider">
              <BatteryCharging className="h-4 w-4 mr-2 text-blue-400" />
              Battery Bank Sizing
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Required Capacity</div>
                <div className="text-xl font-mono text-slate-200">{(results.requiredAh || 0).toFixed(1)} <span className="text-xs text-slate-500">Ah</span></div>
              </div>
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 rounded-bl-full" />
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Select Standard Size</div>
                <div className="text-xl font-mono text-white font-bold">{results.stdAh} <span className="text-xs text-blue-400">Ah / Block</span></div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">String Configuration</div>
                <div className="text-xl font-mono text-slate-200">{Math.ceil(results.blocksPerString)} <span className="text-xs text-slate-500">Blocks</span></div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Battery sizing is estimated based on constant power discharge. Exact backup time depends on battery type (VRLA/Lithium), end-of-discharge voltage, and manufacturer-specific discharge curves. 
                <strong className="text-slate-300"> Recommended: {Math.ceil(results.blocksPerString)} units of {appliedBatteryVoltage}V / {results.stdAh}Ah batteries in series.</strong>
              </p>
            </div>
          </div>


          {/* Visual Chart for Load Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-wider border-b border-slate-800 pb-2">
              <Zap className="h-4 w-4 mr-2 text-amber-400" />
              UPS Load Distribution (kVA)
            </h3>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Active Load', value: parseFloat((results.kva || 0).toFixed(1)), fill: '#38bdf8' },
                  { name: 'Design Margin', value: parseFloat(((results.recommendedKva - results.kva) || 0).toFixed(1)), fill: '#fbbf24' },
                  { name: 'Unused Capacity', value: parseFloat(((results.standardUps - results.recommendedKva) || 0).toFixed(1)), fill: '#10b981' }
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
                      [0,1,2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#38bdf8', '#fbbf24', '#10b981'][index]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Audit Trail */}
          <div className="mt-6">
            <AuditTrailTable
              title="UPS & Battery Sizing Calculation Audit"
              codeReference="IEEE Standard 446 / 1184"
              trail={[
                { symbol: 'P_kw', name: 'Applied Load', value: appliedLoadKw, unit: 'kW' },
                { symbol: 'PF', name: 'Power Factor', value: appliedLoadPf, unit: '' },
                { symbol: 'S_kva', name: 'Apparent Power', formula: 'P_kw / PF', value: (results.kva || 0).toFixed(2), unit: 'kVA' },
                { symbol: 'M', name: 'Design Margin', value: appliedDesignMargin, unit: '' },
                { symbol: 'S_req', name: 'Required Capacity', formula: 'S_kva × M', value: (results.recommendedKva || 0).toFixed(2), unit: 'kVA' },
                { symbol: 't', name: 'Backup Time', value: appliedBackupTime, unit: 'min' },
                { symbol: 'V_dc', name: 'DC Bus Voltage', value: appliedDcBusVoltage, unit: 'V' },
                { symbol: 'η', name: 'Inverter Efficiency', value: appliedInverterEff, unit: '' },
                { symbol: 'C_ah', name: 'Required Battery Capacity', formula: '(P_kw × 1000 × (t/60)) / (V_dc × η)', value: (results.requiredAh || 0).toFixed(2), unit: 'Ah' },
                { symbol: 'N_blocks', name: 'Blocks per String', formula: 'V_dc / V_battery', value: results.blocksPerString, unit: 'blocks' }
              ]}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
