import React from 'react';
import { useLanguage } from '../lib/translations';
import { X, Info, Thermometer, Building, Home, Monitor, Server, Factory, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoolingLoadReferenceProps {
  isOpen: boolean;
  onClose: () => void;
}

const REFERENCE_DATA = [
  {
    category: 'Commercial Offices',
    icon: Building,
    description: 'Standard office spaces, meeting rooms, and corporate lobbies.',
    metrics: [
      { type: 'Private Office', wm2: '80 - 100', ft2Ton: '350 - 450' },
      { type: 'Open Plan Office', wm2: '90 - 120', ft2Ton: '300 - 400' },
      { type: 'Conference Room', wm2: '130 - 170', ft2Ton: '200 - 300' },
    ]
  },
  {
    category: 'Retail & Hospitality',
    icon: ShoppingCart,
    description: 'Shops, restaurants, and hotels with varying occupancy rates.',
    metrics: [
      { type: 'Retail Store', wm2: '120 - 160', ft2Ton: '250 - 350' },
      { type: 'Restaurant (Dining)', wm2: '150 - 250', ft2Ton: '150 - 250' },
      { type: 'Hotel Guest Room', wm2: '80 - 110', ft2Ton: '350 - 450' },
    ]
  },
  {
    category: 'Residential',
    icon: Home,
    description: 'Apartments, single-family homes, and dormitories.',
    metrics: [
      { type: 'Apartment / Condo', wm2: '60 - 90', ft2Ton: '450 - 600' },
      { type: 'Single Family Home', wm2: '50 - 80', ft2Ton: '500 - 700' },
    ]
  },
  {
    category: 'Healthcare & Education',
    icon: Info,
    description: 'Clinics, hospitals, schools, and university facilities.',
    metrics: [
      { type: 'Hospital / Clinic', wm2: '120 - 180', ft2Ton: '200 - 300' },
      { type: 'School Classroom', wm2: '100 - 130', ft2Ton: '300 - 400' },
      { type: 'Laboratory', wm2: '150 - 250', ft2Ton: '150 - 250' },
    ]
  },
  {
    category: 'Technology & Industrial',
    icon: Server,
    description: 'Data centers, server rooms, and light manufacturing.',
    metrics: [
      { type: 'IT / Server Room', wm2: '500 - 1500+', ft2Ton: '50 - 100' },
      { type: 'Light Manufacturing', wm2: '100 - 150', ft2Ton: '250 - 400' },
    ]
  }
];

export default function CoolingLoadReference({ isOpen, onClose }: CoolingLoadReferenceProps) {
  const { isKhmer, setLanguage, language } = useLanguage();
  

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">ASHRAE Design Parameters</h3>
                <p className="text-xs text-slate-400">Standard cooling load estimates by building type</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            <div className="bg-sky-950/20 border border-sky-900/50 p-4 rounded-xl flex items-start space-x-3">
              <Info className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                <p>
                  {isKhmer ? <><strong className="text-sky-300">កំណត់សម្គាល់៖</strong> ប៉ារ៉ាម៉ែត្រទាំងនេះគឺជាតម្លៃប្រហាក់ប្រហែលផ្អែកលើស្តង់ដារ ASHRAE សម្រាប់អាកាសធាតុក្តៅ។</> : <><strong className="text-sky-300">Reference Disclaimer:</strong> These parameters are approximate rule-of-thumb ranges based on standard ASHRAE guidelines for temperate to hot climates.</>} 
                  Actual cooling loads depend heavily on envelope insulation, window-to-wall ratio, solar orientation, and internal equipment.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REFERENCE_DATA.map((section, idx) => (
                <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center space-x-3">
                    <section.icon className="h-4 w-4 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{section.category}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{section.description}</p>
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-800/50">
                        <div className="col-span-5">Space Type</div>
                        <div className="col-span-3 text-right">Load (W/m²)</div>
                        <div className="col-span-4 text-right">Area (sq.ft/TR)</div>
                      </div>
                      {section.metrics.map((metric, mIdx) => (
                        <div key={mIdx} className="grid grid-cols-12 gap-2 text-xs items-center">
                          <div className="col-span-5 text-slate-300 font-medium">{metric.type}</div>
                          <div className="col-span-3 text-right font-mono text-emerald-400 font-bold">{metric.wm2}</div>
                          <div className="col-span-4 text-right font-mono text-sky-400 font-bold">{metric.ft2Ton}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
