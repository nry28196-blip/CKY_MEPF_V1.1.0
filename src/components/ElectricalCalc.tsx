import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, ShieldCheck, Cpu, Bookmark, CheckCircle2, FileSpreadsheet, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import TrendVisualizer from './TrendVisualizer';
import UpsSizingCalc from './UpsSizingCalc';
import ElvUpsSizingCalc from './ElvUpsSizingCalc';
import PowerEquipmentTable, { PowerEquipment } from './PowerEquipmentTable';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import InputAlert from './InputAlert';
import { useLanguage } from '../lib/translations';
import { exportElectricalToCsv } from '../lib/exportCsv';
import FormulaVisualizer from './FormulaVisualizer';
import InteractiveFormulaReferenceCard from './InteractiveFormulaReferenceCard';
import VoltageDropCalc from './VoltageDropCalc';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

interface ElectricalCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
  activeSubTab?: SubTab;
  onSubTabChange?: (subTab: SubTab) => void;
}

type SubTab = 'flc' | 'vd' | 'ups' | 'elv_ups' | 'formulas';

export default function ElectricalCalc({ restoredParams, onSaveCalculation, autoCalculate = true, activeSubTab, onSubTabChange }: ElectricalCalcProps) {
  const { t } = useLanguage();
  const [power, setPower] = useState<number | ''>(15);
  const [voltage, setVoltage] = useState<number>(400);
  const [powerFactor, setPowerFactor] = useState<number>(0.85);
  const [phase, setPhase] = useState<'single' | 'three'>('three');
  const [inputMode, setInputMode] = useState<'single' | 'multiple'>('single');
  const [equipments, setEquipments] = useState<PowerEquipment[]>([
    { id: '1', name: 'Main Chiller', power: 15, qty: 1 }
  ]);
  const [subTab, setSubTab] = useState<SubTab>(activeSubTab || 'flc');

  useEffect(() => {
    if (activeSubTab && activeSubTab !== subTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const onSubTabChangeRef = React.useRef(onSubTabChange);
  useEffect(() => {
    onSubTabChangeRef.current = onSubTabChange;
  });

  const prevSubTabRef = React.useRef(subTab);
  useEffect(() => {
    scrollWorkspaceToTop();
    if (prevSubTabRef.current !== subTab) {
      prevSubTabRef.current = subTab;
      onSubTabChangeRef.current?.(subTab);
    }
  }, [subTab]);
  const [projectType, setProjectType] = useState<'Commercial' | 'Residential' | 'Industrial' | 'Healthcare'>('Commercial');
  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Decoupled applied states
  const [appliedPower, setAppliedPower] = useState<number | ''>(15);
  const [appliedVoltage, setAppliedVoltage] = useState<number>(400);
  const [appliedPowerFactor, setAppliedPowerFactor] = useState<number>(0.85);
  const [appliedPhase, setAppliedPhase] = useState<'single' | 'three'>('three');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state automatically when autoCalculate is true
  useEffect(() => {
    if (autoCalculate) {
      setAppliedPower(power);
      setAppliedVoltage(voltage);
      setAppliedPowerFactor(powerFactor);
      setAppliedPhase(phase);
    }
  }, [autoCalculate, power, voltage, powerFactor, phase]);

  useEffect(() => {
    if (restoredParams && restoredParams.tab === 'electrical' && restoredParams.id !== loadedHistoryId) {
      if (restoredParams.subType) setSubTab(restoredParams.subType);

      setLoadedHistoryId(restoredParams.id);
      const p = restoredParams.parameters;
      if (p) {
        if (p.power !== undefined) { setPower(p.power); setAppliedPower(p.power); }
        if (p.voltage !== undefined) { setVoltage(p.voltage); setAppliedVoltage(p.voltage); }
        if (p.powerFactor !== undefined) { setPowerFactor(p.powerFactor); setAppliedPowerFactor(p.powerFactor); }
        if (p.phase !== undefined) { setPhase(p.phase); setAppliedPhase(p.phase); }
        triggerToast('Electrical parameters loaded!');
      }
    }
  }, [restoredParams, loadedHistoryId]);

  const calculateCurrent = () => {
    const p = Number(appliedPower) || 0;
    
    if (p <= 0 || appliedVoltage <= 0 || appliedPowerFactor <= 0) return 0;
    
    if (appliedPhase === 'three') {
      // I = P(kW) * 1000 / (V * PF * sqrt(3))
      return (p * 1000) / (appliedVoltage * appliedPowerFactor * Math.sqrt(3));
    } else {
      // I = P(kW) * 1000 / (V * PF)
      return (p * 1000) / (appliedVoltage * appliedPowerFactor);
    }
  };

  const current = calculateCurrent();

  const hasPendingChanges = !autoCalculate && (
    power !== appliedPower ||
    voltage !== appliedVoltage ||
    powerFactor !== appliedPowerFactor ||
    phase !== appliedPhase
  );

  const handleApplyCalculations = () => {
    setAppliedPower(power);
    setAppliedVoltage(voltage);
    setAppliedPowerFactor(powerFactor);
    setAppliedPhase(phase);
    triggerToast('Calculations updated!');
  };

  // Rough wire sizing estimate (Copper, XLPE, in air) - very simplified
  const estimateBreaker = (amps: number) => {
    if (amps <= 0) return 0;
    const standardBreakers = [10, 16, 20, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 630];
    const target = amps * 1.25; // 125% rule
    return standardBreakers.find(b => b >= target) || 'Custom';
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-800 pb-1 gap-2">
        <button
          onClick={() => setSubTab('flc')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === 'flc'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Load Current
        </button>
        <button
          onClick={() => setSubTab('vd')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === 'vd'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Voltage Drop & Cables
        </button>
        <button
          onClick={() => setSubTab('ups')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === 'ups'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          UPS Sizing
        </button>
        <button
          onClick={() => setSubTab('elv_ups')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === 'elv_ups'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          UPS for ELV Systems
        </button>
        <button
          onClick={() => setSubTab('formulas')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === 'formulas'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Formulas
        </button>
      </div>

      {subTab === 'formulas' ? (
        <InteractiveFormulaReferenceCard activeTab="electrical" defaultExpanded={true} />
      ) : subTab === 'ups' ? (
        <UpsSizingCalc restoredParams={restoredParams} onSaveCalculation={onSaveCalculation} autoCalculate={autoCalculate} />
      ) : subTab === 'elv_ups' ? (
        <ElvUpsSizingCalc restoredParams={restoredParams} onSaveCalculation={onSaveCalculation} autoCalculate={autoCalculate} />
      ) : subTab === 'vd' ? (
        <VoltageDropCalc />
      ) : (
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
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">Load Current & Breaker Solver</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculate full load current (FLC) and estimate standard overcurrent protection sizes.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 rounded-full font-mono">
          <Zap className="h-3.5 w-3.5" />
          <span>Ohm's & Kirchhoff's Law Solver</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Card: Inputs */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-5 google-pro-border-amber">
          <div className="flex items-center space-x-2 mb-2 border-b border-slate-800 pb-3">
            <Cpu className="h-4.5 w-4.5 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">Circuit Specifications</h3>
          </div>

          <div>
            <TooltipLabel 
              label="System Phase"
              tooltip={t("phaseTooltip")}
              className="block text-xs font-semibold text-slate-400 mb-2 uppercase" 
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setPhase('single'); setVoltage(230); }}
                className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                  phase === 'single'
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/20'
                    : 'bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300'
                }`}
              >
                1-Phase (230V)
              </button>
              <button
                type="button"
                onClick={() => { setPhase('three'); setVoltage(400); }}
                className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                  phase === 'three'
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/20'
                    : 'bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300'
                }`}
              >
                3-Phase (400V)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <TooltipLabel 
                label="Load Power Input"
                tooltip={t("loadPowerTooltip")}
                className="block text-xs font-semibold text-slate-400 uppercase" 
              />
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
              <div>
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  value={power}
                  onChange={(e) => setPower(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g., 15"
                  className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors border ${
                    power !== '' && (Number(power) < 0.1 || Number(power) > 1000)
                      ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                      : 'border-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500'
                  } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                />
              </div>
            ) : (
              <PowerEquipmentTable 
                equipmentList={equipments} 
                onChange={setEquipments} 
                onTotalChange={setPower} 
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <TooltipLabel 
                label="Voltage (V)"
                tooltip={phase === 'three' ? t("voltageTooltipThree") : t("voltageTooltipSingle")}
                className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase" 
              />
              <input
                type="number"
                min="100"
                max="1000"
                value={voltage || ''}
                onChange={(e) => setVoltage(e.target.value === '' ? 0 : Number(e.target.value))}
                className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors border ${
                  voltage !== 0 && (voltage < 100 || voltage > 1000)
                    ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                    : 'border-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500'
                } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
              />
              {voltage !== 0 && (voltage < 100 || voltage > 1000) && (
                <InputAlert type="error" message="Safe range: 100 to 1,000 V" />
              )}
            </div>
            <div>
              <TooltipLabel 
                label="Power Factor (cos φ)"
                tooltip={t("pfTooltip")}
                className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase" 
              />
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1"
                value={powerFactor || ''}
                onChange={(e) => setPowerFactor(e.target.value === '' ? 0 : Number(e.target.value))}
                className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors border ${
                  powerFactor !== 0 && (powerFactor < 0.5 || powerFactor > 1.0)
                    ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                    : powerFactor !== 0 && ((projectType === 'Residential' && powerFactor < 0.9) || (projectType === 'Industrial' && powerFactor > 0.95) || ((projectType === 'Commercial' || projectType === 'Healthcare') && powerFactor < 0.85))
                    ? 'border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 text-amber-200'
                    : 'border-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500'
                } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
              />
              {powerFactor !== 0 && (powerFactor < 0.5 || powerFactor > 1.0) && (
                <InputAlert type="error" message="Safe range: 0.5 to 1.0" />
              )}
              {powerFactor !== 0 && powerFactor >= 0.5 && powerFactor <= 1.0 && (
                <div className="mt-1">
                  {projectType === 'Residential' && powerFactor < 0.9 && <InputAlert type="warning" message="Typical residential is ≥ 0.90" />}
                  {projectType === 'Industrial' && powerFactor > 0.95 && <InputAlert type="warning" message="Typical industrial is ≤ 0.95 without correction" />}
                  {(projectType === 'Commercial' || projectType === 'Healthcare') && powerFactor < 0.85 && <InputAlert type="warning" message="Typical commercial is ≥ 0.85" />}
                </div>
              )}
            </div>
          </div>

          {!autoCalculate && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleApplyCalculations}
                disabled={!hasPendingChanges}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  hasPendingChanges
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                }`}
              >
                <span>{hasPendingChanges ? 'Apply & Calculate' : 'Calculations Up To Date'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Card: Outputs */}
        <motion.div
          key={`${(current || 0).toFixed(4)}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-center space-y-6 relative overflow-hidden google-pro-border-amber"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2">Load FLC Calculations</h3>
          
          <div className="space-y-6">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Calculated Full Load Current (FLC)</span>
              <p className="text-4xl font-black text-white mt-1.5 font-mono">
                {current > 0 ? (current || 0).toFixed(2) : '0.00'}{' '}
                <span className="text-base font-normal text-slate-400">Amperes (A)</span>
              </p>
            </div>

            <div className="pt-5 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Recommended Breaker Size</span>
                  <p className="text-2xl font-bold text-amber-300 mt-1 font-mono">
                    {current > 0 ? estimateBreaker(current) : '0'}{' '}
                    <span className="text-xs font-semibold text-slate-400">Amps (MCB/MCCB)</span>
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-950/20 border border-amber-900/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-start space-x-1.5 text-[10px] text-slate-500 bg-slate-950/40 p-2 rounded border border-slate-850">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>
                  Estimated at 125% continuous load safety factor. Wire sizing depends on routing context, insulation rating, and thermal correction factors.
                </span>
              </div>
            </div>

            {current > 0 && (
              <div className="pt-4 border-t border-slate-800 mb-6">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Power Triangle Breakdown</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Active Power (kW)', value: Number(appliedPower) || 0 },
                      { name: 'Apparent Power (kVA)', value: parseFloat(((Number(appliedPower) || 0) / (appliedPowerFactor || 1)).toFixed(2)) }
                    ]} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={120} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                        formatter={(value) => [`${value}`, 'Power']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {
                          [0,1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6'][index]} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (onSaveCalculation) {
                    const pNum = Number(power) || 0;
                    onSaveCalculation({
                      tab: 'electrical',
                      title: `Electrical FLC (${pNum} kW)`,
                      summary: `${pNum} kW | ${phase === 'three' ? '3-Phase' : '1-Phase'} | ${(current || 0).toFixed(1)} A`,
                      parameters: { power: pNum, voltage, powerFactor, phase }
                    });
                    triggerToast(t('toastCalculationSaved'));
                  }
                }}
                className="flex-1 flex items-center justify-center space-x-2 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Bookmark className="h-4 w-4" />
                <span>{t('saveCalculation')}</span>
              </button>
              <button
                onClick={() => {
                  const pNum = Number(power) || 0;
                  exportElectricalToCsv({
                    power: pNum,
                    voltage,
                    powerFactor,
                    phase,
                    current,
                    breaker: Number(estimateBreaker(current)) || 0
                  });
                  triggerToast('Electrical calculations exported!');
                }}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                <span>{t('exportCsv')}</span>
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`CKY_MEPF - Electrical Load Estimate Report`);
                  const body = encodeURIComponent(
                    `Dear Team,\n\nHere is the Electrical Load Estimate Report generated from CKY_MEPF:\n\n` +
                    `- Load Power: ${power} kW\n` +
                    `- System Phase: ${phase === 'three' ? '3-Phase (400V)' : '1-Phase (230V)'}\n` +
                    `- Voltage: ${voltage} V\n` +
                    `- Power Factor: ${powerFactor} (cos φ)\n` +
                    `- Calculated Full Load Current (FLC): ${(current || 0).toFixed(2)} A\n` +
                    `- Recommended Breaker Size: ${estimateBreaker(current)} Amps (MCB/MCCB)\n\n` +
                    `Generated on ${new Date().toLocaleString()}\n` +
                    `Regards,\n` +
                    `Design Team`
                  );
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Mail className="h-4 w-4 text-amber-400" />
                <span>{t('shareEmail')}</span>
              </button>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Interactive Trend Chart Section */}
      <TrendVisualizer 
        type="electrical" 
        currentParams={{
          power: appliedPower,
          voltage: appliedVoltage,
          powerFactor: appliedPowerFactor,
          phase: appliedPhase
        }} 
      />
    </div>
    )}
    </div>
  );
}