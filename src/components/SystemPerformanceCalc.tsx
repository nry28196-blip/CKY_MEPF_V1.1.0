import { DensityCorrectionService } from '../lib/DensityCorrectionService';
import React, { useState, useEffect } from 'react';
import { Activity, Fan, Wind, Gauge, Zap } from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import { UnitConversionService } from '../lib/UnitConversionService';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { SystemPerformanceService, SystemPerformanceInput, SystemPerformanceResult } from '../calculations/ventilation/SystemPerformanceService';
import ValidatedInput from './ValidatedInput';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

export default function SystemPerformanceCalc({ globalAltitude = 0, globalAirTemp = 20, qOutdoorAirProp }: { globalAltitude?: number, globalAirTemp?: number, qOutdoorAirProp?: number }) {
  const { unitSystem } = useUnit();

  useEffect(() => {
    scrollWorkspaceToTop();
  }, []);
  const isMetric = unitSystem === 'metric';

  const flowUnit = isMetric ? 'L/s' : 'CFM';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const pressureUnit = isMetric ? 'Pa' : 'in.wg.';
  const frictionUnit = isMetric ? 'Pa/m' : 'in.wg./100ft';
  const powerUnit = isMetric ? 'kW' : 'HP';

  // State
  const [qOutdoorAir, setQOutdoorAir] = useState<number>(qOutdoorAirProp ?? (isMetric ? 500 : 1000));
  
  React.useEffect(() => {
    if (qOutdoorAirProp !== undefined) {
      setQOutdoorAir(qOutdoorAirProp);
    }
  }, [qOutdoorAirProp]);
  const [qReturnAir, setQReturnAir] = useState<number>(isMetric ? 1500 : 3000);
      
  const [criticalDuctLength, setCriticalDuctLength] = useState<number>(isMetric ? 30 : 100);
  const [ductFrictionRate, setDuctFrictionRate] = useState<number>(isMetric ? 1.0 : 0.1);
  const [fittingLosses, setFittingLosses] = useState<number>(isMetric ? 125 : 0.5);
  const [equipmentPressureDrop, setEquipmentPressureDrop] = useState<number>(isMetric ? 250 : 1.0);
  
  const [fanEfficiency, setFanEfficiency] = useState<number>(65);
  const [motorEfficiency, setMotorEfficiency] = useState<number>(85);

  // Density logic
  const altMeters = isMetric ? globalAltitude : UnitConversionService.ftToM(globalAltitude);
  const tempC = isMetric ? globalAirTemp : UnitConversionService.fToC(globalAirTemp);
  const densityRatio = DensityCorrectionService.getAirProperties(altMeters, tempC, 50).densityRatio;

  const input: SystemPerformanceInput = {
    qOutdoorAir,
    qReturnAir,
    densityRatio,
    criticalDuctLength,
    ductFrictionRate,
    fittingLosses,
    equipmentPressureDrop,
    fanEfficiency: fanEfficiency / 100,
    motorEfficiency: motorEfficiency / 100,
    isMetric
  };

  const result: SystemPerformanceResult = SystemPerformanceService.calculateFanPerformance(input);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Utility Basis: Fan & Duct Aerodynamic Estimator (Non-ASHRAE 62.1 Compliance Procedure)
        </div>
      </div>

      <EngineeringStatusHeader 
        status="NOT_READY_FOR_ENGINEERING_USE" 
        message="Engineering Diagnostic Utility: Estimates aerodynamic pressure drop and fan duty point. This is an equipment/distribution sizing tool, not an ANSI/ASHRAE Standard 62.1 ventilation compliance path."
        className="mb-4"
      />

      {result.reasons.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Invalid Engineering Input(s):</p>
          {result.reasons.map((r, i) => (
            <p key={i} className="text-xs text-rose-300 font-mono">• {r}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Airflow & Environment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
            <Wind className="w-4 h-4 mr-2 text-sky-400" />
            Airflow & Environment
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Outdoor Air ({flowUnit})</label>
              <ValidatedInput type="number" min={0} errorMsg="Flow rate must be >= 0" value={qOutdoorAir} onChange={(e) => setQOutdoorAir(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Return Air ({flowUnit})</label>
              <ValidatedInput type="number" min={0} errorMsg="Flow rate must be >= 0" value={qReturnAir} onChange={(e) => setQReturnAir(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2">Density Ratio (Eρ): {(densityRatio || 0).toFixed(3)}</p>
        </div>

        {/* Duct Network & Static Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
            <Gauge className="w-4 h-4 mr-2 text-indigo-400" />
            Duct Network & Critical Path
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label={`Critical Length (${lengthUnit})`} tooltip="The longest or most hydraulically restrictive duct run from the fan to the furthest terminal." />
              <ValidatedInput type="number" min={1} errorMsg="Length must be >= 1" value={criticalDuctLength} onChange={(e) => setCriticalDuctLength(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label={`Friction (${frictionUnit})`} tooltip="Design friction loss rate per unit length of duct (e.g., typically 0.1 in.wg/100ft or 1.0 Pa/m)." />
              <ValidatedInput type="number" step="0.01" min={0.01} max={5} errorMsg="Standard friction: 0.01 to 5.0" value={ductFrictionRate} onChange={(e) => setDuctFrictionRate(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label={`Fitting Loss (${pressureUnit})`} tooltip="Sum of dynamic pressure drops through all fittings (elbows, transitions) in the critical path." />
              <ValidatedInput type="number" step="0.1" min={0} errorMsg="Loss must be >= 0" value={fittingLosses} onChange={(e) => setFittingLosses(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label={`Equip. Drop (${pressureUnit})`} tooltip="Internal pressure drop of the air handling unit (coils, filters, dampers) at design airflow." />
              <ValidatedInput type="number" step="0.1" min={0} errorMsg="Pressure drop must be >= 0" value={equipmentPressureDrop} onChange={(e) => setEquipmentPressureDrop(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Efficiency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 h-full">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-amber-400" />
            Fan & Motor Efficiency
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Fan Eff. (%)" tooltip="Aerodynamic efficiency of the fan impeller/housing." />
              <ValidatedInput type="number" min={1} max={100} errorMsg="Efficiency: 1% to 100%" value={fanEfficiency} onChange={(e) => setFanEfficiency(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Motor Eff. (%)" tooltip="Electrical to mechanical conversion efficiency of the fan motor." />
              <ValidatedInput type="number" min={1} max={100} errorMsg="Efficiency: 1% to 100%" value={motorEfficiency} onChange={(e) => setMotorEfficiency(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center relative z-10">
            <Activity className="w-4 h-4 mr-2 text-indigo-400" />
            System Duty Point
          </h3>
          <div className="space-y-4 relative z-10">
            
            <div className="grid grid-cols-2 gap-4 border-b border-slate-800/60 pb-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Standard Airflow</p>
                <p className="text-xl font-mono text-slate-300 font-bold">{result.qSupplyStandard !== null ? `${Math.round(result.qSupplyStandard).toLocaleString()} ` : '— '}<span className="text-sm font-sans font-normal text-slate-500">{flowUnit}</span></p>
              </div>
              <div>
                <p className="text-xs text-sky-400 font-bold uppercase mb-1">Actual Airflow (Eρ Corrected)</p>
                <p className="text-xl font-mono text-white font-bold">{result.qSupplyActual !== null ? `${Math.round(result.qSupplyActual).toLocaleString()} ` : '— '}<span className="text-sm font-sans font-normal text-sky-400/70">{flowUnit}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-800/60 pb-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Static Pressure (SP)</p>
                <p className="text-xl font-mono text-white font-bold">{result.totalStaticPressure !== null ? result.totalStaticPressure.toFixed(2) : '—'} <span className="text-sm font-sans font-normal text-slate-500">{pressureUnit}</span></p>
              </div>
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase mb-1">Fan Power ({isMetric ? "kW" : "BHP"})</p>
                <p className="text-xl font-mono text-white font-bold">{result.fanBrakeHorsepower !== null ? result.fanBrakeHorsepower.toFixed(2) : '—'} <span className="text-sm font-sans font-normal text-amber-500/70">{powerUnit}</span></p>
              </div>
            </div>

            <div>
              <p className="text-xs text-emerald-400 font-bold uppercase mb-1">Motor Electrical Duty</p>
              <p className="text-3xl font-black font-mono tracking-tight text-white">{result.motorElectricalPower !== null ? result.motorElectricalPower.toFixed(2) : '—'} <span className="text-lg font-sans font-bold text-emerald-400/80">kW</span></p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
