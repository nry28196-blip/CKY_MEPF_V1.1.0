import React, { useState } from 'react';
import { Layers, Activity, Building2, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { AirBalanceService, AirBalanceInput, AirBalanceResult, SystemBalanceInput, SystemBalanceResult } from '../calculations/ventilation/AirBalanceService';
import { exportAirBalanceToCsv } from '../lib/exportCsv';

export default function AirBalanceCalc() {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';
  const flowUnit = isMetric ? 'L/s' : 'CFM';
  
  const [mode, setMode] = useState<'room' | 'system'>('system');

  // Room State
  const [supplyAir, setSupplyAir] = useState<number>(500);
  const [exhaustAir, setExhaustAir] = useState<number>(300);
  const [returnAir, setReturnAir] = useState<number>(200);
  const [transferIn, setTransferIn] = useState<number>(0);
  
  // System State
  const [sysSupply, setSysSupply] = useState<number>(10000);
  const [sysOutdoor, setSysOutdoor] = useState<number>(2500);
  const [sysReturn, setSysReturn] = useState<number>(8500);
  const [sysExhaust, setSysExhaust] = useState<number>(2000);
  const [sysVolume, setSysVolume] = useState<number>(isMetric ? 1000 : 35000);

  // Calculations
  const roomInput: AirBalanceInput = {
    qSupply: supplyAir, qExhaust: exhaustAir, qReturn: returnAir, qTransferIn: transferIn
  };
  const roomResult: AirBalanceResult = AirBalanceService.calculateRoomBalance(roomInput);
  const roomNetColor = roomResult.pressureRelationship === 'Positive' ? 'text-sky-400' : roomResult.pressureRelationship === 'Negative' ? 'text-amber-400' : 'text-slate-400';

  const systemInput: SystemBalanceInput = {
    qSupply: sysSupply, qOutdoorAir: sysOutdoor, qReturn: sysReturn, qExhaust: sysExhaust,
    buildingVolume: sysVolume, isMetric
  };
  const systemResult: SystemBalanceResult = AirBalanceService.calculateSystemBalance(systemInput);
  const sysNetColor = systemResult.buildingPressure === 'Positive' ? 'text-sky-400' : systemResult.buildingPressure === 'Negative' ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Utility Basis: Volumetric Air-Balance Diagnostic (Non-ASHRAE Compliance Path)
        </div>
      </div>

      <EngineeringStatusHeader 
        status="NOT_READY_FOR_ENGINEERING_USE" 
        message="Engineering Diagnostic Utility: Performs simplified volumetric flow checks only. This is not an ANSI/ASHRAE Standard 62.1 compliance path and cannot be used for official engineering sign-off."
        className="mb-4"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-400" />
            Air Balance & Pressurization
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Evaluate room-level and building-level airflow pressure relationships.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            id="export-air-balance-csv-btn"
            onClick={() => {
              if (mode === 'system') {
                exportAirBalanceToCsv({
                  isMetric,
                  mode: 'system',
                  supplyAir: sysSupply,
                  exhaustAir: sysExhaust,
                  returnAir: sysReturn,
                  outdoorAir: sysOutdoor,
                  netAirflow: systemResult.qNetBuilding ?? 0,
                  pressureRelationship: systemResult.buildingPressure
                });
              } else {
                exportAirBalanceToCsv({
                  isMetric,
                  mode: 'room',
                  supplyAir,
                  exhaustAir,
                  returnAir,
                  transferAir: transferIn,
                  netAirflow: roomResult.qNet ?? 0,
                  pressureRelationship: roomResult.pressureRelationship
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Export air balance and pressurization analysis to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setMode('system')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'system' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              System / Building
            </button>
            <button
              onClick={() => setMode('room')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'room' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Room / Zone
            </button>
          </div>
        </div>
      </div>

      {mode === 'system' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-indigo-400" />
              System Airflow Inputs
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Total Supply Air ({flowUnit})</label>
                <input 
                  type="number" min="0" step="100"
                  value={sysSupply}
                  onChange={(e) => setSysSupply(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Total Return Air ({flowUnit})</label>
                <input 
                  type="number" min="0" step="100"
                  value={sysReturn}
                  onChange={(e) => setSysReturn(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sky-400 mb-1.5 uppercase">Outdoor Air ({flowUnit})</label>
                <input 
                  type="number" min="0" step="100"
                  value={sysOutdoor}
                  onChange={(e) => setSysOutdoor(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-sky-900 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase">Total Exhaust Air ({flowUnit})</label>
                <input 
                  type="number" min="0" step="100"
                  value={sysExhaust}
                  onChange={(e) => setSysExhaust(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-amber-900 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Unit Airflow Diagnostics</h4>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-xs">Recirculated Air</span>
                    <span className="text-white font-bold">{systemResult.qRecirculated !== null ? `${Math.round(systemResult.qRecirculated).toLocaleString()} ${flowUnit}` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-xs">Relief Air Required</span>
                    <span className="text-amber-300 font-bold">{systemResult.qRelief !== null ? `${Math.round(systemResult.qRelief).toLocaleString()} ${flowUnit}` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400 text-xs">Total Air Leaving Bldg</span>
                    <span className="text-rose-300 font-bold">{systemResult.totalExhaustAndRelief !== null ? `${Math.round(systemResult.totalExhaustAndRelief).toLocaleString()} ${flowUnit}` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg h-full flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                
                <div className="relative z-10 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Building Pressure Relationship</p>
                  <p className={`text-4xl font-black font-mono tracking-tight drop-shadow-md uppercase ${sysNetColor}`}>
                    {systemResult.buildingPressure}
                  </p>
                  
                  {systemResult.qNetBuilding !== null && systemResult.buildingPressure === 'Positive' && (
                    <p className="text-sm text-sky-300 mt-3">
                      Building will exfiltrate {Math.round(systemResult.qNetBuilding).toLocaleString()} {flowUnit} through envelope.
                    </p>
                  )}
                  {systemResult.qNetBuilding !== null && systemResult.buildingPressure === 'Negative' && (
                    <p className="text-sm text-amber-300 mt-3">
                      Building requires {Math.round(Math.abs(systemResult.qNetBuilding)).toLocaleString()} {flowUnit} of unconditioned infiltration.
                    </p>
                  )}
                  {systemResult.buildingPressure === 'Neutral' && (
                    <p className="text-sm text-slate-400 mt-3">
                      Building is neutrally balanced.
                    </p>
                  )}

                  {!systemResult.isValid && (
                    <div className="mt-4 inline-flex items-center text-xs text-rose-400 bg-rose-400/10 border border-rose-400/30 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Impossible System State: Check Airflows
                    </div>
                  )}

                  {systemResult.reasons.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {systemResult.reasons.map((r, i) => (
                        <div key={i} className="inline-flex items-center text-xs text-rose-400 bg-rose-400/10 border border-rose-400/30 px-3 py-1.5 rounded-lg">
                          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-left">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {systemResult.warnings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {systemResult.warnings.map((warn, i) => (
                        <div key={i} className="inline-flex items-center text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-lg">
                          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-left">{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {systemResult.isValid && systemResult.warnings.length === 0 && systemResult.buildingPressure !== 'Negative' && (
                    <div className="mt-4 inline-flex items-center text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Code Compliant Positive Pressurization
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'room' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-indigo-400" />
              Room Air Balance
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Supply Air ({flowUnit})</label>
                  <input 
                    type="number" min="0" step="10"
                    value={supplyAir}
                    onChange={(e) => setSupplyAir(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Return Air ({flowUnit})</label>
                  <input 
                    type="number" min="0" step="10"
                    value={returnAir}
                    onChange={(e) => setReturnAir(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Local Exhaust Air ({flowUnit})</label>
                  <input 
                    type="number" min="0" step="10"
                    value={exhaustAir}
                    onChange={(e) => setExhaustAir(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Transfer Air In ({flowUnit})</label>
                  <input 
                    type="number" min="0" step="10"
                    value={transferIn}
                    onChange={(e) => setTransferIn(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm font-mono border border-slate-800 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-5 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-400" />
              Balance Results
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                 <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                       <span>Supply (In)</span>
                       <span>+ {Math.round(supplyAir).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 border-b border-slate-800/60 pb-2">
                       <span>Transfer (In)</span>
                       <span>+ {Math.round(transferIn).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-slate-400 pt-2">
                       <span>Exhaust (Out)</span>
                       <span>- {Math.round(exhaustAir).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-b border-slate-800/60 pb-2">
                       <span>Return (Out)</span>
                       <span>- {Math.round(returnAir).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-white font-bold pt-2">
                       <span>Net Airflow</span>
                       <span className={roomNetColor}>{roomResult.qNet !== null ? `${Math.round(roomResult.qNet).toLocaleString()} ${flowUnit}` : '—'}</span>
                    </div>
                 </div>
              </div>
              
              <div className="bg-slate-950/50 p-6 rounded-xl border border-indigo-900/30 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 z-10">Pressure Relationship</p>
                <p className={`text-3xl font-black font-mono tracking-tight drop-shadow-md z-10 uppercase ${roomNetColor}`}>
                  {roomResult.pressureRelationship}
                </p>
                {roomResult.qNet !== null && roomResult.pressureRelationship === 'Positive' && roomResult.transferOut !== null && (
                  <p className="text-xs text-sky-300 mt-3 z-10 text-center">
                    Air will transfer OUT to adjacent spaces: {Math.round(roomResult.transferOut).toLocaleString()} {flowUnit}
                  </p>
                )}
                {roomResult.qNet !== null && roomResult.pressureRelationship === 'Negative' && (
                  <p className="text-xs text-amber-300 mt-3 z-10 text-center">
                    Air must transfer IN from adjacent spaces: {Math.round(Math.abs(roomResult.qNet)).toLocaleString()} {flowUnit}
                  </p>
                )}
                {roomResult.pressureRelationship === 'Neutral' && (
                  <p className="text-xs text-slate-400 mt-3 z-10 text-center">
                    Room is neutrally balanced.
                  </p>
                )}
                {roomResult.reasons.length > 0 && (
                  <div className="mt-3 text-xs text-rose-400 z-10 text-center">
                    {roomResult.reasons.join(' ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
