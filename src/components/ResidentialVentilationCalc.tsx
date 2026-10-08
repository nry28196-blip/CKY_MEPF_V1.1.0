import React, { useState, useMemo } from 'react';
import { Home, Wind, CheckCircle2, AlertTriangle, Droplets, ChefHat, Activity, BookOpen, Info } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { Ashrae622Service } from '../calculations/ventilation/Ashrae622Service';
import { UnitConversionService, ft2ToM2 } from "../lib/UnitConversionService";
import { StandardDataProvider } from '../data/ventilation/StandardDataProvider';



export default function ResidentialVentilationCalc() {
  const { t } = useLanguage();
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';
  
  const [standard] = useState<'ASHRAE 62.2-2022'>('ASHRAE 62.2-2022');
  const edition = '2022';
  const [floorArea, setFloorArea] = useState<number>(isMetric ? 150 : 1500);
  const [bedrooms, setBedrooms] = useState<number>(3);
  
  const [qInf, setQInf] = useState<number | ''>('');
  const [infiltrationVerified, setInfiltrationVerified] = useState<boolean>(false);
  const [kitchenRequired, setKitchenRequired] = useState<number>(isMetric ? 25 : 50);
  const [kitchenInstalled, setKitchenInstalled] = useState<number>(0);
  const [bathRequired, setBathRequired] = useState<number>(isMetric ? 25 : 50);
  const [bathInstalled, setBathInstalled] = useState<number>(0);

  const engineResult = useMemo(() => {
    let areaM2 = isMetric ? floorArea : ft2ToM2(floorArea);
    let credit = qInf === '' ? null : qInf;
    if (credit !== null && !isMetric) credit = UnitConversionService.cfmToLs(credit);
    
    const coefficients = StandardDataProvider.getProduction622Coefficients();

    return Ashrae622Service.calculateWholeDwelling({
      floorArea: areaM2,
      bedrooms,
      infiltrationCredit: credit,
      infiltrationVerified,
      localExhaust: {
        kitchenRequired: isMetric ? kitchenRequired : UnitConversionService.cfmToLs(kitchenRequired),
        kitchenInstalled: isMetric ? kitchenInstalled : UnitConversionService.cfmToLs(kitchenInstalled),
        bathRequired: isMetric ? bathRequired : UnitConversionService.cfmToLs(bathRequired),
        bathInstalled: isMetric ? bathInstalled : UnitConversionService.cfmToLs(bathInstalled)
      },
      coefficients
    });
  }, [floorArea, bedrooms, qInf, infiltrationVerified, isMetric, kitchenRequired, kitchenInstalled, bathRequired, bathInstalled]);

  const flowUnit = isMetric ? 'L/s' : 'cfm';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Dwelling Unit Ventilation</h2>
          <div className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Calculation Basis: ASHRAE 62.2-2022
          </div>
        </div>
      </div>

      <EngineeringStatusHeader 
        status={engineResult.status} 
        message={`ASHRAE 62.2-2022 Whole-Dwelling - ${engineResult.status === 'PASS' ? 'Ventilation requirements met' : 'Check requirements'}`} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-cyan-400">
            <Home className="w-5 h-5" />
            <h3 className="font-semibold text-white">Dwelling Parameters</h3>
          </div>
          <div className="space-y-4">
            <div>
              <TooltipLabel label={`Floor Area (${isMetric ? 'm²' : 'ft²'})`} tooltip="Total conditioned area" />
              <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={floorArea} onChange={e => setFloorArea(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel label="Bedrooms" tooltip="Number of bedrooms" />
              <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Wind className="w-5 h-5" />
            <h3 className="font-semibold text-white">Infiltration Credit</h3>
          </div>
          <div className="space-y-4">
            <div>
              <TooltipLabel label={`Measured Infiltration (${flowUnit})`} tooltip="Effective infiltration rate Qinf" />
              <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={qInf} onChange={e => setQInf(e.target.value ? Number(e.target.value) : '')} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-cyan-500" checked={infiltrationVerified} onChange={e => setInfiltrationVerified(e.target.checked)} />
              Measurement verified by certified tester
            </label>
          </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <ChefHat className="w-5 h-5" />
            <h3 className="font-semibold text-white">Local Exhaust Deficit</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <TooltipLabel label={`Kit. Req (${flowUnit})`} tooltip="Kitchen Exhaust Required" />
                <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={kitchenRequired} onChange={e => setKitchenRequired(Number(e.target.value))} />
              </div>
              <div>
                <TooltipLabel label={`Kit. Inst (${flowUnit})`} tooltip="Kitchen Exhaust Installed" />
                <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={kitchenInstalled} onChange={e => setKitchenInstalled(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <TooltipLabel label={`Bath Req (${flowUnit})`} tooltip="Bathroom Exhaust Required" />
                <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={bathRequired} onChange={e => setBathRequired(Number(e.target.value))} />
              </div>
              <div>
                <TooltipLabel label={`Bath Inst (${flowUnit})`} tooltip="Bathroom Exhaust Installed" />
                <input type="number" className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800" value={bathInstalled} onChange={e => setBathInstalled(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center text-center">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Required Fan Airflow (Qfan)</h2>
        <div className="text-5xl font-black text-cyan-400 font-mono tracking-tight flex items-baseline gap-3">
          {engineResult.qFan === null ? '--' : (isMetric ? engineResult.qFan : UnitConversionService.lsToCfm(engineResult.qFan)).toFixed(1)}
          <span className="text-xl text-slate-500">{flowUnit}</span>
        </div>
        <p className="text-slate-500 text-sm mt-3 max-w-lg">
          Final required mechanical ventilation. Total required (Qtot) is {engineResult.qTot === null ? '--' : (isMetric ? engineResult.qTot : UnitConversionService.lsToCfm(engineResult.qTot)).toFixed(1)} {flowUnit}.
        </p>
      </div>
    </div>
  );
}
