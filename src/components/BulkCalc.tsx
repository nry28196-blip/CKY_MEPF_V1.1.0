import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Download, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import { CONVERSIONS, convertValue, deltaCelsiusToFahrenheit, deltaFahrenheitToCelsius } from '../lib/unitConverter';
import { HistoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

type BulkSystemType = 'duct' | 'cooling' | 'flc' | 'pipe' | 'dashboard';

interface BulkRow {
  id: string;
  // Inputs
  in1: number;
  in2: number;
  in3: number;
  in4: number;
  // Outputs
  out1: number;
  out2: number;
  out3: number;
  status?: 'optimal' | 'warning' | 'danger';
}

export default function BulkCalc({ history = [] }: { history?: HistoryItem[] }) {
  const { t } = useLanguage();
  const { unitSystem } = useUnit();
  const prevUnit = React.useRef(unitSystem);

  const [systemType, setSystemType] = useState<BulkSystemType>('duct');

  useEffect(() => {
    scrollWorkspaceToTop();
  }, [systemType]);
  
  const createDefaultRow = (type: BulkSystemType): BulkRow => {
    switch(type) {
      case 'duct': return { id: Math.random().toString(36).substring(2,9), in1: 2000, in2: 0.1, in3: 12, in4: 0, out1: 0, out2: 0, out3: 0 };
      case 'cooling': return { id: Math.random().toString(36).substring(2,9), in1: 500, in2: 10, in3: 0, in4: 0, out1: 0, out2: 0, out3: 0 };
      case 'flc': return { id: Math.random().toString(36).substring(2,9), in1: 400, in2: 3, in3: 10, in4: 0.85, out1: 0, out2: 0, out3: 0 };
      case 'pipe': return { id: Math.random().toString(36).substring(2,9), in1: 5, in2: 50, in3: 0, in4: 0, out1: 0, out2: 0, out3: 0 };
    }
  };

  const [rows, setRows] = useState<BulkRow[]>([createDefaultRow('duct'), createDefaultRow('duct')]);

  useEffect(() => {
    if (prevUnit.current !== unitSystem) {
      setRows(rows.map(r => {
        const newRow = { ...r };
        if (systemType === 'duct') {
          if (unitSystem === 'metric') {
            newRow.in1 = Math.round(r.in1 * CONVERSIONS.CFM_TO_LPS);
            newRow.in2 = Number(((r.in2 * CONVERSIONS.IN100FT_TO_PAM) || 0).toFixed(2));
            newRow.in3 = Math.round(r.in3 * CONVERSIONS.IN_TO_MM);
          } else {
            newRow.in1 = Math.round(r.in1 * CONVERSIONS.LPS_TO_CFM);
            newRow.in2 = Number(((r.in2 * CONVERSIONS.PAM_TO_IN100FT) || 0).toFixed(3));
            newRow.in3 = Math.round(r.in3 * CONVERSIONS.MM_TO_IN);
          }
        } else if (systemType === 'cooling') {
          if (unitSystem === 'metric') {
             newRow.in1 = Math.round(r.in1 * CONVERSIONS.CFM_TO_LPS);
             newRow.in2 = Number((deltaFahrenheitToCelsius(r.in2) || 0).toFixed(1));
          } else {
             newRow.in1 = Math.round(r.in1 * CONVERSIONS.LPS_TO_CFM);
             newRow.in2 = Number((deltaCelsiusToFahrenheit(r.in2) || 0).toFixed(1));
          }
        } else if (systemType === 'pipe') {
          if (unitSystem === 'metric') {
            newRow.in1 = Number(((r.in1 * CONVERSIONS.GPM_TO_LPS) || 0).toFixed(2));
            newRow.in2 = Math.round(r.in2 * CONVERSIONS.IN_TO_MM);
          } else {
            newRow.in1 = Math.round(r.in1 * CONVERSIONS.LPS_TO_GPM);
            newRow.in2 = Number(((r.in2 * CONVERSIONS.MM_TO_IN) || 0).toFixed(2));
          }
        }
        return newRow;
      }));
      prevUnit.current = unitSystem;
    }
  }, [unitSystem, systemType, rows]);

  const handleSystemChange = (type: BulkSystemType) => {
    setSystemType(type);
    setRows([createDefaultRow(type), createDefaultRow(type)]);
  };

  const addRow = () => {
    setRows([...rows, createDefaultRow(systemType)]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof BulkRow, val: number) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  // --- Calculation Logic ---
  
  // Duct Sizing Helpers
  const calculateDe = (cfm: number, friction: number): number => {
    if (cfm <= 0 || friction <= 0) return 0;
    try {
      const de = Math.pow((0.10913 * Math.pow(cfm, 1.9)) / friction, 1 / 5.02);
      return Number.isNaN(de) ? 0 : de;
    } catch { return 0; }
  };
  const solveWidth = (deTarget: number, height: number): number => {
    if (deTarget <= 0 || height <= 0) return 0;
    let low = 1, high = 300, width = (low + high) / 2;
    for (let i = 0; i < 25; i++) {
      const deCalc = 1.30 * Math.pow(width * height, 0.625) / Math.pow(width + height, 0.25);
      if (deCalc < deTarget) low = width;
      else high = width;
      width = (low + high) / 2;
    }
    return Math.ceil(width);
  };
  const calculateVelocityRect = (cfm: number, w: number, h: number): number => {
    if (w <= 0 || h <= 0) return 0;
    return (cfm * 144) / (w * h);
  };

  const calculateResults = (r: BulkRow): BulkRow => {
    const res = { ...r };
    const isMetric = unitSystem === 'metric';
    
    if (systemType === 'duct') {
      const cfm = isMetric ? r.in1 * CONVERSIONS.LPS_TO_CFM : r.in1;
      const friction = isMetric ? r.in2 * CONVERSIONS.PAM_TO_IN100FT : r.in2;
      const height = isMetric ? r.in3 * CONVERSIONS.MM_TO_IN : r.in3;
      const de = calculateDe(cfm, friction);
      const width = solveWidth(de, height);
      const vel = calculateVelocityRect(cfm, width, height);
      res.out1 = isMetric ? de * CONVERSIONS.IN_TO_MM : de;
      res.out2 = isMetric ? Math.round(width * CONVERSIONS.IN_TO_MM) : width;
      res.out3 = isMetric ? vel * CONVERSIONS.FPM_TO_MS : vel;
      res.status = vel <= 2000 ? 'optimal' : vel <= 2500 ? 'warning' : 'danger';
    } 
    else if (systemType === 'cooling') {
      const flow = isMetric ? r.in1 : r.in1 * CONVERSIONS.CFM_TO_LPS;
      const deltaT = isMetric ? r.in2 : deltaFahrenheitToCelsius(r.in2);
      const kw = (1.2 * flow * deltaT) / 1000;
      res.out1 = isMetric ? kw : kw * CONVERSIONS.KW_TO_BTUH;
    }
    else if (systemType === 'flc') {
      // FLC = P(kW)*1000 / (sqrt(3)*V*PF) or P*1000 / (V*PF)
      const v = r.in1;
      const phase = r.in2;
      const pKw = r.in3;
      const pf = r.in4;
      if (v > 0 && pf > 0) {
        if (phase === 3) res.out1 = (pKw * 1000) / (Math.sqrt(3) * v * pf);
        else res.out1 = (pKw * 1000) / (v * pf);
      } else {
        res.out1 = 0;
      }
    }
    else if (systemType === 'pipe') {
      const q_lps = isMetric ? r.in1 : r.in1 * CONVERSIONS.GPM_TO_LPS;
      const d_mm = isMetric ? r.in2 : r.in2 * CONVERSIONS.IN_TO_MM;
      const q = q_lps / 1000;
      const d = d_mm / 1000;
      if (d > 0) {
        const area = Math.PI * Math.pow(d / 2, 2);
        const v_ms = q / area;
        res.out1 = isMetric ? v_ms : v_ms * CONVERSIONS.MS_TO_FPM / 60; // ft/s? No FPM
      } else {
        res.out1 = 0;
      }
    }
    return res;
  };

  const calculatedRows = rows.map(calculateResults);

  const handleExportCsv = () => {
    const headerRow = getHeaders().inputs.map(h => h.name).concat(getHeaders().outputs.map(h => h.name));
    const dataRows = calculatedRows.map(r => {
      const vals = [];
      if (systemType === 'duct') vals.push(r.in1, r.in2, r.in3, (r.out1 || 0).toFixed(2), r.out2, (r.out3 || 0).toFixed(0));
      if (systemType === 'cooling') vals.push(r.in1, r.in2, (r.out1 || 0).toFixed(2));
      if (systemType === 'flc') vals.push(r.in1, r.in2, r.in3, r.in4, (r.out1 || 0).toFixed(2));
      if (systemType === 'pipe') vals.push(r.in1, r.in2, (r.out1 || 0).toFixed(2));
      return vals.join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headerRow.join(','), ...dataRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bulk_calculation_${systemType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHeaders = () => {
    const isMetric = unitSystem === 'metric';
    switch (systemType) {
      case 'duct': return {
        inputs: [{name: isMetric ? 'Airflow (L/s)' : 'Airflow (CFM)', key: 'in1'}, {name: isMetric ? 'Friction (Pa/m)' : 'Friction (in/100ft)', key: 'in2'}, {name: isMetric ? 'Height (mm)' : 'Height (in)', key: 'in3'}],
        outputs: [{name: isMetric ? 'Eq. Dia (mm)' : 'Eq. Dia (in)'}, {name: isMetric ? 'Width (mm)' : 'Width (in)'}, {name: isMetric ? 'Vel (m/s)' : 'Vel (FPM)'}]
      };
      case 'cooling': return {
        inputs: [{name: isMetric ? 'Airflow (L/s)' : 'Airflow (CFM)', key: 'in1'}, {name: isMetric ? 'Delta T (°C)' : 'Delta T (°F)', key: 'in2'}],
        outputs: [{name: isMetric ? 'Sensible Load (kW)' : 'Sensible Load (BTU/h)'}]
      };
      case 'flc': return {
        inputs: [{name: 'Voltage (V)', key: 'in1'}, {name: 'Phase (1 or 3)', key: 'in2'}, {name: 'Power (kW)', key: 'in3'}, {name: 'Power Factor', key: 'in4'}],
        outputs: [{name: 'Full Load Current (A)'}]
      };
      case 'pipe': return {
        inputs: [{name: isMetric ? 'Flow Rate (L/s)' : 'Flow Rate (GPM)', key: 'in1'}, {name: isMetric ? 'Inner Dia (mm)' : 'Inner Dia (in)', key: 'in2'}],
        outputs: [{name: isMetric ? 'Velocity (m/s)' : 'Velocity (FPM)'}]
      };
    }
  };

  const headers = getHeaders();


  const renderDashboard = () => {
    let totalCooling = 0;
    let totalAirflow = 0;
    let totalFireWater = 0;
    
    const coolingData: any[] = [];
    const airflowData: any[] = [];
    const fireData: any[] = [];

    history.forEach(item => {
      if (item.tab === 'mechanical' && item.subType === 'cooling') {
        const match = item.summary.match(/([\d\.]+)\s*TR/);
        if (match) {
          const val = parseFloat(match[1]);
          totalCooling += val;
          coolingData.push({ name: item.title || 'Cooling', value: val });
        }
      }
      if (item.tab === 'mechanical' && item.subType === 'ductSizing') {
        if (item.parameters && item.parameters.airflow) {
          const val = parseFloat(item.parameters.airflow);
          totalAirflow += val;
          airflowData.push({ name: item.title || 'Duct', value: val });
        }
      }
      if (item.tab === 'fire') {
        const match = item.summary.match(/Flows?:\s*([\d\.]+)\s*Lpm/i);
        if (match) {
          const val = parseFloat(match[1]);
          totalFireWater += val;
          fireData.push({ name: item.title || 'Fire', value: val });
        }
      }
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
      <div className="space-y-8 animate-fade-in pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Cooling Capacity</span>
            <span className="text-4xl font-black text-sky-400 font-mono">{(totalCooling || 0).toFixed(1)} <span className="text-lg">TR</span></span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Airflow</span>
            <span className="text-4xl font-black text-emerald-400 font-mono">{Math.round(totalAirflow)} <span className="text-lg">CFM</span></span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Fire Water Demand</span>
            <span className="text-4xl font-black text-rose-400 font-mono">{Math.round(totalFireWater)} <span className="text-lg">Lpm</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-6">Cooling Breakdown</h3>
            {coolingData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coolingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc'}} />
                    <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} name="TR" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 italic text-sm">No cooling data saved.</div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-6">Airflow Breakdown</h3>
            {airflowData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={airflowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc'}} />
                    <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} name="CFM" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 italic text-sm">No airflow data saved.</div>
            )}
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-6">Fire Water Demand Breakdown</h3>
            {fireData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fireData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent * 100) || 0).toFixed(0)}%)`}
                    >
                      {fireData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500 italic text-sm">No fire data saved.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Layers className="h-6 w-6 text-indigo-400" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">Bulk Batch Processor</h2>
          </div>
          <p className="text-xs text-slate-400">Calculate multiple parameters instantly. Best for schedules and equipment lists.</p>
        </div>

        <div className="flex items-center space-x-3">
          <select 
            value={systemType}
            onChange={(e) => handleSystemChange(e.target.value as BulkSystemType)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="duct">Mechanical: Duct Sizing</option>
            <option value="cooling">Mechanical: Cooling Load (Sensible)</option>
            <option value="flc">Electrical: Cable FLC</option>
            <option value="pipe">Plumbing: Pipe Velocity</option>
            <option value="dashboard">Summary Dashboard</option>
          </select>
          {systemType !== 'dashboard' && (
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          )}
        </div>
      </div>

      {systemType === 'dashboard' ? (
        renderDashboard()
      ) : (
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-500 uppercase bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                {headers.inputs.map(h => (
                  <th key={h.name} className="px-4 py-3 font-semibold text-sky-400">{h.name}</th>
                ))}
                {headers.outputs.map(h => (
                  <th key={h.name} className="px-4 py-3 font-semibold text-emerald-400">{h.name}</th>
                ))}
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {calculatedRows.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">{i + 1}</td>
                  
                  {headers.inputs.map(h => (
                    <td key={h.key} className="px-4 py-3">
                      <input 
                        type="number"
                        value={r[h.key as keyof BulkRow] as number}
                        onChange={(e) => updateRow(r.id, h.key as keyof BulkRow, Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </td>
                  ))}

                  {/* Render Outputs */}
                  {systemType === 'duct' && (
                    <>
                      <td className="px-4 py-3 font-mono font-bold text-white">{(r.out1 || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{r.out2}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white flex items-center space-x-2">
                        <span>{(r.out3 || 0).toFixed(0)}</span>
                        {r.status === 'optimal' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {r.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        {r.status === 'danger' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      </td>
                    </>
                  )}
                  {systemType === 'cooling' && (
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{(r.out1 || 0).toFixed(2)}</td>
                  )}
                  {systemType === 'flc' && (
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{(r.out1 || 0).toFixed(2)}</td>
                  )}
                  {systemType === 'pipe' && (
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{(r.out1 || 0).toFixed(2)}</td>
                  )}

                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => removeRow(r.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-950/40 border-t border-slate-800">
          <button 
            onClick={addRow}
            className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Row</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
