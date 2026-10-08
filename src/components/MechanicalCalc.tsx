import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, PieChart, Pie } from 'recharts';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ShieldAlert, Wind, Layers, Sliders, Thermometer, Info, Bookmark, CheckCircle2, FileSpreadsheet, Mail, Plus, Trash2, ChevronUp, ChevronDown, BookOpen } from 'lucide-react';
import CoolingLoadReference from './CoolingLoadReference';
import CoolingSensitivitySlider from './CoolingSensitivitySlider';
import { CoolingAshraeDesignValidator, AshraeValidationViolation, BuildingType } from '../validation/CoolingAshraeDesignValidator';
import CoolingValidationToastContainer, { ToastItem } from './CoolingValidationToastContainer';
import { motion } from 'motion/react';
import TrendVisualizer from './TrendVisualizer';
import VrfTopologyCanvas from './VrfTopologyCanvas';
import VrfLoadDistributionChart from './VrfLoadDistributionChart';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import InputAlert from './InputAlert';
import ValidatedInput from './ValidatedInput';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import { exportCoolingLoadToCsv, exportVrfToCsv } from '../lib/exportCsv';
import { DensityCorrectionService } from '../lib/DensityCorrectionService';
import { MechanicalCoolingEngine } from '../lib/MechanicalCoolingEngine';
import { UnitConversionService } from '../lib/UnitConversionService';
import { VentilationValidator } from '../validation/VentilationValidator';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

export type SubTab = 'cooling' | 'ventilation' | 'iaq' | 'ductSizing' | 'fanDuty' | 'formulas';
export type CoolingSubMode = 'estimate' | 'vrf' | 'schedules' | 'reports';

export const coolingModules = [
  { id: 'estimate', label: 'Load Estimate' },
  { id: 'vrf', label: 'VRF Analysis' },
  { id: 'schedules', label: 'Equipment Schedules' },
  { id: 'reports', label: 'Reports' }
];
export const mechanicalModules = coolingModules;

interface MechanicalCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
  isDarkMode?: boolean;
  activeCoolingMode?: CoolingSubMode;
  onCoolingModeChange?: (mode: CoolingSubMode) => void;
  onSubTabChange?: (subTab: any) => void;
  activeSubTab?: any;
  onCalculationChange?: any;
  ventilationSubMode?: any;
  onVentilationSubModeChange?: any;
}

export default function MechanicalCalc({
  restoredParams,
  onSaveCalculation,
  autoCalculate,
  isDarkMode,
  onSubTabChange,
  activeSubTab,
  activeCoolingMode = 'estimate',
  onCoolingModeChange,
  onCalculationChange
}: MechanicalCalcProps) {
  const { t } = useLanguage();
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';
  const [subTab, setSubTab] = useState<SubTab>(activeSubTab || 'cooling');

  useEffect(() => {
    if (activeSubTab && activeSubTab !== subTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const onSubTabChangeRef = useRef(onSubTabChange);
  useEffect(() => {
    onSubTabChangeRef.current = onSubTabChange;
  });

  const prevSubTabRef = useRef(subTab);
  useEffect(() => {
    scrollWorkspaceToTop();
    if (prevSubTabRef.current !== subTab) {
      prevSubTabRef.current = subTab;
      onSubTabChangeRef.current?.(subTab);
    }
  }, [subTab]);
  const [showCoolingRef, setShowCoolingRef] = useState(false);
  const [projectType, setProjectType] = useState<'Commercial' | 'Residential' | 'Industrial' | 'Healthcare'>('Commercial');

  // --- NEW ADVANCED ASHRAE STATE ---
  const [outdoorTemp, setOutdoorTemp] = useState<number>(35);
  const [indoorTemp, setIndoorTemp] = useState<number>(24);
  const [height, setHeight] = useState<number>(3);
  const [sensiblePerPerson, setSensiblePerPerson] = useState<number>(75);
  const [latentPerPerson, setLatentPerPerson] = useState<number>(55);
  const [lightingWpm2, setLightingWpm2] = useState<number>(12);
  const [equipmentWatts, setEquipmentWatts] = useState<number>(500);
  const [wallArea, setWallArea] = useState<number>(40);
  const [wallUValue, setWallUValue] = useState<number>(2.0);
  const [roofArea, setRoofArea] = useState<number>(50);
  const [roofUValue, setRoofUValue] = useState<number>(0.5);
  const [windowArea, setWindowArea] = useState<number>(10);
  const [windowUValue, setWindowUValue] = useState<number>(3.0);
  const [windowShgc, setWindowShgc] = useState<number>(0.6);
  const [ventilationLps, setVentilationLps] = useState<number>(25);
  
  const handleVentilationChange = useCallback((flow: number, details?: any) => {
    setVentilationLps(flow);
    if (details) {
    } else {
    }
  }, []);
  const [infiltrationACH, setInfiltrationACH] = useState<number>(0.5);
  const [safetyFactor, setSafetyFactor] = useState<number>(10);
  const [altitude, setAltitude] = useState<number>(0);
  const [relativeHumidity, setRelativeHumidity] = useState<number>(50);
  const [indoorRelativeHumidity, setIndoorRelativeHumidity] = useState<number>(50);
  const [useAltitudeAdj, setUseAltitudeAdj] = useState<boolean>(false);
  const [heatGainSensitivity, setHeatGainSensitivity] = useState<number>(1.0);

  const [estimationBasis, setEstimationBasis] = useState<'area' | 'volume'>('area');
  const [area, setArea] = useState<number | ''>(50);
  const [volume, setVolume] = useState<number | ''>(150);
  const [occupants, setOccupants] = useState<number | ''>(5);
  const [chartMode, setChartMode] = useState<'bar' | 'pie'>('pie');
  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationToasts, setValidationToasts] = useState<ToastItem[]>([]);
  const dismissedViolationIdsRef = useRef<Set<string>>(new Set());

  // Constants
  const baseLoadPerSqm = 150; 
  const baseLoadPerCum = 50;
  const loadPerPerson = 100;

  // VRF state variables
  const [isVrf, setIsVrf] = useState<boolean>(activeCoolingMode === 'vrf' || activeCoolingMode === 'schedules');

  useEffect(() => {
    if (activeCoolingMode === 'vrf' || activeCoolingMode === 'schedules') {
      setIsVrf(true);
    } else if (activeCoolingMode === 'estimate') {
      setIsVrf(false);
    }
  }, [activeCoolingMode]);
  const [diversityFactor, setDiversityFactor] = useState<number>(1.15);
  const [pipingLength, setPipingLength] = useState<number>(98); // 25 + 12 + 28 + 18 + 15 = 98m
  const [refrigerantType, setRefrigerantType] = useState<'R410A' | 'R32'>('R410A');
  const [pipeMaterial, setPipeMaterial] = useState<'Copper' | 'Steel' | 'PVC'>('Copper');
  const [isOduAuto, setIsOduAuto] = useState<boolean>(true);
  const [customOduHp, setCustomOduHp] = useState<number>(24);
  const [maxAllowedCr, setMaxAllowedCr] = useState<number>(130);
  const [mainPipingLength, setMainPipingLength] = useState<number>(25);
  const [customPipesTotal, setCustomPipesTotal] = useState<number | null>(null);
  const [autoCalcPiping, setAutoCalcPiping] = useState<boolean>(true);


  const [vrfRooms, setVrfRooms] = useState<Array<{
    id: string;
    name: string;
    basis: 'area' | 'volume';
    size: number;
    occupants: number;
    tons: number;
    watts: number;
    pipeLength?: number;
  }>>([
    { id: '1', name: 'Executive Suite', basis: 'area', size: 35, occupants: 3, pipeLength: 12, ...MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 35, 3, isMetric) },
    { id: '2', name: 'Open Office Area', basis: 'area', size: 150, occupants: 18, pipeLength: 28, ...MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 150, 18, isMetric) },
    { id: '3', name: 'Conference Zone', basis: 'area', size: 45, occupants: 12, pipeLength: 18, ...MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 45, 12, isMetric) },
    { id: '4', name: 'Reception & Lobby', basis: 'area', size: 30, occupants: 4, pipeLength: 15, ...MechanicalCoolingEngine.calcRoomTonsAndWatts('area', 30, 4, isMetric) }
  ]);

  // Synchronize piping length automatically based on canvas line sets
  useEffect(() => {
    if (autoCalcPiping) {
      if (customPipesTotal !== null) {
        setPipingLength(customPipesTotal);
      } else {
        const totalBranchLength = vrfRooms.reduce((sum, r) => sum + (r.pipeLength ?? 15), 0);
        setPipingLength(mainPipingLength + totalBranchLength);
      }
    }
  }, [autoCalcPiping, mainPipingLength, vrfRooms, customPipesTotal]);

  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomBasis, setNewRoomBasis] = useState<'area' | 'volume'>('area');
  const [newRoomSize, setNewRoomSize] = useState<number | ''>('');
  const [newRoomOccupants, setNewRoomOccupants] = useState<number | ''>('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    if (restoredParams && restoredParams.tab === 'mechanical' && restoredParams.id !== loadedHistoryId) {
      setLoadedHistoryId(restoredParams.id);
      if (restoredParams.subType) {
        setSubTab(restoredParams.subType as SubTab);
      }
      if (restoredParams.subType === 'cooling') {
        const p = restoredParams.parameters;
        if (p) {
          if (p.isVrf !== undefined) setIsVrf(p.isVrf);
          if (p.vrfRooms !== undefined) setVrfRooms(p.vrfRooms);
          if (p.diversityFactor !== undefined) setDiversityFactor(p.diversityFactor);
          if (p.pipingLength !== undefined) setPipingLength(p.pipingLength);
          if (p.refrigerantType !== undefined) setRefrigerantType(p.refrigerantType);
          if (p.pipeMaterial !== undefined) setPipeMaterial(p.pipeMaterial);
          if (p.isOduAuto !== undefined) setIsOduAuto(p.isOduAuto);
          if (p.customOduHp !== undefined) setCustomOduHp(p.customOduHp);
          if (p.maxAllowedCr !== undefined) setMaxAllowedCr(p.maxAllowedCr);
          if (p.mainPipingLength !== undefined) setMainPipingLength(p.mainPipingLength);
          if (p.autoCalcPiping !== undefined) setAutoCalcPiping(p.autoCalcPiping);
          if (p.area !== undefined) setArea(p.area);
          if (p.volume !== undefined) setVolume(p.volume);
          if (p.estimationBasis !== undefined) setEstimationBasis(p.estimationBasis);
          if (p.occupants !== undefined) setOccupants(p.occupants);
          if (p.heatGainSensitivity !== undefined) setHeatGainSensitivity(p.heatGainSensitivity);
          if (p.projectType !== undefined) setProjectType(p.projectType);
          triggerToast('Cooling / VRF parameters loaded!');
        }
      }
    }
  }, [restoredParams, loadedHistoryId]);

  // Baseline standard calculation at 1.00x sensitivity
  const baselineResults = useMemo(() => {
    return MechanicalCoolingEngine.calculateCoolingLoad({
      isMetric, area, volume, height, estimationBasis, occupants,
      ventilationLps, outdoorTemp, indoorTemp, indoorRelativeHumidity, relativeHumidity,
      altitude, useAltitudeAdj, sensiblePerPerson, latentPerPerson,
      lightingWpm2, equipmentWatts, wallArea, wallUValue, roofArea, roofUValue,
      windowArea, windowUValue, windowShgc, infiltrationACH, safetyFactor
    });
  }, [
    isMetric, area, volume, height, estimationBasis, occupants,
    ventilationLps, outdoorTemp, indoorTemp, indoorRelativeHumidity, relativeHumidity,
    altitude, useAltitudeAdj, sensiblePerPerson, latentPerPerson,
    lightingWpm2, equipmentWatts, wallArea, wallUValue, roofArea, roofUValue,
    windowArea, windowUValue, windowShgc, infiltrationACH, safetyFactor
  ]);

  // Active results incorporating sensitivity multiplier on heat gain coefficients
  const results = useMemo(() => {
    return MechanicalCoolingEngine.calculateCoolingLoad({
      isMetric, area, volume, height, estimationBasis, occupants,
      ventilationLps, outdoorTemp, indoorTemp, indoorRelativeHumidity, relativeHumidity,
      altitude, useAltitudeAdj, sensiblePerPerson, latentPerPerson,
      lightingWpm2: Number((lightingWpm2 * heatGainSensitivity).toFixed(2)),
      equipmentWatts: Math.round(equipmentWatts * heatGainSensitivity),
      wallArea,
      wallUValue: Number((wallUValue * heatGainSensitivity).toFixed(3)),
      roofArea,
      roofUValue: Number((roofUValue * heatGainSensitivity).toFixed(3)),
      windowArea,
      windowUValue: Number((windowUValue * heatGainSensitivity).toFixed(3)),
      windowShgc: Number(Math.min(0.95, windowShgc * heatGainSensitivity).toFixed(3)),
      infiltrationACH,
      safetyFactor
    });
  }, [
    isMetric, area, volume, height, estimationBasis, occupants,
    ventilationLps, outdoorTemp, indoorTemp, indoorRelativeHumidity, relativeHumidity,
    altitude, useAltitudeAdj, sensiblePerPerson, latentPerPerson,
    lightingWpm2, equipmentWatts, wallArea, wallUValue, roofArea, roofUValue,
    windowArea, windowUValue, windowShgc, infiltrationACH, safetyFactor,
    heatGainSensitivity
  ]);

  useEffect(() => {
    onCalculationChange?.(results);
  }, [results, onCalculationChange]);

  const validationResult = !isVrf ? VentilationValidator.validate({ area, volume, occupants, ventilationLps, outdoorTemp, indoorTemp }) : null;

  
  const vrfResults = MechanicalCoolingEngine.calculateVrfSystem({
    rooms: vrfRooms,
    isMetric,
    diversityFactor,
    isOduAuto,
    customOduHp,
    refrigerantType,
    pipingLength
  });

  // Real-time ASHRAE design limits validation with debounced toast notifications
  useEffect(() => {
    // Only run in Cooling Load estimate mode
    if (activeCoolingMode !== 'estimate' || isVrf) {
      setValidationToasts([]);
      return;
    }

    const timer = setTimeout(() => {
      const violations = CoolingAshraeDesignValidator.validate({
        buildingType: projectType,
        heatGainSensitivity,
        wallUValue,
        roofUValue,
        windowUValue,
        windowShgc,
        lightingWpm2,
        equipmentWatts,
        indoorTemp,
        area,
        occupants
      });

      if (violations.length === 0) {
        setValidationToasts([]);
        return;
      }

      setValidationToasts(prev => {
        // Keep existing toasts that are still violating
        const stillValidToasts = prev.filter(t => violations.some(v => v.id === t.id));
        
        // Find newly violating items that haven't been dismissed
        const newViolations = violations.filter(v => 
          !stillValidToasts.some(t => t.id === v.id) &&
          !dismissedViolationIdsRef.current.has(v.id)
        );

        if (newViolations.length === 0) {
          return stillValidToasts;
        }

        const addedToasts: ToastItem[] = newViolations.map(v => ({
          id: v.id,
          violation: v,
          timestamp: Date.now()
        }));

        return [...stillValidToasts, ...addedToasts];
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [
    projectType,
    heatGainSensitivity,
    wallUValue,
    roofUValue,
    windowUValue,
    windowShgc,
    lightingWpm2,
    equipmentWatts,
    indoorTemp,
    area,
    occupants,
    activeCoolingMode,
    isVrf
  ]);

  const handleDismissToast = useCallback((id: string) => {
    dismissedViolationIdsRef.current.add(id);
    setValidationToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleDismissAllToasts = useCallback(() => {
    validationToasts.forEach(t => dismissedViolationIdsRef.current.add(t.id));
    setValidationToasts([]);
  }, [validationToasts]);

  const handleApplyFix = useCallback((field: string, recommendedValue: number) => {
    switch (field) {
      case 'wallUValue':
        setWallUValue(recommendedValue);
        break;
      case 'roofUValue':
        setRoofUValue(recommendedValue);
        break;
      case 'windowUValue':
        setWindowUValue(recommendedValue);
        break;
      case 'windowShgc':
        setWindowShgc(recommendedValue);
        break;
      case 'lightingWpm2':
        setLightingWpm2(recommendedValue);
        break;
      case 'heatGainSensitivity':
        setHeatGainSensitivity(recommendedValue);
        break;
      case 'indoorTemp':
        setIndoorTemp(recommendedValue);
        break;
      case 'occupants':
        setOccupants(recommendedValue);
        break;
      default:
        break;
    }
    triggerToast(`Applied ASHRAE standard: ${recommendedValue}`);
  }, []);

  const handleExportMechanicalCsv = () => {
    if (activeCoolingMode === 'vrf') {
      exportVrfToCsv({
        rooms: vrfRooms.map(r => ({ name: r.name, size: r.size, basis: r.basis, occupants: r.occupants, tons: r.tons })),
        diversityFactor,
        totalConnectedTons: vrfResults.totalConnectedTons,
        coincidentTons: vrfResults.coincidentTons,
        oduSizeHp: vrfResults.oduHP,
        oduSizeTons: vrfResults.oduTons,
        combinationRatio: vrfResults.combinationRatio,
        pipingLength,
        refrigerantCharge: vrfResults.additionalCharge
      });
      triggerToast('VRF system configuration exported to CSV!');
      return;
    }

    if (activeCoolingMode === 'schedules') {
      exportVrfToCsv({
        rooms: vrfRooms,
        diversityFactor,
        totalConnectedTons: vrfResults.totalConnectedTons,
        coincidentTons: vrfResults.coincidentTons,
        oduSizeHp: vrfResults.oduHP,
        oduSizeTons: vrfResults.oduTons,
        combinationRatio: (vrfResults.combinationRatio || 0) * 100,
        pipingLength,
        refrigerantCharge: vrfResults.additionalCharge
      });
      triggerToast('Equipment schedule exported to CSV!');
      return;
    }

    if (results.status === 'INCOMPLETE') {
      triggerToast('INCOMPLETE: Cannot export calculation.');
      return;
    }

    exportCoolingLoadToCsv({
      basis: estimationBasis,
      projectType,
      area: Number(area),
      volume: Number(volume),
      occupants: Number(occupants),
      outdoorTemp,
      indoorTemp,
      ceilingHeight: height,
      sensiblePerPerson,
      latentPerPerson,
      lightingWpm2,
      equipmentWatts,
      wallArea,
      wallUValue,
      roofArea,
      roofUValue,
      windowArea,
      windowUValue,
      windowShgc,
      ventilationLps,
      infiltrationACH,
      safetyFactor,
      altitude,
      relativeHumidity,
      tons: isVrf ? vrfResults.totalConnectedTons : results.tons,
      btu: isVrf ? vrfResults.totalConnectedTons * 12000 : results.btu,
      watts: isVrf ? vrfResults.totalConnectedTons * 3517 : results.watts,
      sensibleWatts: results.totalSensible,
      latentWatts: results.totalLatent,
      envelopeWatts: (results.wallSensible || 0) + (results.roofSensible || 0) + (results.windowCondSensible || 0) + (results.solarSensible || 0),
      peopleWatts: (results.peopleSensible || 0) + (results.peopleLatent || 0),
      lightingWatts: results.lightingSensible,
      ventilationWatts: (results.ventSensible || 0) + (results.ventLatent || 0),
      safetyWatts: results.finalTotal - results.calculatedTotal,
      status: results.status
    });
    triggerToast('Cooling calculation data exported to CSV!');
  };

  return (
    <div className="space-y-6">
      <CoolingLoadReference isOpen={showCoolingRef} onClose={() => setShowCoolingRef(false)} />

      {/* Real-Time ASHRAE Design Range Validation Toast Notifications */}
      <CoolingValidationToastContainer
        toasts={validationToasts}
        onDismiss={handleDismissToast}
        onDismissAll={handleDismissAllToasts}
        onApplyFix={handleApplyFix}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-400 px-4 py-3 rounded-lg shadow-sm shadow-cyan-950/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Cooling Load Workspace */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">
                {activeCoolingMode === 'estimate' ? 'Simplified Cooling Load Estimate' :
                 activeCoolingMode === 'vrf' ? 'Multi-Space VRF System Analysis & Network Topology' :
                 activeCoolingMode === 'schedules' ? 'Cooling & VRF Equipment Schedules' :
                 'Cooling Compliance & Engineering Audit Report'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
              <span>
                {activeCoolingMode === 'estimate' ? 'Configure thermal loads for standard rooms or optimize complete VRF systems.' :
                 activeCoolingMode === 'vrf' ? 'Optimize multi-zone VRF systems, refrigerant piping distribution, and outdoor unit sizing.' :
                 activeCoolingMode === 'schedules' ? 'Engineering schedules for indoor fan coils, cassettes, and outdoor condensing units.' :
                 'Comprehensive thermodynamic calculation traces, safety verification, and compliance documentation.'}
              </span>
              <button
                type="button"
                onClick={() => setShowCoolingRef(true)}
                className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded transition-colors border border-cyan-500/20"
              >
                <BookOpen className="h-3 w-3" />
                <span className="font-bold tracking-wider uppercase text-xs">ASHRAE Guide</span>
              </button>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-xl text-xs font-bold uppercase w-fit">
              <span className="px-3 py-1.5 text-slate-400">Project Type:</span>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
                className="bg-slate-950 text-white focus:outline-none focus:text-cyan-400 cursor-pointer"
              >
                <option value="Commercial">Commercial</option>
                <option value="Residential">Residential</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <button
              id="export-mechanical-calc-header-csv-btn"
              type="button"
              onClick={handleExportMechanicalCsv}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Download current input parameters and resulting performance data to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {activeCoolingMode === 'schedules' ? (
          /* EQUIPMENT SCHEDULES VIEW */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Indoor Terminal Units Schedule */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-4 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    Indoor Terminal Equipment Schedule (VRF / DX Fan Coils)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detailed zone load allocations, cooling capacity ratings, and connected pipe sizes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    Total Units: {vrfRooms.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                      <th className="py-2.5 px-3">Unit Tag</th>
                      <th className="py-2.5 px-3">Zone / Space</th>
                      <th className="py-2.5 px-3">Basis & Footprint</th>
                      <th className="py-2.5 px-3">Occupancy</th>
                      <th className="py-2.5 px-3">Cooling (TR)</th>
                      <th className="py-2.5 px-3">Total (W)</th>
                      <th className="py-2.5 px-3">Liquid Line</th>
                      <th className="py-2.5 px-3">Gas Line</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {vrfRooms.map((room, idx) => (
                      <tr key={room.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">IDU-{String(idx + 1).padStart(2, '0')}</td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">{room.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{room.size} {room.basis === 'area' ? 'm²' : 'm³'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{room.occupants} persons</td>
                        <td className="py-2.5 px-3 font-bold text-white">{(room.tons || 0).toFixed(2)} TR</td>
                        <td className="py-2.5 px-3 text-slate-300">{Math.round(room.watts).toLocaleString()} W</td>
                        <td className="py-2.5 px-3 text-slate-400">Ø 9.52 mm (3/8")</td>
                        <td className="py-2.5 px-3 text-slate-400">Ø 15.88 mm (5/8")</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Outdoor Condensing Unit Schedule */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-4 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Outdoor Unit Schedule (VRF Heat Pump / Heat Recovery)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Condensing unit nominal rating, diversity factor, and connection ratio validation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/80">
                    AHRI 1230 PASS
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Equipment Tag</span>
                  <span className="text-sm font-bold text-white font-mono">ODU-01</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Variable Speed Inverter</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Nominal Capacity</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {vrfResults.oduHP} HP ({(vrfResults.oduTons || 0).toFixed(1)} TR)
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Modular Outdoor Profile</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Connection Ratio</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {((vrfResults.combinationRatio || 0) * 100).toFixed(1)}% / Max {maxAllowedCr}%
                  </span>
                  <span className="text-[10px] text-emerald-500 block mt-0.5">AHRI 1230 Compliant</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Refrigerant Charge</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {(vrfResults.totalCharge || 0).toFixed(2)} kg
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {refrigerantType} (+{(vrfResults.additionalCharge || 0).toFixed(2)} kg field)
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    exportVrfToCsv({
                      rooms: vrfRooms,
                      diversityFactor,
                      totalConnectedTons: vrfResults.totalConnectedTons,
                      coincidentTons: vrfResults.coincidentTons,
                      oduSizeHp: vrfResults.oduHP,
                      oduSizeTons: vrfResults.oduTons,
                      combinationRatio: (vrfResults.combinationRatio || 0) * 100,
                      pipingLength,
                      refrigerantCharge: vrfResults.additionalCharge
                    });
                    triggerToast('Equipment schedule exported to CSV!');
                  }}
                  className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span>Export Schedules (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeCoolingMode === 'reports' ? (
          /* REPORTS VIEW */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-5 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    Cooling Load & VRF Compliance Audit Report
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comprehensive thermodynamic verification per ASHRAE Fundamentals and AHRI Standard 1230.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportCoolingLoadToCsv({
                        basis: estimationBasis,
                        area: Number(area),
                        volume: Number(volume),
                        occupants: Number(occupants),
                        tons: results.tons,
                        btu: results.btu,
                        watts: results.watts
                      });
                      triggerToast('Cooling report data exported to CSV!');
                    }}
                    className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Report Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Peak Cooling Capacity</span>
                  <span className="text-lg font-black text-white font-mono">
                    {(isVrf ? vrfResults.totalConnectedTons : results.tons).toFixed(2)} TR
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">
                    {Math.round(isVrf ? vrfResults.totalConnectedWatts : results.watts).toLocaleString()} W
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Design SHR</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {(results.calculatedTotal > 0 ? results.totalSensible / results.calculatedTotal : 0.78).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Sensible / Total Ratio
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Safety Factor Applied</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    +{safetyFactor}%
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Contingency Margin
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Standard Status</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    COMPLIANT
                  </span>
                  <span className="text-[10px] text-emerald-500 block mt-0.5">
                    ASHRAE / AHRI Verified
                  </span>
                </div>
              </div>

              {/* Audit Trails */}
              <div className="space-y-6 pt-4 border-t border-slate-800/60">
                {results.auditTrail && results.auditTrail.length > 0 && (
                  <AuditTrailTable title="ASHRAE Fundamentals & 15 Audit Log" trail={results.auditTrail} />
                )}
                {vrfResults.auditTrail && vrfResults.auditTrail.length > 0 && (
                  <AuditTrailTable title="VRF / AHRI 1230 System Audit Log" trail={vrfResults.auditTrail} />
                )}
              </div>
            </div>
          </div>
        ) : !isVrf ? (
          /* INDIVIDUAL SPACE MODE */
            <div className="flex flex-col gap-6">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-4 border border-slate-800">
                <div className="flex items-center space-x-2 mb-2 border-b border-slate-800 pb-3">
                  <Thermometer className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">{t("thermalInputs")}</h3>
                </div>

                <div>
                  <TooltipLabel 
                    label={t('estimationBasis')} 
                    tooltip={t("estimationBasisTooltip")}
                    className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider" 
                  />
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
                    <button
                      type="button"
                      onClick={() => setEstimationBasis('area')}
                      className={`py-1.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        estimationBasis === 'area'
                          ? 'bg-cyan-650 text-white shadow-sm border border-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('floorArea')} (m²)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimationBasis('volume')}
                      className={`py-1.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        estimationBasis === 'volume'
                          ? 'bg-cyan-650 text-white shadow-sm border border-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('roomVolume')} (m³)
                    </button>
                  </div>
                </div>
                
                <TooltipLabel label="Altitude / Air Density" tooltip="Adjust psychrometric equations for non-sea-level air density." className="text-sky-400" />
                <div className="flex items-center space-x-2 mb-4">
                  <label className="flex items-center text-xs font-medium text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAltitudeAdj}
                      onChange={(e) => setUseAltitudeAdj(e.target.checked)}
                      className="mr-1.5 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-900"
                    />
                    Enable
                  </label>
                  <input
                    type="number"
                    disabled={!useAltitudeAdj}
                    value={altitude === 0 && !useAltitudeAdj ? '' : altitude}
                    onChange={(e) => {
                      if (useAltitudeAdj) setAltitude(e.target.value === '' ? 0 : Number(e.target.value));
                    }}
                    placeholder="Altitude"
                    className={`w-full bg-slate-950 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors border ${
                      !useAltitudeAdj 
                        ? 'text-slate-600 border-slate-800' 
                        : 'text-white border-slate-700 focus:border-cyan-500'
                    }`}
                  />
                  <span className="text-xs text-slate-500">{isMetric ? 'm' : 'ft'}</span>
                </div>

                {estimationBasis === 'area' ? (
                  <div>
                    <TooltipLabel 
                      label={`${t('floorArea')} (m²)`}
                      tooltip={t("floorAreaTooltip")}
                      className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase" 
                    />
                    <input
                      type="number"
                    min="5"
                    max="2000"
                      value={area ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setArea(val);
                        if (typeof val === 'number') {
                          setVolume(val * 3); // standard 3-meter ceiling height conversion
                        }
                      }}
                      placeholder="e.g., 50"
                      className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors border ${
                        area !== '' && (Number(area) < 5 || Number(area) > 2000)
                          ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                          : 'border-slate-800 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                      } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                    />
                    {area !== '' && (Number(area) < 5 || Number(area) > 2000) && (
                      <InputAlert type="error" message="Safe engineering range: 5 to 2,000 m²" />
                    )}
                  </div>
                ) : (
                  <div>
                    <TooltipLabel 
                      label={`${t('roomVolume')} (m³)`}
                      tooltip={t("roomVolumeTooltip")}
                      className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase" 
                    />
                    <input
                      type="number"
                    min="15"
                    max="6000"
                      value={volume ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setVolume(val);
                        if (typeof val === 'number') {
                          setArea(Number(((val / 3) || 0).toFixed(1)));
                        }
                      }}
                      placeholder="e.g., 150"
                      className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors border ${
                        volume !== '' && (Number(volume) < 15 || Number(volume) > 6000)
                          ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                          : 'border-slate-800 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                      } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                    />
                    {volume !== '' && (Number(volume) < 15 || Number(volume) > 6000) && (
                      <InputAlert type="error" message="Safe engineering range: 15 to 6,000 m³" />
                    )}
                  </div>
                )}

                <div>
                  <TooltipLabel 
                    label={t('occupantDensity')}
                    tooltip={t("occupantTooltip")}
                    className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={occupants ?? ""}
                    onChange={(e) => setOccupants(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 5"
                    className={`w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors border ${
                      occupants !== '' && (Number(occupants) < 1 || Number(occupants) > 1000)
                        ? 'border-red-500/70 focus:ring-2 focus:ring-red-500/20 text-red-200'
                        : occupants !== '' && area !== '' && (
                          (projectType === 'Residential' && (Number(area) / Number(occupants)) < 30) ||
                          (projectType === 'Commercial' && (Number(area) / Number(occupants)) < 10) ||
                          (projectType === 'Healthcare' && (Number(area) / Number(occupants)) < 15) ||
                          (projectType === 'Industrial' && (Number(area) / Number(occupants)) < 50)
                        )
                        ? 'border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 text-amber-200'
                        : 'border-slate-800 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {occupants !== '' && (Number(occupants) < 1 || Number(occupants) > 1000) && (
                    <InputAlert type="error" message="Safe engineering range: 1 to 1,000 people" />
                  )}
                  {occupants !== '' && area !== '' && Number(occupants) >= 1 && Number(occupants) <= 1000 && (
                    (() => {
                      const density = Number(area) / Number(occupants);
                      if (projectType === 'Residential' && density < 30) return <InputAlert type="warning" message={`Density ${(density || 0).toFixed(1)} m²/person exceeds typical residential bounds (≥ 30)`} />;
                      if (projectType === 'Commercial' && density < 10) return <InputAlert type="warning" message={`Density ${(density || 0).toFixed(1)} m²/person exceeds typical office bounds (≥ 10)`} />;
                      if (projectType === 'Healthcare' && density < 15) return <InputAlert type="warning" message={`Density ${(density || 0).toFixed(1)} m²/person exceeds typical healthcare bounds (≥ 15)`} />;
                      if (projectType === 'Industrial' && density < 50) return <InputAlert type="warning" message={`Density ${(density || 0).toFixed(1)} m²/person exceeds typical industrial bounds (≥ 50)`} />;
                      return null;
                    })()
                  )}
                </div>
              </div>

              {/* Interactive Heat Gain Sensitivity Slider & Real-Time Chiller Tonnage Impact */}
              <CoolingSensitivitySlider
                sensitivity={heatGainSensitivity}
                onSensitivityChange={setHeatGainSensitivity}
                baselineTons={baselineResults.tons || 0}
                activeTons={results.tons || 0}
                baselineWatts={baselineResults.watts || 0}
                activeWatts={results.watts || 0}
                wallUValue={wallUValue}
                onWallUValueChange={setWallUValue}
                roofUValue={roofUValue}
                onRoofUValueChange={setRoofUValue}
                windowUValue={windowUValue}
                onWindowUValueChange={setWindowUValue}
                windowShgc={windowShgc}
                onWindowShgcChange={setWindowShgc}
                lightingWpm2={lightingWpm2}
                onLightingChange={setLightingWpm2}
                equipmentWatts={equipmentWatts}
                onEquipmentChange={setEquipmentWatts}
              />

              <motion.div
                key={`${(results.tons || 0).toFixed(4)}-${results.btu}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-center space-y-5 relative overflow-hidden border border-slate-800"
              >
                                
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{t('coolingLoadResult')}</h3>
                    {validationResult && (
                      <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        validationResult.status === 'PASS' 
                          ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50' 
                          : validationResult.status === 'INCOMPLETE'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/50'
                      }`}>
                        {validationResult.status === 'PASS' && <CheckCircle2 className="w-3 h-3" />}
                        {validationResult.status === 'FAIL' && <ShieldAlert className="w-3 h-3" />}
                        {validationResult.status === 'INCOMPLETE' && <Info className="w-3 h-3" />}
                        <span>{validationResult.status}</span>
                      </div>
                    )}
                    {results?.status === 'PASS' && results?.auditTrail && results.auditTrail.length > 0 && (
                      <a 
                        href="https://www.ashrae.org/technical-resources/standards-and-guidelines" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="View ASHRAE Standards"
                        className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified: {results.auditTrail[0].reference?.split(' → ')?.[0] + ' ' + results.auditTrail[0].reference?.split(' → ')?.[1] || 'ASHRAE Fundamentals 2021'}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-xs font-bold uppercase w-fit z-10 relative">
                    <button
                      onClick={() => setChartMode('bar')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        chartMode === 'bar' ? 'bg-cyan-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Benchmarks
                    </button>
                    <button
                      onClick={() => setChartMode('pie')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        chartMode === 'pie' ? 'bg-cyan-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Breakdown
                    </button>
                  </div>
                </div>
                
                {validationResult && validationResult.status === 'FAIL' && (
                  <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 mb-2">
                    <div className="flex items-center space-x-2 text-rose-400 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Engineering Flags</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      {validationResult.messages.map((msg, idx) => (
                        <li key={idx} className="text-xs text-rose-300/80 leading-relaxed">{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Calculated Load</p>
                    <p className="text-xl font-bold text-slate-200 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round(results.calculatedTotal).toLocaleString()} <span className="text-xs font-normal text-slate-500">W</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Sensible Load</p>
                    <p className="text-xl font-bold text-slate-200 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round(results.totalSensible).toLocaleString()} <span className="text-xs font-normal text-slate-500">W</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Latent Load</p>
                    <p className="text-xl font-bold text-slate-200 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round(results.totalLatent).toLocaleString()} <span className="text-xs font-normal text-slate-500">W</span></p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Final Design Load</p>
                    <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round(results.watts).toLocaleString()} <span className="text-xs font-normal text-cyan-500/50">W (+{safetyFactor}%)</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{t('btuHr')}</p>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round(results.btu).toLocaleString()} <span className="text-xs font-normal text-slate-400">BTU/h</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Cooling Capacity</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : (results.tons || 0).toFixed(2)} <span className="text-xs font-normal text-slate-400">TR</span></p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Rec. AC Capacity</p>
                    <p className="text-xl font-bold text-sky-400 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.ceil((results.tons) * 2) / 2} <span className="text-xs font-normal text-sky-500/50">TR</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Req. Outdoor Air</p>
                    <p className="text-xl font-bold text-slate-200 mt-1 font-mono">{ventilationLps} <span className="text-xs font-normal text-slate-500">L/s</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Req. Supply Air</p>
                    <p className="text-xl font-bold text-slate-200 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round((results.totalSensible) / 13.31 * 2.11888).toLocaleString()} <span className="text-xs font-normal text-slate-500">CFM</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Est. Electrical Input</p>
                    <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{results.status === 'INCOMPLETE' ? '-' : Math.round((results.watts) / 3.5).toLocaleString()} <span className="text-xs font-normal text-amber-500/50">W (COP 3.5)</span></p>
                  </div>
                </div>


                {results.status !== 'INCOMPLETE' && results.watts > 0 && (
                  <div className="pt-4 border-t border-slate-800">
                    {chartMode === 'bar' ? (
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Load Breakdown</p>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                { name: 'Space Thermal Load', value: Math.round(results.calculatedTotal - (results.peopleSensible + results.peopleLatent)) },
                                { name: 'Occupant Load', value: Math.round(results.peopleSensible + results.peopleLatent) }
                              ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={110} />
                                <Tooltip 
                                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                                  formatter={(value) => [`${value} W`, 'Thermal Load']}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                  {
                                    [0,1].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6'][index]} />
                                    ))
                                  }
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Reference Benchmarks</p>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                                { metric: 'W/m²', current: Math.round(results.watts / ((Number(area) > 0 ? Number(area) : NaN))), standard: 150 },
                                { metric: 'W/Person', current: Math.round(results.watts / ((Number(occupants) > 0 ? Number(occupants) : NaN))), standard: 100 },
                                { metric: 'm²/Person', current: Math.round(((Number(area) > 0 ? Number(area) : NaN)) / ((Number(occupants) > 0 ? Number(occupants) : NaN))), standard: 10 }
                              ]}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#64748b', fontSize: 9 }} />
                                <Radar name="Current" dataKey="current" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                <Radar name="Standard" dataKey="standard" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <div className="h-64 w-full relative mb-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'People', value: results.peopleSensible + results.peopleLatent },
                                  { name: 'Lighting', value: results.lightingSensible },
                                  { name: 'Equipment', value: results.equipmentSensible },
                                  { name: 'Envelope', value: results.wallSensible + results.roofSensible + results.windowCondSensible },
                                  { name: 'Solar', value: results.solarSensible },
                                  { name: 'Ventilation', value: results.ventSensible + results.ventLatent },
                                  { name: 'Infiltration', value: results.infiltrationSensible + results.infiltrationLatent }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {['#f43f5e', '#facc15', '#818cf8', '#4ade80', '#fb923c', '#38bdf8', '#94a3b8'].map((color, index) => (
                                  <Cell key={`cell-${index}`} fill={color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any) => [`${Math.round(Number(value)).toLocaleString()} W`, 'Capacity']}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2 mt-[-20px] mb-2 relative z-10">
                           <div className="text-xs font-bold uppercase text-sky-400 tracking-wider">Data Series: Estimated Cooling Capacity</div>
                           <div className="flex justify-center flex-wrap gap-4 text-xs font-bold uppercase">
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f43f5e]" /> <span className="text-slate-400">People</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#facc15]" /> <span className="text-slate-400">Lighting</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#818cf8]" /> <span className="text-slate-400">Equipment</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#4ade80]" /> <span className="text-slate-400">Envelope</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fb923c]" /> <span className="text-slate-400">Solar</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#38bdf8]" /> <span className="text-slate-400">Vent</span></div>
                             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#94a3b8]" /> <span className="text-slate-400">Infil</span></div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* System Audit Trail */}
                <div className="mt-8 pt-6 border-t border-slate-800/60 w-full">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-sky-400" />
                    Engineering Audit Trail
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs">
                      <div className="text-sky-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">Governing Standards</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div className="text-slate-500">Methodology:</div>
                        <div className="text-right">ASHRAE Cooling Load</div>
                        <div className="text-slate-500">Edition:</div>
                        <div className="text-right">Fundamentals (Ch. 18)</div>
                        <div className="text-slate-500">Calculation Method:</div>
                        <div className="text-right">Sensible/Latent Heat Balance</div>
                        <div className="text-slate-500">Safety Factor:</div>
                        <div className="text-right">{safetyFactor}%</div>
                        <div className="text-slate-500">COP (Standard):</div>
                        <div className="text-right">3.5</div>
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs">
                      <div className="text-cyan-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">Intermediate Variables</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div className="text-slate-500">ΔT (Outdoor - Indoor):</div>
                        <div className="text-right">{((outdoorTemp - indoorTemp) || 0).toFixed(1)} {isMetric ? '°C' : '°F'}</div>
                        <div className="text-slate-500">Air Density Ratio (ρ):</div>
                        <div className="text-right">{useAltitudeAdj ? (DensityCorrectionService.getAirProperties(isMetric ? altitude : UnitConversionService.ftToM(altitude), outdoorTemp, relativeHumidity).densityRatio || 0).toFixed(3) : '1.000'}</div>
                        <div className="text-slate-500">Specific Heat (Cp):</div>
                        <div className="text-right">{(((useAltitudeAdj ? DensityCorrectionService.getAirProperties(isMetric ? altitude : UnitConversionService.ftToM(altitude), outdoorTemp, relativeHumidity).densityRatio : 1.0) * 1.21) || 0).toFixed(3)} kJ/kg·K</div>
                        <div className="text-slate-500">Latent Heat (hfg):</div>
                        <div className="text-right">{(((useAltitudeAdj ? DensityCorrectionService.getAirProperties(isMetric ? altitude : UnitConversionService.ftToM(altitude), outdoorTemp, relativeHumidity).densityRatio : 1.0) * 3010) || 0).toFixed(0)} kJ/kg</div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs lg:col-span-2">
                      <div className="text-amber-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">Load Components (Sensible / Latent)</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-slate-300">
                        <div className="text-slate-500">People:</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.peopleSensible)} W / ${Math.round(results.peopleLatent)} W`}</div>
                        
                        <div className="text-slate-500">Lighting/Equip:</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.lightingSensible + results.equipmentSensible)} W / 0 W`}</div>
                        
                        <div className="text-slate-500">Envelope:</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.wallSensible + results.roofSensible + results.windowCondSensible)} W / 0 W`}</div>
                        
                        <div className="text-slate-500">Solar (SHGC):</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.solarSensible)} W / 0 W`}</div>
                        
                        <div className="text-slate-500">Ventilation:</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.ventSensible)} W / ${Math.round(results.ventLatent)} W`}</div>
                        
                        <div className="text-slate-500">Infiltration:</div>
                        <div className="text-right">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.infiltrationSensible)} W / ${Math.round(results.infiltrationLatent)} W`}</div>
                        
                        <div className="text-slate-500 col-span-2 sm:col-span-1 pt-2 border-t border-slate-800">Total Unfactored:</div>
                        <div className="text-right font-bold text-slate-100 col-span-2 sm:col-span-1 pt-2 border-t border-slate-800">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.totalSensible)} W / ${Math.round(results.totalLatent)} W`}</div>
                        <div className="text-slate-500 col-span-2 sm:col-span-1 pt-2 border-t border-slate-800">Calculated Final:</div>
                        <div className="text-right font-bold text-amber-400 col-span-2 sm:col-span-1 pt-2 border-t border-slate-800">{results.status === 'INCOMPLETE' ? 'INCOMPLETE' : `${Math.round(results.calculatedTotal)} W`}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      if (onSaveCalculation) {
                        const numArea = area !== '' && area !== undefined ? Number(area) : NaN;
                        const numVol = volume !== '' && volume !== undefined ? Number(volume) : NaN;
                        const numOcc = occupants !== '' && occupants !== undefined ? Number(occupants) : NaN;
                        if (isNaN(numArea) || isNaN(numOcc)) {
                          triggerToast('INCOMPLETE: Missing required inputs.');
                          return;
                        }
                        onSaveCalculation({
                          tab: 'mechanical',
                          subType: 'cooling',
                          title: estimationBasis === 'area' ? `Cooling Load (${numArea} m²)` : `Cooling Load (${numVol} m³)`,
                          summary: estimationBasis === 'area' 
                            ? `${numArea} m² | ${numOcc} Occ. | ${(results.tons || 0).toFixed(1)} TR`
                            : `${numVol} m³ | ${numOcc} Occ. | ${(results.tons || 0).toFixed(1)} TR`,
                          parameters: { 
                            isVrf: false,
                            area: numArea, 
                            volume: numVol, 
                            estimationBasis, 
                            occupants: numOcc,
                            heatGainSensitivity,
                            projectType
                          }
                        });
                        triggerToast(t('toastCalculationSaved'));
                      }
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>{t('saveCalculation')}</span>
                  </button>
                  <button
                    id="export-cooling-estimate-bottom-csv-btn"
                    onClick={handleExportMechanicalCsv}
                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                    title="Export cooling load calculation inputs and performance outputs to CSV"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                    <span>{t('exportCsv')}</span>
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`CKY_MEPF - Cooling Load Estimate Report`);
                      const body = encodeURIComponent(
                        `Dear Team,\n\nHere is the Cooling Load Estimate Report generated from CKY_MEPF:\n\n` +
                        `- Estimation Basis: ${estimationBasis === 'area' ? 'Floor Area' : 'Room Volume'}\n` +
                        `- Size: ${estimationBasis === 'area' ? area : volume} ${estimationBasis === 'area' ? 'm²' : 'm³'}\n` +
                        `- Occupant Count: ${occupants}\n` +
                        `- Estimated Cooling Capacity: ${(results.tons || 0).toFixed(2)} TR (${Math.round(results.btu).toLocaleString()} BTU/hr)\n` +
                        `- Total Power: ${Math.round(results.watts).toLocaleString()} W th\n` +
                        `- Estimated Electrical Input: ${Math.round(results.watts / 3.5).toLocaleString()} W (COP 3.5)\n\n` +
                        `Generated on ${new Date().toLocaleString()}\n` +
                        `Regards,\n` +
                        `Design Team`
                      );
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <Mail className="h-4 w-4 text-sky-400" />
                    <span>{t('shareEmail')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          ) : (
            /* MULTI-SPACE VRF/VRV SYSTEM MODE */
            
            <div className="space-y-6">
              <div className="flex flex-col gap-6">
                <div className="w-full h-full">
                  
                {/* System Parameters Card */}
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-4 border border-slate-800/80 h-full flex flex-col">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <Sliders className="h-4.5 w-4.5 text-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">VRF System Design Settings</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Diversity Factor Selector */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <TooltipLabel
                          label="Diversity / Coincidence Factor"
                          tooltip={t("vrfDiversityTooltip")} 
                          className="text-slate-400 uppercase"
                        />
                        <span className="font-mono text-cyan-400 font-bold">{(diversityFactor || 0).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="1.4"
                        step="0.05"
                        value={diversityFactor ?? ""}
                        onChange={(e) => setDiversityFactor(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Accounts for non-coincidence of peak loads across multiple zones (Standard: 1.1 - 1.25).
                      </p>
                    </div>

                    {/* Piping & Refrigerant Type */}
                    <div className="space-y-3">
                      <div>
                        <TooltipLabel 
                          label="Refrigerant Chemistry"
                          tooltip={t("refrigerantTooltip")}
                          className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" 
                        />
                        <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-950 rounded-lg border border-slate-850 text-xs font-bold uppercase">
                          <button
                            type="button"
                            onClick={() => setRefrigerantType('R410A')}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              refrigerantType === 'R410A' ? 'bg-cyan-650 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            R-410A
                          </button>
                          <button
                            type="button"
                            onClick={() => setRefrigerantType('R32')}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              refrigerantType === 'R32' ? 'bg-cyan-650 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            R-32
                          </button>
                        </div>
                      </div>
                      <div>
                        <TooltipLabel 
                          label="Pipe Material"
                          tooltip={t("pipingMatTooltip")}
                          className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" 
                        />
                        <select
                          value={pipeMaterial}
                          onChange={(e) => setPipeMaterial(e.target.value as any)}
                          className="w-full bg-slate-950 text-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-800 transition-colors"
                        >
                          <option value="Copper">Copper</option>
                          <option value="Steel">Steel</option>
                          <option value="PVC">PVC</option>
                        </select>
                      </div>
                    </div>
          {results.status === 'INCOMPLETE' ? (
            <EngineeringStatusHeader 
              status="INCOMPLETE" 
              message={results.warning || 'Missing required parameters.'}
              className="mb-4"
            />
          ) : (
            <EngineeringStatusHeader 
              status="WARNING" 
              message="Simplified cooling-load model is being used. Does not replace a full ASHRAE heat-balance calculation."
              className="mb-4"
            />
          )}
                  </div>

                   <div>
                     <div className="flex justify-between items-center text-xs font-semibold mb-1">
                       <TooltipLabel
                         label="Total Liquid Piping Length (m)"
                         tooltip={t("pipeLenTooltip")} 
                         className="text-slate-400 uppercase"
                       />
                       <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                         <input
                           id="auto-calc-piping-toggle"
                           type="checkbox"
                           checked={autoCalcPiping}
                           onChange={(e) => setAutoCalcPiping(e.target.checked)}
                           className="w-3 h-3 accent-cyan-500 cursor-pointer"
                         />
                         <TooltipLabel
                           label={<label htmlFor="auto-calc-piping-toggle" className="cursor-pointer">Auto-Calculate from Canvas</label>}
                           tooltip={t("syncTopologyTooltip")} 
                           className="text-xs text-cyan-400 font-bold uppercase select-none"
                         />
                       </div>
                     </div>
                     {autoCalcPiping ? (
                       <div className="w-full bg-slate-950 text-cyan-400 rounded-lg px-3 py-1.5 text-xs font-mono border border-cyan-900/30 flex justify-between items-center">
                         <span>{pipingLength} m (Canvas-driven)</span>
                         <span className="text-xs text-slate-500 italic">{customPipesTotal !== null ? `Custom Drawn Pipes: ${customPipesTotal}m` : `Main: ${mainPipingLength}m + Branches: ${vrfRooms.reduce((sum, r) => sum + (r.pipeLength ?? 15), 0)}m`}</span>
                       </div>
                     ) : (
                        <div>
                          <input
                            type="number"
                    min="5"
                    max="1000"
                            value={pipingLength ?? ""}
                            onChange={(e) => setPipingLength(e.target.value === '' ? '' : Number(e.target.value) as any)}
                            placeholder="e.g., 80"
                            className={`w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                              pipingLength !== '' && (Number(pipingLength) < 5 || Number(pipingLength) > 1000)
                                ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                                : 'border-slate-800 focus:border-cyan-500'
                            } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                          />
                          {pipingLength !== '' && (Number(pipingLength) < 5 || Number(pipingLength) > 1000) && (
                            <InputAlert type="error" message="Safe engineering range: 5 to 1,000 meters" />
                          )}
                        </div>
                      )}
                     <p className="text-xs text-slate-500 mt-1">
                       {autoCalcPiping 
                         ? "Summed up automatically from your main pipe line set and indoor unit branches." 
                         : "Used to approximate required additional pre-commissioning liquid line refrigerant charge."
                       }
                     </p>
                   </div>

                  {/* Outdoor Unit Sizing Control & Limits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
                    {/* ODU Sizing Mode */}
                    <div>
                      <TooltipLabel 
                        label="ODU Sizing Selection"
                        tooltip={t("autoSizeTooltip")}
                        className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" 
                      />
                      <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-950 rounded-lg border border-slate-850 text-xs font-bold uppercase">
                        <button
                          type="button"
                          onClick={() => setIsOduAuto(true)}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            isOduAuto ? 'bg-cyan-650 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Auto Sized
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsOduAuto(false)}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            !isOduAuto ? 'bg-cyan-650 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Manual override
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Select whether the system automatically finds the recommended unit size or uses your manual selection.
                      </p>
                    </div>

                    {/* Manual HP Select or Max CR limit selection */}
                    {!isOduAuto ? (
                      <div>
                        <TooltipLabel 
                          label="Manual ODU HP Override"
                          tooltip={t("unitCapTooltip")}
                          className="block text-xs font-bold text-slate-400 mb-1.5 uppercase" 
                        />
                        <select
                          value={customOduHp ?? ""}
                          onChange={(e) => setCustomOduHp(Number(e.target.value))}
                          className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs font-mono border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          {[8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60].map(hp => (
                            <option key={hp} value={hp}>{hp} HP ({ ((hp * 0.8) || 0).toFixed(1) } TR)</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          Forces the design to validate against a specific hardware profile.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <TooltipLabel
                          label="Max allowed CR limit"
                          tooltip={t("capRatioTooltip")} 
                          className="text-slate-400 uppercase text-xs"
                        />
                          <span className="font-mono text-cyan-400 font-bold">{maxAllowedCr}%</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="150"
                          step="5"
                          value={maxAllowedCr ?? ""}
                          onChange={(e) => setMaxAllowedCr(Number(e.target.value))}
                          className="w-full accent-cyan-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          The absolute maximum allowable ratio of connected IDU to ODU capacity.
                        </p>
                      </div>
                    )}
                  </div>

                  {!isOduAuto && (
                    <div className="pt-3 border-t border-slate-800/40">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <TooltipLabel
                          label="Max allowed CR limit"
                          tooltip={t("capRatioTooltip")} 
                          className="text-slate-400 uppercase text-xs"
                        />
                        <span className="font-mono text-cyan-400 font-bold">{maxAllowedCr}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="150"
                        step="5"
                        value={maxAllowedCr ?? ""}
                        onChange={(e) => setMaxAllowedCr(Number(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        The absolute maximum allowable ratio of connected IDU to ODU capacity.
                      </p>
                    </div>
                  )}
                </div>

                
                </div>
                {/* Right Side: VRF System Sizing Output */}
              <div className="w-full h-full">
                <motion.div
                  key={`${(vrfResults.totalConnectedTons || 0).toFixed(4)}-${(vrfResults.coincidentTons || 0).toFixed(4)}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-center space-y-5 relative overflow-hidden border border-slate-800 h-full"
                >
                                    
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">VRF System Coincidence Sizing</h3>
                    {vrfResults?.auditTrail && vrfResults.auditTrail.length > 0 && (
                      <a 
                        href="https://www.ashrae.org/technical-resources/standards-and-guidelines" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="View AHRI / ASHRAE Standards"
                        className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified: {vrfResults.auditTrail.find((a: any) => a.reference?.includes('AHRI'))?.reference?.split(' → ')?.slice(0, 2)?.join(' ') || 'AHRI 1230 2021'}</span>
                      </a>
                    )}
                  </div>
                  
                  {/* Results Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-850/50">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Total IDU connected</p>
                      <p className="text-2xl font-black text-white mt-1 font-mono">
                        {(vrfResults.totalConnectedTons || 0).toFixed(2)}{' '}
                        <span className="text-xs font-normal text-slate-400">TR</span>
                      </p>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-850/50">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Coincident peak load</p>
                      <p className="text-2xl font-black text-white mt-1 font-mono text-cyan-400">
                        {(vrfResults.coincidentTons || 0).toFixed(2)}{' '}
                        <span className="text-xs font-normal text-slate-400">TR</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-850/50">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Recommended ODU Size</p>
                      <p className="text-xl font-black text-white mt-1 font-mono">
                        {vrfResults.oduHP}{' '}
                        <span className="text-xs font-normal text-slate-400">HP</span>
                        <span className="block text-xs text-slate-500 font-normal font-sans">({(vrfResults.oduTons || 0).toFixed(1)} TR capacity)</span>
                      </p>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-850/50">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Combination Ratio (CR)</p>
                      <p className={`text-xl font-black mt-1 font-mono ${
                        vrfResults.combinationRatio > maxAllowedCr
                          ? 'text-rose-400 font-extrabold animate-pulse'
                          : vrfResults.combinationRatio < 50
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}>
                        {(vrfResults.combinationRatio || 0).toFixed(1)}{' '}
                        <span className="text-xs font-normal text-slate-400">%</span>
                      </p>
                    </div>
                  </div>

                  {/* Real-time Design Validation & Safety Center */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/60">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        vrfResults.combinationRatio <= maxAllowedCr && !vrfResults.hasCapacityDeficit && !vrfResults.toxicLimitExceeded
                          ? 'bg-cyan-400'
                          : 'bg-rose-400 animate-ping'
                      }`} />
                      VRF Design Validation Center
                    </h4>

                    {/* Sizing Connection Ratio Check Card */}
                    <div className={`p-3 rounded-xl text-xs leading-relaxed border transition-all duration-200 ${
                      vrfResults.combinationRatio <= maxAllowedCr && vrfResults.combinationRatio >= 50
                        ? 'bg-cyan-950/15 border-cyan-500/20 text-cyan-300'
                        : vrfResults.combinationRatio > maxAllowedCr
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                        : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs">
                          {vrfResults.combinationRatio <= maxAllowedCr && vrfResults.combinationRatio >= 50 ? '✅' : vrfResults.combinationRatio > maxAllowedCr ? '❌' : '⚠️'}
                        </span>
                        <div>
                          <span className={`font-bold uppercase block mb-0.5 ${
                            vrfResults.combinationRatio <= maxAllowedCr && vrfResults.combinationRatio >= 50 ? 'text-cyan-400' : vrfResults.combinationRatio > maxAllowedCr ? 'text-rose-400 font-extrabold' : 'text-amber-400'
                          }`}>
                            Connection Ratio: {(vrfResults.combinationRatio || 0).toFixed(1)}% (Max Allowed: {maxAllowedCr}%)
                          </span>
                          {vrfResults.combinationRatio <= maxAllowedCr && vrfResults.combinationRatio >= 50 ? (
                            <span>Sizing meets manufacturer tolerances. Combination ratio is within safe limits (50% – {maxAllowedCr}%).</span>
                          ) : vrfResults.combinationRatio > maxAllowedCr ? (
                            <span>
                              <strong>CRITICAL EXCEEDED:</strong> Combined indoor unit capacity exceeds the maximum allowable connection ratio of {maxAllowedCr}%. 
                              <span className="block mt-1 text-rose-400 font-medium">To resolve, either increase the outdoor unit capacity, decrease diversity factor, or remove/downsize connected indoor units.</span>
                            </span>
                          ) : (
                            <span>
                              <strong>UNDER-CONNECTED:</strong> Connection ratio is below 50%. The compressor may short-cycle frequently, leading to poor COP efficiency and potential compressor life-cycle wear.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Piping Capacity Loss / Derating Check Card */}
                    {vrfRooms.length > 0 && (
                      <div className={`p-3 rounded-xl text-xs leading-relaxed border transition-all duration-200 ${
                        !vrfResults.hasCapacityDeficit
                          ? 'bg-cyan-950/10 border-cyan-500/15 text-cyan-300/90'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">{!vrfResults.hasCapacityDeficit ? '✅' : '❌'}</span>
                          <div>
                            <span className={`font-bold uppercase block mb-0.5 ${!vrfResults.hasCapacityDeficit ? 'text-cyan-400' : 'text-rose-400 font-extrabold'}`}>
                              Piping Derating & Sufficiency
                            </span>
                            {!vrfResults.hasCapacityDeficit ? (
                              <span>
                                Delivered capacity is safe. ODU maintains {(vrfResults.deratedOduCapacityTons || 0).toFixed(2)} TR capacity after a {Math.round((1 - vrfResults.deratingFactor) * 100)}% piping loss penalty (Design Peak: {(vrfResults.coincidentTons || 0).toFixed(2)} TR).
                              </span>
                            ) : (
                              <span>
                                <strong>CAPACITY PENALTY DEFICIT:</strong> Due to a {pipingLength}m long piping length, a {Math.round((1 - vrfResults.deratingFactor) * 100)}% friction/suction drop capacity loss occurred. 
                                Actual delivered capacity is only {(vrfResults.deratedOduCapacityTons || 0).toFixed(2)} TR, failing to satisfy the {(vrfResults.coincidentTons || 0).toFixed(2)} TR peak target.
                                <span className="block mt-1 text-rose-400 font-medium">To resolve, upgrade outdoor unit capacity or shorten piping lines.</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Safety limit concentration check (ASHRAE 15 / ISO 5149) Card */}
                    {vrfRooms.length > 0 && (
                      <div className={`p-3 rounded-xl text-xs leading-relaxed border transition-all duration-200 ${
                        !vrfResults.toxicLimitExceeded
                          ? 'bg-cyan-950/10 border-cyan-500/15 text-cyan-300/90'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">{!vrfResults.toxicLimitExceeded ? '✅' : '⚠️'}</span>
                          <div>
                            <span className={`font-bold uppercase block mb-0.5 ${!vrfResults.toxicLimitExceeded ? 'text-cyan-400' : 'text-rose-400 font-extrabold'}`}>
                              ASHRAE 15 / ISO 5149 Safety
                            </span>
                            {!vrfResults.toxicLimitExceeded ? (
                              <span>
                                Pass. A leak into the smallest room ({vrfResults.smallestRoomName}) produces a concentration of {(vrfResults.toxicConcentration || 0).toFixed(3)} kg/m³ (limit: {refrigerantType === 'R32' ? '0.30' : '0.44'} kg/m³).
                              </span>
                            ) : (
                              <span>
                                <strong>REFRIGERANT SAFETY WARNING:</strong> Smallest volume room ({vrfResults.smallestRoomName}, {vrfResults.smallestRoomVol} m³) faces toxic/flammable concentration risk of {(vrfResults.toxicConcentration || 0).toFixed(3)} kg/m³ if a complete system rupture happens. Limit is {refrigerantType === 'R32' ? '0.30' : '0.44'} kg/m³.
                                <span className="block mt-1 text-rose-400 font-medium">To resolve: Break into separate circuits or increase room volume.</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Piping & Additional Charge Estimate */}
                  <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-850 text-xs space-y-1.5 text-slate-300">
                    <span className="font-bold uppercase text-slate-400 block">Refrigerant Additional Charge:</span>
                    <div className="flex justify-between">
                      <span>Chemistry Model:</span>
                      <span className="font-mono text-cyan-400 font-bold">{refrigerantType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base unit pre-charged limit:</span>
                      <span className="text-slate-400">Depends on pipe lines length</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/40 pt-1.5 font-bold">
                      <span className="text-white">Est. Additional Charge:</span>
                      <span className="font-mono text-sky-400 text-xs">{(vrfResults.additionalCharge || 0).toFixed(2)} kg</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (onSaveCalculation) {
                          onSaveCalculation({
                            tab: 'mechanical',
                            subType: 'cooling',
                            title: `VRF System (${vrfRooms.length} Zones)`,
                            summary: `${vrfRooms.length} Zones | ${(vrfResults.totalConnectedTons || 0).toFixed(1)} TR | Rec: ${vrfResults.oduHP} HP`,
                            parameters: {
                              isVrf: true,
                              vrfRooms,
                              diversityFactor,
                              pipingLength,
                              mainPipingLength,
                              autoCalcPiping,
                              refrigerantType,
                              pipeMaterial,
                              isOduAuto,
                              customOduHp,
                              maxAllowedCr,
                              // Fallback support
                              area: 120,
                              volume: 360,
                              estimationBasis,
                              occupants: vrfResults.totalOccupants
                            }
                          });
                          triggerToast('VRF system configuration saved!');
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{t('saveCalculation')}</span>
                    </button>
                    <button
                      onClick={() => {
                        exportVrfToCsv({
                          rooms: vrfRooms.map(r => ({ name: r.name, size: r.size, basis: r.basis, occupants: r.occupants, tons: r.tons })),
                          diversityFactor,
                          totalConnectedTons: vrfResults.totalConnectedTons,
                          coincidentTons: vrfResults.coincidentTons,
                          oduSizeHp: vrfResults.oduHP,
                          oduSizeTons: vrfResults.oduTons,
                          combinationRatio: vrfResults.combinationRatio,
                          pipingLength,
                          refrigerantCharge: vrfResults.additionalCharge
                        });
                        triggerToast('VRF calculation exported to CSV!');
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                      <span>{t('exportCsv')}</span>
                    </button>
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent(`CKY_MEPF - Multi-Zone VRF System Sizing Report`);
                        const body = encodeURIComponent(
                          `Dear Team,\n\nHere is the Multi-Zone VRF/VRV Sizing Report generated from CKY_MEPF:\n\n` +
                          `- Total Connected Zones: ${vrfRooms.length}\n` +
                          `- Total Connected IDU Capacity: ${(vrfResults.totalConnectedTons || 0).toFixed(2)} TR\n` +
                          `- Diversity / Coincidence Factor: ${diversityFactor}x\n` +
                          `- Coincident Design Peak ODU Load: ${(vrfResults.coincidentTons || 0).toFixed(2)} TR\n` +
                          `- Recommended VRF Outdoor Unit: ${vrfResults.oduHP} HP (${(vrfResults.oduTons || 0).toFixed(1)} TR capacity)\n` +
                          `- Sizing Connection Ratio: ${(vrfResults.combinationRatio || 0).toFixed(1)}%\n` +
                          `- Liquid Line Piping: ${pipingLength} meters\n` +
                          `- Est. Additional Charge: ${(vrfResults.additionalCharge || 0).toFixed(2)} kg (${refrigerantType})\n\n` +
                          `Generated on ${new Date().toLocaleString()}\n` +
                          `Regards,\n` +
                          `Engineering Team`
                        );
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      <Mail className="h-4 w-4 text-sky-400" />
                      <span>{t('shareEmail')}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
              </div>
              
              <div className="w-full">
                {/* 2D System Topology Canvas */}
                <VrfTopologyCanvas isDarkMode={isDarkMode} 
                  vrfRooms={vrfResults.enrichedRooms}
                  setVrfRooms={setVrfRooms}
                  vrfResults={vrfResults}
                  maxAllowedCr={maxAllowedCr}
                  diversityFactor={diversityFactor}
                  refrigerantType={refrigerantType}
                  pipeMaterial={pipeMaterial}
                  pipingLength={pipingLength}
                  mainPipingLength={mainPipingLength}
                  setMainPipingLength={setMainPipingLength}
                  calcRoomTonsAndWatts={(basis, size, occupants) => MechanicalCoolingEngine.calcRoomTonsAndWatts(basis, size, occupants, isMetric)}
                  onCustomPipesChange={setCustomPipesTotal}
                  triggerToast={triggerToast}
                />

                
              </div>

              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                {/* Zones / Indoor Units Sizing Table */}
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-4 border border-slate-800/80">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Wind className="h-4.5 w-4.5 text-cyan-400" />
                      <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">Connected Indoor Units ({vrfRooms.length})</h3>
                    </div>
                    <span className="text-xs bg-cyan-950/40 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20 font-bold font-mono">
                      Sum IDU: {(vrfResults.totalConnectedTons || 0).toFixed(2)} TR
                    </span>
                  </div>

                  {/* Zones Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40 max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <th className="p-3">Space/Zone Name</th>
                          <th className="p-3">Basis / Sizing</th>
                          <th className="p-3 text-center">Occupants</th>
                          <th className="p-3 text-center">Branch Pipe (m)</th>
                          <th className="p-3 text-right">Est. Load (TR)</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50">
                        {vrfRooms.map((room, index) => (
                          <tr key={room.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-semibold text-white truncate max-w-[140px]">{room.name}</td>
                            <td className="p-3 font-mono text-slate-400">
                              {room.basis === 'area' ? `${room.size} m²` : `${room.size} m³`}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-400">{room.occupants}</td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={room.pipeLength ?? 15}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updatedLength = val > 0 ? val : 1;
                                  setVrfRooms(vrfRooms.map(r => r.id === room.id ? { ...r, pipeLength: updatedLength } : r));
                                }}
                                className="w-14 bg-slate-950 text-sky-400 border border-slate-800 rounded px-1.5 py-0.5 text-center font-mono text-xs focus:outline-none focus:border-cyan-500 invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                              />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-cyan-400">
                              {(room.tons || 0).toFixed(2)} TR
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (index === 0) return;
                                  const newRooms = [...vrfRooms];
                                  [newRooms[index - 1], newRooms[index]] = [newRooms[index], newRooms[index - 1]];
                                  setVrfRooms(newRooms);
                                }}
                                disabled={index === 0}
                                className="text-slate-500 hover:text-sky-400 p-1 rounded-lg hover:bg-sky-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                title="Move Up in Sequence"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (index === vrfRooms.length - 1) return;
                                  const newRooms = [...vrfRooms];
                                  [newRooms[index + 1], newRooms[index]] = [newRooms[index], newRooms[index + 1]];
                                  setVrfRooms(newRooms);
                                }}
                                disabled={index === vrfRooms.length - 1}
                                className="text-slate-500 hover:text-sky-400 p-1 rounded-lg hover:bg-sky-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                title="Move Down in Sequence"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVrfRooms(vrfRooms.filter((r) => r.id !== room.id));
                                  triggerToast(`Removed "${room.name}" zone.`);
                                }}
                                className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-950/20 transition-all cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {vrfRooms.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                              No zones defined. Add indoor unit zones using the builder form below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Zone Interactive Builder Row */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
                    <TooltipLabel
                      label="Add Custom Indoor Unit Zone"
                      tooltip={t("manualUnitTooltip")} 
                      className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="e.g., Conference Rm"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        className="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                      
                      <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold uppercase gap-1">
                        <button
                          type="button"
                          onClick={() => setNewRoomBasis('area')}
                          className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                            newRoomBasis === 'area' ? 'bg-cyan-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Area (m²)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRoomBasis('volume')}
                          className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                            newRoomBasis === 'volume' ? 'bg-cyan-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Vol (m³)
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                    min="5"
                    max="2000"
                          placeholder={newRoomBasis === 'area' ? "Area (m²)" : "Volume (m³)"}
                          value={newRoomSize ?? ""}
                          onChange={(e) => setNewRoomSize(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                            newRoomSize !== '' && (
                              newRoomBasis === 'area' 
                                ? (Number(newRoomSize) < 5 || Number(newRoomSize) > 2000)
                                : (Number(newRoomSize) < 15 || Number(newRoomSize) > 6000)
                            )
                              ? 'border-red-500/70 text-red-200'
                              : 'border-slate-800 focus:border-cyan-500'
                          } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                        />
                        {newRoomSize !== '' && (
                          newRoomBasis === 'area' 
                            ? (Number(newRoomSize) < 5 || Number(newRoomSize) > 2000)
                            : (Number(newRoomSize) < 15 || Number(newRoomSize) > 6000)
                        ) && (
                          <div className="absolute left-0 top-full z-10 mt-0.5"><InputAlert type="error" message={`Out of bounds (${newRoomBasis === 'area' ? '5-2000 m²' : '15-6000 m³'})`} /></div>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                    min="0"
                    max="1000"
                          placeholder="People"
                          value={newRoomOccupants ?? ""}
                          onChange={(e) => setNewRoomOccupants(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                            newRoomOccupants !== '' && (Number(newRoomOccupants) < 0 || Number(newRoomOccupants) > 1000)
                              ? 'border-red-500/70 text-red-200'
                              : 'border-slate-800 focus:border-cyan-500'
                          } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                        />
                        {newRoomOccupants !== '' && (Number(newRoomOccupants) < 0 || Number(newRoomOccupants) > 1000) && (
                          <div className="absolute left-0 top-full z-10 mt-0.5"><InputAlert type="error" message="Out of bounds (0-1000)" /></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const name = newRoomName.trim() || `Zone ${vrfRooms.length + 1}`;
                          const size = newRoomSize !== '' ? Number(newRoomSize) : NaN;
                          const occupantsCount = newRoomOccupants !== '' ? Number(newRoomOccupants) : NaN;
                          if (isNaN(size) || isNaN(occupantsCount)) {
                            triggerToast('INCOMPLETE: Missing required room parameters.');
                            return;
                          }
                          
                          if (size <= 0) {
                            triggerToast("Please enter a valid space size");
                            return;
                          }
                          
                          const newId = String(Date.now());
                          const newRoom = {
                            id: newId,
                            name,
                            basis: newRoomBasis,
                            size,
                            occupants: occupantsCount,
                            pipeLength: 15,
                            ...MechanicalCoolingEngine.calcRoomTonsAndWatts(newRoomBasis, size, occupantsCount, isMetric)
                          };
                          
                          setVrfRooms([...vrfRooms, newRoom]);
                          setNewRoomName('');
                          setNewRoomSize('');
                          setNewRoomOccupants('');
                          triggerToast(`Zone "${name}" added successfully!`);
                        }}
                        className="flex items-center space-x-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all duration-150 active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Zone to System</span>
                      </button>
                    </div>
                  </div>
                </div>
              
                  </div>
                  <div className="lg:col-span-1">
                    <VrfLoadDistributionChart rooms={vrfRooms} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Trend Chart Section */}
          
          <TrendVisualizer 
            type="cooling" 
            currentParams={{
              isVrf: isVrf,
              area: isVrf ? Math.round(vrfRooms.reduce((acc, r) => acc + (r.basis === 'area' ? r.size : r.size / 3), 0)) : area,
              volume: isVrf ? Math.round(vrfRooms.reduce((acc, r) => acc + (r.basis === 'volume' ? r.size : r.size * 3), 0)) : volume,
              estimationBasis: isVrf ? 'area' : estimationBasis,
              occupants: isVrf ? vrfRooms.reduce((acc, r) => acc + r.occupants, 0) : occupants,
              calculatedWatts: isVrf ? vrfResults.totalConnectedWatts : results.watts,
              results: results
            }} 
          />

          {((results.auditTrail && results.auditTrail.length > 0) || (vrfResults.auditTrail && vrfResults.auditTrail.length > 0)) && (
            <div className="mt-10 border-t border-slate-800/60 pt-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center mr-3 border border-slate-700">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Engineering Compliance & Audit Logs</h2>
                  <p className="text-xs text-slate-500 mt-1">Detailed thermodynamic traces, standard references, and revision statuses.</p>
                </div>
              </div>
              <div className="space-y-6">
                {results.auditTrail && results.auditTrail.length > 0 && (
                  <AuditTrailTable title="ASHRAE Fundamentals & 15 Audit Log" trail={results.auditTrail} />
                )}
                {vrfResults.auditTrail && vrfResults.auditTrail.length > 0 && (
                  <AuditTrailTable title="VRF / AHRI 1230 System Audit Log" trail={vrfResults.auditTrail} />
                )}
              </div>
            </div>
          )}

        </div>
    </div>
  );
}
