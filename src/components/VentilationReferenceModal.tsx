import React, { useState } from 'react';
import { useLanguage } from '../lib/translations';
import { X, BookOpen, Wind, Home, ChefHat } from 'lucide-react';

interface VentilationReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VentilationReferenceModal({ isOpen, onClose }: VentilationReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<'62.1' | '62.2' | '154'>('62.1');
  const { isKhmer, setLanguage, language } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{isKhmer ? 'ឯកសារយោង ASHRAE' : 'ASHRAE Reference Tables'}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
              className="px-3 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/50 hover:bg-sky-900/30 hover:border-sky-500/30 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              {isKhmer ? 'English' : 'ភាសាខ្មែរ'}
            </button>
            <button 
              onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-4 pt-4 border-b border-slate-800 space-x-4">
          <button 
            onClick={() => setActiveTab('62.1')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === '62.1' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wind className="w-4 h-4 hidden sm:block" />
            <span>ASHRAE 62.1 <span className="hidden sm:inline">(Commercial)</span></span>
          </button>
          <button 
            onClick={() => setActiveTab('62.2')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === '62.2' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Home className="w-4 h-4 hidden sm:block" />
            <span>ASHRAE 62.2 <span className="hidden sm:inline">(Residential)</span></span>
          </button>
          <button 
            onClick={() => setActiveTab('154')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === '154' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <ChefHat className="w-4 h-4 hidden sm:block" />
            <span>ASHRAE 154 <span className="hidden sm:inline">(Kitchen)</span></span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto">
          {activeTab === '62.1' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard outdoor air requirements according to ASHRAE 62.1-2019 Table 6.2.2.1. 
                Values shown are the people outdoor air rate (Rp) and the area outdoor air rate (Ra).
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-800">{isKhmer ? "ប្រភេទបន្ទប់ (Occupancy)" : "Occupancy Category"}</th>
                      <th className="px-4 py-3 border-b border-slate-800 text-center text-sky-400">Rp {isKhmer ? "(CFM/មនុស្ស)" : "(CFM/person)"}</th>
                      <th className="px-4 py-3 border-b border-slate-800 text-center text-emerald-400">Ra (CFM/ft²)</th>
                      <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "ដង់ស៊ីតេ (Density)" : "Default Density"} (#/1000 ft²)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Office Space</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">5</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.06</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">5</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Classroom (Age 9+)</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">10</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.12</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">35</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Conference Room</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">5</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.06</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">50</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Retail Sales</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">7.5</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.12</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">15</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Restaurant Dining</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">7.5</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.18</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">70</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Gymnasium</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono">20</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">0.30</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">30</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === '62.2' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-400 leading-relaxed">
                Minimum ventilation requirements for residential dwellings according to ASHRAE 62.2 (Table 4.1.1).
              </p>
              
              <div>
                <h3 className="text-sm font-bold text-indigo-400 mb-3">Whole-Building Ventilation Rate (CFM)</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-4 py-3 border-b border-slate-800">Floor Area (ft²)</th>
                        <th className="px-4 py-3 border-b border-slate-800 text-center">1 Bed</th>
                        <th className="px-4 py-3 border-b border-slate-800 text-center">2-3 Bed</th>
                        <th className="px-4 py-3 border-b border-slate-800 text-center">4-5 Bed</th>
                        <th className="px-4 py-3 border-b border-slate-800 text-center">6-7 Bed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono">
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-sans">&lt; 500</td>
                        <td className="px-4 py-3 text-center">30</td>
                        <td className="px-4 py-3 text-center">45</td>
                        <td className="px-4 py-3 text-center">60</td>
                        <td className="px-4 py-3 text-center">75</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-sans">501 - 1000</td>
                        <td className="px-4 py-3 text-center">45</td>
                        <td className="px-4 py-3 text-center">60</td>
                        <td className="px-4 py-3 text-center">75</td>
                        <td className="px-4 py-3 text-center">90</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-sans">1001 - 1500</td>
                        <td className="px-4 py-3 text-center">60</td>
                        <td className="px-4 py-3 text-center">75</td>
                        <td className="px-4 py-3 text-center">90</td>
                        <td className="px-4 py-3 text-center">105</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-sans">1501 - 2000</td>
                        <td className="px-4 py-3 text-center">75</td>
                        <td className="px-4 py-3 text-center">90</td>
                        <td className="px-4 py-3 text-center">105</td>
                        <td className="px-4 py-3 text-center">120</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-sans">2001 - 2500</td>
                        <td className="px-4 py-3 text-center">90</td>
                        <td className="px-4 py-3 text-center">105</td>
                        <td className="px-4 py-3 text-center">120</td>
                        <td className="px-4 py-3 text-center">135</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-indigo-400 mb-3">Local Exhaust Requirements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    <p className="text-xs font-bold text-slate-200 mb-2">Kitchens</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      A vented range hood capable of exhausting at least 100 CFM (50 L/s) shall be installed over each range. Alternatively, a continuous mechanical exhaust system shall be installed with a rate not less than 5 ACH based on kitchen volume.
                    </p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    <p className="text-xs font-bold text-slate-200 mb-2">Bathrooms</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Each bathroom shall have a mechanical exhaust system capable of exhausting at least 50 CFM (25 L/s) intermittently or 20 CFM (10 L/s) continuously.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === '154' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Base exhaust rates (CFM per linear foot of hood) according to ASHRAE 154 Table 3.
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-800">Equipment Duty</th>
                      <th className="px-4 py-3 border-b border-slate-800 text-center">Wall-Mounted (CFM/ft)</th>
                      <th className="px-4 py-3 border-b border-slate-800 text-center">Single Island (CFM/ft)</th>
                      <th className="px-4 py-3 border-b border-slate-800">Example Appliances</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Light Duty</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">200</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">400</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">Ovens, steamers, cheese melters. Up to 400°F</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Medium Duty</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">300</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">500</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">Ranges, griddles, fryers. Up to 400°F</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Heavy Duty</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">400</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">600</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">Charbroilers, woks, upright broilers. Up to 600°F</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">Extra-Heavy Duty</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">550</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-mono">700</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">Solid fuel (wood/charcoal) equipment. Up to 700°F</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
                      </div>
    </div>
  );
}
