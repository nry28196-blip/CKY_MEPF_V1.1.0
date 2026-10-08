import React from 'react';
import { useLanguage } from '../lib/translations';
import { X, BookOpen, Flame } from 'lucide-react';

interface FireReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FireReferenceModal({ isOpen, onClose }: FireReferenceModalProps) {
  const { isKhmer, setLanguage, language } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-red-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{isKhmer ? 'ឯកសារយោងប្រព័ន្ធពន្លត់អគ្គីភ័យ' : 'Fire Fighting Reference Tables'}</h2>
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
        
        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-8">
          <p className="text-xs text-slate-400 leading-relaxed">
            {isKhmer ? "តម្លៃអ៊ីដ្រូលីក និងការអនុញ្ញាតស្តង់ដារតាមគោលការណ៍ NFPA 13, NFPA 20 និង BS EN 12845។" : "Standard hydraulic values and allowances per NFPA 13, NFPA 20, and BS EN 12845 guidelines."}
          </p>

          {/* Table 1: NFPA Hazard Classifications */}
          <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> NFPA 13 Hazard Classifications
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-800">{isKhmer ? "ចំណាត់ថ្នាក់គ្រោះថ្នាក់ (Hazard Class)" : "Hazard Class"}</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "កំហាប់រចនា (Design Density)" : "Design Density"} (GPM/ft²)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "ផ្ទៃដីរចនា (Design Area)" : "Design Area"} (ft²)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "រយៈពេល (Duration)" : "Duration"} (Mins)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "ប្រព័ន្ធទុយោ (Hose Allowance)" : "Hose Allowance"} (GPM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Light Hazard</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">0.10</td>
                    <td className="px-4 py-3 text-center font-mono">1,500</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">30</td>
                    <td className="px-4 py-3 text-center font-mono">100</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Ordinary Hazard (Group 1)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">0.15</td>
                    <td className="px-4 py-3 text-center font-mono">1,500</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">60-90</td>
                    <td className="px-4 py-3 text-center font-mono">250</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Ordinary Hazard (Group 2)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">0.20</td>
                    <td className="px-4 py-3 text-center font-mono">1,500</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">60-90</td>
                    <td className="px-4 py-3 text-center font-mono">250</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Extra Hazard (Group 1)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">0.30</td>
                    <td className="px-4 py-3 text-center font-mono">2,500</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">90-120</td>
                    <td className="px-4 py-3 text-center font-mono">500</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Extra Hazard (Group 2)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">0.40</td>
                    <td className="px-4 py-3 text-center font-mono">2,500</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">90-120</td>
                    <td className="px-4 py-3 text-center font-mono">500</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: BS EN 12845 Hazard Classifications */}
          <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> BS EN 12845 Hazard Classifications
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-800">Hazard Class</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "កំហាប់រចនា (Design Density)" : "Design Density"} (mm/min)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "ផ្ទៃដីប្រតិបត្តិការ (Area of Operation)" : "Area of Operation"} (m²)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">Duration (Mins)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Light Hazard (LH)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">2.25</td>
                    <td className="px-4 py-3 text-center font-mono">84</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">30</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Ordinary Hazard (OH1)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">5.0</td>
                    <td className="px-4 py-3 text-center font-mono">72</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">60</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Ordinary Hazard (OH2)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">5.0</td>
                    <td className="px-4 py-3 text-center font-mono">144</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">60</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">Ordinary Hazard (OH3)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">5.0</td>
                    <td className="px-4 py-3 text-center font-mono">216</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">60</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-medium text-slate-200">High Hazard (HHP)</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">7.5 to 12.5</td>
                    <td className="px-4 py-3 text-center font-mono">260</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">90</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 3: Typical K-Factors */}
          <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Common Sprinkler K-Factors
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-800">{isKhmer ? "K-Factor (អាមេរិក)" : "US K-Factor"} (GPM/psi½)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "K-Factor (ម៉ែត្រ)" : "Metric K-Factor"} (Lpm/bar½)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "កម្មវិធីប្រើប្រាស់ (Typical Application)" : "Typical Application"}</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-center">{isKhmer ? "ទំហំធ្មេញ (Thread Size)" : "Thread Size"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">5.6</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">80</td>
                    <td className="px-4 py-3 text-center">Standard Coverage, Light/Ord Hazard</td>
                    <td className="px-4 py-3 text-center">1/2" NPT</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">8.0</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">115</td>
                    <td className="px-4 py-3 text-center">Large Orifice, Ord/Extra Hazard</td>
                    <td className="px-4 py-3 text-center">3/4" NPT</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">11.2</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">160</td>
                    <td className="px-4 py-3 text-center">ESFR, Storage, Extra Hazard</td>
                    <td className="px-4 py-3 text-center">3/4" NPT</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">14.0</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">200</td>
                    <td className="px-4 py-3 text-center">ESFR, High Piled Storage</td>
                    <td className="px-4 py-3 text-center">3/4" NPT</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">16.8</td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">240</td>
                    <td className="px-4 py-3 text-center">ESFR, High Piled Storage</td>
                    <td className="px-4 py-3 text-center">3/4" NPT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
                      </div>
    </div>
  );
}
