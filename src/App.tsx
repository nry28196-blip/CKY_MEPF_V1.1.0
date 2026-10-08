/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Wind,
  Droplet,
  Flame,
  Zap,
  Layers,
  Calculator,
  History,
  Trash2,
  Clock,
  BookOpen,
  Sun,
  Moon,
  Scale,
  CheckSquare,
  Square,
  Languages,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Ruler,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Construction,
  Info,
  ChevronDown,
  ChevronRight,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Pencil,
  FileSpreadsheet,
  ChefHat,
  Thermometer,
  Compass,
  Search,
  X,
  FolderKanban,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TabType, HistoryItem, ProjectContainer } from './types';
import { EngineeringStatus } from './components/common/EngineeringStatusHeader';
import MechanicalCalc from './components/MechanicalCalc';
import ElectricalCalc from './components/ElectricalCalc';
import PlumbingCalc from './components/PlumbingCalc';
import FireCalc from './components/FireCalc';
import BulkCalc from './components/BulkCalc';
import CostCalc from './components/CostCalc';
import Ashrae621VentilationCalc from './components/Ashrae621VentilationCalc';
import Ashrae621ExhaustCalc from './components/Ashrae621ExhaustCalc';
import AirBalanceCalc from './components/AirBalanceCalc';
import SystemPerformanceCalc from './components/SystemPerformanceCalc';
import VentilationReportsView from './components/VentilationReportsView';
import DuctSizingCalc from './components/DuctSizingCalc';
import StaticPressureCalc from './components/StaticPressureCalc';
import DuctFittingsLossView from './components/DuctFittingsLossView';
import KitchenVentilationCalc from './components/KitchenVentilationCalc';
import NotYetImplementedModuleCard from './components/common/NotYetImplementedModuleCard';
import IAQCalc from './components/IAQCalc';
import InteractiveFormulaReferenceCard from './components/InteractiveFormulaReferenceCard';
import QuickActionsMenu from './components/QuickActionsMenu';
import EngineeringUnitConverter from './components/EngineeringUnitConverter';
import ReferenceModal from './components/ReferenceModal';
import CompareModal from './components/CompareModal';
import PdfExportConfigModal from './components/PdfExportConfigModal';
import ProjectManagerModal from './components/ProjectManagerModal';
import BatchUnitConvertModal from './components/BatchUnitConvertModal';
import AuditTrailOverlayModal from './components/AuditTrailOverlayModal';
import SidebarConversionList from './components/SidebarConversionList';
import { useLanguage } from './lib/translations';
import { exportElementToPdf } from './lib/exportPdf';
import {
  exportVentilationToCsv,
  exportCoolingLoadToCsv,
  exportVrfToCsv,
  exportDuctSizingToCsv,
  exportExhaustToCsv,
  exportStaticPressureToCsv,
  exportKitchenVentilationToCsv,
  exportAirBalanceToCsv,
  exportDuctFittingsToCsv,
  downloadCsv
} from './lib/exportCsv';
import { useUnit } from './lib/UnitContext';
import { scrollWorkspaceToTop } from './lib/scrollUtils';
import { getProjects } from './lib/projectStorage';
import {
  VentilationSubMode,
  DEFAULT_MECHANICAL_MODULES,
  MECHANICAL_MODULE_METADATA,
  SUB_SYSTEM_MODULES,
  SUBORDINATE_LABELS,
  resolveActiveMechanicalModule,
  getMechanicalBreadcrumbs,
  getMechanicalPageTitle
} from './lib/navigationUtils';

export { DEFAULT_MECHANICAL_MODULES, MECHANICAL_MODULE_METADATA, SUB_SYSTEM_MODULES, SUBORDINATE_LABELS };
export type { VentilationSubMode };

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const { unitSystem, toggleUnitSystem } = useUnit();

  // Main System State (Sidebar)
  const [activeTab, setActiveTab] = useState<TabType>('mechanical');

  // Subordinate System States across Main Systems (Section 1 & 2)
  const [activeSubordinates, setActiveSubordinates] = useState<Record<string, string>>({
    mechanical: 'cooling',
    plumbing: 'fixtures',
    fire: 'equipment',
    electrical: 'flc',
    bulk: 'batch_duct'
  });

  // Active Module per Mechanical / HVAC system (Section 3 & 10)
  const [mechanicalModules, setMechanicalModules] = useState<Record<string, string>>({
    cooling: 'estimate',
    ventilation: 'calculation',
    psychrometrics: 'properties',
    ductSizing: 'equal_friction',
    fanDuty: 'pressure',
    kitchenHood: 'capture',
    heatRecovery: 'hrv_sizing'
  });

  // Accordion Expand/Collapse State per Parent System
  const [expandedParents, setExpandedParents] = useState<Record<TabType, boolean>>({
    mechanical: true,
    plumbing: false,
    fire: false,
    electrical: false,
    bulk: false,
    cost: false
  });

  // Ventilation Sub-System Mode (Top Sub-System Panel)
  const [ventilationSubMode, setVentilationSubMode] = useState<VentilationSubMode>('calculation');

  // Sidebar Search Query State for MEP Subordinate Systems & Modules
  const [searchQuery, setSearchQuery] = useState<string>('');

  const workspaceRef = useRef<HTMLDivElement>(null);

  const [isRefModalOpen, setIsRefModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cky_mepf_theme');
      return saved === 'light' ? false : true;
    } catch {
      return true;
    }
  });

  const [autoCalculate, setAutoCalculate] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cky_mepf_autocalculate');
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectContainer[]>(getProjects);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isBatchUnitModalOpen, setIsBatchUnitModalOpen] = useState<boolean>(false);
  const [lastCalculationResult, setLastCalculationResult] = useState<any>(null);
  const [coolingResult, setCoolingResult] = useState<any>(null);
  const [exhaustStatus, setExhaustStatus] = useState<EngineeringStatus | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('cky_mepf_theme', isDarkMode ? 'dark' : 'light');
    } catch (e) {
      console.error(e);
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('cky_mepf_autocalculate', autoCalculate ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }, [autoCalculate]);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cky_mepf_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [restoredParams, setRestoredParams] = useState<HistoryItem | null>(null);

  // Precise active module identifier resolver across all Mechanical / HVAC subordinates
  const getActiveMechModuleId = useCallback((subId?: string): string => {
    const targetSub = subId || activeSubordinates.mechanical || 'cooling';
    return resolveActiveMechanicalModule(targetSub, mechanicalModules, ventilationSubMode);
  }, [activeSubordinates.mechanical, ventilationSubMode, mechanicalModules]);

  // Active screen identity key: changes whenever user navigates to another screen, module, or saved run
  const currentMechModule = activeTab === 'mechanical'
    ? getActiveMechModuleId(activeSubordinates.mechanical)
    : '';
  const activeScreenKey = `${activeTab}-${activeSubordinates[activeTab] || ''}-${currentMechModule}-${restoredParams?.id || ''}`;

  // Instantly reset workspace scroll to top whenever any screen or module changes
  useLayoutEffect(() => {
    scrollWorkspaceToTop();
    const rafId = requestAnimationFrame(scrollWorkspaceToTop);
    const t1 = setTimeout(scrollWorkspaceToTop, 40);
    const t2 = setTimeout(scrollWorkspaceToTop, 150);
    const t3 = setTimeout(scrollWorkspaceToTop, 260);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeScreenKey]);

  // Side-by-Side comparison states
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');

  const updateHistoryNotes = (id: string, notes: string) => {
    setHistory((prev) => {
      const next = prev.map(p => p.id === id ? { ...p, notes } : p);
      localStorage.setItem('cky_mepf_history', JSON.stringify(next));
      return next;
    });
  };

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setHistory((prev) => {
      const filtered = prev.filter(p => JSON.stringify(p.parameters) !== JSON.stringify(item.parameters) || p.title !== item.title);
      const next = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem('cky_mepf_history', JSON.stringify(next));
      return next;
    });
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('cky_mepf_history', JSON.stringify(next));
      return next;
    });
    if (restoredParams?.id === id) {
      setRestoredParams(null);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('cky_mepf_history');
    setRestoredParams(null);
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setActiveTab(item.tab);
    if (item.subType) {
      setActiveSubordinates(prev => ({
        ...prev,
        [item.tab]: item.subType as string
      }));
    }
    setRestoredParams(item);
    scrollWorkspaceToTop();
  };

  const handleSaveCurrentCalculation = () => {
    let summary = 'Standard engineering execution';

    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      const currentMod = getActiveMechModuleId(currentSub);

      if (currentSub === 'ventilation') {
        if (currentMod === 'calculation') {
          const status = lastCalculationResult?.status;
          const finalAir = lastCalculationResult?.finalDesignOutdoorAir;
          const space = lastCalculationResult?.spaceType || lastCalculationResult?.zone?.spaceType?.name || 'Configured Space';

          if (typeof finalAir === 'number' && status) {
            summary = `Required OA: ${finalAir.toFixed(1)} L/s | Space: ${space} | ASHRAE 62.1-2022 ${status}`;
          } else if (status) {
            summary = `ASHRAE 62.1-2022 calculation status: ${status}`;
          } else {
            summary = 'Calculation result unavailable';
          }
        } else if (currentMod === 'exhaust') {
          if (exhaustStatus) {
            summary = `Exhaust Table 6-2 prescriptive status: ${exhaustStatus}`;
          } else {
            summary = 'Calculation result unavailable';
          }
        } else if (currentMod === 'balance') {
          summary = 'Volumetric air balance diagnostic summary';
        } else if (currentMod === 'reports') {
          const status = lastCalculationResult?.status;
          summary = status ? `Ventilation submittal report audit status: ${status}` : 'Calculation result unavailable';
        }
      } else if (currentSub === 'cooling') {
        summary = coolingResult?.totalCoolingTons
          ? `Cooling estimate: ${coolingResult.totalCoolingTons.toFixed(1)} Tons (Simplified model)`
          : 'Cooling load estimate (Simplified model)';
      } else {
        summary = `${currentSub.toUpperCase()} calculation parameters saved`;
      }
    }

    addHistoryItem({
      tab: activeTab,
      subType: activeSubordinates[activeTab],
      title: activeTab === 'mechanical' && activeSubordinates.mechanical === 'ventilation'
        ? `ASHRAE 62.1 Ventilation (${ventilationSubMode.toUpperCase()})`
        : `${activeTab.toUpperCase()} Calculation`,
      summary,
      parameters: { activeTab, activeSubordinates, ventilationSubMode, lastCalculationResult, exhaustStatus, coolingResult }
    });
  };

  /**
   * Universal CSV export handler for active calculation view
   */
  const handleExportCurrentCsv = () => {
    const isMetric = unitSystem === 'metric';

    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      const currentMod = getActiveMechModuleId(currentSub);

      if (currentSub === 'ventilation') {
        if (currentMod === 'exhaust') {
          exportExhaustToCsv({
            isMetric,
            complianceProcedure: 'prescriptive',
            overallStatus: exhaustStatus || 'READY',
            rows: []
          });
          return;
        }
        if (currentMod === 'balance') {
          exportAirBalanceToCsv({
            isMetric,
            mode: 'system',
            supplyAir: isMetric ? 1000 : 2000,
            exhaustAir: isMetric ? 800 : 1600,
            returnAir: isMetric ? 200 : 400,
            netAirflow: 0,
            pressureRelationship: 'Balanced'
          });
          return;
        }
        exportVentilationToCsv({
          isMetric,
          systemType: lastCalculationResult?.systemType || 'single_zone',
          result: lastCalculationResult,
          zones: lastCalculationResult?.zones || []
        });
        return;
      }

      if (currentSub === 'cooling') {
        if (currentMod === 'vrf' || currentMod === 'schedules') {
          exportVrfToCsv({
            rooms: [
              { name: 'Zone 1', size: 50, basis: 'area', occupants: 4, tons: 2.0 },
              { name: 'Zone 2', size: 40, basis: 'area', occupants: 3, tons: 1.5 }
            ],
            diversityFactor: 1.15,
            totalConnectedTons: 3.5,
            coincidentTons: 3.04,
            oduSizeHp: 4,
            oduSizeTons: 3.4,
            combinationRatio: 102.9,
            pipingLength: 45,
            refrigerantCharge: 2.48
          });
          return;
        }
        exportCoolingLoadToCsv({
          basis: coolingResult?.estimationBasis || 'area',
          projectType: 'Commercial',
          area: coolingResult?.area || 100,
          volume: coolingResult?.volume || 300,
          occupants: coolingResult?.occupants || 5,
          tons: coolingResult?.totalCoolingTons || 5.0,
          btu: (coolingResult?.totalCoolingTons || 5.0) * 12000,
          watts: (coolingResult?.totalCoolingTons || 5.0) * 3517,
          sensibleWatts: coolingResult?.sensibleWatts,
          latentWatts: coolingResult?.latentWatts,
          status: coolingResult?.status || 'READY'
        });
        return;
      }

      if (currentSub === 'ductSizing') {
        if (currentMod === 'fittings') {
          exportDuctFittingsToCsv({
            isMetric,
            velocity: isMetric ? 6.0 : 1200,
            airDensity: isMetric ? 1.204 : 0.075,
            velocityPressure: isMetric ? 21.67 : 0.09,
            selectedCategory: 'all',
            fittings: []
          });
          return;
        }
        if (currentMod === 'critical_path') {
          exportStaticPressureToCsv({
            isMetric,
            density: isMetric ? 1.204 : 0.075,
            roughness: isMetric ? 0.00009 : 0.0003,
            safetyFactor: 10,
            criticalPathId: 'path-1',
            criticalPathName: 'Governing Critical Duct Run',
            maxPressure: isMetric ? 250 : 1.0,
            designPressure: isMetric ? 275 : 1.1,
            maxPathAirflow: isMetric ? 1200 : 2500,
            paths: []
          });
          return;
        }
        exportDuctSizingToCsv({
          airflow: isMetric ? 1000 : 2000,
          frictionRate: isMetric ? 0.8 : 0.1,
          velocityLimit: isMetric ? 5.0 : 1200,
          ductHeight: isMetric ? 300 : 14,
          widthMain: isMetric ? 450 : 22,
          deMain: isMetric ? 380 : 18.5,
          velRoundMain: isMetric ? 4.8 : 1050,
          velRectMain: isMetric ? 4.4 : 940,
          branches: []
        });
        return;
      }

      if (currentSub === 'fanDuty') {
        exportStaticPressureToCsv({
          isMetric,
          density: isMetric ? 1.204 : 0.075,
          roughness: isMetric ? 0.00009 : 0.0003,
          safetyFactor: 10,
          criticalPathId: 'path-1',
          criticalPathName: 'Governing Fan Duty Index Run',
          maxPressure: isMetric ? 280 : 1.12,
          designPressure: isMetric ? 308 : 1.23,
          maxPathAirflow: isMetric ? 1500 : 3000,
          paths: []
        });
        return;
      }

      if (currentSub === 'kitchenHood') {
        exportKitchenVentilationToCsv({
          isMetric,
          standard: 'unlisted',
          hoodType: 'wall',
          duty: 'medium',
          hoodLength: isMetric ? 3.0 : 10,
          hoodDepth: isMetric ? 1.2 : 4,
          exhaustAirflow: isMetric ? 850 : 1800,
          muaTotalFlow: isMetric ? 680 : 1440,
          totalMuaRatio: 80,
          ductArea: isMetric ? 425 : 65,
          ductVelocity: isMetric ? 2.5 : 500,
          status: 'READY'
        });
        return;
      }
    }

    // Default/fallback for current view
    const rows = [
      { section: 'Active View', parameter: 'Discipline', value: activeTab.toUpperCase(), unit: '-', notes: '' },
      { section: 'Active View', parameter: 'Sub-system', value: (activeSubordinates[activeTab] || '').toUpperCase(), unit: '-', notes: '' },
      { section: 'Active View', parameter: 'Timestamp', value: new Date().toLocaleString(), unit: '-', notes: '' }
    ];

    if (lastCalculationResult) {
      if (lastCalculationResult.status) {
        rows.push({ section: 'Results', parameter: 'Validation Status', value: lastCalculationResult.status, unit: '-', notes: '' });
      }
      if (typeof lastCalculationResult.finalDesignOutdoorAir === 'number') {
        rows.push({ section: 'Results', parameter: 'Required Outdoor Airflow', value: lastCalculationResult.finalDesignOutdoorAir.toFixed(1), unit: isMetric ? 'L/s' : 'cfm', notes: '' });
      }
    }

    if (coolingResult) {
      if (coolingResult.totalCoolingTons) {
        rows.push({ section: 'Results', parameter: 'Cooling Capacity', value: coolingResult.totalCoolingTons.toFixed(2), unit: 'TR', notes: '' });
      }
    }

    downloadCsv(`${activeTab}_${activeSubordinates[activeTab] || 'calc'}`, `${activeTab.toUpperCase()} Calculation Data`, rows);
  };

  // Stable callback for ventilation calculation result propagation
  const handleVentilationChange = useCallback((flow: number, details: any) => {
    setLastCalculationResult((prev: any) => {
      if (prev === details) return prev;
      return details;
    });
  }, []);

  // MAIN SYSTEMS: 5 MAJOR SYSTEMS WITH SUBORDINATE SYSTEMS (SECTION 1, 2, 6)
  const mainSystems: Array<{
    id: TabType;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
    subordinates: Array<{
      id: string;
      label: string;
      badge?: string;
    }>;
  }> = [
    {
      id: 'mechanical',
      label: 'Mechanical / HVAC',
      sublabel: 'Ventilation & Airflow',
      icon: Wind,
      badge: 'ASHRAE 62.1',
      subordinates: [
        { id: 'cooling', label: 'Cooling Load' },
        { id: 'ventilation', label: 'Ventilation', badge: '62.1' },
        { id: 'psychrometrics', label: 'Psychrometrics' },
        { id: 'ductSizing', label: 'Duct Design' },
        { id: 'fanDuty', label: 'Fan Selection' },
        { id: 'kitchenHood', label: 'Kitchen Hood' },
        { id: 'heatRecovery', label: 'Heat Recovery' }
      ]
    },
    {
      id: 'plumbing',
      label: 'Plumbing',
      sublabel: 'Water & Drainage',
      icon: Droplet,
      badge: 'IPC 2021',
      subordinates: [
        { id: 'fixtures', label: 'Water Supply & Drainage' },
        { id: 'tanks', label: 'Water Storage Tanks' },
        { id: 'pumps', label: 'Booster & Transfer Pumps' },
        { id: 'formulas', label: 'IPC Standards' }
      ]
    },
    {
      id: 'fire',
      label: 'Fire Fighting',
      sublabel: 'Hydraulics & Pumps',
      icon: Flame,
      badge: 'NFPA 13/14',
      subordinates: [
        { id: 'equipment', label: 'Equipment & Sprinklers' },
        { id: 'sizing', label: 'Hydraulic & Supply Sizing' },
        { id: 'pump', label: 'Fire Pumps & Pressure' },
        { id: 'formulas', label: 'NFPA 13/14 Standards' }
      ]
    },
    {
      id: 'electrical',
      label: 'Electrical / FLC',
      sublabel: 'FLC & Voltage Drop',
      icon: Zap,
      badge: 'NEC / IEC',
      subordinates: [
        { id: 'flc', label: 'Full Load Current (FLC)' },
        { id: 'vd', label: 'Voltage Drop & Cables' },
        { id: 'ups', label: 'UPS Sizing & Runtime' },
        { id: 'elv_ups', label: 'ELV Emergency Power' },
        { id: 'formulas', label: 'NEC / IEC Standards' }
      ]
    },
    {
      id: 'bulk',
      label: 'Bulk',
      sublabel: 'Batch Operations',
      icon: Layers,
      badge: 'Batch',
      subordinates: [
        { id: 'batch_duct', label: 'Bulk Duct Sizing' },
        { id: 'batch_cooling', label: 'Bulk Cooling Load' },
        { id: 'batch_flc', label: 'Bulk Electrical FLC' },
        { id: 'batch_pipe', label: 'Bulk Pipe Sizing' }
      ]
    },
  ];

  // Accordion Toggle Handler
  const handleToggleParent = (systemId: TabType) => {
    setExpandedParents(prev => ({
      ...prev,
      [systemId]: !prev[systemId]
    }));
    if (activeTab !== systemId) {
      setActiveTab(systemId);
      setRestoredParams(null);
      scrollWorkspaceToTop();
    }
  };

  // Subordinate System Selection Handler
  const handleSelectSubordinate = (systemId: TabType, subId: string) => {
    // 1. Set parent system as active
    setActiveTab(systemId);
    // 2. Set subordinate system as active
    setActiveSubordinates(prev => ({
      ...prev,
      [systemId]: subId
    }));
    // 3. Keep parent expanded
    setExpandedParents(prev => ({
      ...prev,
      [systemId]: true
    }));
    // 4. Reset the appropriate module to that subordinate system's default module
    if (systemId === 'mechanical') {
      const defaultMod = DEFAULT_MECHANICAL_MODULES[subId] || 'estimate';
      setMechanicalModules(prev => ({
        ...prev,
        [subId]: defaultMod
      }));
      if (subId === 'ventilation') {
        setVentilationSubMode('calculation');
      }
    }
    setRestoredParams(null);
    // 5. Scroll calculation workspace to the top
    scrollWorkspaceToTop();
  };

  // SEARCH INDEX: All MEP Subordinate Systems & Specialized Modules
  interface SearchIndexItem {
    id: string;
    name: string;
    systemId: TabType;
    subId: string;
    ventSubMode?: VentilationSubMode;
    systemLabel: string;
    systemIcon: React.ElementType;
    badge?: string;
    description: string;
    keywords: string[];
  }

  const searchIndex: SearchIndexItem[] = [
    // Mechanical / HVAC Subordinates & Modules
    {
      id: 'mech-vent-calc',
      name: 'Ventilation Calculation',
      systemId: 'mechanical',
      subId: 'ventilation',
      ventSubMode: 'calculation',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'ASHRAE 62.1',
      description: 'Outdoor airflow rates Vbz, Ez, Voz per ASHRAE 62.1-2022 Ventilation Rate Procedure',
      keywords: ['ashrae', '62.1', 'ventilation', 'outdoor air', 'fresh air', 'vbz', 'voz', 'ez', 'density']
    },
    {
      id: 'mech-vent-exhaust',
      name: 'Exhaust Air Rates',
      systemId: 'mechanical',
      subId: 'ventilation',
      ventSubMode: 'exhaust',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Prescriptive 6.5.1',
      description: 'Prescriptive exhaust airflow sizing per ASHRAE 62.1 Table 6-2 (Performance path unverified)',
      keywords: ['exhaust', 'table 6-2', 'restroom', 'toilet', 'parking', 'kitchen exhaust', 'extraction']
    },
    {
      id: 'mech-vent-balance',
      name: 'Air Balance & Pressurization',
      systemId: 'mechanical',
      subId: 'ventilation',
      ventSubMode: 'balance',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Diagnostic Only',
      description: 'Diagnostic airflow balance and building zone pressurization evaluation (Non-authoritative)',
      keywords: ['balance', 'air balance', 'pressure', 'pressurization', 'differential', 'supply', 'exhaust']
    },
    {
      id: 'mech-vent-heat',
      name: 'Heat Recovery (HRV / ERV)',
      systemId: 'mechanical',
      subId: 'heatRecovery',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Not Yet Implemented',
      description: 'Not Yet Implemented: Planned HRV/ERV heat recovery performance models per AHRI 1060',
      keywords: ['hrv', 'erv', 'heat recovery', 'energy recovery', 'efficiency', 'enthalpy']
    },
    {
      id: 'mech-vent-reports',
      name: 'Ventilation Reports & Schedules',
      systemId: 'mechanical',
      subId: 'ventilation',
      ventSubMode: 'reports',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Reports',
      description: 'ASHRAE 62.1 calculation documentation and schedule reports (Reflects calculation audit state)',
      keywords: ['reports', 'schedules', 'submittals', 'pdf', 'export', 'compliance']
    },
    {
      id: 'mech-cooling',
      name: 'Cooling Load Estimate',
      systemId: 'mechanical',
      subId: 'cooling',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Simplified Model',
      description: 'Simplified cooling load estimate model (Preliminary, not ready for authoritative engineering use)',
      keywords: ['cooling', 'load', 'sensible', 'latent', 'chiller', 'vrf', 'tons', 'btu', 'heat gain']
    },
    {
      id: 'mech-psychro',
      name: 'Psychrometric Analysis',
      systemId: 'mechanical',
      subId: 'psychrometrics',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Reference Library',
      description: 'Psychrometric formulas & reference library (State analysis calculators under specification)',
      keywords: ['psychrometric', 'psychrometrics', 'dew point', 'wet bulb', 'enthalpy', 'humidity']
    },
    {
      id: 'mech-duct',
      name: 'Duct Design & Sizing',
      systemId: 'mechanical',
      subId: 'ductSizing',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Calculation Utility',
      description: 'Equal friction duct sizing utility, fitting loss database, and static pressure diagnostic aid',
      keywords: ['duct', 'duct sizing', 'friction', 'velocity', 'static pressure', 'air distribution']
    },
    {
      id: 'mech-fan',
      name: 'Fan Selection & Duty',
      systemId: 'mechanical',
      subId: 'fanDuty',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Calculation Aid',
      description: 'Total external static pressure (TSP) calculation aid (Fan curves and motor selection not yet implemented)',
      keywords: ['fan', 'fan selection', 'fan duty', 'static pressure', 'esp', 'bhp', 'blower']
    },
    {
      id: 'mech-kitchen',
      name: 'Commercial Kitchen Hood',
      systemId: 'mechanical',
      subId: 'kitchenHood',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Diagnostic Only',
      description: 'Diagnostic estimation utility for kitchen hood capture velocity, grease filters, and make-up air',
      keywords: ['kitchen', 'kitchen hood', 'hood', 'culinary', 'grease', 'nfpa 96', 'type 1']
    },
    {
      id: 'mech-heat-recovery-sys',
      name: 'Heat Recovery System',
      systemId: 'mechanical',
      subId: 'heatRecovery',
      systemLabel: 'Mechanical / HVAC',
      systemIcon: Wind,
      badge: 'Not Yet Implemented',
      description: 'Not Yet Implemented: Planned HRV/ERV heat recovery performance models per AHRI 1060',
      keywords: ['heat recovery', 'thermal', 'energy recovery', 'cop', 'eer']
    },

    // Plumbing
    {
      id: 'plumb-fixtures',
      name: 'Water Supply & Drainage',
      systemId: 'plumbing',
      subId: 'fixtures',
      systemLabel: 'Plumbing',
      systemIcon: Droplet,
      badge: 'IPC 2021',
      description: 'WSFU and DFU fixture units, domestic cold/hot water demand',
      keywords: ['water', 'plumbing', 'fixtures', 'wsfu', 'dfu', 'drainage', 'supply', 'pipe']
    },
    {
      id: 'plumb-tanks',
      name: 'Water Storage Tanks',
      systemId: 'plumbing',
      subId: 'tanks',
      systemLabel: 'Plumbing',
      systemIcon: Droplet,
      badge: 'Storage',
      description: 'Domestic underground/overhead water storage volume sizing',
      keywords: ['tank', 'storage', 'water tank', 'reservoir', 'volume', 'capacity']
    },
    {
      id: 'plumb-pumps',
      name: 'Booster & Transfer Pumps',
      systemId: 'plumbing',
      subId: 'pumps',
      systemLabel: 'Plumbing',
      systemIcon: Droplet,
      badge: 'Pumps',
      description: 'Total dynamic head (TDH), flow rate (GPM/LPS), and motor kW',
      keywords: ['pump', 'booster', 'transfer', 'tdh', 'head', 'plumbing pump']
    },
    {
      id: 'plumb-formulas',
      name: 'IPC Standards & Reference',
      systemId: 'plumbing',
      subId: 'formulas',
      systemLabel: 'Plumbing',
      systemIcon: Droplet,
      badge: 'IPC Code',
      description: 'International Plumbing Code sizing tables and velocity limits',
      keywords: ['ipc', 'plumbing code', 'standards', 'formula', 'ipc 2021']
    },

    // Fire Fighting
    {
      id: 'fire-equipment',
      name: 'Equipment & Sprinklers',
      systemId: 'fire',
      subId: 'equipment',
      systemLabel: 'Fire Fighting',
      systemIcon: Flame,
      badge: 'NFPA 13',
      description: 'Hazard classification, design area, density, and sprinkler coverage',
      keywords: ['sprinkler', 'nfpa 13', 'hazard', 'fire protection', 'k-factor', 'density']
    },
    {
      id: 'fire-sizing',
      name: 'Hydraulic & Supply Sizing',
      systemId: 'fire',
      subId: 'sizing',
      systemLabel: 'Fire Fighting',
      systemIcon: Flame,
      badge: 'NFPA 14',
      description: 'Hazen-Williams friction loss and standpipe system sizing',
      keywords: ['hydraulic', 'pipe sizing', 'standpipe', 'nfpa 14', 'friction loss', 'gpm']
    },
    {
      id: 'fire-pump',
      name: 'Fire Pumps & Pressure',
      systemId: 'fire',
      subId: 'pump',
      systemLabel: 'Fire Fighting',
      systemIcon: Flame,
      badge: 'NFPA 20',
      description: 'Rated capacity, churn pressure, net head, and driver power sizing',
      keywords: ['fire pump', 'nfpa 20', 'churn', 'head', 'fire pressure', 'driver']
    },
    {
      id: 'fire-formulas',
      name: 'NFPA 13/14 Standards',
      systemId: 'fire',
      subId: 'formulas',
      systemLabel: 'Fire Fighting',
      systemIcon: Flame,
      badge: 'NFPA Code',
      description: 'NFPA fire protection code references and friction loss charts',
      keywords: ['nfpa', 'fire code', 'standards', 'nfpa 13', 'nfpa 20']
    },

    // Electrical / FLC
    {
      id: 'elec-flc',
      name: 'Full Load Current (FLC)',
      systemId: 'electrical',
      subId: 'flc',
      systemLabel: 'Electrical / FLC',
      systemIcon: Zap,
      badge: 'NEC 430',
      description: 'Motor full load current, power factor, and breaker sizing',
      keywords: ['flc', 'full load current', 'current', 'amps', 'electrical', 'kw', 'motor', 'breaker']
    },
    {
      id: 'elec-vd',
      name: 'Voltage Drop & Cables',
      systemId: 'electrical',
      subId: 'vd',
      systemLabel: 'Electrical / FLC',
      systemIcon: Zap,
      badge: 'NEC 310',
      description: 'Conductor cross-section, allowable % drop, and conduit sizing',
      keywords: ['voltage drop', 'cables', 'wire', 'conduit', 'ampacity', 'derating', 'nec']
    },
    {
      id: 'elec-ups',
      name: 'UPS Sizing & Runtime',
      systemId: 'electrical',
      subId: 'ups',
      systemLabel: 'Electrical / FLC',
      systemIcon: Zap,
      badge: 'Battery',
      description: 'kVA rating, battery backup duration, and inverter efficiency',
      keywords: ['ups', 'battery', 'runtime', 'backup', 'inverter', 'autonomy', 'kva']
    },
    {
      id: 'elec-elv',
      name: 'ELV Emergency Power',
      systemId: 'electrical',
      subId: 'elv_ups',
      systemLabel: 'Electrical / FLC',
      systemIcon: Zap,
      badge: 'ELV',
      description: 'Extra-low voltage DC backup for security, CCTV, and fire alarm',
      keywords: ['elv', 'extra low voltage', 'cctv', 'dc backup', 'fire alarm']
    },
    {
      id: 'elec-formulas',
      name: 'NEC / IEC Standards',
      systemId: 'electrical',
      subId: 'formulas',
      systemLabel: 'Electrical / FLC',
      systemIcon: Zap,
      badge: 'NEC / IEC',
      description: 'National Electrical Code (NEC) tables and IEC conductor standards',
      keywords: ['nec', 'iec', 'electrical code', 'standards', 'formulas']
    },

    // Bulk Operations
    {
      id: 'bulk-duct',
      name: 'Bulk Duct Sizing',
      systemId: 'bulk',
      subId: 'batch_duct',
      systemLabel: 'Bulk',
      systemIcon: Layers,
      badge: 'Batch',
      description: 'Batch spreadsheet calculation for multiple duct segments',
      keywords: ['bulk', 'batch', 'duct', 'spreadsheet', 'csv']
    },
    {
      id: 'bulk-cooling',
      name: 'Bulk Cooling Load',
      systemId: 'bulk',
      subId: 'batch_cooling',
      systemLabel: 'Bulk',
      systemIcon: Layers,
      badge: 'Batch',
      description: 'Multi-zone cooling load estimation and schedule compilation',
      keywords: ['bulk', 'batch', 'cooling', 'multi-zone']
    },
    {
      id: 'bulk-flc',
      name: 'Bulk Electrical FLC',
      systemId: 'bulk',
      subId: 'batch_flc',
      systemLabel: 'Bulk',
      systemIcon: Layers,
      badge: 'Batch',
      description: 'Equipment schedule batch calculation of motor currents',
      keywords: ['bulk', 'batch', 'flc', 'motor schedule']
    },
    {
      id: 'bulk-pipe',
      name: 'Bulk Pipe Sizing',
      systemId: 'bulk',
      subId: 'batch_pipe',
      systemLabel: 'Bulk',
      systemIcon: Layers,
      badge: 'Batch',
      description: 'Simultaneous sizing of multiple piping runs and pressure loss',
      keywords: ['bulk', 'batch', 'pipe', 'hydraulics']
    }
  ];

  // Filtered Search Results
  const filteredSearchItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(item => {
      if (item.name.toLowerCase().includes(q)) return true;
      if (item.systemLabel.toLowerCase().includes(q)) return true;
      if (item.description.toLowerCase().includes(q)) return true;
      if (item.badge && item.badge.toLowerCase().includes(q)) return true;
      if (item.keywords.some(k => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [searchQuery]);

  // Navigate directly to Search Result Item
  const handleNavigateSearchItem = (item: SearchIndexItem) => {
    setActiveTab(item.systemId);
    setActiveSubordinates(prev => ({
      ...prev,
      [item.systemId]: item.subId
    }));
    setExpandedParents(prev => ({
      ...prev,
      [item.systemId]: true
    }));
    if (item.systemId === 'mechanical') {
      if (item.subId === 'ventilation' && item.ventSubMode) {
        setVentilationSubMode(item.ventSubMode);
        setMechanicalModules(prev => ({ ...prev, ventilation: item.ventSubMode! }));
      } else {
        const defaultMod = DEFAULT_MECHANICAL_MODULES[item.subId] || 'estimate';
        setMechanicalModules(prev => ({ ...prev, [item.subId]: defaultMod }));
      }
    }
    setRestoredParams(null);
    scrollWorkspaceToTop();
  };

  // SUB-SYSTEMS / MODULES FOR TOP PANEL (SECTION 3, 4, 8, 9, 10)
  const getSubSystems = () => {
    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      return SUB_SYSTEM_MODULES[currentSub] || [
        { id: 'overview', label: 'System Overview' },
        { id: 'reports', label: 'Engineering Report' }
      ];
    }
    return SUB_SYSTEM_MODULES[activeTab] || [];
  };

  // TOP SUB-SYSTEM PANEL TITLE (LEVEL 3 MODULE SELECTOR)
  const getSubPanelTitle = () => {
    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      if (currentSub === 'cooling') return 'COOLING LOAD';
      if (currentSub === 'ventilation') return 'VENTILATION';
      if (currentSub === 'psychrometrics') return 'PSYCHROMETRICS';
      if (currentSub === 'ductSizing') return 'DUCT DESIGN';
      if (currentSub === 'fanDuty') return 'FAN SELECTION';
      if (currentSub === 'kitchenHood') return 'KITCHEN HOOD';
      if (currentSub === 'heatRecovery') return 'HEAT RECOVERY';
      return 'MECHANICAL / HVAC';
    }
    if (activeTab === 'plumbing') return 'PLUMBING';
    if (activeTab === 'fire') return 'FIRE FIGHTING';
    if (activeTab === 'electrical') return 'ELECTRICAL';
    if (activeTab === 'bulk') return 'BULK';
    return 'SYSTEM';
  };

  // Breadcrumb generation (reflects currently active module identifier strictly from MECHANICAL_MODULE_METADATA & SUB_SYSTEM_MODULES)
  const getBreadcrumbs = () => {
    if (activeTab === 'mechanical') {
      const currentSubId = activeSubordinates.mechanical;
      const subItem = mainSystems.find(m => m.id === 'mechanical')?.subordinates.find(s => s.id === currentSubId);
      const currentModuleId = getActiveMechModuleId(currentSubId);
      return getMechanicalBreadcrumbs(currentSubId, currentModuleId, subItem?.label);
    }
    const currentMain = mainSystems.find(m => m.id === activeTab);
    const currentSubId = activeSubordinates[activeTab];
    const currentSub = currentMain?.subordinates.find(s => s.id === currentSubId);
    const subModuleItem = SUB_SYSTEM_MODULES[activeTab]?.find(m => m.id === currentSubId);
    return `${currentMain?.label || 'Engineering'} / ${currentSub?.label || subModuleItem?.label || 'Calculation'}`;
  };

  // Page title generation (strictly resolves titles from MECHANICAL_MODULE_METADATA configuration object)
  const getPageTitle = () => {
    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      const currentModId = getActiveMechModuleId(currentSub);
      const subItem = mainSystems.find(m => m.id === 'mechanical')?.subordinates.find(s => s.id === currentSub);
      return getMechanicalPageTitle(currentSub, currentModId, subItem?.label);
    }
    if (activeTab === 'plumbing') {
      const sub = activeSubordinates.plumbing;
      if (sub === 'tanks') return 'Water Storage Tank Sizing';
      if (sub === 'pumps') return 'Booster & Transfer Pump Sizing';
      if (sub === 'formulas') return 'IPC Reference Standards';
      return 'Water Supply Fixture Units (WSFU) & Drainage';
    }
    if (activeTab === 'fire') {
      const sub = activeSubordinates.fire;
      if (sub === 'sizing') return 'Hydraulic & Standpipe Sizing';
      if (sub === 'pump') return 'Fire Pump & Pressure Calculation';
      if (sub === 'formulas') return 'NFPA 13/14 Standards & Density';
      return 'Sprinkler Head & Fire Hazard Sizing';
    }
    if (activeTab === 'electrical') {
      const sub = activeSubordinates.electrical;
      if (sub === 'vd') return 'Voltage Drop & Cable Sizing';
      if (sub === 'ups') return 'UPS Battery Sizing & Autonomy';
      if (sub === 'elv_ups') return 'ELV Emergency Power Backup';
      if (sub === 'formulas') return 'NEC / IEC Electrical Standards';
      return 'Full Load Current (FLC) Calculation';
    }
    if (activeTab === 'bulk') {
      const sub = activeSubordinates.bulk;
      if (sub === 'batch_cooling') return 'Batch Cooling Load Sizing';
      if (sub === 'batch_flc') return 'Batch Electrical FLC Sizing';
      if (sub === 'batch_pipe') return 'Batch Pipe Sizing';
      return 'Bulk Duct Sizing Calculation';
    }
    return 'Engineering Calculator';
  };

  const getPageSubtitle = () => {
    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      const mod = getActiveMechModuleId(currentSub);
      if (currentSub === 'cooling') {
        switch (mod) {
          case 'vrf': return 'Optimize multi-zone VRF systems, refrigerant piping distribution, and outdoor unit sizing';
          case 'schedules': return 'Engineering schedules for indoor fan coils, cassettes, and outdoor condensing units';
          case 'reports': return 'Cooling load estimate and VRF engineering submittal documentation';
          case 'estimate':
          default:
            return 'Simplified cooling load estimate based on standard space parameters';
        }
      }
      if (currentSub === 'ventilation') {
        switch (mod) {
          case 'exhaust': return 'Prescriptive exhaust airflow sizing per ASHRAE 62.1-2022 Table 6-2';
          case 'balance': return 'Diagnostic airflow balance and building pressure evaluation';
          case 'reports': return 'Ventilation submittal documentation, schedules, and mathematical audit trail';
          case 'calculation':
          default:
            return 'Calculate required outdoor air ventilation rates per ASHRAE 62.1-2022';
        }
      }
      if (currentSub === 'psychrometrics') {
        const mod = mechanicalModules.psychrometrics || 'properties';
        switch (mod) {
          case 'references': return 'Grounded mathematical formulas and unit conversions from ASHRAE Fundamentals Chapter 1';
          case 'comfort': return 'Thermodynamics & moist air enthalpy — Not Yet Implemented (Under Specification)';
          case 'properties':
          default:
            return 'Psychrometric state property calculation — Not Yet Implemented (Under Specification)';
        }
      }
      if (currentSub === 'ductSizing') {
        const mod = mechanicalModules.ductSizing || 'equal_friction';
        switch (mod) {
          case 'critical_path': return 'Identify the index run with highest cumulative resistance across parallel duct paths';
          case 'fittings': return 'Loss coefficients (Co) and dynamic velocity pressure drop per ASHRAE Fitting Database';
          case 'static_regain': return 'Static regain duct sizing method — Not Yet Implemented (Under Specification)';
          case 'equal_friction':
          default:
            return 'Air distribution sizing using Equal Friction and SMACNA standard guidelines';
        }
      }
      if (currentSub === 'fanDuty') {
        const mod = mechanicalModules.fanDuty || 'pressure';
        switch (mod) {
          case 'fan_curve': return 'Fan performance curve and operating point — Not Yet Implemented (Under Specification)';
          case 'selection': return 'Fan motor selection and electrical BHP — Not Yet Implemented (Under Specification)';
          case 'reports': return 'Fan submittal schedule report — Not Yet Implemented (Under Specification)';
          case 'pressure':
          default:
            return 'Total external static pressure, duct fittings loss, and critical path analysis';
        }
      }
      if (currentSub === 'kitchenHood') {
        const mod = mechanicalModules.kitchenHood || 'capture';
        switch (mod) {
          case 'grease': return 'Engineering Diagnostic Utility: UL 1046 baffle filter extraction and grease velocity check';
          case 'mua': return 'Engineering Diagnostic Utility: Make-up air percentage balance estimation';
          case 'capture':
          default:
            return 'Engineering Diagnostic Utility: Commercial kitchen exhaust estimation per IMC 507 / ASHRAE 154';
        }
      }
      if (currentSub === 'heatRecovery') {
        const mod = mechanicalModules.heatRecovery || 'hrv_sizing';
        switch (mod) {
          case 'aerodynamics': return 'Heat recovery aerodynamic performance — Not Yet Implemented (Under Specification)';
          case 'efficiency': return 'Thermal & latent energy effectiveness — Not Yet Implemented (Under Specification)';
          case 'reports': return 'Heat recovery energy audit report — Not Yet Implemented (Under Specification)';
          case 'hrv_sizing':
          default:
            return 'HRV / ERV heat recovery sizing — Not Yet Implemented (Under Specification)';
        }
      }
    }
    return 'Professional MEP engineering calculations compliant with international codes';
  };

  // Header Engineering Status type reflecting visual hierarchy
  type HeaderEngineeringStatus =
    | 'PASS'
    | 'FAIL'
    | 'INCOMPLETE'
    | 'BLOCKED'
    | 'NOT_VERIFIED'
    | 'NOT_READY_FOR_ENGINEERING_USE'
    | 'NOT_YET_IMPLEMENTED'
    | 'NEUTRAL'
    | 'READY';

  // Dynamic header engineering status derived honestly from active module state
  const getHeaderStatusInfo = (): {
    status: HeaderEngineeringStatus;
    label: string;
    message?: string;
  } => {
    if (activeTab !== 'mechanical') {
      return {
        status: 'NEUTRAL',
        label: 'ENGINEERING MODULE',
        message: 'Active engineering calculation module'
      };
    }

    const currentSub = activeSubordinates.mechanical;
    const currentModId = getActiveMechModuleId(currentSub);

    // 1. Ventilation Subordinates
    if (currentSub === 'ventilation') {
      if (currentModId === 'calculation') {
        const engineStatus = lastCalculationResult?.status;
        if (engineStatus === 'PASS') {
          return {
            status: 'PASS',
            label: 'PASS',
            message: 'All ASHRAE 62.1-2022 ventilation requirements verified'
          };
        }
        if (engineStatus === 'FAIL') {
          return {
            status: 'FAIL',
            label: 'FAIL',
            message: 'Ventilation requirements not met — Check zone parameters'
          };
        }
        if (engineStatus === 'BLOCKED') {
          return {
            status: 'BLOCKED',
            label: 'BLOCKED',
            message: 'Calculation blocked — Invalid or non-physical parameters'
          };
        }
        if (engineStatus === 'INCOMPLETE') {
          return {
            status: 'INCOMPLETE',
            label: 'INCOMPLETE',
            message: 'Incomplete parameters — Missing required inputs'
          };
        }
        if (engineStatus === 'NOT_VERIFIED') {
          return {
            status: 'NOT_VERIFIED',
            label: 'NOT VERIFIED',
            message: 'Parameters not verified against ASHRAE 62.1 tables'
          };
        }
        return {
          status: 'NEUTRAL',
          label: 'NEUTRAL',
          message: 'ASHRAE 62.1-2022 calculation pending execution'
        };
      }

      if (currentModId === 'exhaust') {
        if (exhaustStatus === 'PASS') {
          return {
            status: 'PASS',
            label: 'PASS',
            message: 'Prescriptive exhaust requirements met per Table 6-2'
          };
        }
        if (exhaustStatus === 'FAIL') {
          return {
            status: 'FAIL',
            label: 'FAIL',
            message: 'Prescriptive exhaust requirements failed per Table 6-2'
          };
        }
        if (exhaustStatus === 'BLOCKED') {
          return {
            status: 'BLOCKED',
            label: 'BLOCKED',
            message: 'Section 6.5.2 Performance compliance path unimplemented / blocked'
          };
        }
        if (exhaustStatus === 'NOT_VERIFIED') {
          return {
            status: 'NOT_VERIFIED',
            label: 'NOT VERIFIED',
            message: 'Exhaust parameters not verified against Table 6-2'
          };
        }
        if (exhaustStatus === 'INCOMPLETE') {
          return {
            status: 'INCOMPLETE',
            label: 'INCOMPLETE',
            message: 'Incomplete exhaust inputs'
          };
        }
        if (exhaustStatus === 'NOT_READY_FOR_ENGINEERING_USE') {
          return {
            status: 'NOT_READY_FOR_ENGINEERING_USE',
            label: 'NOT READY',
            message: 'Exhaust calculation parameters require engineering review'
          };
        }
        return {
          status: 'NEUTRAL',
          label: 'NEUTRAL',
          message: 'ASHRAE 62.1 prescriptive exhaust calculation active'
        };
      }

      if (currentModId === 'balance') {
        return {
          status: 'NOT_READY_FOR_ENGINEERING_USE',
          label: 'DIAGNOSTIC ONLY',
          message: 'Diagnostic airflow balance — Non-authoritative diagnostic utility'
        };
      }

      if (currentModId === 'reports') {
        const engineStatus = lastCalculationResult?.status;
        if (engineStatus === 'PASS') {
          return {
            status: 'PASS',
            label: 'PASS',
            message: 'ASHRAE 62.1 compliance documentation verified'
          };
        }
        if (engineStatus === 'FAIL') {
          return {
            status: 'FAIL',
            label: 'FAIL',
            message: 'Compliance audit indicates non-conformance'
          };
        }
        if (engineStatus === 'BLOCKED') {
          return {
            status: 'BLOCKED',
            label: 'BLOCKED',
            message: 'Calculation blocked — Report unavailable'
          };
        }
        if (engineStatus === 'INCOMPLETE') {
          return {
            status: 'INCOMPLETE',
            label: 'INCOMPLETE',
            message: 'Incomplete calculation — Parameters missing'
          };
        }
        return {
          status: 'NEUTRAL',
          label: 'AWAITING CALCULATION',
          message: 'Perform ventilation calculation before generating submittal report'
        };
      }
    }

    // 2. Cooling Load
    if (currentSub === 'cooling') {
      if (coolingResult?.status === 'INCOMPLETE') {
        return {
          status: 'INCOMPLETE',
          label: 'INCOMPLETE',
          message: coolingResult?.warning || 'Missing required parameters'
        };
      }
      return {
        status: 'NOT_READY_FOR_ENGINEERING_USE',
        label: 'SIMPLIFIED MODEL',
        message: 'Simplified cooling load estimate — Does not replace full ASHRAE heat balance calculation'
      };
    }

    // 3. Psychrometrics
    if (currentSub === 'psychrometrics') {
      if (currentModId === 'references') {
        return {
          status: 'READY',
          label: 'REFERENCE LIBRARY',
          message: 'ASHRAE Fundamentals Chapter 1 psychrometric equations and tables'
        };
      }
      return {
        status: 'NOT_YET_IMPLEMENTED',
        label: 'NOT YET IMPLEMENTED',
        message: 'Psychrometric module under specification per ASHRAE Fundamentals Chapter 1'
      };
    }

    // 4. Duct Design
    if (currentSub === 'ductSizing') {
      if (currentModId === 'equal_friction') {
        return {
          status: 'NOT_READY_FOR_ENGINEERING_USE',
          label: 'CALCULATION UTILITY',
          message: 'Equal friction duct sizing utility — Preliminary sizing'
        };
      }
      if (currentModId === 'critical_path') {
        return {
          status: 'NOT_READY_FOR_ENGINEERING_USE',
          label: 'CALCULATION AID',
          message: 'Darcy-Weisbach critical path pressure loss diagnostic aid'
        };
      }
      if (currentModId === 'fittings') {
        return {
          status: 'READY',
          label: 'REFERENCE LIBRARY',
          message: 'ASHRAE Duct Fitting Database (DFDB) reference loss coefficients'
        };
      }
      if (currentModId === 'static_regain') {
        return {
          status: 'NOT_YET_IMPLEMENTED',
          label: 'NOT YET IMPLEMENTED',
          message: 'Static regain method under formal specification'
        };
      }
    }

    // 5. Fan Selection
    if (currentSub === 'fanDuty') {
      if (currentModId === 'pressure') {
        return {
          status: 'NOT_READY_FOR_ENGINEERING_USE',
          label: 'CALCULATION AID',
          message: 'Total external static pressure (TSP) calculation aid'
        };
      }
      return {
        status: 'NOT_YET_IMPLEMENTED',
        label: 'NOT YET IMPLEMENTED',
        message: 'Fan selection module under formal specification'
      };
    }

    // 6. Kitchen Hood
    if (currentSub === 'kitchenHood') {
      return {
        status: 'NOT_READY_FOR_ENGINEERING_USE',
        label: 'DIAGNOSTIC ONLY',
        message: 'Commercial kitchen exhaust estimation based on IMC 507 / ASHRAE 154 guidelines'
      };
    }

    // 7. Heat Recovery
    if (currentSub === 'heatRecovery') {
      return {
        status: 'NOT_YET_IMPLEMENTED',
        label: 'NOT YET IMPLEMENTED',
        message: 'HRV / ERV heat recovery modeling under formal specification'
      };
    }

    return {
      status: 'NEUTRAL',
      label: 'ENGINEERING MODULE',
      message: 'Active engineering module'
    };
  };

  const getStatusBadgeConfig = (status: HeaderEngineeringStatus) => {
    switch (status) {
      case 'PASS':
        return {
          bg: 'bg-emerald-950/60 border-emerald-700/80',
          text: 'text-emerald-300',
          icon: CheckCircle2,
          iconColor: 'text-emerald-400'
        };
      case 'FAIL':
        return {
          bg: 'bg-red-950/60 border-red-700/80',
          text: 'text-red-300',
          icon: XCircle,
          iconColor: 'text-red-400'
        };
      case 'BLOCKED':
        return {
          bg: 'bg-rose-950/60 border-rose-700/80',
          text: 'text-rose-300',
          icon: ShieldAlert,
          iconColor: 'text-rose-400'
        };
      case 'NOT_VERIFIED':
        return {
          bg: 'bg-fuchsia-950/60 border-fuchsia-700/80',
          text: 'text-fuchsia-300',
          icon: AlertTriangle,
          iconColor: 'text-fuchsia-400'
        };
      case 'NOT_READY_FOR_ENGINEERING_USE':
        return {
          bg: 'bg-amber-950/50 border-amber-700/70',
          text: 'text-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-400'
        };
      case 'NOT_YET_IMPLEMENTED':
        return {
          bg: 'bg-amber-950/40 border-amber-800/60',
          text: 'text-amber-300',
          icon: Construction,
          iconColor: 'text-amber-400'
        };
      case 'INCOMPLETE':
        return {
          bg: 'bg-amber-950/50 border-amber-700/70',
          text: 'text-amber-300',
          icon: Clock,
          iconColor: 'text-amber-400'
        };
      case 'READY':
        return {
          bg: 'bg-sky-950/50 border-sky-700/70',
          text: 'text-sky-300',
          icon: Info,
          iconColor: 'text-sky-400'
        };
      case 'NEUTRAL':
      default:
        return {
          bg: 'bg-slate-900 border-slate-700',
          text: 'text-slate-300',
          icon: Layers,
          iconColor: 'text-slate-400'
        };
    }
  };

  // Main Calculation View Rendering
  const renderCalculationArea = () => {
    if (activeTab === 'mechanical') {
      const currentSub = activeSubordinates.mechanical;
      if (currentSub === 'cooling') {
        return (
          <MechanicalCalc
            restoredParams={restoredParams}
            onSaveCalculation={addHistoryItem}
            autoCalculate={autoCalculate}
            isDarkMode={isDarkMode}
            activeCoolingMode={(mechanicalModules.cooling as any) || 'estimate'}
            onCoolingModeChange={(mode) => {
              setMechanicalModules(prev => ({ ...prev, cooling: mode }));
              scrollWorkspaceToTop();
            }}
            onCalculationChange={(res: any) => {
              setCoolingResult(res);
              setLastCalculationResult(res);
            }}
          />
        );
      }
      if (currentSub === 'ventilation') {
        switch (ventilationSubMode) {
          case 'calculation':
            return (
              <Ashrae621VentilationCalc
                onVentilationChange={(flow, details) => {
                  setLastCalculationResult(details);
                }}
                edition="2022"
              />
            );
          case 'exhaust':
            return <Ashrae621ExhaustCalc onStatusChange={setExhaustStatus} />;
          case 'balance':
            return <AirBalanceCalc />;
          case 'reports':
            return (
              <VentilationReportsView
                engineResult={lastCalculationResult}
                auditTrails={lastCalculationResult?.auditTrail || []}
              />
            );
          default:
            return (
              <Ashrae621VentilationCalc
                onVentilationChange={handleVentilationChange}
                edition="2022"
              />
            );
        }
      }
      if (currentSub === 'psychrometrics') {
        const mod = mechanicalModules.psychrometrics || 'properties';
        if (mod === 'references') {
          return (
            <InteractiveFormulaReferenceCard
              activeTab="mechanical"
              subTab="all"
              defaultExpanded={true}
            />
          );
        }
        if (mod === 'properties') {
          return (
            <NotYetImplementedModuleCard
              system="Mechanical / HVAC"
              subordinate="Psychrometrics"
              module="Psychrometric State"
              standard="ASHRAE Fundamentals Chapter 1 (Psychrometrics)"
              customDescription="Interactive psychrometric state property calculation: Dry bulb, wet bulb, dew point, relative humidity, humidity ratio, and moist air specific volume."
              plannedFeatures={[
                'Moist air state calculation (Dry bulb, Wet bulb, Dew point, Relative humidity, Enthalpy, Humidity ratio)',
                'Barometric pressure and altitude psychrometric corrections',
                'Interactive psychrometric state point plotting and process lines'
              ]}
              fallbackModuleId="references"
              fallbackModuleLabel="Formulas & References"
              onNavigateFallback={() => {
                setMechanicalModules(prev => ({ ...prev, psychrometrics: 'references' }));
                scrollWorkspaceToTop();
              }}
            />
          );
        }
        return (
          <NotYetImplementedModuleCard
            system="Mechanical / HVAC"
            subordinate="Psychrometrics"
            module="Thermodynamics & Enthalpy"
            standard="ASHRAE Fundamentals Chapter 1"
            customDescription="Thermodynamic enthalpy calculations: Sensible and latent heat ratios, air mixing, humidification, and sensible heating/cooling process lines."
            plannedFeatures={[
              'Sensible, latent, and total enthalpy change during heating and cooling processes',
              'Humidification, dehumidification, and adiabatic air mixing calculations',
              'Apparatus dew point (ADP) and cooling coil bypass factor determination'
            ]}
            fallbackModuleId="references"
            fallbackModuleLabel="Formulas & References"
            onNavigateFallback={() => {
              setMechanicalModules(prev => ({ ...prev, psychrometrics: 'references' }));
              scrollWorkspaceToTop();
            }}
          />
        );
      }
      if (currentSub === 'ductSizing') {
        const mod = mechanicalModules.ductSizing || 'equal_friction';
        if (mod === 'equal_friction') {
          return (
            <DuctSizingCalc
              restoredParams={restoredParams}
              onSaveCalculation={addHistoryItem}
              autoCalculate={autoCalculate}
            />
          );
        }
        if (mod === 'critical_path') {
          return <StaticPressureCalc />;
        }
        if (mod === 'fittings') {
          return <DuctFittingsLossView />;
        }
        return (
          <NotYetImplementedModuleCard
            system="Mechanical / HVAC"
            subordinate="Duct Design"
            module="Static Regain"
            standard="SMACNA HVAC Duct Systems Design / ASHRAE Fundamentals Chapter 21"
            customDescription="Static regain duct sizing method: Converting dynamic velocity pressure into static pressure to achieve balanced static pressure across all downstream air terminals."
            plannedFeatures={[
              'Section-by-section static regain calculation based on velocity reduction',
              'Equal static pressure at each terminal diffuser branch takeoff',
              'High-velocity commercial supply duct optimization'
            ]}
            fallbackModuleId="equal_friction"
            fallbackModuleLabel="Equal Friction"
            onNavigateFallback={() => {
              setMechanicalModules(prev => ({ ...prev, ductSizing: 'equal_friction' }));
              scrollWorkspaceToTop();
            }}
          />
        );
      }
      if (currentSub === 'fanDuty') {
        const mod = mechanicalModules.fanDuty || 'pressure';
        if (mod === 'pressure') {
          return <StaticPressureCalc />;
        }
        if (mod === 'fan_curve') {
          return (
            <NotYetImplementedModuleCard
              system="Mechanical / HVAC"
              subordinate="Fan Selection"
              module="Fan Curve"
              standard="AMCA Standard 210 / ISO 5801"
              customDescription="Aerodynamic fan curve analysis: Overlaying calculated duct system resistance against manufacturer fan performance curves to pinpoint operating duty points."
              plannedFeatures={[
                'Fan operating curve vs. system resistance curve overlay',
                'Duty point intersection (Airflow vs. Total Static Pressure)',
                'Variable frequency drive (VFD) affinity law speed curves'
              ]}
              fallbackModuleId="pressure"
              fallbackModuleLabel="Static Pressure"
              onNavigateFallback={() => {
                setMechanicalModules(prev => ({ ...prev, fanDuty: 'pressure' }));
                scrollWorkspaceToTop();
              }}
            />
          );
        }
        if (mod === 'selection') {
          return (
            <NotYetImplementedModuleCard
              system="Mechanical / HVAC"
              subordinate="Fan Selection"
              module="Motor Selection"
              standard="NEMA MG-1 / IEC 60034-30-1"
              customDescription="Fan electrical motor sizing: Converting air power and fan mechanical efficiency into brake horsepower (BHP) and nominal motor kW ratings."
              plannedFeatures={[
                'Fan brake horsepower (BHP) and nominal motor kW selection',
                'Transmission drive loss factor (direct drive vs. V-belt)',
                'Premium efficiency (IE3 / IE4) electrical load estimation'
              ]}
              fallbackModuleId="pressure"
              fallbackModuleLabel="Static Pressure"
              onNavigateFallback={() => {
                setMechanicalModules(prev => ({ ...prev, fanDuty: 'pressure' }));
                scrollWorkspaceToTop();
              }}
            />
          );
        }
        return (
          <NotYetImplementedModuleCard
            system="Mechanical / HVAC"
            subordinate="Fan Selection"
            module="Reports"
            standard="AMCA Submittal Standard"
            customDescription="Fan selection engineering report: Comprehensive schedule export including design CFM, external static pressure, fan RPM, motor size, and sound power levels."
            plannedFeatures={[
              'Fan schedule generation with operating CFM, TSP, RPM, and motor kW',
              'Sound power level spectrum (octave bands 1 through 8)',
              'Engineering compliance summary submittal PDF export'
            ]}
            fallbackModuleId="pressure"
            fallbackModuleLabel="Static Pressure"
            onNavigateFallback={() => {
              setMechanicalModules(prev => ({ ...prev, fanDuty: 'pressure' }));
              scrollWorkspaceToTop();
            }}
          />
        );
      }
      if (currentSub === 'kitchenHood') {
        const mod = (mechanicalModules.kitchenHood as any) || 'capture';
        return (
          <KitchenVentilationCalc
            activeSection={mod}
            onSectionChange={(sec) => {
              setMechanicalModules(prev => ({ ...prev, kitchenHood: sec }));
              scrollWorkspaceToTop();
            }}
          />
        );
      }
      if (currentSub === 'heatRecovery') {
        const mod = mechanicalModules.heatRecovery || 'hrv_sizing';
        const moduleDetails: Record<string, { name: string; desc: string; planned: string[] }> = {
          hrv_sizing: {
            name: 'HRV / ERV Sizing',
            desc: 'Heat & Energy Recovery Ventilator physical capacity sizing according to outdoor ventilation airflow and exhaust flow balance.',
            planned: [
              'Sensible energy recovery ventilator (HRV) core sizing (plate heat exchangers)',
              'Total energy recovery ventilator (ERV) desiccant wheel sizing',
              'Winter preheating and summer precooling coil load offsets'
            ]
          },
          aerodynamics: {
            name: 'Aerodynamic Performance',
            desc: 'Airflow pressure drop across recovery matrix and balance of intake vs exhaust fan static pressure.',
            planned: [
              'Media face velocity and static pressure drop through heat exchange core',
              'Internal leakage and exhaust air transfer ratio (EATR) evaluation per AHRI 1060',
              'Supply and exhaust duct resistance balancing'
            ]
          },
          efficiency: {
            name: 'Energy Effectiveness',
            desc: 'Sensible, latent, and total recovery effectiveness ratings per AHRI Standard 1060 and ASHRAE 90.1.',
            planned: [
              'Sensible recovery effectiveness (SRE) and total energy recovery effectiveness (TRE)',
              'Net sensible coefficient of performance (COP) improvement',
              'Annual energy savings and carbon emission reduction metrics'
            ]
          },
          reports: {
            name: 'Reports',
            desc: 'Comprehensive heat recovery submittal schedules and energy compliance documentation.',
            planned: [
              'HRV / ERV equipment engineering schedules',
              'ASHRAE 90.1 prescriptive energy recovery compliance certificates',
              'Exportable engineering documentation and audit trail'
            ]
          }
        };
        const currentDetail = moduleDetails[mod] || moduleDetails.hrv_sizing;
        return (
          <NotYetImplementedModuleCard
            system="Mechanical / HVAC"
            subordinate="Heat Recovery"
            module={currentDetail.name}
            standard="AHRI Standard 1060 / ANSI/ASHRAE/IES Standard 90.1"
            customDescription={currentDetail.desc}
            plannedFeatures={currentDetail.planned}
          />
        );
      }
    }

    if (activeTab === 'plumbing') {
      return (
        <PlumbingCalc
          restoredParams={restoredParams}
          onSaveCalculation={addHistoryItem}
          autoCalculate={autoCalculate}
          activeSubTab={activeSubordinates.plumbing as any}
          onSubTabChange={(sub) => {
            setActiveSubordinates(prev => ({ ...prev, plumbing: sub }));
            scrollWorkspaceToTop();
          }}
        />
      );
    }

    if (activeTab === 'fire') {
      return (
        <FireCalc
          restoredParams={restoredParams}
          onSaveCalculation={addHistoryItem}
          autoCalculate={autoCalculate}
          activeSubTab={activeSubordinates.fire as any}
          onSubTabChange={(sub) => {
            setActiveSubordinates(prev => ({ ...prev, fire: sub }));
            scrollWorkspaceToTop();
          }}
        />
      );
    }

    if (activeTab === 'electrical') {
      return (
        <ElectricalCalc
          restoredParams={restoredParams}
          onSaveCalculation={addHistoryItem}
          autoCalculate={autoCalculate}
          activeSubTab={activeSubordinates.electrical as any}
          onSubTabChange={(sub) => {
            setActiveSubordinates(prev => ({ ...prev, electrical: sub }));
            scrollWorkspaceToTop();
          }}
        />
      );
    }

    if (activeTab === 'bulk') {
      return <BulkCalc history={history} />;
    }

    return null;
  };

  return (
    <div className={`h-screen w-screen flex bg-[#0B132B] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden ${
      language === 'km' ? 'font-khmer' : 'font-sans'
    } ${isDarkMode ? 'app-theme-dark' : 'app-theme-light'}`}>
      
      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR: MAIN SYSTEMS NAVIGATION ONLY (SECTION 3)        */}
      {/* ============================================================== */}
      <aside data-sidebar="true" data-testid="utility-sidebar" className="navigation-panel utility-sidebar w-64 xl:w-72 h-screen sticky top-0 bg-[#090F22] border-r border-slate-800/80 flex flex-col shrink-0 z-30 select-none overflow-hidden">
        
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-lg shadow-md shadow-cyan-950/50">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black tracking-wider text-white">CKY_MEPF</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                ENGINEERING SUITE
              </span>
            </div>
          </div>
        </div>

        {/* Search & Quick Filter Controls */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              placeholder="Search systems & modules..."
              className="w-full bg-slate-900/90 text-xs text-white placeholder:text-slate-500 pl-8 pr-7 py-1.5 rounded-lg border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-sans"
              aria-label="Filter MEP subordinate systems and modules"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                title="Clear filter (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 5 Main Systems Accordion OR Filtered Search Results Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {searchQuery.trim() ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-mono text-slate-400 border-b border-slate-800/60">
                <span className="uppercase font-bold tracking-wider text-cyan-400">
                  Matches ({filteredSearchItems.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white hover:underline text-[10px] cursor-pointer"
                >
                  Clear filter
                </button>
              </div>

              {filteredSearchItems.length === 0 ? (
                <div className="py-8 px-2 text-center text-xs text-slate-500 font-mono">
                  <p>No systems or modules found for</p>
                  <p className="text-slate-300 font-bold mt-1">"{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-cyan-400 text-[11px] rounded border border-slate-800 cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                filteredSearchItems.map((item) => {
                  const Icon = item.systemIcon;
                  const isCurrent = activeTab === item.systemId &&
                    activeSubordinates[item.systemId] === item.subId &&
                    (!item.ventSubMode || ventilationSubMode === item.ventSubMode);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateSearchItem(item)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer group ${
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-500/60 shadow-sm shadow-cyan-950/40 text-cyan-200'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-cyan-500/40 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="text-cyan-400 font-semibold truncate max-w-[140px]">
                          {item.systemLabel}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${isCurrent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-950 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-850'} transition-colors`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold truncate text-white group-hover:text-cyan-200 transition-colors">
                            {item.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            {item.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <>
              {/* Major Systems Menu Header */}
              <div className="px-2 pt-2 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                MAIN SYSTEMS
              </div>

              {mainSystems.map(system => {
                const Icon = system.icon;
                const isExpanded = !!expandedParents[system.id];
                const isActiveParent = activeTab === system.id;

                return (
                  <div key={system.id} className="space-y-1">
                    {/* Parent Row Button (Interactive Expand/Collapse Control) */}
                    <button
                      type="button"
                      onClick={() => handleToggleParent(system.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer text-left border ${
                        isActiveParent
                          ? 'bg-slate-900/90 text-white border-cyan-500/40 font-bold shadow-sm shadow-cyan-950/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
                      }`}
                      aria-expanded={isExpanded}
                      title={`Expand/Collapse ${system.label}`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-1.5 rounded-md transition-colors ${
                          isActiveParent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-bold leading-tight">
                            {system.label}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate font-mono">
                            {system.sublabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {system.badge && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                            isActiveParent ? 'bg-cyan-900/60 text-cyan-300' : 'bg-slate-900 text-slate-400'
                          }`}>
                            {system.badge}
                          </span>
                        )}
                        {/* Chevron Rotating 180deg (▼ when collapsed, ▲ when expanded) */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="shrink-0 text-slate-400"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-colors ${isActiveParent ? 'text-cyan-400' : 'text-slate-400'}`} />
                        </motion.div>
                      </div>
                    </button>

                    {/* Subordinate Systems Accordion Dropdown */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`subordinates-${system.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden pl-3 pr-1 py-0.5 space-y-0.5 border-l border-slate-800/80 ml-5 my-0.5"
                        >
                          {system.subordinates.map((sub, idx) => {
                            const isSubActive = isActiveParent && activeSubordinates[system.id] === sub.id;

                            return (
                              <motion.button
                                key={sub.id}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.18, delay: idx * 0.02 }}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSubordinate(system.id, sub.id);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                                  isSubActive
                                    ? 'bg-cyan-950/50 text-cyan-300 font-bold border-l-2 border-cyan-400 pl-2.5 shadow-sm shadow-cyan-950/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                }`}
                              >
                                <span className="truncate">{sub.label}</span>
                                {isSubActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1.5 shadow-sm shadow-cyan-400/50" />
                                )}
                                {sub.badge && !isSubActive && (
                                  <span className="text-[9px] font-mono text-slate-500 bg-slate-900/80 px-1 py-0.5 rounded">{sub.badge}</span>
                                )}
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar Footer Controls & Utilities */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
          
          {/* Project Manager Button */}
          <button
            onClick={() => setIsProjectManagerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-white rounded-lg border border-cyan-800/60 text-xs font-medium transition-colors cursor-pointer"
            title="Open Project Manager for grouped calculations and collective PDF submittals"
          >
            <div className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Manager ({projects.length})</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">Open</span>
          </button>

          {/* Batch Unit Convert Button */}
          <button
            onClick={() => setIsBatchUnitModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 hover:text-white rounded-lg border border-indigo-800/60 text-xs font-medium transition-colors cursor-pointer"
            title="Simultaneously convert multiple input parameters between Metric and Imperial"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Batch Unit Convert</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 font-bold">Batch</span>
          </button>

          {/* Quick Stats / History Toggle */}
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saved Runs ({history.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">View</span>
          </button>

          {/* Utility Toggles Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleUnitSystem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-800 transition-colors cursor-pointer"
              title="Toggle Metric / Imperial Units"
            >
              <Ruler className="w-3.5 h-3.5 text-cyan-400" />
              <span>{unitSystem === 'metric' ? 'MET' : 'IMP'}</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            <button
              onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
              className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
              title="Switch Language"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              onClick={() => setIsRefModalOpen(true)}
              className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Standards & References"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MAIN WORKING AREA: HEADER, TOP SUB-SYSTEM PANEL, CALCULATION */}
      {/* ============================================================== */}
      <div className="h-screen flex flex-col overflow-hidden flex-1">
        
        {/* ============================================================ */}
        {/* STICKY TOP CONTAINER: PAGE HEADER (A) + MODULES PANEL (B)    */}
        {/* ============================================================ */}
        <div className="sticky top-0 z-20 shrink-0 shadow-md shadow-slate-950/20 top-navigation-panel">
          {/* A. PAGE HEADER (SECTION 6) */}
          <header className="bg-[#0B132B]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 main-header-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Left: Breadcrumbs & Title */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold mb-1 flex-wrap">
                  {getBreadcrumbs().split(' / ').map((segment, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className={idx === arr.length - 1 ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                        {segment}
                      </span>
                      {idx < arr.length - 1 && (
                        <span className="text-slate-600 font-normal">/</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  {getPageTitle()}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getPageSubtitle()}
                </p>
              </div>

              {/* Right: Engineering Status & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Dynamic Engineering Status Badge with smooth 200ms transition */}
                {(() => {
                  const headerStatusInfo = getHeaderStatusInfo();
                  const badgeConfig = getStatusBadgeConfig(headerStatusInfo.status);
                  const StatusIcon = badgeConfig.icon;
                  return (
                    <div
                      className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200 ${badgeConfig.bg}`}
                      title={headerStatusInfo.message}
                    >
                      <StatusIcon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${badgeConfig.iconColor}`} />
                      <span className={`text-xs font-mono font-bold tracking-wider transition-colors duration-200 ${badgeConfig.text}`}>
                        {headerStatusInfo.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Save Button */}
                <button
                  onClick={handleSaveCurrentCalculation}
                  className="btn-micro-action flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer"
                  title="Save current calculation parameters"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save</span>
                </button>

                {/* Export CSV Button */}
                <button
                  id="main-header-export-csv-btn"
                  onClick={handleExportCurrentCsv}
                  className="btn-micro-action flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer"
                  title="Export active calculation inputs and performance outputs to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export CSV</span>
                </button>

                {/* Export PDF Button */}
                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="btn-micro-action flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer"
                  title="Configure and export calculation to PDF"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export PDF</span>
                </button>

                {/* Run Calculation Action Button */}
                <button
                  onClick={() => {
                    setAutoCalculate(true);
                    if (workspaceRef.current) {
                      workspaceRef.current.classList.add('ring-1', 'ring-cyan-500/50');
                      setTimeout(() => {
                        workspaceRef.current?.classList.remove('ring-1', 'ring-cyan-500/50');
                      }, 400);
                    }
                  }}
                  className="btn-micro-action flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-cyan-950/50 transition-all cursor-pointer"
                  title="Execute active engineering calculation"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Calculation</span>
                </button>
              </div>
            </div>
          </header>

          {/* B. TOP MODULE PANEL (LEVEL 3 MODULE SELECTOR) */}
          <section className="bg-[#090F22] border-b border-slate-800/80 px-6 py-2.5 sub-system-nav-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  {getSubPanelTitle()}
                </span>
                <div className="h-4 w-[1px] bg-slate-800 hidden sm:block shrink-0" />
                
                {/* Sub-system / Module Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {getSubSystems().map(item => {
                    const currentMechModule = activeTab === 'mechanical'
                      ? getActiveMechModuleId(activeSubordinates.mechanical)
                      : '';
                    const isActive = activeTab === 'mechanical'
                      ? currentMechModule === item.id
                      : activeSubordinates[activeTab] === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (activeTab === 'mechanical') {
                            const currentSub = activeSubordinates.mechanical;
                            setMechanicalModules(prev => ({
                              ...prev,
                              [currentSub]: item.id
                            }));
                            if (currentSub === 'ventilation') {
                              setVentilationSubMode(item.id as VentilationSubMode);
                            }
                            scrollWorkspaceToTop();
                          } else {
                            setActiveSubordinates(prev => ({
                              ...prev,
                              [activeTab]: item.id
                            }));
                            scrollWorkspaceToTop();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-950/50'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subordinate Module Active Indicator */}
              <div className="flex items-center gap-2 self-end sm:self-center text-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase hidden md:inline">Current Module:</span>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {activeTab === 'mechanical'
                    ? (
                        MECHANICAL_MODULE_METADATA[activeSubordinates.mechanical]?.[getActiveMechModuleId(activeSubordinates.mechanical)]?.label ||
                        getSubSystems().find(m => m.id === getActiveMechModuleId(activeSubordinates.mechanical))?.label ||
                        'MODULE'
                      ).toUpperCase()
                    : (activeSubordinates[activeTab] || 'MAIN').toUpperCase()}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================ */}
        {/* C. CALCULATION WORKSPACE (RESPONSIVE GRID LAYOUT)            */}
        {/* Prioritizes tabular output on smaller screens with stacking  */}
        {/* ============================================================ */}
        <div
          ref={workspaceRef}
          id="calculation-workspace"
          role="main"
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 max-w-[1700px] w-full mx-auto transition-all grid grid-cols-1 gap-6 auto-rows-max"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreenKey}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onAnimationStart={scrollWorkspaceToTop}
              onAnimationComplete={scrollWorkspaceToTop}
              className="w-full"
            >
              {renderCalculationArea()}
            </motion.div>
          </AnimatePresence>

          {/* Interactive Reference Card Component (Preserved for non-Mechanical systems) */}
          {activeTab !== 'mechanical' && (
            <div data-pdf-section="formulas" className="mt-8 pt-6 border-t border-slate-800/80">
              <InteractiveFormulaReferenceCard
                activeTab={activeTab}
              />
            </div>
          )}

          {/* Professional Engineering Disclaimer */}
          <div data-pdf-section="disclaimer" className="mt-8 p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center">
            <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest mb-1.5">
              Engineering Quality Assurance Notice
            </p>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed max-w-3xl mx-auto">
              This software provides engineering calculations under ANSI/ASHRAE Standard 62.1-2022 and applicable MEP codes.
              All final schedules and submittals must be certified by a licensed professional engineer in accordance with local jurisdictional authority (AHJ) requirements.
            </p>
            <p className="text-[9px] text-slate-400 mt-2 font-mono">
              CKY_MEPF Engineering Suite &copy; {new Date().getFullYear()}. Production Basis Active.
            </p>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. SAVED RUNS & COMPARISON DRAWER                              */}
      {/* ============================================================== */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#090F22] border-l border-slate-800/90 shadow-2xl z-50 p-5 flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-300 history-utility-drawer">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Saved Calculations</h3>
            </div>
            <button
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 hide-scrollbar">
            {history.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 font-mono">
                No calculations saved in this session.
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    handleLoadHistory(item);
                    setIsHistoryDrawerOpen(false);
                  }}
                  className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-800/60 rounded-xl transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="uppercase text-cyan-400 font-bold">{item.tab}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{item.summary}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick link to Project Manager */}
          <button
            onClick={() => {
              setIsHistoryDrawerOpen(false);
              setIsProjectManagerOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-800/60 transition-colors cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Project Manager</span>
          </button>

          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-800 flex justify-between">
              <button
                onClick={clearHistory}
                className="text-[10px] text-red-400 hover:text-red-300 font-mono uppercase font-bold"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Dynamic Unit Solver & References */}
      <EngineeringUnitConverter onOpenBatchConvert={() => setIsBatchUnitModalOpen(true)} />
      <QuickActionsMenu
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        autoCalculate={autoCalculate}
        onToggleAutoCalculate={() => setAutoCalculate(!autoCalculate)}
        unitSystem={unitSystem}
        onToggleUnitSystem={toggleUnitSystem}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenReferenceModal={() => setIsRefModalOpen(true)}
        onScrollToTop={scrollWorkspaceToTop}
        onOpenBatchUnitModal={() => setIsBatchUnitModalOpen(true)}
      />
      <ReferenceModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} />
      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        items={history.filter(item => selectedCompareIds.includes(item.id))}
      />
      <PdfExportConfigModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        targetElementId="calculation-workspace"
        defaultFilename={`CKY_MEPF_${activeTab}_report.pdf`}
        systemName={activeTab === 'mechanical' ? 'ASHRAE 62.1 Ventilation' : activeTab.toUpperCase()}
      />
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => {
          setIsProjectManagerOpen(false);
          setProjects(getProjects());
        }}
        history={history}
        onLoadHistoryItem={handleLoadHistory}
      />
      <BatchUnitConvertModal
        isOpen={isBatchUnitModalOpen}
        onClose={() => setIsBatchUnitModalOpen(false)}
        initialDirection={unitSystem === 'metric' ? 'met_to_imp' : 'imp_to_met'}
      />
      <AuditTrailOverlayModal />
    </div>
  );
}
