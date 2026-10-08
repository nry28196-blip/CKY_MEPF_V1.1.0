import React, { useState } from 'react';
import { Wind, Zap, Thermometer, Droplet, Copy, Check, Search, Scale, Ruler, Layers } from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface ConversionFactor {
  id: string;
  from: string;
  to: string;
  factor: number;
  description: string;
}

interface ConversionGroup {
  category: string;
  icon: React.ComponentType<any>;
  color: string;
  bgClass: string;
  borderClass: string;
  textColor: string;
  factors: ConversionFactor[];
}

const CONVERSION_GROUPS: ConversionGroup[] = [
  {
    category: 'HVAC Airflow',
    icon: Wind,
    color: 'text-sky-400',
    bgClass: 'bg-sky-950/10',
    borderClass: 'border-sky-900/30',
    textColor: 'text-sky-300',
    factors: [
      { id: 'cfm-m3h', from: 'CFM', to: 'm³/h', factor: 1.69901, description: 'Cubic Feet/Min to Cubic Meters/Hour' },
      { id: 'ls-m3h', from: 'L/s', to: 'm³/h', factor: 3.6, description: 'Liters/Sec to Cubic Meters/Hour' },
      { id: 'cfm-ls', from: 'CFM', to: 'L/s', factor: 0.471947, description: 'Cubic Feet/Min to Liters/Second' },
      { id: 'm3h-ls', from: 'm³/h', to: 'L/s', factor: 0.277778, description: 'Cubic Meters/Hour to Liters/Second' }
    ]
  },
  {
    category: 'Thermal & Power',
    icon: Thermometer,
    color: 'text-emerald-400',
    bgClass: 'bg-emerald-950/10',
    borderClass: 'border-emerald-900/30',
    textColor: 'text-emerald-300',
    factors: [
      { id: 'tr-kw', from: 'TR', to: 'kW', factor: 3.51685, description: 'Tons of Refrigeration to Kilowatts' },
      { id: 'tr-btuh', from: 'TR', to: 'BTU/h', factor: 12000, description: 'Tons of Refrigeration to BTUs/Hour' },
      { id: 'kw-btuh', from: 'kW', to: 'BTU/h', factor: 3412.142, description: 'Kilowatts to BTUs/Hour' },
      { id: 'hp-kw', from: 'HP', to: 'kW', factor: 0.7457, description: 'Horsepower to Kilowatts' }
    ]
  },
  {
    category: 'Pressure & Head',
    icon: Zap,
    color: 'text-indigo-400',
    bgClass: 'bg-indigo-950/10',
    borderClass: 'border-indigo-900/30',
    textColor: 'text-indigo-300',
    factors: [
      { id: 'bar-psi', from: 'bar', to: 'PSI', factor: 14.5038, description: 'Bar to Pounds per Square Inch' },
      { id: 'bar-kpa', from: 'bar', to: 'kPa', factor: 100, description: 'Bar to Kilopascals' },
      { id: 'mh2o-kpa', from: 'm H₂O', to: 'kPa', factor: 9.80665, description: 'Meters of Water Gauge to Kilopascals' },
      { id: 'psi-fth2o', from: 'PSI', to: 'ft H₂O', factor: 2.30666, description: 'PSI to Feet of Water Head' },
      { id: 'pa-mmh2o', from: 'Pa', to: 'mm H₂O', factor: 0.101972, description: 'Pascals to Millimeters of Water' }
    ]
  },
  {
    category: 'Plumbing & Fluid',
    icon: Droplet,
    color: 'text-cyan-400',
    bgClass: 'bg-cyan-950/10',
    borderClass: 'border-cyan-900/30',
    textColor: 'text-cyan-300',
    factors: [
      { id: 'gpm-ls', from: 'GPM (US)', to: 'L/s', factor: 0.06309, description: 'US Gallons/Min to Liters/Second' },
      { id: 'gpm-m3h', from: 'GPM (US)', to: 'm³/h', factor: 0.22712, description: 'US Gallons/Min to Cubic Meters/Hour' },
      { id: 'm3-liters', from: 'm³', to: 'Liters', factor: 1000, description: 'Cubic Meters to Liters' },
      { id: 'gal-liters', from: 'Gal (US)', to: 'Liters', factor: 3.78541, description: 'US Gallons to Liters' }
    ]
  },
  {
    category: 'Dimensions & Area',
    icon: Ruler,
    color: 'text-amber-400',
    bgClass: 'bg-amber-950/10',
    borderClass: 'border-amber-900/30',
    textColor: 'text-amber-300',
    factors: [
      { id: 'm2-ft2', from: 'm²', to: 'ft²', factor: 10.76391, description: 'Square Meters to Square Feet' },
      { id: 'm-ft', from: 'm', to: 'ft', factor: 3.28084, description: 'Meters to Feet' },
      { id: 'inch-mm', from: 'inch', to: 'mm', factor: 25.4, description: 'Inches to Millimeters' }
    ]
  }
];

export default function SidebarConversionList() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scaleValue, setScaleValue] = useState<string>('1');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const parsedScale = parseFloat(scaleValue);
  const multiplier = isNaN(parsedScale) ? 1 : parsedScale;

  const handleCopy = (factorText: string, id: string) => {
    navigator.clipboard.writeText(factorText);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  // Filter groups and factors
  const filteredGroups = CONVERSION_GROUPS.map(group => {
    const matchingFactors = group.factors.filter(f => 
      f.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...group,
      factors: matchingFactors
    };
  }).filter(group => group.factors.length > 0);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Scale className="h-4.5 w-4.5 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">{t('quickConverters')}</h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
          MEPF Quick Ref
        </span>
      </div>

      {/* Interactive Inputs */}
      <div className="grid grid-cols-12 gap-2">
        {/* Scale Multiplier */}
        <div className="col-span-4 relative">
          <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Scale</label>
          <input
            type="number"
            value={scaleValue}
            onChange={(e) => setScaleValue(e.target.value)}
            placeholder="1"
            className="w-full bg-slate-950/80 border border-slate-850 text-white rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
          />
        </div>

        {/* Search Filter */}
        <div className="col-span-8 relative">
          <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search Units</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. CFM, kW, bar..."
              className="w-full bg-slate-950/80 border border-slate-850 text-slate-300 placeholder:text-slate-600 rounded-lg pl-7 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-500" />
          </div>
        </div>
      </div>

      {/* List of Conversion Factors */}
      <div className="space-y-4 overflow-y-auto max-h-[360px] pr-1 hide-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
            <span className="text-xs font-semibold text-slate-500">No units match "{searchTerm}"</span>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.category} className="space-y-2">
                {/* Category Subheader */}
                <div className="flex items-center space-x-1.5 px-1">
                  <GroupIcon className={`h-3.5 w-3.5 ${group.color}`} />
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                    {group.category}
                  </span>
                </div>

                {/* Factors List */}
                <div className="space-y-1.5">
                  {group.factors.map((f) => {
                    const scaledResult = multiplier * f.factor;
                    // Format output nicely based on value size
                    const formattedResult = scaledResult.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: scaledResult < 0.1 ? 5 : scaledResult < 10 ? 4 : 2
                    });
                    
                    const equationString = `${multiplier} ${f.from} = ${formattedResult} ${f.to}`;

                    return (
                      <div
                        key={f.id}
                        onClick={() => handleCopy(equationString, f.id)}
                        className="group relative flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-850 hover:bg-slate-900/60 hover:border-slate-800 transition-all cursor-pointer select-none"
                        title={`Click to copy: ${f.description}`}
                      >
                        <div className="min-w-0 flex-grow pr-2">
                          <div className="flex items-baseline space-x-1.5 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-white">
                              {multiplier} <span className="text-slate-400 text-[10px]">{f.from}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 font-sans">=</span>
                            <span className={`text-[11px] font-mono font-black ${group.color}`}>
                              {formattedResult} <span className="text-slate-400 text-[10px]">{f.to}</span>
                            </span>
                          </div>
                          <span className="block text-[8px] text-slate-500 truncate font-mono mt-0.5">
                            {f.description}
                          </span>
                        </div>

                        {/* Copy / Copied Action Indicator */}
                        <div className="shrink-0 ml-1">
                          {copiedId === f.id ? (
                            <div className="p-1 bg-emerald-950/60 rounded border border-emerald-500/20 text-emerald-400">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className="p-1 bg-slate-900 rounded border border-slate-850 text-slate-500 group-hover:text-slate-300 transition-colors">
                              <Copy className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Helper Prompt Footer */}
      <div className="text-[8px] font-mono text-slate-500 bg-slate-950/20 p-2 rounded border border-slate-850 text-center leading-normal">
        * Change the <strong className="text-slate-300">Scale</strong> input above to dynamically multiply and calculate standard MEPF load values.
      </div>
    </div>
  );
}
