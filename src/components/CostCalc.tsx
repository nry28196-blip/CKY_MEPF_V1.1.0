import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { HistoryItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface CostCalcProps {
  history: HistoryItem[];
}

export default function CostCalc({ history = [] }: CostCalcProps) {
  const [rates, setRates] = useState({
    cooling: 1500, // per TR
    airflow: 5,    // per CFM
    electrical: 300, // per kW
    fire: 10,       // per Lpm
  });
  
  const [contingency, setContingency] = useState(10); // %

  const { totals, costs, totalProjectCost } = useMemo(() => {
    let totalCooling = 0;
    let totalAirflow = 0;
    let totalElectrical = 0;
    let totalFireWater = 0;

    history.forEach(item => {
      if (item.tab === 'mechanical' && item.subType === 'cooling') {
        const match = item.summary.match(/([\d\.]+)\s*TR/);
        if (match) totalCooling += parseFloat(match[1]);
      }
      if (item.tab === 'mechanical' && item.subType === 'ductSizing') {
        if (item.parameters && item.parameters.airflow) {
          totalAirflow += parseFloat(item.parameters.airflow);
        }
      }
      if (item.tab === 'electrical') {
        const match = item.summary.match(/([\d\.]+)\s*kW/);
        if (match) totalElectrical += parseFloat(match[1]);
      }
      if (item.tab === 'fire') {
        const match = item.summary.match(/Flows?:\s*([\d\.]+)\s*Lpm/i) || item.summary.match(/Flow:\s*([\d\.]+)\s*Lpm/i);
        if (match) totalFireWater += parseFloat(match[1]);
      }
    });

    const costCooling = totalCooling * rates.cooling;
    const costAirflow = totalAirflow * rates.airflow;
    const costElectrical = totalElectrical * rates.electrical;
    const costFire = totalFireWater * rates.fire;

    const subtotal = costCooling + costAirflow + costElectrical + costFire;
    const contingencyAmount = subtotal * (contingency / 100);
    const totalProjectCost = subtotal + contingencyAmount;

    return {
      totals: { cooling: totalCooling, airflow: totalAirflow, electrical: totalElectrical, fire: totalFireWater },
      costs: { cooling: costCooling, airflow: costAirflow, electrical: costElectrical, fire: costFire, subtotal, contingency: contingencyAmount },
      totalProjectCost
    };
  }, [history, rates, contingency]);

  const chartData = [
    { name: 'Cooling', value: costs.cooling, color: '#38bdf8' },
    { name: 'Airflow / Duct', value: costs.airflow, color: '#34d399' },
    { name: 'Electrical', value: costs.electrical, color: '#fbbf24' },
    { name: 'Fire / Plumbing', value: costs.fire, color: '#f87171' },
    { name: 'Contingency', value: costs.contingency, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <DollarSign className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Project Cost Estimation</h2>
          <p className="text-sm text-slate-400">Estimate MEP project costs based on saved calculation history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Calculator className="w-4 h-4 mr-2"/> Estimation Rates</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Cooling Rate ($/TR)</label>
                <input 
                  type="number" 
                  min="0"
                  value={rates.cooling ?? ""} 
                  onChange={(e) => setRates({...rates, cooling: Number(e.target.value)})}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-sky-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Aggregated TR: {(totals.cooling || 0).toFixed(1)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Airflow / Duct Rate ($/CFM)</label>
                <input 
                  type="number" 
                  min="0"
                  value={rates.airflow ?? ""} 
                  onChange={(e) => setRates({...rates, airflow: Number(e.target.value)})}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Aggregated CFM: {Math.round(totals.airflow)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Electrical Rate ($/kW)</label>
                <input 
                  type="number" 
                  min="0"
                  value={rates.electrical ?? ""} 
                  onChange={(e) => setRates({...rates, electrical: Number(e.target.value)})}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Aggregated kW: {(totals.electrical || 0).toFixed(1)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Fire / Plumbing Rate ($/Lpm)</label>
                <input 
                  type="number" 
                  min="0"
                  value={rates.fire ?? ""} 
                  onChange={(e) => setRates({...rates, fire: Number(e.target.value)})}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Aggregated Lpm: {Math.round(totals.fire)}</p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Contingency (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={contingency ?? ""} 
                  onChange={(e) => setContingency(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden p-6 flex flex-col justify-center items-center text-center">
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Estimated Total Cost</span>
            <span className="text-5xl font-black text-white font-mono">{formatCurrency(totalProjectCost)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><PieChartIcon className="w-4 h-4 mr-2"/> Cost Breakdown</h3>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px'}} 
                        itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 italic text-sm">No cost data available. Add items to history.</div>
              )}
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80">
                <h3 className="text-sm font-semibold text-slate-300">Cost Summary</h3>
              </div>
              <div className="divide-y divide-slate-800/50">
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-400">Cooling Equipment</span>
                  <span className="text-sm font-semibold text-sky-400">{formatCurrency(costs.cooling)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-400">Ductwork / Airflow</span>
                  <span className="text-sm font-semibold text-emerald-400">{formatCurrency(costs.airflow)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-400">Electrical System</span>
                  <span className="text-sm font-semibold text-amber-400">{formatCurrency(costs.electrical)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-400">Plumbing & Fire</span>
                  <span className="text-sm font-semibold text-rose-400">{formatCurrency(costs.fire)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-4 bg-slate-800/20">
                  <span className="text-sm font-medium text-slate-300">Subtotal</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(costs.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-400">Contingency ({contingency}%)</span>
                  <span className="text-sm font-semibold text-slate-300">{formatCurrency(costs.contingency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
