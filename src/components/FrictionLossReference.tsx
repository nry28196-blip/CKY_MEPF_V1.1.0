import { motion, AnimatePresence } from 'motion/react';
import React from 'react';
import { useLanguage } from '../lib/translations';
import { X, Droplets, Info } from 'lucide-react';

interface FrictionLossReferenceProps {
  isOpen: boolean;
  onClose: () => void;
}

const MATERIAL_DATA = [
  { material: 'Plastic (PVC, CPVC, ABS, PE)', cFactor: '150', condition: 'New/All' },
  { material: 'Copper', cFactor: '140', condition: 'New' },
  { material: 'Copper', cFactor: '130', condition: '20 Years Old' },
  { material: 'Cast Iron (Unlined)', cFactor: '130', condition: 'New' },
  { material: 'Cast Iron (Unlined)', cFactor: '100', condition: '20 Years Old' },
  { material: 'Galvanized Steel', cFactor: '120', condition: 'New' },
  { material: 'Galvanized Steel', cFactor: '100', condition: '10-20 Years Old' },
  { material: 'Galvanized Steel', cFactor: '75', condition: 'Old (Tuberculated)' },
  { material: 'Brass', cFactor: '130', condition: 'New' },
  { material: 'Concrete or Cement-Lined', cFactor: '120 - 140', condition: 'New/Good' },
];

export default function FrictionLossReference({ isOpen, onClose }: FrictionLossReferenceProps) {
  const { isKhmer, setLanguage, language } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/20">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hazen-Williams Reference</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Typical Pipe Roughness Coefficients (C-Factors)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/20">
            <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-slate-700/50 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    <th className="p-3 pl-4">Pipe Material</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3 text-right pr-4">C-Factor</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-800/50 font-mono text-slate-300">
                  {MATERIAL_DATA.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-cyan-100">{row.material}</td>
                      <td className="p-3 text-slate-400">{row.condition}</td>
                      <td className="p-3 pr-4 text-right font-bold text-cyan-400">{row.cFactor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note */}
            <div className="mt-4 p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg flex items-start gap-3">
              <Info className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                The Hazen-Williams <span className="text-cyan-400 font-bold">C-factor</span> represents the internal roughness of a pipe. 
                A higher C-factor means a smoother pipe and less friction loss. As pipes age, scaling or tuberculation can lower their C-factor, increasing pressure loss. Standard IPC/UPC calculations typically assume new or moderately aged conditions.
              </p>
            </div>
          </div>
                </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
