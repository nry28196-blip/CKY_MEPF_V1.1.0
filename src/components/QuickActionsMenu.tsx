import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Wind, 
  Droplet, 
  Flame, 
  Layers, 
  DollarSign, 
  X, 
  Sparkles, 
  Scale, 
  Sun, 
  Moon, 
  ArrowUp, 
  BookOpen, 
  Check, 
  Sliders,
  ChevronRight,
  Compass,
  ArrowRightLeft
} from 'lucide-react';
import { TabType } from '../types';
import { useLanguage } from '../lib/translations';

interface QuickActionsMenuProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  autoCalculate: boolean;
  onToggleAutoCalculate: () => void;
  unitSystem: 'metric' | 'imperial';
  onToggleUnitSystem: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenReferenceModal?: () => void;
  onScrollToTop?: () => void;
  onOpenBatchUnitModal?: () => void;
}

interface DisciplineItem {
  id: TabType;
  name: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  colorClass: string;
  activeBg: string;
  activeBorder: string;
}

export default function QuickActionsMenu({
  activeTab,
  onSelectTab,
  autoCalculate,
  onToggleAutoCalculate,
  unitSystem,
  onToggleUnitSystem,
  isDarkMode = true,
  onToggleDarkMode,
  onOpenReferenceModal,
  onScrollToTop,
  onOpenBatchUnitModal
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();

  const disciplines: DisciplineItem[] = [
    {
      id: 'mechanical',
      name: 'Mechanical',
      shortDesc: 'HVAC & Ducts',
      icon: Wind,
      hotkey: '1',
      colorClass: 'text-cyan-400',
      activeBg: 'bg-cyan-950/40',
      activeBorder: 'border-cyan-500/70 text-cyan-300'
    },
    {
      id: 'electrical',
      name: 'Electrical',
      shortDesc: 'Power & FLC',
      icon: Zap,
      hotkey: '2',
      colorClass: 'text-amber-400',
      activeBg: 'bg-amber-950/40',
      activeBorder: 'border-amber-500/70 text-amber-300'
    },
    {
      id: 'plumbing',
      name: 'Plumbing',
      shortDesc: 'Supply & Pipes',
      icon: Droplet,
      hotkey: '3',
      colorClass: 'text-sky-400',
      activeBg: 'bg-sky-950/40',
      activeBorder: 'border-sky-500/70 text-sky-300'
    },
    {
      id: 'fire',
      name: 'Fire Protection',
      shortDesc: 'Sprinklers & Pumps',
      icon: Flame,
      hotkey: '4',
      colorClass: 'text-rose-400',
      activeBg: 'bg-rose-950/40',
      activeBorder: 'border-rose-500/70 text-rose-300'
    },
    {
      id: 'bulk',
      name: 'Bulk Batch',
      shortDesc: 'Batch Schedules',
      icon: Layers,
      hotkey: '5',
      colorClass: 'text-purple-400',
      activeBg: 'bg-purple-950/40',
      activeBorder: 'border-purple-500/70 text-purple-300'
    },
    {
      id: 'cost',
      name: 'Cost Estimator',
      shortDesc: 'MEPF Quantities',
      icon: DollarSign,
      hotkey: '6',
      colorClass: 'text-emerald-400',
      activeBg: 'bg-emerald-950/40',
      activeBorder: 'border-emerald-500/70 text-emerald-300'
    }
  ];

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Global hotkeys listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // 'q' or 'Alt+q' toggles the Quick Actions menu
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Escape closes the menu
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // When open, keys 1-6 switch disciplines
      if (isOpen) {
        if (e.key >= '1' && e.key <= '6') {
          const index = parseInt(e.key, 10) - 1;
          const disc = disciplines[index];
          if (disc) {
            e.preventDefault();
            onSelectTab(disc.id);
            onScrollToTop?.();
          }
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          onToggleAutoCalculate();
        } else if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          onToggleUnitSystem();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onSelectTab, onToggleAutoCalculate, onToggleUnitSystem, onScrollToTop]);

  const handleDisciplineClick = (tabId: TabType) => {
    onSelectTab(tabId);
    onScrollToTop?.();
  };

  return (
    <>
      {/* Floating Action Trigger Button in Bottom-Right Corner */}
      <div className="fixed bottom-6 right-6 z-50 font-sans floating-quick-actions">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Quick Actions Menu"
          aria-expanded={isOpen}
          className={`flex items-center gap-2.5 px-3.5 py-3 rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer border group ${
            isOpen
              ? 'bg-slate-900 border-slate-700 text-white shadow-black/80 ring-2 ring-cyan-500/40'
              : 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-950/60 hover:shadow-cyan-500/30'
          }`}
          title="Quick Actions & Discipline Switcher (Press Q)"
        >
          {/* Animated Icon */}
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X className="w-5 h-5 text-slate-300 group-hover:text-white transition-transform group-hover:rotate-90 duration-200" />
            ) : (
              <>
                <Compass className="w-5 h-5 text-white animate-pulse" />
                {autoCalculate && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-cyan-700 animate-ping" />
                )}
              </>
            )}
          </div>

          {/* Label (desktop only, compact on mobile) */}
          <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
            {isOpen ? 'Close' : 'Quick Actions'}
          </span>

          {/* Hotkey hint pill */}
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-black/30 border border-white/20 text-white/90">
            Q
          </kbd>
        </button>
      </div>

      {/* Floating Modal Panel */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-20 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/90 p-4 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200 text-slate-200 font-sans"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                  Quick Actions
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">Discipline jump & workflow switches</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close menu (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/90 border border-slate-800/80 px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-slate-400">Tab:</span>
              <span className="text-cyan-300 font-bold uppercase">{activeTab}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                {unitSystem === 'metric' ? 'SI METRIC' : 'IP IMPERIAL'}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${autoCalculate ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-400'}`}>
                {autoCalculate ? 'AUTO ON' : 'MANUAL'}
              </span>
            </div>
          </div>

          {/* Section 1: Disciplines Navigation Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Jump to Discipline
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Keys [1 - 6]</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {disciplines.map(disc => {
                const isActive = activeTab === disc.id;
                const IconComponent = disc.icon;

                return (
                  <button
                    key={disc.id}
                    onClick={() => handleDisciplineClick(disc.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isActive
                        ? `${disc.activeBg} ${disc.activeBorder} ring-1 ring-cyan-500/40 shadow-sm`
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 ${disc.colorClass}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold leading-tight truncate text-white">
                          {disc.name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono truncate">
                          {disc.shortDesc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}
                      <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-950 rounded border border-slate-800">
                        {disc.hotkey}
                      </kbd>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Quick Workflow Controls */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block">
              Workflow Settings
            </span>

            {/* Auto-Calculate Toggle */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg border ${autoCalculate ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Auto-Calculate</span>
                    <kbd className="px-1 text-[8px] font-mono bg-slate-950 rounded border border-slate-800 text-slate-400">A</kbd>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {autoCalculate ? 'Instant computation on input' : 'Manual run triggered'}
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={onToggleAutoCalculate}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoCalculate ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
                title="Toggle Auto-Calculate (Hotkey: A)"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoCalculate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Unit System Toggle */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Units System</span>
                    <kbd className="px-1 text-[8px] font-mono bg-slate-950 rounded border border-slate-800 text-slate-400">U</kbd>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {unitSystem === 'metric' ? 'Metric: L/s, kW, Pa, m' : 'Imperial: CFM, Tons, in.wg, ft'}
                  </div>
                </div>
              </div>

              {/* Segmented Button for Units */}
              <button
                onClick={onToggleUnitSystem}
                className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 cursor-pointer"
                title="Switch Unit System (Hotkey: U)"
              >
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${unitSystem === 'metric' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}>
                  SI
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${unitSystem === 'imperial' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}>
                  IP
                </span>
              </button>
            </div>

            {/* Batch Unit Converter Trigger */}
            {onOpenBatchUnitModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBatchUnitModal();
                }}
                className="w-full flex items-center justify-between p-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/60 rounded-xl text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/60 text-indigo-400 group-hover:text-indigo-300">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-200">
                      Batch Unit Converter
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Simultaneously convert 22+ MEP parameters
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Quick Actions Footer Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onScrollToTop && (
                <button
                  onClick={() => {
                    onScrollToTop();
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scroll to Top</span>
                </button>
              )}

              {onOpenReferenceModal && (
                <button
                  onClick={() => {
                    onOpenReferenceModal();
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>References</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Tip Footer */}
          <div className="pt-1 text-[9px] text-slate-500 font-mono text-center flex items-center justify-center gap-1">
            <span>Press</span>
            <kbd className="px-1 rounded bg-slate-900 border border-slate-800 text-slate-400">Q</kbd>
            <span>or</span>
            <kbd className="px-1 rounded bg-slate-900 border border-slate-800 text-slate-400">Esc</kbd>
            <span>anytime to toggle menu</span>
          </div>
        </div>
      )}
    </>
  );
}
