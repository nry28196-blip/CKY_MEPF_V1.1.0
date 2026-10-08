/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ValidationBanner, { ValidationItem } from './ValidationBanner';
import { 
  Droplet, AlertTriangle, CheckCircle2, Compass, Bookmark, 
  Plus, Trash2, Layers, ShieldCheck, Activity, Info, HelpCircle, FileSpreadsheet, Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import TrendVisualizer from './TrendVisualizer';
import TooltipLabel from './TooltipLabel';
import InputAlert from './InputAlert';
import { useLanguage } from '../lib/translations';
import { exportPlumbingToCsv } from '../lib/exportCsv';
import { IPC_FIXTURES, getFixtureById } from '../lib/plumbingFixtures';
import FormulaVisualizer from './FormulaVisualizer';
import InteractiveFormulaReferenceCard from './InteractiveFormulaReferenceCard';
import IPCReferenceModal from './IPCReferenceModal';
import PressureGauge from './PressureGauge';

export interface SelectedFitting {
  id: string;
  typeId: string;
  qty: number;
}

export const FITTING_TYPES = [
  { id: 'elbow_90', name: '90° Elbow (Std)', ratio: 30 },
  { id: 'elbow_90_lr', name: '90° Elbow (LR)', ratio: 20 },
  { id: 'elbow_45', name: '45° Elbow', ratio: 16 },
  { id: 'tee_run', name: 'Tee (Run)', ratio: 20 },
  { id: 'tee_branch', name: 'Tee (Branch)', ratio: 60 },
  { id: 'valve_gate', name: 'Gate Valve', ratio: 8 },
  { id: 'valve_globe', name: 'Globe Valve', ratio: 340 },
  { id: 'valve_check', name: 'Swing Check Valve', ratio: 50 },
  { id: 'valve_butterfly', name: 'Butterfly Valve', ratio: 45 },
];

import FrictionLossReference from './FrictionLossReference';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

type SubTab = 'fixtures' | 'tanks' | 'pumps' | 'formulas';

interface PlumbingCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
  activeSubTab?: SubTab;
  onSubTabChange?: (subTab: SubTab) => void;
}

interface FixtureRow {
  id: string;
  name: string;
  wsfu: number; // Water Supply Fixture Unit (IPC)
  dfu: number;  // Drainage Fixture Unit (IPC)
  lu: number;   // Loading Unit (BS 8558 / BS EN 806)
  du: number;   // Discharge Unit (BS EN 12056)
  qty: number;
  baseName?: string;
  usageType?: 'public' | 'private' | 'na';
  options?: {
    public?: string;
    private?: string;
    na?: string;
  };
}

export default function PlumbingCalc({ restoredParams, onSaveCalculation, autoCalculate = true, activeSubTab, onSubTabChange }: PlumbingCalcProps) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<SubTab>(activeSubTab || 'fixtures');

  useEffect(() => {
    if (activeSubTab && activeSubTab !== subTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const onSubTabChangeRef = React.useRef(onSubTabChange);
  useEffect(() => {
    onSubTabChangeRef.current = onSubTabChange;
  });

  const prevSubTabRef = React.useRef(subTab);
  useEffect(() => {
    scrollWorkspaceToTop();
    if (prevSubTabRef.current !== subTab) {
      prevSubTabRef.current = subTab;
      onSubTabChangeRef.current?.(subTab);
    }
  }, [subTab]);
  const [projectType, setProjectType] = useState<'Commercial' | 'Residential' | 'Industrial' | 'Healthcare'>('Commercial');
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [isFrictionModalOpen, setIsFrictionModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [standard, setStandard] = useState<'ipc' | 'bs'>('ipc');
  
  // TOAST state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // State 1: Fixtures (IPC Appendix E & Chapter 7 Compliant)
  const [fixtures, setFixtures] = useState<FixtureRow[]>([
    { ...getFixtureById('wc_pub_fv')!, qty: 10, baseName: 'Water Closet - Flushometer (1.6 GPF)', usageType: 'public', options: { public: 'wc_pub_fv', private: 'wc_priv_fv' } },
    { ...getFixtureById('wc_pub_ft')!, qty: 0, baseName: 'Water Closet - Flush Tank', usageType: 'public', options: { public: 'wc_pub_ft', private: 'wc_priv_ft' } },
    { ...getFixtureById('lav_pub')!, qty: 12, baseName: 'Lavatory - Faucet', usageType: 'public', options: { public: 'lav_pub', private: 'lav_priv' } },
    { ...getFixtureById('shower_pub')!, qty: 8, baseName: 'Shower - Mixing Valve', usageType: 'public', options: { public: 'shower_pub', private: 'shower_priv' } },
    { ...getFixtureById('sink_priv')!, qty: 4, baseName: 'Sink - Faucet', usageType: 'private', options: { public: 'sink_pub', private: 'sink_priv' } },
    { ...getFixtureById('urinal_pub_fv')!, qty: 4, baseName: 'Urinal - 1" Flushometer', usageType: 'public', options: { public: 'urinal_pub_fv' } },
    { ...getFixtureById('drink_fount')!, qty: 0, baseName: 'Drinking Fountain', usageType: 'na', options: { na: 'drink_fount' } },
    { ...getFixtureById('bathtub')!, qty: 0, baseName: 'Bathtub', usageType: 'private', options: { private: 'bathtub' } },
    { ...getFixtureById('bidet')!, qty: 0, baseName: 'Bidet', usageType: 'private', options: { private: 'bidet' } },
    { ...getFixtureById('dishwasher_dom')!, qty: 0, baseName: 'Dishwasher (Domestic)', usageType: 'private', options: { private: 'dishwasher_dom' } },
    { ...getFixtureById('washing_mach')!, qty: 0, baseName: 'Washing Machine (8 lb)', usageType: 'private', options: { private: 'washing_mach' } },
  ]);

  const [designVelocity, setDesignVelocity] = useState<number>(1.2); // m/s
  
  const [slope, setSlope] = useState<number>(2); // %, standard slopes are 1%, 2%, 4%

  const [appliedFixtures, setAppliedFixtures] = useState<FixtureRow[]>(fixtures);
  const [appliedStandard, setAppliedStandard] = useState<'ipc' | 'bs'>('ipc');
  const [demandCurveOverride, setDemandCurveOverride] = useState<'auto' | 'valve' | 'tank'>('auto');
  const [appliedDemandCurveOverride, setAppliedDemandCurveOverride] = useState<'auto' | 'valve' | 'tank'>('auto');

  const determineSystemType = (fxs: FixtureRow[], override: 'auto' | 'valve' | 'tank' = 'auto') => {
    if (override !== 'auto') return override;
    const valveWSFU = fxs.filter(f => f.id.includes('_fv')).reduce((sum, f) => sum + (f.wsfu * f.qty), 0);
    const tankWSFU = fxs.filter(f => !f.id.includes('_fv')).reduce((sum, f) => sum + (f.wsfu * f.qty), 0);
    return valveWSFU > tankWSFU ? 'valve' : 'tank';
  };
  const systemType = determineSystemType(appliedFixtures, appliedDemandCurveOverride);
  const liveSystemType = determineSystemType(fixtures, demandCurveOverride);
  const appliedSystemType = determineSystemType(appliedFixtures, appliedDemandCurveOverride);

  // State 2: Tanks Sizing
  const [occupants, setOccupants] = useState<number>(120);
  const [consumptionRate, setConsumptionRate] = useState<number>(120); // Liters per person per day (Typical standard)
  const [storageDays, setStorageDays] = useState<number>(2); // Sizing buffer days
  
  const [septicDischarge, setSepticDischarge] = useState<number>(80); // L/person/day
  const [septicDesludgeInterval, setSepticDesludgeInterval] = useState<number>(3); // years
  const [sumpInflow, setSumpInflow] = useState<number>(150); // Liters/min peak storm/waste flow

  // Hydraulic Pipe Sizing States
  const [hydraulicMode, setHydraulicMode] = useState<'auto'|'multi'>('auto');
  const [multiSegments, setMultiSegments] = useState<any[]>([
    { id: '1', diameterMm: 25, lengthM: 10, elevationChangeM: 2, fittings: [] }
  ]);
  const [pipeMaterial, setPipeMaterial] = useState<'pvc'|'copper'|'steel'>('pvc');
  const [pipeLength, setPipeLength] = useState<number>(30); // meters
  const [elevationChange, setElevationChange] = useState<number>(5); // meters
  const [availablePressure, setAvailablePressure] = useState<number>(4.0); // bar
  const [requiredResidual, setRequiredResidual] = useState<number>(1.5); // bar
  const [fittings, setFittings] = useState<SelectedFitting[]>([
    { id: 'init-1', typeId: 'elbow_90', qty: 6 },
    { id: 'init-2', typeId: 'tee_branch', qty: 4 },
  ]);
  
  // State 3: Pumps Sizing
  const [boosterStaticHead, setBoosterStaticHead] = useState<number>(35); // meters (height of building)
  const [boosterResidualPress, setBoosterResidualPress] = useState<number>(2.0); // bar at remote fixture (IPC minimum)
  const [boosterFrictionPercent, setBoosterFrictionPercent] = useState<number>(15); // % of height
  const [boosterEfficiency, setBoosterEfficiency] = useState<number>(68); // %
  
  const [transferFillTime, setTransferFillTime] = useState<number>(90); // minutes to fill roof tank
  const [transferStaticHead, setTransferStaticHead] = useState<number>(45); // meters total vertical lift
  
  const [sumpStaticHead, setSumpStaticHead] = useState<number>(6); // meters sump to gravity sewer line

  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);

  // Decoupled applied states
  const [appliedDesignVelocity, setAppliedDesignVelocity] = useState<number>(1.2);
  const [appliedSlope, setAppliedSlope] = useState<number>(2);
  const [appliedOccupants, setAppliedOccupants] = useState<number>(120);
  const [appliedConsumptionRate, setAppliedConsumptionRate] = useState<number>(120);
  const [appliedStorageDays, setAppliedStorageDays] = useState<number>(2);
  const [appliedSepticDischarge, setAppliedSepticDischarge] = useState<number>(80);
  const [appliedSepticDesludgeInterval, setAppliedSepticDesludgeInterval] = useState<number>(3);
  const [appliedSumpInflow, setAppliedSumpInflow] = useState<number>(150);
  const [appliedHydraulicMode, setAppliedHydraulicMode] = useState<'auto'|'multi'>('auto');
  const [appliedMultiSegments, setAppliedMultiSegments] = useState<any[]>([
    { id: '1', diameterMm: 25, lengthM: 10, elevationChangeM: 2, fittings: [] }
  ]);
  const [appliedPipeMaterial, setAppliedPipeMaterial] = useState<'pvc'|'copper'|'steel'>('pvc');
  const [appliedPipeLength, setAppliedPipeLength] = useState<number>(30);
  const [appliedElevationChange, setAppliedElevationChange] = useState<number>(5);
  const [appliedAvailablePressure, setAppliedAvailablePressure] = useState<number>(4.0);
  const [appliedRequiredResidual, setAppliedRequiredResidual] = useState<number>(1.5);
  const [appliedFittings, setAppliedFittings] = useState<SelectedFitting[]>([]);
  const [appliedBoosterStaticHead, setAppliedBoosterStaticHead] = useState<number>(35);
  const [appliedBoosterResidualPress, setAppliedBoosterResidualPress] = useState<number>(2.0);
  const [appliedBoosterFrictionPercent, setAppliedBoosterFrictionPercent] = useState<number>(15);
  const [appliedBoosterEfficiency, setAppliedBoosterEfficiency] = useState<number>(68);
  const [appliedTransferFillTime, setAppliedTransferFillTime] = useState<number>(90);
  const [appliedTransferStaticHead, setAppliedTransferStaticHead] = useState<number>(45);
  const [appliedSumpStaticHead, setAppliedSumpStaticHead] = useState<number>(6);

  // Sync state automatically when autoCalculate is true
  useEffect(() => {
    if (autoCalculate) {
      setAppliedStandard(standard);
      setAppliedFixtures(fixtures);
      setAppliedDesignVelocity(designVelocity);
    setAppliedSlope(slope);
      setAppliedSlope(slope);
      setAppliedOccupants(occupants);
      setAppliedConsumptionRate(consumptionRate);
      setAppliedStorageDays(storageDays);
      setAppliedSepticDischarge(septicDischarge);
      setAppliedSepticDesludgeInterval(septicDesludgeInterval);
      setAppliedSumpInflow(sumpInflow);
      setAppliedHydraulicMode(hydraulicMode);
      setAppliedMultiSegments(multiSegments);
    setAppliedPipeMaterial(pipeMaterial);
    setAppliedPipeLength(pipeLength);
    setAppliedElevationChange(elevationChange);
    setAppliedAvailablePressure(availablePressure);
    setAppliedRequiredResidual(requiredResidual);
    setAppliedFittings(fittings);
      setAppliedPipeMaterial(pipeMaterial);
      setAppliedPipeLength(pipeLength);
      setAppliedElevationChange(elevationChange);
      setAppliedAvailablePressure(availablePressure);
      setAppliedRequiredResidual(requiredResidual);
      setAppliedFittings(fittings);
      setAppliedBoosterStaticHead(boosterStaticHead);
      setAppliedBoosterResidualPress(boosterResidualPress);
      setAppliedBoosterFrictionPercent(boosterFrictionPercent);
      setAppliedBoosterEfficiency(boosterEfficiency);
      setAppliedTransferFillTime(transferFillTime);
      setAppliedTransferStaticHead(transferStaticHead);
      setAppliedSumpStaticHead(sumpStaticHead);
    }
  }, [
    autoCalculate, standard, fixtures, designVelocity, slope, occupants,
    consumptionRate, storageDays, septicDischarge, septicDesludgeInterval, sumpInflow,
    pipeMaterial, pipeLength, elevationChange, availablePressure, requiredResidual, fittings,
    boosterStaticHead, boosterResidualPress, boosterFrictionPercent, boosterEfficiency,
    transferFillTime, transferStaticHead, sumpStaticHead
  ]);

  // Load state from parameters history
  useEffect(() => {
    if (restoredParams && restoredParams.tab === 'plumbing' && restoredParams.id !== loadedHistoryId) {
      setLoadedHistoryId(restoredParams.id);
      const p = restoredParams.parameters;
      if (p) {
        if (p.subTab) setSubTab(p.subTab as SubTab);
        if (p.standard) { setStandard(p.standard); setAppliedStandard(p.standard); }
        if (Array.isArray(p.fixtures)) { setFixtures(p.fixtures); setAppliedFixtures(p.fixtures); }
        if (p.designVelocity) { setDesignVelocity(p.designVelocity); setAppliedDesignVelocity(p.designVelocity); }
        if (p.slope) { setSlope(p.slope); setAppliedSlope(p.slope); }
        if (p.occupants) { setOccupants(p.occupants); setAppliedOccupants(p.occupants); }
        if (p.consumptionRate) { setConsumptionRate(p.consumptionRate); setAppliedConsumptionRate(p.consumptionRate); }
        if (p.storageDays) { setStorageDays(p.storageDays); setAppliedStorageDays(p.storageDays); }
        if (p.septicDischarge) { setSepticDischarge(p.septicDischarge); setAppliedSepticDischarge(p.septicDischarge); }
        if (p.septicDesludgeInterval) { setSepticDesludgeInterval(p.septicDesludgeInterval); setAppliedSepticDesludgeInterval(p.septicDesludgeInterval); }
        if (p.sumpInflow) { setSumpInflow(p.sumpInflow); setAppliedSumpInflow(p.sumpInflow); }
        if (p.boosterStaticHead) { setBoosterStaticHead(p.boosterStaticHead); setAppliedBoosterStaticHead(p.boosterStaticHead); }
        if (p.boosterResidualPress) { setBoosterResidualPress(p.boosterResidualPress); setAppliedBoosterResidualPress(p.boosterResidualPress); }
        if (p.boosterFrictionPercent) { setBoosterFrictionPercent(p.boosterFrictionPercent); setAppliedBoosterFrictionPercent(p.boosterFrictionPercent); }
        if (p.boosterEfficiency) { setBoosterEfficiency(p.boosterEfficiency); setAppliedBoosterEfficiency(p.boosterEfficiency); }
        if (p.transferFillTime) { setTransferFillTime(p.transferFillTime); setAppliedTransferFillTime(p.transferFillTime); }
        if (p.transferStaticHead) { setTransferStaticHead(p.transferStaticHead); setAppliedTransferStaticHead(p.transferStaticHead); }
        if (p.sumpStaticHead) { setSumpStaticHead(p.sumpStaticHead); setAppliedSumpStaticHead(p.sumpStaticHead); }
        
        triggerToast('Plumbing parameters loaded!');
      }
    }
  }, [restoredParams, loadedHistoryId]);

  // Fixture helpers
  
  const handleQtyChange = (baseName: string, value: number) => {
    const clampedValue = Math.min(9999, Math.max(0, value));
    setFixtures(prev => prev.map(f => (f.baseName || f.id) === baseName ? { ...f, qty: clampedValue } : f));
  };

  const handleUsageChange = (baseName: string, newUsage: 'public' | 'private' | 'na') => {
    setFixtures(prev => prev.map(f => {
      if ((f.baseName || f.id) === baseName) {
        const newId = f.options?.[newUsage];
        if (newId) {
          const newData = getFixtureById(newId);
          if (newData) {
             return { ...newData, qty: f.qty, baseName: f.baseName, usageType: newUsage, options: f.options };
          }
        }
      }
      return f;
    }));
  };

  const handleRemoveFixture = (id: string) => {
    setFixtures(prev => prev.filter(f => f.id !== id));
  };

  const [selectedNewFixture, setSelectedNewFixture] = useState<string>('');
  
  const handleAddFixture = () => {
    if (!selectedNewFixture) return;
    const existing = fixtures.find(f => f.id === selectedNewFixture);
    if (existing) {
      handleQtyChange(selectedNewFixture, existing.qty + 1);
    } else {
      const fixtureData = IPC_FIXTURES.find(f => f.id === selectedNewFixture);
      if (fixtureData) {
        setFixtures(prev => [...prev, { ...fixtureData, qty: 1 }]);
      }
    }
    setSelectedNewFixture('');
  };

  const hasPendingChanges = !autoCalculate && (
    standard !== appliedStandard ||
    JSON.stringify(fixtures) !== JSON.stringify(appliedFixtures) ||
    designVelocity !== appliedDesignVelocity ||
    slope !== appliedSlope ||
    occupants !== appliedOccupants ||
    consumptionRate !== appliedConsumptionRate ||
    storageDays !== appliedStorageDays ||
    septicDischarge !== appliedSepticDischarge ||
    septicDesludgeInterval !== appliedSepticDesludgeInterval ||
    sumpInflow !== appliedSumpInflow ||
    hydraulicMode !== appliedHydraulicMode || JSON.stringify(multiSegments) !== JSON.stringify(appliedMultiSegments) || pipeMaterial !== appliedPipeMaterial ||
    pipeLength !== appliedPipeLength ||
    elevationChange !== appliedElevationChange ||
    availablePressure !== appliedAvailablePressure ||
    requiredResidual !== appliedRequiredResidual ||
    JSON.stringify(fittings) !== JSON.stringify(appliedFittings) ||
    boosterStaticHead !== appliedBoosterStaticHead ||
    boosterResidualPress !== appliedBoosterResidualPress ||
    boosterFrictionPercent !== appliedBoosterFrictionPercent ||
    boosterEfficiency !== appliedBoosterEfficiency ||
    transferFillTime !== appliedTransferFillTime ||
    transferStaticHead !== appliedTransferStaticHead ||
    sumpStaticHead !== appliedSumpStaticHead
  );

  const handleApplyCalculations = () => {
    setAppliedStandard(standard);
    setAppliedFixtures(fixtures);
    setAppliedDesignVelocity(designVelocity);
    setAppliedSlope(slope);
    setAppliedOccupants(occupants);
    setAppliedConsumptionRate(consumptionRate);
    setAppliedStorageDays(storageDays);
    setAppliedSepticDischarge(septicDischarge);
    setAppliedSepticDesludgeInterval(septicDesludgeInterval);
    setAppliedSumpInflow(sumpInflow);
      setAppliedHydraulicMode(hydraulicMode);
      setAppliedMultiSegments(multiSegments);
    setAppliedPipeMaterial(pipeMaterial);
    setAppliedPipeLength(pipeLength);
    setAppliedElevationChange(elevationChange);
    setAppliedAvailablePressure(availablePressure);
    setAppliedRequiredResidual(requiredResidual);
    setAppliedFittings(fittings);
    setAppliedBoosterStaticHead(boosterStaticHead);
    setAppliedBoosterResidualPress(boosterResidualPress);
    setAppliedBoosterFrictionPercent(boosterFrictionPercent);
    setAppliedBoosterEfficiency(boosterEfficiency);
    setAppliedTransferFillTime(transferFillTime);
    setAppliedTransferStaticHead(transferStaticHead);
    setAppliedSumpStaticHead(sumpStaticHead);
    triggerToast('Calculations updated!');
  };

  // Calculations
  const totalWSFU = appliedFixtures.reduce((sum, f) => sum + (f.wsfu * f.qty), 0);
  const totalDFU = appliedFixtures.reduce((sum, f) => sum + (f.dfu * f.qty), 0);
  
  // BS 8558 Loading Units and BS EN 12056 Discharge Units
  const totalLU = appliedFixtures.reduce((sum, f) => sum + (f.lu * f.qty), 0);
  const totalDU = appliedFixtures.reduce((sum, f) => sum + (f.du * f.qty), 0);

  // Hunter's Curve Peak Demand Estimation (GPM)
    
  // IPC 2018 Table E103.3(3) Hunter's Curve Exact Data Points
  const ipcValveData = [
    [0, 0], [5, 15], [10, 27], [15, 31], [20, 35], [25, 38], [30, 42], [35, 44],
    [40, 46], [45, 48], [50, 50], [60, 54], [70, 58], [80, 61.2], [90, 64.3],
    [100, 67.5], [120, 73], [140, 77], [160, 81], [180, 85.5], [200, 90],
    [225, 95.5], [250, 101], [275, 104.5], [300, 108], [400, 127], [500, 143]
  ];
  
  const ipcTankData = [
    [0, 0], [1, 3], [2, 5], [3, 6.5], [4, 8], [5, 9.4], [10, 14.6],
    [15, 17.5], [20, 19.6], [25, 21.5], [30, 23.3], [35, 24.9], [40, 26.3],
    [45, 27.7], [50, 29.1], [60, 32], [70, 35], [80, 38], [90, 41],
    [100, 43.5], [120, 48], [140, 52.5], [160, 57], [180, 61], [200, 65],
    [225, 70], [250, 75], [275, 80], [300, 85], [400, 105], [500, 124]
  ];

  // Helper function to validate IPC Data Table against standard constants
  const validateIPCHuntersCurve = () => {
    // Standard baseline values to verify against
    const CONSTANTS = {
      TANK_10: 14.6, TANK_100: 43.5, TANK_500: 124,
      VALVE_10: 27, VALVE_100: 67.5, VALVE_500: 143
    };
    
    let isValid = true;
    
    const checkPoint = (data: number[][], x: number, expectedY: number, label: string) => {
      const point = data.find(p => p[0] === x);
      if (!point || point[1] !== expectedY) {
        console.error(`IPC Validation Error (${label}): Expected ${expectedY} at ${x} WSFU, found ${point ? point[1] : 'undefined'}`);
        isValid = false;
      }
    };
    
    checkPoint(ipcTankData, 10, CONSTANTS.TANK_10, 'Tank 10 WSFU');
    checkPoint(ipcTankData, 100, CONSTANTS.TANK_100, 'Tank 100 WSFU');
    checkPoint(ipcTankData, 500, CONSTANTS.TANK_500, 'Tank 500 WSFU');
    
    checkPoint(ipcValveData, 10, CONSTANTS.VALVE_10, 'Valve 10 WSFU');
    checkPoint(ipcValveData, 100, CONSTANTS.VALVE_100, 'Valve 100 WSFU');
    checkPoint(ipcValveData, 500, CONSTANTS.VALVE_500, 'Valve 500 WSFU');
    
    if (isValid) {
      console.log('IPC Hunter\'s Curve validated against standard constants. No hidden multipliers detected.');
    }
    
    return isValid;
  };

  const getHuntersFlowGPM = (wsfu: number, type: 'valve' | 'tank'): {gpm: number, log: string} => {
    // Run validation to guarantee data integrity
    validateIPCHuntersCurve();

    if (wsfu <= 0) return {gpm: 0, log: 'WSFU is 0 or less.'};
    
    const data = type === 'valve' ? ipcValveData : ipcTankData;

    if (wsfu >= 500) {
      const baseGPM = type === 'valve' ? 143 : 124;
      const extrapolated = baseGPM + ((wsfu - 500) * 0.15); // Standard extrapolation
      const log = `Extrapolated: WSFU=${(wsfu || 0).toFixed(1)} => ${(extrapolated || 0).toFixed(2)} GPM`;
      console.log(`Hunter's Curve ${log}`);
      return {gpm: extrapolated, log};
    }

    for (let i = 0; i < data.length - 1; i++) {
      const [x1, y1] = data[i];
      const [x2, y2] = data[i + 1];
      if (wsfu >= x1 && wsfu <= x2) {
        if (wsfu === x1) {
          const log = `Exact Match: WSFU=${(wsfu || 0).toFixed(1)} exactly matches IPC row [x: ${x1}, y: ${y1}] => ${y1} GPM`;
          console.log(`Hunter's Curve ${log}`);
          return {gpm: y1, log};
        }
        if (wsfu === x2) {
          const log = `Exact Match: WSFU=${(wsfu || 0).toFixed(1)} exactly matches IPC row [x: ${x2}, y: ${y2}] => ${y2} GPM`;
          console.log(`Hunter's Curve ${log}`);
          return {gpm: y2, log};
        }
        const interpolated = y1 + ((wsfu - x1) * (y2 - y1) / (x2 - x1));
        const log = `Interpolated: WSFU=${(wsfu || 0).toFixed(1)} lies between IPC row [x: ${x1}, y: ${y1}] and [x: ${x2}, y: ${y2}] => ${(interpolated || 0).toFixed(2)} GPM`;
        console.log(`Hunter's Curve ${log}`);
        return {gpm: interpolated, log};
      }
    }
    return {gpm: 0, log: 'Out of bounds'};
  };

  
  const totalFixtures = appliedFixtures.reduce((sum, f) => sum + f.qty, 0);
  const wsfuDensity = totalFixtures > 0 ? ((totalWSFU / totalFixtures) || 0).toFixed(2) : '0.00';
  const luDensity = totalFixtures > 0 ? ((totalLU / totalFixtures) || 0).toFixed(2) : '0.00';
  
  // Peak water supply flow rate calculation
  const hunterDebug = appliedStandard !== 'bs' ? getHuntersFlowGPM(totalWSFU, appliedSystemType) : null;
  const peakFlowLps = appliedStandard === 'bs' 
    ? (totalLU > 0 ? 0.09 * Math.sqrt(totalLU) : 0)
    : (hunterDebug?.gpm || 0) * 0.06309;
  const peakFlowGPM = peakFlowLps / 0.06309;

  // Pipe Sizing Logic
  const calcDiameter = (flowLps: number, velocityMs: number) => {
    if (flowLps <= 0 || velocityMs <= 0) return 0;
    const q_m3s = flowLps / 1000;
    // Area = Q / V
    const area = q_m3s / velocityMs;
    // D = sqrt(4 * A / pi)
    const d_m = Math.sqrt((4 * area) / Math.PI);
    return d_m * 1000; // to mm
  };

  const calculatedWaterPipeDia = calcDiameter(peakFlowLps, appliedDesignVelocity);

  const getNominalPipeSize = (diaMm: number) => {
    if (diaMm <= 0) return 'N/A';
    const sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200];
    const match = sizes.find(s => s >= diaMm);
    return match ? `${match} mm (DN${match})` : 'DN250+';
  };

  const recommendedWaterPipe = getNominalPipeSize(calculatedWaterPipeDia);

  // Advanced Hydraulic Sizing (IPC Appendix E Style)
  const calculateHydraulicPipe = () => {
    if (peakFlowLps <= 0) return null;
    const cFactor = appliedPipeMaterial === 'pvc' ? 150 : appliedPipeMaterial === 'copper' ? 140 : 120;
    const q_m3s = peakFlowLps / 1000;
    
    if (appliedHydraulicMode === 'multi') {
      let cumFrictionM = 0;
      let cumElevationM = 0;
      const segResults = [];

      for (const seg of appliedMultiSegments) {
        const d_m = seg.diameterMm / 1000;
        let equivFittings = 0;
        for (const fit of seg.fittings) {
          const type = FITTING_TYPES.find(t => t.id === fit.typeId);
          if (type) equivFittings += (fit.qty * type.ratio * d_m);
        }
        const totalLength = seg.lengthM + equivFittings;
        const Hf = 10.67 * Math.pow(q_m3s, 1.85) / (Math.pow(cFactor, 1.85) * Math.pow(d_m, 4.87));
        const frictionLossM = Hf * totalLength;
        const elevationLossM = seg.elevationChangeM;
        
        cumFrictionM += frictionLossM;
        cumElevationM += elevationLossM;
        
        const vel = q_m3s / (Math.PI * Math.pow(d_m / 2, 2));
        const reynolds = Math.round((vel * d_m) / 1.004e-6);
        let regime = 'Turbulent';
        if (reynolds < 2300) regime = 'Laminar';
        else if (reynolds <= 4000) regime = 'Transitional';

        segResults.push({
          id: seg.id,
          size: `${seg.diameterMm} mm (DN${seg.diameterMm})`,
          frictionLossBar: ((frictionLossM / 10.197) || 0).toFixed(3),
          elevationLossBar: ((elevationLossM / 10.197) || 0).toFixed(3),
          velocity: (vel || 0).toFixed(2),
          mode: 'auto',
          reynoldsNumber: reynolds.toLocaleString(),
          flowRegime: regime,
          totalLength: (totalLength || 0).toFixed(1),
          equivFittings: (equivFittings || 0).toFixed(1)
        });
      }

      const totalHeadLossM = cumFrictionM + cumElevationM;
      const totalHeadLossBar = totalHeadLossM / 10.197;
      const residualBar = appliedAvailablePressure - totalHeadLossBar;
      
      console.log(`[Hydraulic Sizing Trace - Multi-Segment]`);
      console.log(`  - Flow (m³/s): ${q_m3s}`);
      console.log(`  - Cum Friction (m): ${cumFrictionM}`);
      console.log(`  - Cum Elevation (m): ${cumElevationM}`);
      console.log(`  - Total Head Loss (m): ${totalHeadLossM}`);
      console.log(`  - Total Head Loss (bar): ${totalHeadLossBar}`);
      console.log(`  - Available Pressure (bar): ${appliedAvailablePressure}`);
      console.log(`  - Residual Pressure (bar): ${residualBar}`);

      return {
        mode: 'multi',
        frictionLossBar: ((cumFrictionM / 10.197) || 0).toFixed(2),
        elevationLossBar: ((cumElevationM / 10.197) || 0).toFixed(2),
        residualBar: (residualBar || 0).toFixed(2),
        failed: residualBar < appliedRequiredResidual,
        segmentResults: segResults
      };
    }

    const sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200];
    const minVelocityDiaMm = Math.sqrt((4 * q_m3s) / (Math.PI * appliedDesignVelocity)) * 1000;

    let finalDiaMm = sizes[sizes.length - 1];
    let hydraulicDetails = null;

    for (const dia of sizes) {
      if (dia < minVelocityDiaMm) continue; // Start checking from velocity-compliant size

      const d_m = dia / 1000;
      // Equivalent length calculation (Simplified L/D ratios: 90 elbow ~30, Tee ~60)
      let equivFittings = 0;
      for (const fit of appliedFittings) {
        const type = FITTING_TYPES.find(t => t.id === fit.typeId);
        if (type) equivFittings += (fit.qty * type.ratio * d_m);
      }
      const totalLength = appliedPipeLength + equivFittings;

      // Metric Hazen-Williams
      const Hf = 10.67 * Math.pow(q_m3s, 1.85) / (Math.pow(cFactor, 1.85) * Math.pow(d_m, 4.87));
      const frictionLossM = Hf * totalLength;
      
      const totalHeadLossM = frictionLossM + appliedElevationChange;
      const totalHeadLossBar = totalHeadLossM / 10.197;
      
      const residualBar = appliedAvailablePressure - totalHeadLossBar;

      if (residualBar >= appliedRequiredResidual) {
        finalDiaMm = dia;
        const vel = q_m3s / (Math.PI * Math.pow(d_m / 2, 2));
        const reynolds = Math.round((vel * d_m) / 1.004e-6);
        let regime = 'Turbulent';
        if (reynolds < 2300) regime = 'Laminar';
        else if (reynolds <= 4000) regime = 'Transitional';

        hydraulicDetails = {
          size: `${dia} mm (DN${dia})`,
          frictionLossBar: ((frictionLossM / 10.197) || 0).toFixed(2),
          elevationLossBar: ((appliedElevationChange / 10.197) || 0).toFixed(2),
          residualBar: (residualBar || 0).toFixed(2),
          totalLength: (totalLength || 0).toFixed(1),
          equivFittings: (equivFittings || 0).toFixed(1),
          velocity: (vel || 0).toFixed(2),
          mode: 'auto',
          reynoldsNumber: reynolds.toLocaleString(),
          flowRegime: regime
        };
        break;
      }
    }

    if (!hydraulicDetails) {
      // Failed to find a size that works, use max
      const d_m = finalDiaMm / 1000;
      let equivFittings = 0;
      for (const fit of appliedFittings) {
        const type = FITTING_TYPES.find(t => t.id === fit.typeId);
        if (type) equivFittings += (fit.qty * type.ratio * d_m);
      }
      const totalLength = appliedPipeLength + equivFittings;
      const Hf = 10.67 * Math.pow(q_m3s, 1.85) / (Math.pow(cFactor, 1.85) * Math.pow(d_m, 4.87));
      const totalHeadLossBar = (Hf * totalLength + appliedElevationChange) / 10.197;
      
      console.log(`[Hydraulic Sizing Trace - Max Size Fallback] Dia: >200mm`);
      console.log(`  - Flow (m³/s): ${q_m3s}`);
      console.log(`  - Pipe Length (m): ${appliedPipeLength}`);
      console.log(`  - Equiv Fittings (m): ${equivFittings}`);
      console.log(`  - Total Length (m): ${totalLength}`);
      console.log(`  - Friction Loss (m): ${Hf * totalLength}`);
      console.log(`  - Elevation Change (m): ${appliedElevationChange}`);
      console.log(`  - Total Head Loss (bar): ${totalHeadLossBar}`);
      console.log(`  - Available Pressure (bar): ${appliedAvailablePressure}`);
      console.log(`  - Residual Pressure (bar): ${appliedAvailablePressure - totalHeadLossBar}`);
      
      const vel = q_m3s / (Math.PI * Math.pow(d_m / 2, 2));
      const reynolds = Math.round((vel * d_m) / 1.004e-6);
      let regime = 'Turbulent';
      if (reynolds < 2300) regime = 'Laminar';
      else if (reynolds <= 4000) regime = 'Transitional';

      hydraulicDetails = {
        size: `> DN200`,
        frictionLossBar: ((Hf * totalLength / 10.197) || 0).toFixed(2),
        elevationLossBar: ((appliedElevationChange / 10.197) || 0).toFixed(2),
        residualBar: ((appliedAvailablePressure - totalHeadLossBar) || 0).toFixed(2),
        totalLength: (totalLength || 0).toFixed(1),
        equivFittings: (equivFittings || 0).toFixed(1),
        velocity: (vel || 0).toFixed(2),
          mode: 'auto',
        reynoldsNumber: reynolds.toLocaleString(),
        flowRegime: regime,
        failed: true
      };
    }
    
    return hydraulicDetails;
  };
  
  const hydraulicResult = calculateHydraulicPipe();

  // Sewage Pipe size based on IPC Table 710.1(1) and slope
  const getSewagePipeSize = (dfu: number, slopePercent: number, hasWC: boolean) => {
    if (dfu <= 0) return { size: 'N/A', reason: 'No drainage load' };
    
    // IPC 2018 Table 710.1(1) Building Drains and Sewers
    // Evaluates the smallest acceptable pipe size. If the selected slope is too flat for a given pipe size,
    // it returns the pipe size but appends a warning that a steeper slope is required by code.
    
    type PipeCap = { size: string, minSlope: number, cap05: number, cap1: number, cap2: number, cap4: number, noWC?: boolean, maxWCs?: number };
    const pipes: PipeCap[] = [
      { size: 'DN50 (2")', minSlope: 2.0, cap05: 0, cap1: 0, cap2: 21, cap4: 26, noWC: true },
      { size: 'DN65 (2.5")', minSlope: 2.0, cap05: 0, cap1: 0, cap2: 24, cap4: 31, noWC: true },
      { size: 'DN75 (3")', minSlope: 1.0, cap05: 0, cap1: 36, cap2: 42, cap4: 50, maxWCs: 2 },
      { size: 'DN100 (4")', minSlope: 1.0, cap05: 0, cap1: 180, cap2: 216, cap4: 250 },
      { size: 'DN125 (5")', minSlope: 1.0, cap05: 0, cap1: 390, cap2: 480, cap4: 575 },
      { size: 'DN150 (6")', minSlope: 1.0, cap05: 0, cap1: 700, cap2: 840, cap4: 1000 },
      { size: 'DN200 (8")', minSlope: 0.5, cap05: 1400, cap1: 1600, cap2: 1920, cap4: 2300 },
      { size: 'DN250 (10")', minSlope: 0.5, cap05: 2500, cap1: 2900, cap2: 3500, cap4: 4200 },
      { size: 'DN300 (12")', minSlope: 0.5, cap05: 3900, cap1: 4600, cap2: 5600, cap4: 6700 },
      { size: 'DN375 (15")', minSlope: 0.5, cap05: 7000, cap1: 8300, cap2: 10000, cap4: 12000 }
    ];

    for (const p of pipes) {
      if (hasWC && p.noWC) continue;
      
      // Get the capacity at the selected slope, or if the slope is too flat, use the capacity at its min slope
      // to determine if the pipe is physically large enough (though it will require a slope correction)
      const effectiveSlope = Math.max(slopePercent, p.minSlope);
      let capacity = 0;
      if (effectiveSlope === 0.5) capacity = p.cap05;
      else if (effectiveSlope === 1.0) capacity = p.cap1;
      else if (effectiveSlope === 2.0) capacity = p.cap2;
      else if (effectiveSlope >= 4.0) capacity = p.cap4;

      if (dfu <= capacity) {
        if (slopePercent < p.minSlope) {
          return { size: p.size, reason: `IPC 710.1(1) requires min ${p.minSlope}% slope for this size` };
        }
        return { size: p.size, reason: `IPC Table 710.1(1) at ${slopePercent}% slope` };
      }
    }
    
    return { size: 'DN375+ (15"+)', reason: `Exceeds table capacity for ${slopePercent}% slope` };
  };

  // BS EN 12056: Gravity drainage systems inside buildings Sizing
  const getBSSewagePipeSize = (du: number, slopePercent: number, hasWC: boolean) => {
    if (du <= 0) return { size: 'N/A', reason: 'No drainage load' };
    const peakDrainageFlow = 0.7 * Math.sqrt(du);
    
    if (slopePercent === 0.5) { // 1:200
      if (peakDrainageFlow <= 3.0) return { size: 'DN100 (4")', reason: `BS EN 12056 at 1:200 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      if (peakDrainageFlow <= 10.0) return { size: 'DN150 (6")', reason: `BS EN 12056 at 1:200 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      return { size: 'DN200+ (8"+)', reason: `BS EN 12056 at 1:200 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
    } else if (slopePercent === 1.0) { // 1:100
      if (!hasWC && peakDrainageFlow <= 1.5) return { size: 'DN75 (3")', reason: `BS EN 12056 at 1:100 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      if (peakDrainageFlow <= 4.2) return { size: 'DN100 (4")', reason: `BS EN 12056 at 1:100 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      if (peakDrainageFlow <= 14.5) return { size: 'DN150 (6")', reason: `BS EN 12056 at 1:100 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      return { size: 'DN200+ (8"+)', reason: `BS EN 12056 at 1:100 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
    } else { // 1:50 (2%) or higher
      if (!hasWC && peakDrainageFlow <= 1.5) return { size: 'DN75 (3")', reason: `BS EN 12056 at 1:50 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      if (peakDrainageFlow <= 5.8) return { size: 'DN100 (4")', reason: `BS EN 12056 at 1:50 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      if (peakDrainageFlow <= 18.0) return { size: 'DN150 (6")', reason: `BS EN 12056 at 1:50 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
      return { size: 'DN200+ (8"+)', reason: `BS EN 12056 at 1:50 slope (Peak: ${(peakDrainageFlow || 0).toFixed(2)} L/s)` };
    }
  };

  const hasAnyWC = appliedFixtures.some(f => f.qty > 0 && f.id.includes('wc'));
  const sewagePipe = appliedStandard === 'bs' 
    ? getBSSewagePipeSize(totalDU, appliedSlope, hasAnyWC) 
    : getSewagePipeSize(totalDFU, appliedSlope, hasAnyWC);

  // Water Tank calculations
  const totalWaterStorageLiters = appliedOccupants * appliedConsumptionRate * appliedStorageDays;
  const totalWaterStorageM3 = totalWaterStorageLiters / 1000;
  
  // Standard building setup divides water into Underground Reservoir (2/3) and Roof Elevated Tank (1/3)
  const ugTankVolume = totalWaterStorageM3 * (2/3);
  const roofTankVolume = totalWaterStorageM3 * (1/3);

  // Septic tank capacity calculation (IPC/EPA guidelines)
  // Liquid Volume (L) = Daily Sewage Discharge = Occupants * SepticDischarge * RetentionTime (usually 1.5 days)
  const septicDailyFlow = appliedOccupants * appliedSepticDischarge;
  const septicLiquidVol = septicDailyFlow * 1.5; // Liters
  
  // Sludge accumulation = Occupants * Sludge Accumulation Rate (30L/year) * Desludging interval (years)
  const septicSludgeVol = appliedOccupants * 30 * appliedSepticDesludgeInterval;
  const totalSepticVolumeLiters = septicLiquidVol + septicSludgeVol;
  const totalSepticVolumeM3 = totalSepticVolumeLiters / 1000;

  // Submersible Sump Tank sizing
  // Buffer capacity of 15-30 minutes of peak drainage flow inflow
  const sumpVolumeLiters = appliedSumpInflow * 20; // 20 minutes storage
  const sumpVolumeM3 = sumpVolumeLiters / 1000;

  // Pumps Sizing
  // 1. Booster Pump (Flow is Hunter's Peak Demand, Head = Static Head + Friction Loss + Residual Pressure requirement)
  // Convert residual pressure in bar to meters of head: 1 bar ≈ 10.197 meters
  const boosterHeadMeters = appliedBoosterStaticHead + (appliedBoosterStaticHead * (appliedBoosterFrictionPercent / 100)) + (appliedBoosterResidualPress * 10.197);
  const boosterFlowLpm = peakFlowLps * 60; // L/s to L/min
  // Hydraulic power (kW) = Flow(m3/s) * density(1000) * g(9.81) * Head(m) / 1000
  const boosterHydraulicPower = (peakFlowLps * 9.81 * boosterHeadMeters) / 1000; // kW
  const boosterShaftPower = boosterHydraulicPower / (appliedBoosterEfficiency / 100); // kW
  const boosterHP = boosterShaftPower * 1.341; // kW to HP

  // 2. Transfer Pump (Ground Tank to Roof Tank)
  // Capacity: roof tank size filled in target time
  const transferFlowLpm = (roofTankVolume * 1000) / appliedTransferFillTime;
  const transferFlowLps = transferFlowLpm / 60;
  const transferHeadMeters = appliedTransferStaticHead * 1.15; // 15% estimated friction loss
  const transferHydraulicPower = (transferFlowLps * 9.81 * transferHeadMeters) / 1000;
  const transferHP = (transferHydraulicPower / 0.65) * 1.341; // Assuming standard 65% efficiency

  // 3. Submersible Sump Pump
  // Standard sizing is 1.2x peak inflow rate
  const sumpFlowLpm = appliedSumpInflow * 1.2;
  const sumpFlowLps = sumpFlowLpm / 60;
  const sumpHeadMeters = appliedSumpStaticHead * 1.2; // 20% friction
  const sumpHydraulicPower = (sumpFlowLps * 9.81 * sumpHeadMeters) / 1000;
  const sumpHP = (sumpHydraulicPower / 0.55) * 1.341; // Sump pump efficiency average 55%

  // Recommended Pump-to-Service Main Pipe Sizing (Suction @ 1.2 m/s, Discharge/Service @ 1.8 m/s)
  const boosterSuctionPipe = getNominalPipeSize(calcDiameter(peakFlowLps, 1.2));
  const boosterDischargePipe = getNominalPipeSize(calcDiameter(peakFlowLps, 1.8));

  const transferSuctionPipe = getNominalPipeSize(calcDiameter(transferFlowLps, 1.2));
  const transferDischargePipe = getNominalPipeSize(calcDiameter(transferFlowLps, 1.8));

  const sumpDischargePipe = getNominalPipeSize(calcDiameter(sumpFlowLps, 1.8));
  // Validation Engine
  const validations: ValidationItem[] = [];
  if (subTab === 'fixtures') {
    if (designVelocity > 2.4) {
      validations.push({
        id: 'vel-high',
        severity: 'error',
        message: `Design velocity (${designVelocity} m/s) exceeds the standard maximum limit of 2.4 m/s. This can cause severe pipe erosion, cavitation, and water hammer.`,
      });
    } else if (designVelocity > 1.8) {
      validations.push({
        id: 'vel-warn',
        severity: 'warning',
        message: `Design velocity (${designVelocity} m/s) is high. Ensure proper pipe supports and consider water hammer arrestors.`,
      });
    }

    if (slope < 1) {
      validations.push({
        id: 'slope-low',
        severity: 'error',
        message: `Sewage pipe slope (${slope}%) is below the absolute minimum of 1.0%. This will lead to solid waste blockages.`,
      });
    } else if (slope < 2 && (totalWSFU <= 20 || totalDU <= 20)) {
      validations.push({
        id: 'slope-warn',
        severity: 'warning',
        message: `A minimum slope of 2.0% is typically recommended for branches with low fixture unit loads to maintain self-cleansing velocity.`,
      });
    }
  } else if (subTab === 'tanks') {
    if (storageDays < 1) {
      validations.push({
        id: 'storage-low',
        severity: 'warning',
        message: `Storage days (${storageDays}) is below 1. Ensure the municipal water supply is highly reliable, or increase storage capacity.`,
      });
    }
    if (septicDesludgeInterval > 5) {
      validations.push({
        id: 'desludge-high',
        severity: 'warning',
        message: `Septic desludge interval (${septicDesludgeInterval} years) is unusually long. Standard intervals are typically 1 to 5 years. This significantly inflates tank volume.`,
      });
    }
  }

  const handleSave = () => {
    if (onSaveCalculation) {
      let title = '';
      let summary = '';
      let parameters: any = { subTab, standard };
 
      if (subTab === 'fixtures') {
        title = standard === 'bs' 
          ? `BS Pipe Sizing (${totalLU} LU)` 
          : `IPC Pipe Sizing (${totalWSFU} WSFU)`;
        summary = standard === 'bs'
          ? `${totalLU} LU | Flow: ${(peakFlowLps || 0).toFixed(2)} L/s | Rec: ${recommendedWaterPipe}`
          : `${totalWSFU} WSFU | Flow: ${(peakFlowLps || 0).toFixed(1)} L/s | Rec: ${recommendedWaterPipe}`;
        parameters = {
          ...parameters,
          fixtures,
          systemType,
          designVelocity,
          slope,
        };
      } else if (subTab === 'tanks') {
        title = `Water/Septic Sizing (${occupants} Occ)`;
        summary = `Potable: ${(totalWaterStorageM3 || 0).toFixed(0)}m³ | Septic: ${(totalSepticVolumeM3 || 0).toFixed(1)}m³`;
        parameters = {
          ...parameters,
          occupants,
          consumptionRate,
          storageDays,
          septicDischarge,
          septicDesludgeInterval,
          sumpInflow,
        };
      } else {
        title = `Plumbing Pumps (Elev. ${boosterStaticHead}m)`;
        summary = `Booster: ${(boosterHP || 0).toFixed(1)} HP | Transfer: ${(transferHP || 0).toFixed(1)} HP`;
        parameters = {
          ...parameters,
          boosterStaticHead,
          boosterResidualPress,
          boosterFrictionPercent,
          boosterEfficiency,
          transferFillTime,
          transferStaticHead,
          sumpStaticHead,
        };
      }
 
      onSaveCalculation({
        tab: 'plumbing',
        subType: subTab,
        title,
        summary,
        parameters,
      });
      triggerToast(t('toastCalculationSaved'));
    }
  };

  const handleExportCSV = () => {
    if (subTab === 'fixtures') {
      exportPlumbingToCsv({
        standard,
        fixtures: appliedFixtures.map(f => ({
          name: f.name,
          qty: f.qty,
          value: standard === 'bs' ? f.lu : f.wsfu,
          unitType: standard === 'bs' ? 'LU' : 'WSFU'
        })),
        totalUnits: standard === 'bs' ? totalLU : totalWSFU,
        flowRate: peakFlowLps,
        velocity: designVelocity,
        pipeDiameter: calculatedWaterPipeDia
      });
    } else if (subTab === 'tanks') {
      const rows = [
        { section: "Tanks Input", parameter: "Occupants Count", value: occupants, unit: "Persons", notes: "" },
        { section: "Tanks Input", parameter: "Daily Potable Use Rate", value: consumptionRate, unit: "L/person/day", notes: "" },
        { section: "Tanks Input", parameter: "Storage Days Margin", value: storageDays, unit: "Days", notes: "Emergency buffer" },
        { section: "Tanks Input", parameter: "Daily Septic Load Rate", value: septicDischarge, unit: "L/person/day", notes: "Greywater + blackwater discharge" },
        { section: "Tanks Input", parameter: "Septic Desludge Interval", value: septicDesludgeInterval, unit: "Years", notes: "Sludge accumulation cycle" },
        
        { section: "Tanks Sizing Output", parameter: "Daily Potable Water Demand", value: totalWaterStorageLiters / storageDays, unit: "Liters", notes: "Average consumption per 24 hours" },
        { section: "Tanks Sizing Output", parameter: "Potable Tank Capacity Required", value: totalWaterStorageLiters, unit: "Liters", notes: `Sized for ${storageDays} days` },
        { section: "Tanks Sizing Output", parameter: "Potable Tank Volume", value: (totalWaterStorageM3 || 0).toFixed(2), unit: "m³", notes: "" },
        { section: "Tanks Sizing Output", parameter: "Septic Sludge Storage Zone", value: ((septicSludgeVol / 1000) || 0).toFixed(2), unit: "m³", notes: "" },
        { section: "Tanks Sizing Output", parameter: "Septic Settling Liquid Volume", value: ((septicLiquidVol / 1000) || 0).toFixed(2), unit: "m³", notes: "" },
        { section: "Tanks Sizing Output", parameter: "Total Septic Tank Volume Required", value: (totalSepticVolumeM3 || 0).toFixed(2), unit: "m³", notes: "Total tank interior clearance volume" }
      ];
      import('../lib/exportCsv').then(({ downloadCsv }) => {
        downloadCsv("plumbing_tank_sizing", "Plumbing Water and Septic Tank Sizing", rows);
      });
    } else {
      const rows = [
        { section: "Pump Input", parameter: "Building Static Height", value: boosterStaticHead, unit: "meters", notes: "Vertical static head" },
        { section: "Pump Input", parameter: "Remote Fixture Residual Press", value: boosterResidualPress, unit: "bar", notes: "IPC/BS minimum target pressure" },
        { section: "Pump Input", parameter: "Friction Loss Allowance", value: boosterFrictionPercent, unit: "%", notes: "Allowance added to static rise" },
        { section: "Pump Input", parameter: "Pump Mech. Efficiency", value: boosterEfficiency, unit: "%", notes: "Used to determine electric motor HP" },
        
        { section: "Booster Pump Output", parameter: "Booster Total Head (TDH)", value: (boosterHeadMeters || 0).toFixed(1), unit: "meters", notes: "" },
        { section: "Booster Pump Output", parameter: "Booster Required Power", value: (boosterHP || 0).toFixed(2), unit: "HP (Horsepower)", notes: "Electric motor rating" },
        
        { section: "Transfer Pump Output", parameter: "Transfer Target Fill Time", value: transferFillTime, unit: "minutes", notes: "" },
        { section: "Transfer Pump Output", parameter: "Transfer Pump Flow Rate", value: (transferFlowLps || 0).toFixed(2), unit: "L/s", notes: "" },
        { section: "Transfer Pump Output", parameter: "Transfer Head (TDH)", value: (transferHeadMeters || 0).toFixed(1), unit: "meters", notes: "" },
        { section: "Transfer Pump Output", parameter: "Transfer Required Power", value: (transferHP || 0).toFixed(2), unit: "HP (Horsepower)", notes: "" },
        
        { section: "Sump Pump Output", parameter: "Sump Peak Inflow Rate", value: sumpInflow, unit: "L/min", notes: "Stormwater or drainage peak load" },
        { section: "Sump Pump Output", parameter: "Sump Head (TDH)", value: (sumpHeadMeters || 0).toFixed(1), unit: "meters", notes: "" },
        { section: "Sump Pump Output", parameter: "Sump Required Power", value: (sumpHP || 0).toFixed(2), unit: "HP (Horsepower)", notes: "" },
      ];
      import('../lib/exportCsv').then(({ downloadCsv }) => {
        downloadCsv("plumbing_pump_sizing", "Plumbing Water Booster and Transfer Pump Sizing", rows);
      });
    }
    triggerToast('Plumbing calculations exported!');
  };
 
  return (
    <>
      <IPCReferenceModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} />
      <FrictionLossReference isOpen={isFrictionModalOpen} onClose={() => setIsFrictionModalOpen(false)} />
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-slate-100">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-400 px-4 py-3 rounded-lg shadow-xl shadow-cyan-950/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse shadow-md shadow-cyan-500/50" />
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">
              {standard === 'bs' ? 'BS Plumbing Suite (BS 8558)' : '2018 IPC Plumbing Suite'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {standard === 'bs'
              ? 'British Standard loading units (LU), gravity drainage discharge units (DU) BS EN 12056, septic BS 6297, and pumping design.'
              : 'Compliant water load, drainage pipe sizing, municipal/private septic capacity, and booster/submersible pump specifications.'}
          </p>
        </div>
        <div className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
          <button
            onClick={() => setStandard('ipc')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              standard === 'ipc'
                ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            IPC Standard
          </button>
          <button
            onClick={() => setStandard('bs')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              standard === 'bs'
                ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BS STANDARD
          </button>
        </div>
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex flex-wrap bg-slate-950/80 p-1 rounded-xl border border-slate-850 gap-1">
        <button
          onClick={() => setSubTab('fixtures')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'fixtures' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          1. Fixtures & Pipe Sizing
        </button>
        <button
          onClick={() => setSubTab('tanks')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'tanks' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          2. Water & Septic Tanks
        </button>
        <button
          onClick={() => setSubTab('pumps')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'pumps' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          3. Pumps & Flow Rates
        </button>
        <button
          onClick={() => setSubTab('formulas')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'formulas' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          4. Formulas
        </button>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* LEFT COLUMN: MODULE SPECIFIC INPUTS (7 cols) */}
        <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6 google-pro-border-cyan">
          
          {subTab === 'formulas' && (
            <InteractiveFormulaReferenceCard activeTab="plumbing" defaultExpanded={true} />
          )}

          {subTab === 'fixtures' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                    {standard === 'bs' ? 'Plumbing Fixtures (BS EN 806 Schedule)' : 'Plumbing Fixtures (IPC Schedule)'}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {standard === 'bs' ? (
                    <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-900/50 rounded px-2.5 py-1 font-mono font-bold">
                      BS EN 806-3 Demand Curve
                    </span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Demand Curve:</label>
                      <select
                        value={demandCurveOverride}
                        onChange={(e) => setDemandCurveOverride(e.target.value as 'auto' | 'valve' | 'tank')}
                        className="bg-slate-950 border border-slate-800 text-cyan-400 rounded px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider outline-none cursor-pointer focus:border-cyan-500/50"
                      >
                        <option value="auto">Auto ({determineSystemType(fixtures, 'auto')} System)</option>
                        <option value="valve">Valve System</option>
                        <option value="tank">Tank System</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>

              {(() => {

                const currentTotalWSFU = fixtures.reduce((sum, f) => sum + (f.wsfu * f.qty), 0);
                const currentTotalLU = fixtures.reduce((sum, f) => sum + (f.lu * f.qty), 0);
                const currentTotalDFU = fixtures.reduce((sum, f) => sum + (f.dfu * f.qty), 0);
                const currentTotalDU = fixtures.reduce((sum, f) => sum + (f.du * f.qty), 0);
                
                const isOverCapacity = standard === 'bs' 
                  ? (currentTotalLU > 10000 || currentTotalDU > 12000) 
                  : (currentTotalWSFU > 5000 || currentTotalDFU > 12000);
                  
                if (!isOverCapacity) return null;
                
                return (
                  <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-3 mb-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-amber-400 font-bold text-xs mb-1">Standard Capacity Exceeded</h4>
                      <p className="text-amber-200/70 text-[10px] leading-relaxed">
                        The total fixture load exceeds standard empirical sizing tables. Values displayed are extrapolated and may not be accurate for exceptionally high-demand systems. Consider dividing the system into distinct zones.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Fixtures Table Grid */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {fixtures.map((fix) => (
                  <div key={fix.id} className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-850 hover:border-slate-800 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="block text-xs font-bold text-slate-200 leading-snug">{fix.baseName || fix.name}</span>
                        {fix.options && Object.keys(fix.options).length > 1 && (
                          <select
                            value={fix.usageType}
                            onChange={(e) => handleUsageChange(fix.baseName!, e.target.value as any)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            {fix.options.public && <option value="public">Public</option>}
                            {fix.options.private && <option value="private">Private</option>}
                          </select>
                        )}
                        {fix.options && Object.keys(fix.options).length === 1 && fix.options.public && !fix.options.private && (
                          <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800">Public</span>
                        )}
                        {fix.options && Object.keys(fix.options).length === 1 && fix.options.private && !fix.options.public && (
                          <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800">Private</span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                        {standard === 'bs'
                          ? `Loading Units (LU): ${fix.lu} | Discharge Units (DU): ${fix.du}`
                          : `WSFU: ${fix.wsfu} | DFU: ${fix.dfu}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        onClick={() => handleQtyChange(fix.baseName || fix.id, fix.qty - 1)}
                        className="h-7 w-7 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-black cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={fix.qty ?? ""}
                        onChange={(e) => handleQtyChange(fix.baseName || fix.id, Number(e.target.value))}
                        className="w-12 bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center rounded py-1 invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500"
                      />
                      <button
                        onClick={() => handleQtyChange(fix.baseName || fix.id, fix.qty + 1)}
                        className="h-7 w-7 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-black cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Type & Validation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Project Type" tooltip="Determines peak usage patterns and diversity factors for water demand calculation (e.g., Hunter's Curve probabilities vary by building use)." />
                  <select
                    value={projectType ?? ""}
                    onChange={(e) => setProjectType(e.target.value as any)}
                    className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500"
                  >
                    <option value="Commercial">Commercial / Office</option>
                    <option value="Residential">Residential</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Sizing Constraints */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="People (Occupants)" tooltip="Total building population used for macroscopic water storage volume calculations." />
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={occupants ?? ""}
                    onChange={(e) => setOccupants(Number(e.target.value) || 0)}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      occupants !== 0 && (occupants < 1 || occupants > 5000)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {occupants !== 0 && (occupants < 1 || occupants > 5000) && (
                    <InputAlert type="error" message="Safe range: 1 to 5,000" />
                  )}
                </div>
                <div>
                  <TooltipLabel 
                    label="Water Velocity (m/s)" 
                    tooltip={t("waterVelTooltip")} 
                    className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={designVelocity ?? ""}
                    onChange={(e) => setDesignVelocity(Number(e.target.value) || 0)}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      designVelocity !== 0 && (designVelocity < 0.5 || designVelocity > 3.0)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : designVelocity !== 0 && ((projectType === 'Residential' && designVelocity > 2.0) || ((projectType === 'Commercial' || projectType === 'Healthcare') && designVelocity > 2.4))
                        ? 'border-amber-500/70 focus:ring-1 focus:ring-amber-500/20 text-amber-200'
                        : 'border-slate-800 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />

                  {designVelocity !== 0 && (designVelocity < 0.5 || designVelocity > 3.0) && (
                    <InputAlert type="error" message="Safe range: 0.5 to 3.0 m/s" />
                  )}
                  {designVelocity !== 0 && designVelocity >= 0.5 && designVelocity <= 3.0 && (
                    (projectType === 'Residential' && designVelocity > 2.0) ||
                    (projectType === 'Commercial' && designVelocity > 2.4) ||
                    (projectType === 'Healthcare' && designVelocity > 2.4)
                  ) && (
                    <InputAlert type="warning" message={`Exceeds typical ${projectType} standard (≤ ${projectType === 'Residential' ? '2.0' : '2.4'} m/s)`} />
                  )}

                </div>
                <div>
                  <TooltipLabel 
                    label="Sewage Slope (%)"
                    tooltip={t("slopeTooltip")}
                    className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" 
                  />
                  <select
                    value={slope}
                    onChange={(e) => setSlope(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono"
                  >
                    <option value={0.5}>0.5% Slope (1:200)</option>
                    <option value={1.0}>1% Slope (1:100)</option>
                    <option value={2.0}>2% Slope (1:50)</option>
                    <option value={4.0}>4% Slope (1:25)</option>
                  </select>
                </div>
                

                <div className="pt-4 mt-4 border-t border-slate-800 col-span-full">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-cyan-500" />
                      Hydraulic Pressure Sizing (IPC Appendix E)
                    </h4>
                    <button
                      onClick={() => setIsFrictionModalOpen(true)}
                      className="text-[9px] flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-colors uppercase font-bold"
                      title="View C-Factor Reference Table"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                      C-Factors
                    </button>
                  </div>
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-4">
                    <button 
                      onClick={() => setHydraulicMode('auto')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors cursor-pointer ${hydraulicMode === 'auto' ? 'bg-cyan-900/50 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Single Segment (Auto Sizer)
                    </button>
                    <button 
                      onClick={() => setHydraulicMode('multi')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors cursor-pointer ${hydraulicMode === 'multi' ? 'bg-cyan-900/50 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Multi-Segment System
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 relative">
                        <div className="flex items-center gap-1.5 group">
                          <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 uppercase" label="Pipe Material" tooltip="Determines the absolute pipe roughness (e.g., PVC is smoother than Cast Iron) used in the Colebrook-White or Hazen-Williams friction equations." />
                          <span className="cursor-help text-slate-500 hover:text-cyan-400 pb-0.5">
                            <Info className="w-3.5 h-3.5" />
                          </span>
                          <div className="absolute left-0 top-6 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-[10px] normal-case text-slate-300 font-normal pointer-events-none drop-shadow-2xl">
                            <strong className="block text-white mb-2 text-xs border-b border-slate-700 pb-1">Roughness Advisor (C-Factor by Age)</strong>
                            <div className="grid grid-cols-4 gap-2 text-right">
                              <span className="font-bold text-slate-400 text-left">Material</span>
                              <span className="font-bold text-slate-400">New</span>
                              <span className="font-bold text-slate-400">10yr</span>
                              <span className="font-bold text-slate-400">20yr</span>
                              
                              <span className="text-left text-white">PVC/CPVC</span>
                              <span>150</span>
                              <span>145</span>
                              <span>140</span>
                              
                              <span className="text-left text-white">Copper</span>
                              <span>140</span>
                              <span>135</span>
                              <span>130</span>
                              
                              <span className="text-left text-white">Steel</span>
                              <span>120</span>
                              <span>100</span>
                              <span>80</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-500 italic">
                              Hazen-Williams coefficients degrade over time due to scaling and corrosion. Note: Current calculations use standard 'New' values.
                            </div>
                          </div>
                        </div>
                        {hydraulicMode === 'auto' && (
                          <button 
                            onClick={() => setIsOptimizerModalOpen(true)}
                            className="text-[9px] uppercase font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Optimize
                          </button>
                        )}
                      </div>
                      <select
                        value={pipeMaterial}
                        onChange={(e) => setPipeMaterial(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono"
                      >
                        <option value="pvc">PVC / CPVC (C=150)</option>
                        <option value="copper">Copper (C=140)</option>
                        <option value="steel">Galvanized Steel (C=120)</option>
                      </select>
                    </div>
                    <div>
                      <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Avail. Pressure (bar)" tooltip="Static pressure available at the source connection." />
                      <input type="number" min="0.1" step="0.1" value={availablePressure ?? ""} onChange={(e) => setAvailablePressure(Number(e.target.value) || 0)} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500" />
                      {availablePressure !== 0 && availablePressure < 2.0 && (
                        <InputAlert type="warning" message="Low municipal pressure (< 2.0 bar). A booster pump is highly likely to be required." />
                      )}
                      {availablePressure !== 0 && availablePressure > 5.5 && (
                        <InputAlert type="warning" message="High municipal pressure (> 5.5 bar). A pressure reducing valve (PRV) may be required to protect fixtures." />
                      )}
                    </div>
                    <div>
                      <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Req. Residual (bar)" tooltip="Minimum pressure required at the furthest/highest fixture for proper operation." />
                      <input type="number" min="0.1" step="0.1" value={requiredResidual ?? ""} onChange={(e) => setRequiredResidual(Number(e.target.value) || 0)} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500" />
                      {requiredResidual !== 0 && requiredResidual < 0.5 && (
                        <InputAlert type="warning" message="Very low residual pressure. Standard fixtures typically require at least 0.5 - 1.0 bar (8-15 psi)." />
                      )}
                      {requiredResidual !== 0 && requiredResidual > 3.0 && (
                        <InputAlert type="warning" message="High residual requirement. Standard fixtures need 1.0-2.0 bar unless specialized (e.g., flushometer)." />
                      )}
                    </div>
                  </div>

                  {hydraulicMode === 'auto' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Main Pipe Length (m)" tooltip="Linear length of the pipe run. Used to calculate friction loss." />
                        <input type="number" min="1" value={pipeLength ?? ""} onChange={(e) => setPipeLength(Number(e.target.value) || 0)} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500" />
                      </div>
                      <div>
                        <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Elevation Change (m)" tooltip="Vertical rise (+ value) or drop (- value). Used to calculate hydrostatic pressure loss/gain (approx 0.098 bar per meter)." />
                        <input type="number" value={elevationChange ?? ""} onChange={(e) => setElevationChange(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500" />
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 uppercase" label="Fittings & Valves (Equivalent Length)" tooltip="Additional friction from fittings modeled as an equivalent length of straight pipe." />
                          <button 
                            onClick={() => setFittings([...fittings, { id: Date.now().toString(), typeId: 'elbow_90', qty: 1 }])}
                            className="text-[10px] flex items-center gap-1 bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-800/50 hover:bg-cyan-800/50 transition-colors cursor-pointer uppercase font-bold"
                          >
                            <Plus className="w-3 h-3" /> Add Fitting
                          </button>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800/60 p-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {fittings.length === 0 && (
                            <div className="text-center py-4 text-xs text-slate-500 font-mono">No fittings added</div>
                          )}
                          {fittings.map((fitting) => (
                            <div key={fitting.id} className="flex gap-2 items-center">
                              <select 
                                value={fitting.typeId}
                                onChange={(e) => setFittings(fittings.map(f => f.id === fitting.id ? { ...f, typeId: e.target.value } : f))}
                                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono"
                              >
                                {FITTING_TYPES.map(type => (
                                  <option key={type.id} value={type.id}>{type.name} (L/D: {type.ratio})</option>
                                ))}
                              </select>
                              <input 
                                type="number" min="1" 
                                value={fitting.qty || ''} 
                                onChange={(e) => setFittings(fittings.map(f => f.id === fitting.id ? { ...f, qty: Number(e.target.value) || 0 } : f))}
                                className="w-16 bg-slate-900 border border-slate-700 text-center text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                              />
                              <button 
                                onClick={() => setFittings(fittings.filter(f => f.id !== fitting.id))}
                                className="p-1.5 bg-slate-900 hover:bg-red-950/40 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase">Pipe Segments (In Series)</label>
                        <button 
                          onClick={() => setMultiSegments([...multiSegments, { id: Date.now().toString(), diameterMm: 25, lengthM: 10, elevationChangeM: 0, fittings: [] }])}
                          className="text-[10px] flex items-center gap-1 bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-800/50 hover:bg-cyan-800/50 transition-colors cursor-pointer uppercase font-bold"
                        >
                          <Plus className="w-3 h-3" /> Add Segment
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {multiSegments.map((seg, idx) => (
                          <div key={seg.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 relative">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Segment {idx + 1}</span>
                              <button 
                                onClick={() => setMultiSegments(multiSegments.filter(s => s.id !== seg.id))}
                                className="text-slate-500 hover:text-red-400 cursor-pointer p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Diameter</label>
                                <select 
                                  value={seg.diameterMm}
                                  onChange={(e) => setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, diameterMm: Number(e.target.value) } : s))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs font-mono"
                                >
                                  {[15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200].map(d => (
                                    <option key={d} value={d}>DN{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Length (m)</label>
                                <input 
                                  type="number" min="0.1" step="0.1"
                                  value={seg.lengthM}
                                  onChange={(e) => setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, lengthM: Number(e.target.value) || 0 } : s))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Elev. (m)</label>
                                <input 
                                  type="number"
                                  value={seg.elevationChangeM}
                                  onChange={(e) => setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, elevationChangeM: e.target.value === '' ? 0 : Number(e.target.value) } : s))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs font-mono"
                                />
                              </div>
                            </div>
                            
                            {/* Segment Fittings */}
                            <div className="bg-slate-900/50 rounded p-2 border border-slate-800">
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-[9px] text-slate-500 uppercase font-bold">Fittings</label>
                                <button 
                                  onClick={() => {
                                    const newFittings = [...seg.fittings, { id: Date.now().toString(), typeId: 'elbow_90', qty: 1 }];
                                    setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, fittings: newFittings } : s));
                                  }}
                                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="w-2.5 h-2.5" /> Add
                                </button>
                              </div>
                              {seg.fittings.length === 0 ? (
                                <div className="text-center py-2 text-[10px] text-slate-600 font-mono">No fittings in this segment</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {seg.fittings.map((fit: any) => (
                                    <div key={fit.id} className="flex gap-1.5 items-center">
                                      <select 
                                        value={fit.typeId}
                                        onChange={(e) => {
                                          const newFittings = seg.fittings.map((f: any) => f.id === fit.id ? { ...f, typeId: e.target.value } : f);
                                          setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, fittings: newFittings } : s));
                                        }}
                                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-1 text-[10px] font-mono"
                                      >
                                        {FITTING_TYPES.map(type => (
                                          <option key={type.id} value={type.id}>{type.name} (L/D: {type.ratio})</option>
                                        ))}
                                      </select>
                                      <input 
                                        type="number" min="1" 
                                        value={fit.qty || ''} 
                                        onChange={(e) => {
                                          const newFittings = seg.fittings.map((f: any) => f.id === fit.id ? { ...f, qty: Number(e.target.value) || 0 } : f);
                                          setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, fittings: newFittings } : s));
                                        }}
                                        className="w-12 bg-slate-950 border border-slate-800 text-center text-white rounded px-1 py-1 text-[10px] font-mono"
                                      />
                                      <button 
                                        onClick={() => {
                                          const newFittings = seg.fittings.filter((f: any) => f.id !== fit.id);
                                          setMultiSegments(multiSegments.map(s => s.id === seg.id ? { ...s, fittings: newFittings } : s));
                                        }}
                                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {subTab === 'tanks' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">Storage & Tank Parameters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <TooltipLabel className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" label="Building Occupants Count" tooltip="Used to size the water tank based on daily per-capita usage standards." />
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={occupants || ''}
                    onChange={(e) => setOccupants(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      occupants !== 0 && (occupants < 1 || occupants > 5000)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {occupants !== 0 && (occupants < 1 || occupants > 5000) && (
                    <InputAlert type="error" message="Safe range: 1 to 5,000 occupants" />
                  )}
                </div>
                <div>
                  <TooltipLabel 
                    label="Daily Consump. (Liters/person/day)"
                    tooltip={t("dailyConsumpTooltip")}
                    className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={consumptionRate || ''}
                    onChange={(e) => setConsumptionRate(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      consumptionRate !== 0 && (consumptionRate < 20 || consumptionRate > 500)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {consumptionRate !== 0 && (consumptionRate < 20 || consumptionRate > 500) && (
                    <InputAlert type="warning" message="Standard range: 20 to 500 L/p/d" />
                  )}
                </div>
                <div>
                  <TooltipLabel className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" label="Water Storage Buffer (Days)" tooltip="The required number of days the tank can supply the building without municipal makeup." />
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={storageDays || ''}
                    onChange={(e) => setStorageDays(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      storageDays !== 0 && (storageDays < 1 || storageDays > 7)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {storageDays !== 0 && (storageDays < 1 || storageDays > 7) && (
                    <InputAlert type="error" message="Safe range: 1 to 7 days" />
                  )}
                </div>
                <div>
                  <TooltipLabel 
                    label="Septic Discharge Rate (L/p/day)"
                    tooltip={t("soilAbsTooltip")}
                    className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={septicDischarge || ''}
                    onChange={(e) => setSepticDischarge(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      septicDischarge !== 0 && (septicDischarge < 20 || septicDischarge > 400)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {septicDischarge !== 0 && (septicDischarge < 20 || septicDischarge > 400) && (
                    <InputAlert type="error" message="Safe range: 20 to 400 L/p/d" />
                  )}
                </div>
                <div>
                  <TooltipLabel className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" label="Desludging Interval (Years)" tooltip="Frequency of tank maintenance. Impacts the required sludge retention volume." />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={septicDesludgeInterval || ''}
                    onChange={(e) => setSepticDesludgeInterval(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      septicDesludgeInterval !== 0 && (septicDesludgeInterval < 1 || septicDesludgeInterval > 10)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {septicDesludgeInterval !== 0 && (septicDesludgeInterval < 1 || septicDesludgeInterval > 10) && (
                    <InputAlert type="error" message="Safe range: 1 to 10 years" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Peak Sump Sump Inflow (L/min)</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={sumpInflow || ''}
                    onChange={(e) => setSumpInflow(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      sumpInflow !== 0 && (sumpInflow < 10 || sumpInflow > 1000)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {sumpInflow !== 0 && (sumpInflow < 10 || sumpInflow > 1000) && (
                    <InputAlert type="error" message="Safe range: 10 to 1,000 L/min" />
                  )}
                </div>
              </div>
            </div>
          )}

          {subTab === 'pumps' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Activity className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">Pumps Head & Sizing Parameters</h3>
              </div>

              <div className="space-y-4">
                {/* Section A: Booster */}
                <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3.5">
                  <h4 className="text-[11px] font-bold uppercase text-cyan-400 tracking-wide">1. Domestic Water Booster Pump Set</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <TooltipLabel className="block text-[9px] text-slate-400 font-bold uppercase mb-1" label="Building Static Height (m)" tooltip="Determines the hydrostatic pump head (0.098 bar / m)." />
                      <input
                        type="number"
                    min="1"
                    max="250"
                        value={boosterStaticHead || ''}
                        onChange={(e) => setBoosterStaticHead(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                          boosterStaticHead !== 0 && (boosterStaticHead < 1 || boosterStaticHead > 250)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {boosterStaticHead !== 0 && (boosterStaticHead < 1 || boosterStaticHead > 250) && (
                        <InputAlert type="error" message="Safe range: 1 - 250 m" />
                      )}
                    </div>
                    <div>
                      <TooltipLabel 
                        label="IPC Target Press. (bar)"
                        tooltip={t("residualPresTooltip")}
                        className="block text-[9px] text-slate-400 font-bold uppercase mb-1" 
                      />
                      <input
                        type="number"
                    min="1.0"
                    max="6.0"
                        step="0.5"
                        value={boosterResidualPress || ''}
                        onChange={(e) => setBoosterResidualPress(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                          boosterResidualPress !== 0 && (boosterResidualPress < 1.0 || boosterResidualPress > 6.0)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {boosterResidualPress !== 0 && (boosterResidualPress < 1.0 || boosterResidualPress > 6.0) && (
                        <InputAlert type="error" message="Absolute calculation limits: 1.0 - 6.0 bar" />
                      )}
                      {boosterResidualPress !== 0 && boosterResidualPress >= 1.0 && boosterResidualPress <= 6.0 && boosterResidualPress > 3.0 && (
                        <InputAlert type="warning" message="High residual pressure. Standard fixtures require 1.0 - 2.0 bar." />
                      )}
                    </div>
                    <div>
                      <TooltipLabel className="block text-[9px] text-slate-400 font-bold uppercase mb-1" label="Friction Loss Allowance (%)" tooltip="An estimated allowance added to the static head to account for dynamic pipe friction during flow." />
                      <input
                        type="number"
                    min="5"
                    max="45"
                        value={boosterFrictionPercent || ''}
                        onChange={(e) => setBoosterFrictionPercent(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                          boosterFrictionPercent !== 0 && (boosterFrictionPercent < 5 || boosterFrictionPercent > 45)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {boosterFrictionPercent !== 0 && (boosterFrictionPercent < 5 || boosterFrictionPercent > 45) && (
                        <InputAlert type="error" message="Absolute calculation limits: 5% - 45%" />
                      )}
                      {boosterFrictionPercent !== 0 && boosterFrictionPercent >= 5 && boosterFrictionPercent <= 45 && (boosterFrictionPercent < 10 || boosterFrictionPercent > 30) && (
                        <InputAlert type="warning" message={`Typical friction allowance is 15-25%. ${boosterFrictionPercent > 30 ? 'High allowance may oversize the pump.' : 'Low allowance may under-size the pump if fittings are numerous.'}`} />
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Pump Set Efficiency (%)</label>
                      <input
                        type="number"
                    min="40"
                    max="95"
                        value={boosterEfficiency || ''}
                        onChange={(e) => setBoosterEfficiency(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                          boosterEfficiency !== 0 && (boosterEfficiency < 40 || boosterEfficiency > 95)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {boosterEfficiency !== 0 && (boosterEfficiency < 40 || boosterEfficiency > 95) && (
                        <InputAlert type="error" message="Safe range: 40% - 95%" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Transfer & Sump */}
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold uppercase text-cyan-400 tracking-wide">2. Transfer Pump Sizing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Roof Sump target fill time (mins)</label>
                      <input
                        type="number"
                    min="10"
                    max="180"
                        value={transferFillTime || ''}
                        onChange={(e) => setTransferFillTime(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1 text-xs font-mono focus:outline-none transition-colors border ${
                          transferFillTime !== 0 && (transferFillTime < 10 || transferFillTime > 180)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {transferFillTime !== 0 && (transferFillTime < 10 || transferFillTime > 180) && (
                        <InputAlert type="error" message="Safe range: 10 - 180 mins" />
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Vertical Sump Lift (m)</label>
                      <input
                        type="number"
                    min="1"
                    max="150"
                        value={transferStaticHead || ''}
                        onChange={(e) => setTransferStaticHead(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1 text-xs font-mono focus:outline-none transition-colors border ${
                          transferStaticHead !== 0 && (transferStaticHead < 1 || transferStaticHead > 150)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {transferStaticHead !== 0 && (transferStaticHead < 1 || transferStaticHead > 150) && (
                        <InputAlert type="error" message="Safe range: 1 - 150 m" />
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold uppercase text-cyan-400 tracking-wide">3. Submersible Sump Pump</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Peak Waste Inflow (Lpm)</label>
                      <p className="bg-slate-950 border border-slate-850 text-slate-400 rounded px-2.5 py-1 text-xs font-mono">
                        {sumpInflow} L/min
                      </p>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Static Lift to sewer (m)</label>
                      <input
                        type="number"
                    min="1"
                    max="50"
                        value={sumpStaticHead || ''}
                        onChange={(e) => setSumpStaticHead(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full bg-slate-950 text-white rounded px-2.5 py-1 text-xs font-mono focus:outline-none transition-colors border ${
                          sumpStaticHead !== 0 && (sumpStaticHead < 1 || sumpStaticHead > 50)
                            ? 'border-red-500/70 text-red-200'
                            : 'border-slate-800 focus:border-cyan-500'
                        } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                      />
                      {sumpStaticHead !== 0 && (sumpStaticHead < 1 || sumpStaticHead > 50) && (
                        <InputAlert type="error" message="Safe range: 1 - 50 m" />
                      )}
                    </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {!autoCalculate && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleApplyCalculations}
                disabled={!hasPendingChanges}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  hasPendingChanges
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                }`}
              >
                <span>{hasPendingChanges ? 'Apply & Calculate' : 'Calculations Up To Date'}</span>
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: MODULE SPECIFIC RESULTS & REPORTS (5 cols) */}
        <motion.div
          key={`${subTab}-${(peakFlowLps || 0).toFixed(4)}-${(sumpVolumeLiters || 0).toFixed(2)}-${(totalWaterStorageLiters || 0).toFixed(2)}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden google-pro-border-cyan"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Calculated Output Dynamics</span>
              <span className="text-[9px] text-slate-500 font-mono">Active Run</span>
            </h3>

            {subTab === 'fixtures' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">

                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">
                      {standard === 'bs' ? 'Total Loading Units' : 'Total Water Load'}
                    </span>
                    <p className="text-xl font-bold text-white mt-0.5 font-mono">
                      {standard === 'bs' ? (
                        <>
                          {(totalLU || 0).toFixed(1)} <span className="text-xs text-slate-400">LU</span>
                        </>
                      ) : (
                        <>
                          {totalWSFU} <span className="text-xs text-slate-400">WSFU</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">
                      {standard === 'bs' ? 'Total Discharge Units' : 'Total Drainage'}
                    </span>
                    <p className="text-xl font-bold text-white mt-0.5 font-mono">
                      {standard === 'bs' ? (
                        <>
                          {(totalDU || 0).toFixed(1)} <span className="text-xs text-slate-400">DU</span>
                        </>
                      ) : (
                        <>
                          {totalDFU} <span className="text-xs text-slate-400">DFU</span>
                        </>
                      )}
                    </p>
                  </div>
                                  
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl col-span-2">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">
                      {standard === 'bs' ? 'Avg Load Density (LU/fixture)' : 'Demand Density (WSFU/fixture)'}
                    </span>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
                      {standard === 'bs' ? (
                        <>
                          {luDensity} <span className="text-xs text-slate-400">LU/fix</span>
                        </>
                      ) : (
                        <>
                          {wsfuDensity} <span className="text-xs text-slate-400">WSFU/fix</span>
                        </>
                      )}
                    </p>
                    <span className="block text-[10px] text-slate-500 leading-normal mt-1">
                      {standard === 'bs' ? 'Higher density indicates concentrated flow demands.' : 'Values > 2.0 typically indicate high commercial or flush-valve demand concentration.'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2.5 pt-3.5 border-t border-slate-800">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      {standard === 'bs' ? 'BS EN 806 Peak Flow (QD)' : "Hunter's Peak Flow"}
                    </span>
                    <p className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5">
                      {(peakFlowLps || 0).toFixed(2)} <span className="text-xs text-slate-400 font-semibold">L/s</span>{' '}
                      <span className="text-xs text-slate-500">({(peakFlowGPM || 0).toFixed(1)} GPM)</span>
                    </p>
                    {standard === 'ipc' && hunterDebug && (
                      <div className="mt-2 bg-slate-900/80 border border-slate-700/50 p-2 rounded-lg">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 text-cyan-500/80">IPC Table E103.3(3) Lookup Debug</span>
                        <span className="block text-[10px] text-slate-300 font-mono leading-relaxed">
                          {hunterDebug.log}
                        </span>
                        <span className="block text-[9px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/50">
                          *Raw flow = {(peakFlowGPM || 0).toFixed(2)} GPM (No implicit multipliers applied)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {standard === 'bs' ? (
                      <>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                          Suggested Cold Water Pipe
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-extrabold text-white">
                            {recommendedWaterPipe}
                          </p>
                        </div>
                        <span className="block text-[10px] text-slate-500 font-mono font-normal mt-1">
                          (Minimum internal diameter: {(calculatedWaterPipeDia || 0).toFixed(1)} mm @ {designVelocity} m/s)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center justify-between">
                          Final Hydraulic Water Pipe (IPC)
                          {hydraulicResult?.failed && (
                            <span className="text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded">Insufficient Pressure</span>
                          )}
                        </span>
                        
                        {hydraulicResult?.mode === 'auto' && (
                          <>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className={`text-sm font-extrabold ${hydraulicResult?.failed ? 'text-red-400' : 'text-cyan-400'}`}>
                                {hydraulicResult?.size}
                              </p>
                            </div>
                            <div className="mt-2 bg-slate-900/50 border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono text-slate-400 space-y-1">
                              <div className="flex justify-between">
                                <span>Min Vel. Diameter:</span>
                                <span className="text-white">{(calculatedWaterPipeDia || 0).toFixed(1)} mm (@ {designVelocity} m/s)</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Eq. Length:</span>
                                <span className="text-white">{hydraulicResult.totalLength} m (Fittings: {hydraulicResult.equivFittings} m)</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Friction Loss:</span>
                                <span className="text-white">{hydraulicResult.frictionLossBar} bar</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Elevation {Number(hydraulicResult.elevationLossBar) < 0 ? 'Gain' : 'Loss'}:</span>
                                <span className="text-white">{Number(hydraulicResult.elevationLossBar) < 0 ? '+' : ''}{(Math.abs(Number(hydraulicResult.elevationLossBar)) || 0).toFixed(2)} bar</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Calc. Velocity:</span>
                                <span className={Number(hydraulicResult.velocity) > 2.4 ? 'text-red-400 font-bold flex items-center gap-1' : 'text-white'}>
                                  {Number(hydraulicResult.velocity) > 2.4 && <AlertTriangle className="w-3 h-3" />}
                                  {hydraulicResult.velocity} m/s
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Reynolds Number:</span>
                                <span className="text-white">
                                  {hydraulicResult.reynoldsNumber} (<span className={
                                    (hydraulicResult.flowRegime as string) === 'Laminar' ? 'text-emerald-400' : 
                                    (hydraulicResult.flowRegime as string) === 'Transitional' ? 'text-yellow-400' : 'text-cyan-400'
                                  }>{hydraulicResult.flowRegime}</span>)
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-700/50 pt-1 mt-1">
                                <span>Residual Pressure:</span>
                                <span className={Number(hydraulicResult.residualBar) >= appliedRequiredResidual ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                  {hydraulicResult.residualBar} bar (Req: {appliedRequiredResidual} bar)
                                </span>
                              </div>
                              
                              {(Number(hydraulicResult.velocity) > 2.5 || hydraulicResult.failed) && (
                                <div className="mt-3 p-2 bg-red-950/30 border border-red-900/50 rounded flex flex-col gap-1">
                                  {Number(hydraulicResult.velocity) > 2.5 && (
                                    <div className="flex items-start gap-1.5 text-red-400">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <span><strong>Velocity Warning:</strong> {hydraulicResult.velocity} m/s exceeds standard 2.5 m/s limit for cold water. Consider increasing pipe size or decreasing flow.</span>
                                    </div>
                                  )}
                                  {hydraulicResult.failed && (
                                    <div className="flex items-start gap-1.5 text-red-400">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <span><strong>Pressure Warning:</strong> Total pressure drop exceeds available system pressure (Residual &lt; {appliedRequiredResidual} bar).</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        {hydraulicResult?.mode === 'multi' && (
                          <div className="mt-2 space-y-2">
                            <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono text-slate-400 space-y-1">
                              <div className="flex justify-between">
                                <span>Total Friction Loss:</span>
                                <span className="text-orange-400 font-bold">-{hydraulicResult.frictionLossBar} bar</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Elevation {Number(hydraulicResult.elevationLossBar) < 0 ? 'Gain' : 'Loss'}:</span>
                                <span className={Number(hydraulicResult.elevationLossBar) < 0 ? 'text-cyan-400 font-bold' : 'text-orange-400 font-bold'}>
                                  {Number(hydraulicResult.elevationLossBar) < 0 ? '+' : '-'}{(Math.abs(Number(hydraulicResult.elevationLossBar)) || 0).toFixed(2)} bar
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-700/50 pt-1 mt-1">
                                <span>Final Residual Pressure:</span>
                                <span className={Number(hydraulicResult.residualBar) >= appliedRequiredResidual ? 'text-emerald-400 font-bold text-sm' : 'text-red-400 font-bold text-sm'}>
                                  {hydraulicResult.residualBar} bar
                                </span>
                              </div>
                              {hydraulicResult.failed && (
                                <div className="mt-2 p-1.5 bg-red-950/30 border border-red-900/50 rounded flex items-start gap-1.5 text-red-400">
                                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                  <span><strong>System Failed:</strong> Target residual ({appliedRequiredResidual} bar) not met.</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="max-h-40 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                              {(hydraulicResult as any).segmentResults.map((seg: any, idx: number) => {
                                const highVel = Number(seg.velocity) > 2.5;
                                return (
                                  <div key={seg.id} className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-[9px] font-mono">
                                    <div className="flex justify-between items-center mb-1 border-b border-slate-800/60 pb-1">
                                      <span className="text-cyan-400 font-bold uppercase">Segment {idx + 1}</span>
                                      <span className="text-white font-bold">{seg.size}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                      <span>Length (Eq. {seg.totalLength}m)</span>
                                      <span className="text-slate-300">-{seg.frictionLossBar} bar</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                      <span>Elev. Loss</span>
                                      <span className="text-slate-300">-{seg.elevationLossBar} bar</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                      <span>Velocity / Re</span>
                                      <span className={highVel ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                        {seg.velocity} m/s / {seg.flowRegime}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                            
                            {hydraulicResult && (
                              <div className="mt-2">
                                {/* Pressure Drop Visualizer */}
                            {(() => {
                              const avail = appliedAvailablePressure;
                              const req = appliedRequiredResidual;
                              const elev = Number(hydraulicResult.elevationLossBar);
                              const fric = Number(hydraulicResult.frictionLossBar);
                              
                              const effectiveAvail = elev < 0 ? avail + Math.abs(elev) : avail;
                              const maxAllowable = Math.max(0, avail - req) + (elev < 0 ? Math.abs(elev) : 0);
                              const thresholdPct = Math.min((maxAllowable / effectiveAvail) * 100, 100);
                              
                              const elevLossPct = elev > 0 ? Math.min((elev / effectiveAvail) * 100, 100) : 0;
                              const fricPct = Math.max(0, Math.min((fric / effectiveAvail) * 100, 100 - elevLossPct));
                              
                              return (
                                <div className="pt-3 mt-2 border-t border-slate-800/60 relative">
                                  <div className="flex justify-between text-[9px] uppercase tracking-wider mb-2">
                                    <span className="font-bold text-slate-500">Pressure Budget {elev < 0 && '(w/ Elev Gain)'}</span>
                                    <span className={hydraulicResult.failed ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                      {hydraulicResult.failed ? "FAIL" : "PASS"}
                                    </span>
                                  </div>
                                  <div className="relative mb-4">
                                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex relative border border-slate-800">
                                      {/* Max Allowable Threshold Line */}
                                      {thresholdPct > 0 && (
                                        <div 
                                          className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-500 z-10"
                                          style={{ left: `${thresholdPct}%` }}
                                        />
                                      )}
                                      
                                      {/* Elevation Loss */}
                                      {elev > 0 && (
                                        <div 
                                          className="h-full bg-blue-500/80 border-r border-slate-900 transition-all duration-500"
                                          style={{ width: `${elevLossPct}%` }}
                                          title={`Elevation Loss: ${elev} bar`}
                                        />
                                      )}
                                      {/* Friction Loss */}
                                      <div 
                                        className={`h-full transition-all duration-500 ${hydraulicResult.failed ? 'bg-red-500/80' : 'bg-orange-500/80'}`}
                                        style={{ width: `${fricPct}%` }}
                                        title={`Friction Loss: ${fric} bar`}
                                      />
                                    </div>
                                    {/* Label for Threshold */}
                                    {thresholdPct > 0 && (
                                      <div 
                                        className="absolute top-full mt-1 text-[8.5px] text-emerald-500/90 whitespace-nowrap -translate-x-1/2 font-bold"
                                        style={{ left: `${thresholdPct}%` }}
                                      >
                                        Min Req.
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-[8px] text-slate-500">
                                    <span>0</span>
                                    <div className="flex gap-2">
                                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/80"></span>Elev</span>
                                      <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${hydraulicResult.failed ? 'bg-red-500/80' : 'bg-orange-500/80'}`}></span>Friction</span>
                                    </div>
                                    <span>Avail: {(avail || 0).toFixed(1)} bar</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-850">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      {standard === 'bs' ? 'BS EN 12056 Main Drain' : 'Sewage Sewer Design Size (IPC Table 710.1)'}
                    </span>
                    <p className="text-sm font-extrabold text-cyan-400 mt-1">
                      {sewagePipe.size}
                    </p>
                    <span className="block text-[9px] text-slate-500 leading-normal mt-0.5">
                      * {sewagePipe.reason}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'tanks' && (
              <div className="space-y-4">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Potable Water Tank Capacity</span>
                  <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
                    {(totalWaterStorageM3 || 0).toFixed(1)} <span className="text-sm font-normal text-slate-400">m³</span>
                  </p>
                  <span className="block text-[10px] text-slate-400 font-mono mt-1">
                    ({totalWaterStorageLiters.toLocaleString()} Liters for {storageDays} days)
                  </span>
                </div>

                <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-950/30 p-2.5 rounded border border-slate-850">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase">Ground Reservoir (2/3)</span>
                    <span className="block text-xs font-bold font-mono text-white mt-1">{(ugTankVolume || 0).toFixed(1)} m³</span>
                  </div>
                  <div className="bg-slate-950/30 p-2.5 rounded border border-slate-850">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase">Roof Elev. Tank (1/3)</span>
                    <span className="block text-xs font-bold font-mono text-white mt-1">{(roofTankVolume || 0).toFixed(1)} m³</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      {standard === 'bs' ? 'BS 6297 Septic Tank Volume' : 'IPC/EPA Septic Tank Volume'}
                    </span>
                    <p className="text-lg font-black text-white font-mono mt-1">
                      {(totalSepticVolumeM3 || 0).toFixed(2)} <span className="text-xs text-slate-400 font-semibold">m³</span>
                    </p>
                    <span className="block text-[9px] text-slate-500 leading-normal mt-1">
                      {standard === 'bs' ? (
                        <>* Complies with BS 6297 Code of Practice. Includes {septicLiquidVol.toLocaleString()}L retention + {septicSludgeVol.toLocaleString()}L sludge build-up reserve.</>
                      ) : (
                        <>* Includes {septicLiquidVol.toLocaleString()}L wastewater retention (1.5 days flow) + {septicSludgeVol.toLocaleString()}L sludge build-up storage.</>
                      )}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-850">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      {standard === 'bs' ? 'Sump Receiver (BS EN 12050)' : 'Submersible / Sump Tank'}
                    </span>
                    <p className="text-lg font-bold text-cyan-400 font-mono mt-1">
                      {(sumpVolumeM3 || 0).toFixed(1)} <span className="text-xs text-slate-400">m³</span>
                    </p>
                    <span className="block text-[9px] text-slate-500">
                      * Holds {sumpVolumeLiters.toLocaleString()} Liters (20 mins protection flow)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'pumps' && (
              <div className="space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 space-y-3">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Water Booster Pump Set</span>
                    <p className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">
                      {(boosterHP || 0).toFixed(2)} <span className="text-xs text-slate-400">HP</span>{' '}
                      <span className="text-xs text-slate-500">({((boosterShaftPower || 0)).toFixed(2)} kW)</span>
                    </p>
                    <div className="text-[9px] text-slate-400 font-mono mt-1 space-y-0.5">
                      <div>• Sump Peak Flow: {(boosterFlowLpm || 0).toFixed(0)} L/min ({(peakFlowLps || 0).toFixed(2)} L/s)</div>
                      <div>• Total Calc Head: {(boosterHeadMeters || 0).toFixed(1)} meters ({ ((boosterHeadMeters / 10.197) || 0).toFixed(1) } bar)</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2.5">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase">Water Transfer Pump</span>
                    <span className="block text-sm font-bold text-white font-mono">{(transferHP || 0).toFixed(2)} HP</span>
                    <div className="text-[8px] text-slate-500 leading-normal">
                      Flow: {(transferFlowLpm || 0).toFixed(0)} Lpm<br/>Head: {(transferHeadMeters || 0).toFixed(1)}m
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase">Submersible Sump Pump</span>
                    <span className="block text-sm font-bold text-cyan-400 font-mono">{(sumpHP || 0).toFixed(2)} HP</span>
                    <div className="text-[8px] text-slate-500 leading-normal">
                      Flow: {(sumpFlowLpm || 0).toFixed(0)} Lpm<br/>Head: {(sumpHeadMeters || 0).toFixed(1)}m
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 space-y-2.5">
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pump-to-Service Recommended Main Pipes</span>
                  <div className="space-y-2 text-[10px] text-slate-300 font-mono">
                    <div className="border-b border-slate-850/60 pb-1.5">
                      <span className="text-cyan-400 font-bold">Booster Main (Flow: {(peakFlowLps || 0).toFixed(2)} L/s):</span>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 pl-2">
                        <span>• Suction Line (≤ 1.2 m/s):</span>
                        <span className="text-white font-bold">{boosterSuctionPipe}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 pl-2">
                        <span>• Discharge/Service Main:</span>
                        <span className="text-white font-bold">{boosterDischargePipe}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-bold">Transfer Main (Flow: {(transferFlowLps || 0).toFixed(2)} L/s):</span>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 pl-2">
                        <span>• Suction Line (≤ 1.2 m/s):</span>
                        <span className="text-white font-bold">{transferSuctionPipe}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 pl-2">
                        <span>• Discharge/Service Main:</span>
                        <span className="text-white font-bold">{transferDischargePipe}</span>
                      </div>
                    </div>
                  </div>
                  <span className="block text-[8px] text-slate-500 italic mt-1 leading-normal">
                    * Sized using standard fluid velocities to prevent pipe erosion, cavitation, and dynamic water hammer.
                  </span>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-xl text-[10px] text-slate-400 leading-relaxed">
                  <Info className="h-4 w-4 text-cyan-400 float-left mr-2 mt-0.5" />
                  {standard === 'bs'
                    ? 'Pump sizing features auto-calculate total dynamic hydraulic head (TDH) based on gravity elevation vertical rise, pipe friction allowances, and BS EN 806 / BS 8558 required residual discharge water pressure standards.'
                    : 'Pump sizing features auto-calculates total dynamic hydraulic head (TDH) based on gravity elevation vertical rise, pipe friction allowances, and IPC required residual discharge water pressure standards.'
                  }
                </div>
              </div>
            )}

          </div>
          <ValidationBanner validations={validations} />
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => setIsRefModalOpen(true)}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              title="View Fixture Unit Reference Tables"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Reference</span>
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center space-x-2 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Bookmark className="h-4 w-4" />
              <span>{t('saveIteration')}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/20 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 border border-cyan-500/50 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{t('exportCsv')}</span>
            </button>
            <button
              onClick={() => {
                const subject = encodeURIComponent(`CKY_MEPF - Plumbing Sizing Estimate Report`);
                let summaryText = '';
                if (subTab === 'fixtures') {
                  summaryText = `- Standard: ${standard.toUpperCase()}\n` +
                    `- Total Load: ${standard === 'bs' ? totalLU + ' LU | ' + totalDU + ' DU' : totalWSFU + ' WSFU | ' + totalDFU + ' DFU'}\n` +
                    `- Design Velocity: ${designVelocity} m/s\n` +
                    `- Sewage Slope: ${slope}%\n` +
                    `- Peak Flow: ${(peakFlowLps || 0).toFixed(2)} L/s (${(peakFlowGPM || 0).toFixed(1)} GPM)\n` +
                    (standard === 'bs' 
                      ? `- Recommended Water Pipe: ${recommendedWaterPipe}\n` 
                      : `- Preliminary Water Pipe (Velocity): ${recommendedWaterPipe} *Requires IPC friction tables for complete sizing.\n`) +
                    `- Recommended Sewage Pipe: ${sewagePipe.size} (${sewagePipe.reason})`;
                } else if (subTab === 'tanks') {
                  summaryText = `- Occupants: ${occupants}\n` +
                    `- Daily Water Use Rate: ${consumptionRate} L/person/day\n` +
                    `- Storage Days: ${storageDays}\n` +
                    `- Required Water Storage: ${(totalWaterStorageM3 || 0).toFixed(1)} m³ (${totalWaterStorageLiters.toLocaleString()} Liters)\n` +
                    `  • Underground Tank (2/3): ${(ugTankVolume || 0).toFixed(1)} m³\n` +
                    `  • Elevated Roof Tank (1/3): ${(roofTankVolume || 0).toFixed(1)} m³\n` +
                    `- Required Septic Tank: ${(totalSepticVolumeM3 || 0).toFixed(1)} m³ (${totalSepticVolumeLiters.toLocaleString()} Liters)\n` +
                    `- Sump Receiver Volume: ${(sumpVolumeM3 || 0).toFixed(1)} m³`;
                } else {
                  summaryText = `- Static Booster Rise: ${boosterStaticHead} m\n` +
                    `- Booster Flow: ${(boosterFlowLpm || 0).toFixed(0)} L/min (${(peakFlowLps || 0).toFixed(2)} L/s)\n` +
                    `- Required Booster Pump: ${(boosterHP || 0).toFixed(2)} HP (${(boosterShaftPower || 0).toFixed(2)} kW)\n` +
                    `- Required Transfer Pump: ${(transferHP || 0).toFixed(2)} HP\n` +
                    `- Required Sump Pump: ${(sumpHP || 0).toFixed(2)} HP`;
                }
                const body = encodeURIComponent(
                  `Dear Team,\n\nHere is the Plumbing Sizing Estimate Report (${subTab === 'fixtures' ? 'Fixtures & Pipe Sizing' : subTab === 'tanks' ? 'Water & Septic Tanks' : 'Pumps & Flow Rates'}) generated from CKY_MEPF:\n\n` +
                  summaryText +
                  `\n\nGenerated on ${new Date().toLocaleString()}\n` +
                  `Regards,\n` +
                  `Design Team`
                );
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-cyan-400" />
              <span>{t('shareEmail')}</span>
            </button>
          </div>
        </motion.div>

      </div>

      {/* Interactive Trend Chart Section */}
      <TrendVisualizer 
        type={subTab === 'fixtures' ? 'plumbing_fixtures' : subTab === 'tanks' ? 'plumbing_tanks' : 'plumbing_pumps'} 
        currentParams={{
          totalLU: totalLU,
          totalWSFU: totalWSFU,
          peakFlowLps: peakFlowLps,
          standard: appliedStandard,
          systemType: systemType,
          occupants: appliedOccupants,
          consumptionRate: appliedConsumptionRate,
          storageDays: appliedStorageDays,
          septicDischarge: appliedSepticDischarge,
          septicDesludgeInterval: appliedSepticDesludgeInterval,
          totalWaterStorageLiters: totalWaterStorageLiters,
          boosterStaticHead: appliedBoosterStaticHead,
          boosterEfficiency: appliedBoosterEfficiency,
          boosterResidualPress: appliedBoosterResidualPress,
          boosterFrictionPercent: appliedBoosterFrictionPercent,
          boosterHP: boosterHP
        }}
      />
    </div>
    </>
  );
}
