import React from 'react';
import { useLanguage } from '../lib/translations';
import { X, BookOpen } from 'lucide-react';
import { IPC_FIXTURES } from '../lib/plumbingFixtures';

interface IPCReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IPCReferenceModal({ isOpen, onClose }: IPCReferenceModalProps) {
  const { isKhmer, setLanguage, language } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{isKhmer ? 'ឯកសារយោងបន្ទុកឧបករណ៍' : 'Fixture Unit Reference'}</h2>
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
        <div className="p-4 overflow-y-auto">
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            {isKhmer 
              ? 'តម្លៃឯកតាបន្ទុកឧបករណ៍ស្តង់ដារយោងតាម International Plumbing Code (IPC) និង British Standards (BS EN 806 / BS EN 12056)។ Water Supply Fixture Units (WSFU/LU) ប៉ាន់ស្មានតម្រូវការទឹកអតិបរមា ខណៈ Drainage Fixture Units (DFU/DU) ត្រូវបានប្រើសម្រាប់គណនាទំហំបំពង់បង្ហូរទឹកស្អុយ។'
              : 'Standard fixture unit values according to the International Plumbing Code (IPC) and British Standards (BS EN 806 / BS EN 12056). Water Supply Fixture Units (WSFU/LU) estimate peak water demand, while Drainage Fixture Units (DFU/DU) are used for sizing sanitary drainage and vent systems.'}
          </p>
          
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-800">{isKhmer ? "ប្រភេទឧបករណ៍" : "Fixture Type"}</th>
                  <th className="px-4 py-3 border-b border-slate-800 text-center text-cyan-400/80">WSFU (Supply)</th>
                  <th className="px-4 py-3 border-b border-slate-800 text-center text-amber-400/80">DFU (Drainage)</th>
                  <th className="px-4 py-3 border-b border-slate-800 text-center">LU (BS 806)</th>
                  <th className="px-4 py-3 border-b border-slate-800 text-center">DU (BS 12056)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {IPC_FIXTURES.map((fixture) => (
                  <tr key={fixture.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{fixture.name}</td>
                    <td className="px-4 py-3 text-center text-cyan-400 font-mono">{fixture.wsfu}</td>
                    <td className="px-4 py-3 text-center text-amber-400 font-mono">{fixture.dfu}</td>
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{fixture.lu}</td>
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{fixture.du}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
                      </div>
    </div>
  );
}
