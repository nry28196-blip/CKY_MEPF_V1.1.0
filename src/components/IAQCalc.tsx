import React, { useState } from 'react';
import { ShieldAlert, Wind, Ruler, Activity, CheckCircle2, Filter } from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import ValidatedInput from './ValidatedInput';
import TooltipLabel from './TooltipLabel';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { StandardDataProvider } from '../data/ventilation/StandardDataProvider';

const MERV_DATA = [
  { rating: '1-4', e1: 'n/a', e2: 'n/a', e3: '< 20%', app: 'Residential window AC' },
  { rating: '5-6', e1: 'n/a', e2: 'n/a', e3: '20-49%', app: 'Better residential, light commercial' },
  { rating: '7-8', e1: 'n/a', e2: 'n/a', e3: '50-84%', app: 'Commercial buildings (ASHRAE 62.1 Min)' },
  { rating: '9-10', e1: 'n/a', e2: '50-64%', e3: '85%+', app: 'Better commercial, lab basics' },
  { rating: '11-12', e1: '< 20%', e2: '65-79%', e3: '85%+', app: 'Superior commercial, PM2.5 nonattainment' },
  { rating: '13', e1: '50%', e2: '85%', e3: '90%+', app: 'Hospital inpatient, general surgery, LEED' },
  { rating: '14', e1: '75-84%', e2: '90%+', e3: '90%+', app: 'Hospital general surgery, clean rooms' },
  { rating: '15-16', e1: '85-95%+', e2: '90%+', e3: '90%+', app: 'Hospital inpatient, specialized clean rooms' },
  { rating: 'HEPA', e1: '> 99.97%', e2: '> 99.97%', e3: '> 99.97%', app: 'Cleanrooms, isolation rooms, hazardous' }
];

export default function IAQCalc() {

  const aqs = StandardDataProvider.getProduction621AirQualityStandards();
  const minMerv = aqs.filtrationRequirements.minimumMERV;
  const pm25Threshold = aqs.filtrationRequirements.pm25DesignThreshold;
  const exhaustClasses = aqs.exhaustClasses;


  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';
  const flowUnit = unitSystem === 'metric' ? 'L/s' : 'cfm';
  const lenUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const areaUnit = unitSystem === 'metric' ? 'm²' : 'ft²';

  // --- DCV & CO2 ---
  const [designPop, setDesignPop] = useState(100);
  const [dcvPop, setDcvPop] = useState(40);
  const [rp, setRp] = useState(isMetric ? 2.5 : 5);
  const [ra, setRa] = useState(isMetric ? 0.3 : 0.06);
  const [area, setArea] = useState(isMetric ? 100 : 1000);
  const [outdoorCO2, setOutdoorCO2] = useState(400); // ppm
  const [activityLevel, setActivityLevel] = useState(isMetric ? 0.005 : 0.0105); // L/s or cfm per person CO2 gen

  const designAirflow = (designPop * rp) + (area * ra);
  const dcvAirflow = (dcvPop * rp) + (area * ra);
  
  // Steady state CO2 ppm = Cout + (N * G) / Vo
  // Where G is generation rate.
  // We need to make sure Vo is in the same units as G, or apply conversion.
  // If Metric: G = L/s, Vo = L/s. If Imperial: G = cfm, Vo = cfm.
  // Formula works directly since N * (L/s) / (L/s) = dimensionless fraction. Multiply by 1,000,000 for ppm.
  const calcCO2 = (pop: number, airflow: number) => {
    if (airflow <= 0) return 9999;
    const fraction = (pop * activityLevel) / airflow;
    return outdoorCO2 + (fraction * 1000000);
  };

  const designCO2 = calcCO2(designPop, designAirflow);
  const dcvCO2 = calcCO2(dcvPop, dcvAirflow);
  const maxAllowedCO2 = outdoorCO2 + 700; // Typical ASHRAE guidance

  // --- Separation Distance ---
  const [exhaustSource, setExhaustSource] = useState('class2');
  const [outdoorAirType, setOutdoorAirType] = useState('intake');

  const getDistance = (source: string, oaType: string) => {
    // Returns [ft, m]
    const map: Record<string, [number, number]> = {
      'class1': [10, 3],
      'class2': [10, 3],
      'class3': [15, 4.5],
      'class4': [30, 9],
      'plumbing': [10, 3],
      'garage': [15, 4.5],
      'cooling_tower': [25, 7.5],
    };
    
    // Operable windows sometimes have different rules, but we'll stick to typical min distances for simplicity, 
    // or just return the standard table distance.
    const dists = map[source] || [10, 3];
    return isMetric ? dists[1] : dists[0];
  };

  const distance = getDistance(exhaustSource, outdoorAirType);

  // --- Filtration ---
  const [selectedMerv, setSelectedMerv] = useState('7-8');
  const currentMerv = MERV_DATA.find(m => m.rating === selectedMerv) || MERV_DATA[2];

  return (
    <div className="space-y-6 animate-fade-in">
      <EngineeringStatusHeader 
        status={dcvCO2 > maxAllowedCO2 ? 'WARNING' : 'READY'} 
        message={dcvCO2 > maxAllowedCO2 ? "Estimated CO₂ exceeds max allowable threshold." : "DCV calculations ready."}
        className="mb-4"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-emerald-400" />
            CO₂ / DCV Engineering Analysis
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Analyze Demand Controlled Ventilation, CO₂ concentrations, filtration efficacy, and separation distances.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DCV and CO2 Module */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-emerald-400" />
            Demand Control Ventilation (DCV) & CO₂
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Design Population" tooltip="Maximum expected occupancy. Sets the upper boundary for the CO2 concentration curve." />
              <ValidatedInput type="number" min={0} value={designPop} onChange={(e) => setDesignPop(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="DCV Current Population" tooltip="Actual current occupancy for Demand Controlled Ventilation. Dynamically impacts the allowable CO2 setpoint." />
              <ValidatedInput type="number" min={0} value={dcvPop} onChange={(e) => setDcvPop(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Area ({areaUnit})</label>
              <ValidatedInput type="number" min={0} value={area} onChange={(e) => setArea(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label={`CO₂ Generation Rate (${isMetric ? 'L/s/person' : 'cfm/person'})`} tooltip="Metabolic CO2 generation. Depends on the occupant activity level (e.g., resting, office work, heavy exercise per ASHRAE guidelines)." />
              <ValidatedInput type="number" min={0} step={0.001} value={activityLevel} onChange={(e) => setActivityLevel(Number(e.target.value))} />
            </div>
            <div>
              <TooltipLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" label="Outdoor CO₂ (ppm)" tooltip="Baseline outdoor ambient CO2 concentration. Typically 400-500 ppm in urban areas." />
              <ValidatedInput type="number" min={300} value={outdoorCO2} onChange={(e) => setOutdoorCO2(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Design State (Max Occupancy)</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-300">Required Airflow</span>
                <span className="text-sm font-mono font-bold text-white">{!isNaN(designAirflow) ? designAirflow.toFixed(1) : '--'} {flowUnit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Est. Indoor CO₂</span>
                <span className={`text-sm font-mono font-bold ${designCO2 > maxAllowedCO2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.round(designCO2)} ppm
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-emerald-900/30">
              <h4 className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mb-3">DCV State (Current Occupancy)</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-300">DCV Airflow</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{dcvAirflow !== null && !isNaN(dcvAirflow) ? dcvAirflow.toFixed(1) : '--'} {flowUnit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Est. Indoor CO₂</span>
                <span className={`text-sm font-mono font-bold ${dcvCO2 > maxAllowedCO2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.round(dcvCO2)} ppm
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
             <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">DCV Airflow Reduction</span>
             <span className="text-xl font-black text-emerald-400">
               {designAirflow > 0 && !isNaN(dcvAirflow) ? (((designAirflow - dcvAirflow) / designAirflow) * 100).toFixed(1) : '--'}%
             </span>
          </div>
        </div>

        {/* Filtration Module */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="w-4 h-4 mr-2 text-sky-400" />
              Filter Rating Reference
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                ASHRAE 62.1-2022 Min: MERV {minMerv}
              </span>
              <span className="text-xs uppercase tracking-wider font-bold bg-amber-950/30 text-amber-400 border border-amber-900/50 px-2 py-1 rounded">
                PM2.5 Threshold: {pm25Threshold} μg/m³
              </span>
            </div>
          </h3>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Target Filter MERV Rating</label>
            <select 
              value={selectedMerv} onChange={(e) => setSelectedMerv(e.target.value)}
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:border-sky-500 font-mono"
            >
              {MERV_DATA.map(m => (
                <option key={m.rating} value={m.rating}>MERV {m.rating}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Particle Size Efficiency (PSE)</h4>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">E1 (0.3 - 1.0 µm) <span className="text-xs ml-1 text-slate-600">e.g. Smoke</span></span>
                  <span className="text-sky-300 font-bold">{currentMerv.e1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">E2 (1.0 - 3.0 µm) <span className="text-xs ml-1 text-slate-600">e.g. PM2.5</span></span>
                  <span className="text-sky-300 font-bold">{currentMerv.e2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">E3 (3.0 - 10.0 µm) <span className="text-xs ml-1 text-slate-600">e.g. Pollen</span></span>
                  <span className="text-sky-300 font-bold">{currentMerv.e3}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-sky-950/20 p-4 rounded-xl border border-sky-900/30">
              <h4 className="text-xs font-bold text-sky-500/70 uppercase tracking-wider mb-1">Typical Applications</h4>
              <p className="text-xs text-sky-200">{currentMerv.app}</p>
            </div>
          </div>
        </div>

        {/* Separation Distance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
            <Ruler className="w-4 h-4 mr-2 text-amber-400" />
            Simplified Separation Check (ASHRAE 62.1)
          </h3>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Exhaust / Source Type</label>
              <select 
                value={exhaustSource} onChange={(e) => setExhaustSource(e.target.value)}
                className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:border-amber-500"
              >
                {exhaustClasses.map((ec: any) => (
                  <option key={`class${ec.class}`} value={`class${ec.class}`}>Class {ec.class} Exhaust ({ec.description})</option>
                ))}
                <option value="plumbing">Plumbing Vents</option>
                <option value="garage">Parking Garage Exhaust</option>
                <option value="cooling_tower">Cooling Tower Exhaust</option>
              </select>
            </div>
            {exhaustSource.startsWith('class') && (() => {
              const classNum = parseInt(exhaustSource.replace('class', ''));
              const ec = exhaustClasses.find((c: any) => c.class === classNum);
              if (!ec) return null;
              return (
                <div className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                   <h5 className="text-xs font-bold text-amber-500/70 uppercase tracking-wider mb-1">Recirculation Rule (ASHRAE 62.1-2022)</h5>
                   <p className="text-xs text-slate-300">
                     {ec.recirculationAllowed === true && "Full recirculation allowed to any space."}
                     {ec.recirculationAllowed === 'limited' && "Limited recirculation allowed (only to Class 2/3/4 spaces, never to Class 1)."}
                     {ec.recirculationAllowed === false && "Strictly no recirculation. Must be exhausted directly outdoors."}
                   </p>
                </div>
              )
            })()}
          </div>

          <div className="mt-4 bg-amber-950/20 p-6 rounded-xl border border-amber-900/50 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-amber-500/70 uppercase tracking-wider">Minimum Distance to Intake</span>
            <span className="text-4xl font-black font-mono text-amber-400 mt-2">{distance} <span className="text-xl text-amber-600">{lenUnit}</span></span>
            <p className="text-xs text-slate-400 mt-3 max-w-[250px]">
              Minimum separation required between the selected exhaust source and any outdoor air intake.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
