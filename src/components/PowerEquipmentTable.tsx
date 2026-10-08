import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '../lib/translations';

export interface PowerEquipment {
  id: string;
  name: string;
  model?: string;
  power: number;
  qty: number;
}

interface PowerEquipmentTableProps {
  equipmentList: PowerEquipment[];
  onChange: (newList: PowerEquipment[]) => void;
  onTotalChange: (total: number) => void;
  unit?: 'kW' | 'W';
  headerRight?: React.ReactNode;
}

export default function PowerEquipmentTable({ equipmentList, onChange, onTotalChange, unit = 'kW', headerRight }: PowerEquipmentTableProps) {
  const { t } = useLanguage();

  const handleAdd = () => {
    const newItem: PowerEquipment = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Equipment ${equipmentList.length + 1}`,
      power: 10,
      qty: 1
    };
    onChange([...equipmentList, newItem]);
  };

  const handleRemove = (id: string) => {
    onChange(equipmentList.filter(item => item.id !== id));
  };

  const handleChange = (id: string, field: keyof PowerEquipment, value: any) => {
    const updated = equipmentList.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange(updated);
  };

  const totalPower = equipmentList.reduce((acc, item) => acc + ((Number(item.power) || 0) * (Number(item.qty) || 1)), 0);

  useEffect(() => {
    onTotalChange(totalPower);
  }, [totalPower, onTotalChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Equipment List
        </label>
        <div className="flex items-center gap-3">
          {headerRight}
          <button
            type="button"
            onClick={handleAdd}
            className="text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-2 py-1 rounded transition-colors flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-950/50 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 px-3 font-semibold w-[35%]">Equipment</th>
              <th className="py-2 px-3 font-semibold w-[25%]">Model</th>
              <th className="py-2 px-3 font-semibold text-center w-[15%]">Qty</th>
              <th className="py-2 px-3 font-semibold text-center w-[15%] m-0">{unit}/ea</th>
              <th className="py-2 px-3 font-semibold text-center w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {equipmentList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                <td className="py-1.5 px-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 text-white px-1 py-1 focus:outline-none transition-colors"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="text"
                    value={item.model || ''}
                    placeholder="Optional"
                    onChange={(e) => handleChange(item.id, 'model', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 text-slate-300 px-1 py-1 focus:outline-none transition-colors"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => handleChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                    className="w-[60px] ml-6 mr-0 block bg-slate-900 border border-slate-700 rounded text-center text-white px-1 py-1 focus:outline-none focus:border-amber-500 transition-colors invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.power}
                    onChange={(e) => handleChange(item.id, 'power', parseFloat(e.target.value) || 0)}
                    className="w-[60px] ml-5 block bg-slate-900 border border-slate-700 rounded text-right text-white px-2 py-1 leading-4 focus:outline-none focus:border-amber-500 transition-colors font-mono invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                  />
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {equipmentList.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                  No equipment added.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-900/80 border-t border-slate-800">
            <tr>
              <td colSpan={3} className="py-2 px-3 text-right font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Total Load:
              </td>
              <td className="py-2 px-3 text-right font-bold text-amber-400 font-mono">
                {(totalPower || 0).toFixed(1)} {unit}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {equipmentList.length > 0 && totalPower > 0 && (
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-3">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Equipment Load Distribution
          </label>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentList} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${unit}`} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  formatter={(value) => [`${value} ${unit}`, 'Power per unit']}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="power" radius={[2, 2, 0, 0]}>
                  {equipmentList.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#f472b6', '#fb7185'][index % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
