/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Flame, AlertTriangle, ShieldCheck, Award, Bookmark, 
  CheckCircle2, Compass, Activity, Info, Layers, RefreshCw, FileSpreadsheet, Mail, BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import TrendVisualizer from './TrendVisualizer';
import TooltipLabel from './TooltipLabel';
import InputAlert from './InputAlert';
import { useLanguage } from '../lib/translations';
import { exportFireToCsv } from '../lib/exportCsv';
import FireReferenceModal from "./FireReferenceModal";
import FormulaVisualizer from './FormulaVisualizer';
import InteractiveFormulaReferenceCard from './InteractiveFormulaReferenceCard';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

type HazardClass = 'light' | 'ordinary' | 'extra';
type SubTab = 'equipment' | 'sizing' | 'pump' | 'formulas';

interface FireCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
  activeSubTab?: SubTab;
  onSubTabChange?: (subTab: SubTab) => void;
}

export default function FireCalc({ restoredParams, onSaveCalculation, autoCalculate = true, activeSubTab, onSubTabChange }: FireCalcProps) {
  const { t } = useLanguage();
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>(activeSubTab || 'equipment');

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
  const [standard, setStandard] = useState<'nfpa' | 'bs'>('nfpa');
  const [hazard, setHazard] = useState<HazardClass>('ordinary');
  
  // Equipment States
  const [sprinklersCount, setSprinklersCount] = useState<number>(150);
  const [hoseReelsCount, setHoseReelsCount] = useState<number>(12);
  const [hydrantsCount, setHydrantsCount] = useState<number>(4);
  const [breechingInletsCount, setBreechingInletsCount] = useState<number>(2);

  // Sprinkler design options
  const [kFactor, setKFactor] = useState<number>(5.6); // GPM/psi^0.5 or Metric K
  const [residualPressure, setResidualPressure] = useState<number>(10); // psi (NFPA 13 minimum is 7 psi) or bar (BS)
  const [activeHeadsInDesignArea, setActiveHeadsInDesignArea] = useState<number>(12); // standard design area head count
  
  // Sizing options
  const [flowDuration, setFlowDuration] = useState<number>(60); // minutes
  const [hoseStreamAllowance, setHoseStreamAllowance] = useState<number>(250); // GPM or Lpm
  
  // Pump parameters
  const [buildingHeight, setBuildingHeight] = useState<number>(35); // meters static height
  const [standpipeSystem, setStandpipeSystem] = useState<'class1' | 'class2' | 'sprinklerOnly'>('class1');
  const [pipeFrictionPercent, setPipeFrictionPercent] = useState<number>(15); // % static head friction loss
  const [pumpEfficiency, setPumpEfficiency] = useState<number>(72); // %

  // TOAST state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);

  // Decoupled applied states
  const [appliedStandard, setAppliedStandard] = useState<'nfpa' | 'bs'>('nfpa');
  const [appliedHazard, setAppliedHazard] = useState<HazardClass>('ordinary');
  const [appliedSprinklersCount, setAppliedSprinklersCount] = useState<number>(150);
  const [appliedHoseReelsCount, setAppliedHoseReelsCount] = useState<number>(12);
  const [appliedHydrantsCount, setAppliedHydrantsCount] = useState<number>(4);
  const [appliedBreechingInletsCount, setAppliedBreechingInletsCount] = useState<number>(2);
  const [appliedKFactor, setAppliedKFactor] = useState<number>(5.6);
  const [appliedResidualPressure, setAppliedResidualPressure] = useState<number>(10);
  const [appliedActiveHeadsInDesignArea, setAppliedActiveHeadsInDesignArea] = useState<number>(12);
  const [appliedFlowDuration, setAppliedFlowDuration] = useState<number>(60);
  const [appliedHoseStreamAllowance, setAppliedHoseStreamAllowance] = useState<number>(250);
  const [appliedBuildingHeight, setAppliedBuildingHeight] = useState<number>(35);
  const [appliedStandpipeSystem, setAppliedStandpipeSystem] = useState<'class1' | 'class2' | 'sprinklerOnly'>('class1');
  const [appliedPipeFrictionPercent, setAppliedPipeFrictionPercent] = useState<number>(15);
  const [appliedPumpEfficiency, setAppliedPumpEfficiency] = useState<number>(72);

  // Sync state automatically when autoCalculate is true
  useEffect(() => {
    if (autoCalculate) {
      setAppliedStandard(standard);
      setAppliedHazard(hazard);
      setAppliedSprinklersCount(sprinklersCount);
      setAppliedHoseReelsCount(hoseReelsCount);
      setAppliedHydrantsCount(hydrantsCount);
      setAppliedBreechingInletsCount(breechingInletsCount);
      setAppliedKFactor(kFactor);
      setAppliedResidualPressure(residualPressure);
      setAppliedActiveHeadsInDesignArea(activeHeadsInDesignArea);
      setAppliedFlowDuration(flowDuration);
      setAppliedHoseStreamAllowance(hoseStreamAllowance);
      setAppliedBuildingHeight(buildingHeight);
      setAppliedStandpipeSystem(standpipeSystem);
      setAppliedPipeFrictionPercent(pipeFrictionPercent);
      setAppliedPumpEfficiency(pumpEfficiency);
    }
  }, [
    autoCalculate, standard, hazard, sprinklersCount, hoseReelsCount, hydrantsCount, breechingInletsCount,
    kFactor, residualPressure, activeHeadsInDesignArea, flowDuration, hoseStreamAllowance,
    buildingHeight, standpipeSystem, pipeFrictionPercent, pumpEfficiency
  ]);

  // Load state from parameters history
  useEffect(() => {
    if (restoredParams && restoredParams.tab === 'fire' && restoredParams.id !== loadedHistoryId) {
      setLoadedHistoryId(restoredParams.id);
      const p = restoredParams.parameters;
      if (p) {
        if (p.subTab) setSubTab(p.subTab as SubTab);
        if (p.standard) { setStandard(p.standard as 'nfpa' | 'bs'); setAppliedStandard(p.standard as 'nfpa' | 'bs'); }
        if (p.hazard) { setHazard(p.hazard as HazardClass); setAppliedHazard(p.hazard as HazardClass); }
        if (p.sprinklersCount) { setSprinklersCount(p.sprinklersCount); setAppliedSprinklersCount(p.sprinklersCount); }
        if (p.hoseReelsCount) { setHoseReelsCount(p.hoseReelsCount); setAppliedHoseReelsCount(p.hoseReelsCount); }
        if (p.hydrantsCount) { setHydrantsCount(p.hydrantsCount); setAppliedHydrantsCount(p.hydrantsCount); }
        if (p.breechingInletsCount) { setBreechingInletsCount(p.breechingInletsCount); setAppliedBreechingInletsCount(p.breechingInletsCount); }
        if (p.kFactor) { setKFactor(p.kFactor); setAppliedKFactor(p.kFactor); }
        if (p.residualPressure) { setResidualPressure(p.residualPressure); setAppliedResidualPressure(p.residualPressure); }
        if (p.activeHeadsInDesignArea) { setActiveHeadsInDesignArea(p.activeHeadsInDesignArea); setAppliedActiveHeadsInDesignArea(p.activeHeadsInDesignArea); }
        if (p.flowDuration) { setFlowDuration(p.flowDuration); setAppliedFlowDuration(p.flowDuration); }
        if (p.hoseStreamAllowance) { setHoseStreamAllowance(p.hoseStreamAllowance); setAppliedHoseStreamAllowance(p.hoseStreamAllowance); }
        if (p.buildingHeight) { setBuildingHeight(p.buildingHeight); setAppliedBuildingHeight(p.buildingHeight); }
        if (p.standpipeSystem) { setStandpipeSystem(p.standpipeSystem); setAppliedStandpipeSystem(p.standpipeSystem); }
        if (p.pipeFrictionPercent) { setPipeFrictionPercent(p.pipeFrictionPercent); setAppliedPipeFrictionPercent(p.pipeFrictionPercent); }
        if (p.pumpEfficiency) { setPumpEfficiency(p.pumpEfficiency); setAppliedPumpEfficiency(p.pumpEfficiency); }
        
        triggerToast('Fire fighting parameters loaded!');
      }
    }
  }, [restoredParams, loadedHistoryId]);

  // Toggle standards helper
  const toggleStandard = (std: 'nfpa' | 'bs') => {
    setStandard(std);
    if (std === 'bs') {
      setKFactor(80); // K80 standard metric
      setResidualPressure(1.0); // 1.0 bar standard metric
      if (hazard === 'light') {
        setActiveHeadsInDesignArea(6);
        setFlowDuration(30);
        setHoseStreamAllowance(100); // Lpm
      } else if (hazard === 'ordinary') {
        setActiveHeadsInDesignArea(12);
        setFlowDuration(60);
        setHoseStreamAllowance(300); // Lpm
      } else {
        setActiveHeadsInDesignArea(22);
        setFlowDuration(90);
        setHoseStreamAllowance(600); // Lpm
      }
    } else {
      setKFactor(5.6); // 5.6 US standard
      setResidualPressure(10); // 10 psi standard
      if (hazard === 'light') {
        setActiveHeadsInDesignArea(8);
        setFlowDuration(30);
        setHoseStreamAllowance(100); // GPM
      } else if (hazard === 'ordinary') {
        setActiveHeadsInDesignArea(12);
        setFlowDuration(60);
        setHoseStreamAllowance(250); // GPM
      } else {
        setActiveHeadsInDesignArea(20);
        setFlowDuration(90);
        setHoseStreamAllowance(500); // GPM
      }
    }
  };

  // Handle Hazard changes to auto-preset rules
  const handleHazardChange = (h: HazardClass) => {
    setHazard(h);
    if (standard === 'bs') {
      if (h === 'light') {
        setActiveHeadsInDesignArea(6);
        setFlowDuration(30);
        setHoseStreamAllowance(100); // Lpm
      } else if (h === 'ordinary') {
        setActiveHeadsInDesignArea(12);
        setFlowDuration(60);
        setHoseStreamAllowance(300); // Lpm
      } else {
        setActiveHeadsInDesignArea(22);
        setFlowDuration(90);
        setHoseStreamAllowance(600); // Lpm
      }
    } else {
      if (h === 'light') {
        setActiveHeadsInDesignArea(8);
        setFlowDuration(30);
        setHoseStreamAllowance(100); // GPM
      } else if (h === 'ordinary') {
        setActiveHeadsInDesignArea(12);
        setFlowDuration(60);
        setHoseStreamAllowance(250); // GPM
      } else {
        setActiveHeadsInDesignArea(20);
        setFlowDuration(90);
        setHoseStreamAllowance(500); // GPM
      }
    }
  };

  const hasPendingChanges = !autoCalculate && (
    standard !== appliedStandard ||
    hazard !== appliedHazard ||
    sprinklersCount !== appliedSprinklersCount ||
    hoseReelsCount !== appliedHoseReelsCount ||
    hydrantsCount !== appliedHydrantsCount ||
    breechingInletsCount !== appliedBreechingInletsCount ||
    kFactor !== appliedKFactor ||
    residualPressure !== appliedResidualPressure ||
    activeHeadsInDesignArea !== appliedActiveHeadsInDesignArea ||
    flowDuration !== appliedFlowDuration ||
    hoseStreamAllowance !== appliedHoseStreamAllowance ||
    buildingHeight !== appliedBuildingHeight ||
    standpipeSystem !== appliedStandpipeSystem ||
    pipeFrictionPercent !== appliedPipeFrictionPercent ||
    pumpEfficiency !== appliedPumpEfficiency
  );

  const handleApplyCalculations = () => {
    setAppliedStandard(standard);
    setAppliedHazard(hazard);
    setAppliedSprinklersCount(sprinklersCount);
    setAppliedHoseReelsCount(hoseReelsCount);
    setAppliedHydrantsCount(hydrantsCount);
    setAppliedBreechingInletsCount(breechingInletsCount);
    setAppliedKFactor(kFactor);
    setAppliedResidualPressure(residualPressure);
    setAppliedActiveHeadsInDesignArea(activeHeadsInDesignArea);
    setAppliedFlowDuration(flowDuration);
    setAppliedHoseStreamAllowance(hoseStreamAllowance);
    setAppliedBuildingHeight(buildingHeight);
    setAppliedStandpipeSystem(standpipeSystem);
    setAppliedPipeFrictionPercent(pipeFrictionPercent);
    setAppliedPumpEfficiency(pumpEfficiency);
    triggerToast('Calculations updated!');
  };

  // Calculations
  // 1. Single Sprinkler Flow
  // NFPA uses US K-factor and pressure in psi: Q_GPM = K_US * sqrt(P_psi)
  // BS uses Metric K-factor and pressure in bar: Q_Lpm = K_metric * sqrt(P_bar)
  const singleSprinklerFlowLpm = appliedStandard === 'bs'
    ? appliedKFactor * Math.sqrt(appliedResidualPressure)
    : (appliedKFactor * Math.sqrt(appliedResidualPressure)) * 3.7854;

  const singleSprinklerFlowGPM = singleSprinklerFlowLpm / 3.7854;

  // 2. Active Design Area Sprinkler Flow
  const designAreaSprinklerFlowLpm = singleSprinklerFlowLpm * appliedActiveHeadsInDesignArea;
  const designAreaSprinklerFlowGPM = designAreaSprinklerFlowLpm / 3.7854;

  // 3. Combined Water Demand (Sprinklers + Hose Stream / Hydrant Allowance)
  // In NFPA: hoseStreamAllowance is GPM
  // In BS: hoseStreamAllowance is Lpm
  const totalWaterDemandLpm = appliedStandard === 'bs'
    ? designAreaSprinklerFlowLpm + appliedHoseStreamAllowance
    : (designAreaSprinklerFlowGPM + appliedHoseStreamAllowance) * 3.7854;

  const totalWaterDemandGPM = totalWaterDemandLpm / 3.7854;

  // 4. Fire fighting Reservoir water storage sizing (Gallons and Liters)
  const storageTankVolumeLiters = totalWaterDemandLpm * appliedFlowDuration;
  const storageTankVolumeGallons = storageTankVolumeLiters / 3.7854;
  const storageTankVolumeM3 = storageTankVolumeLiters / 1000;

  // 5. Fire Hydrant & Breeching Checks
  // A standard NFPA 2.5" hydrant outlet is assumed to discharge 250 GPM (946 Lpm).
  // Under BS 9990, a hydrant landing valve is assumed to discharge 750 Lpm (approx 200 GPM).
  const hydrantRequiredOutlets = Math.ceil(
    appliedStandard === 'bs'
      ? appliedHoseStreamAllowance / 750
      : appliedHoseStreamAllowance / 250
  );
  
  // Breeching Inlets requirement: 2-way is enough for up to 1000 Lpm. 4-way for larger flows.
  const suggestedBreechingType = totalWaterDemandLpm <= 1000 ? '2-Way Breeching Inlet (DN100)' : '4-Way Breeching Inlet (DN150)';
  const minBreechingInletsNeeded = Math.ceil(totalWaterDemandLpm / 1000);

  // 6. Pump Calculations
  // Elevation static head
  // 1 meter ≈ 0.0981 bar ≈ 1.422 psi
  const staticHeadBar = appliedBuildingHeight * 0.0981;
  const staticHeadPsi = staticHeadBar * 14.5038;

  const frictionLossBar = staticHeadBar * (appliedPipeFrictionPercent / 100);
  const frictionLossPsi = frictionLossBar * 14.5038;
  
  // Required residual pressure at the highest point
  // NFPA 14 Class I = 100 psi (6.9 bar), Class II = 65 psi (4.5 bar)
  // BS 9990 Wet Riser Landing Valve = 6.0 bar (87 psi), Hose Reel = 3.0 bar (43.5 psi)
  const getRequiredResidualBar = () => {
    if (appliedStandard === 'bs') {
      switch (appliedStandpipeSystem) {
        case 'class1': return 6.0; // bar (Landing valve under BS 9990)
        case 'class2': return 3.0; // bar (Hose Reel under BS EN 671)
        case 'sprinklerOnly': return appliedResidualPressure; // bar
        default: return 6.0;
      }
    } else {
      switch (appliedStandpipeSystem) {
        case 'class1': return 100 / 14.5038; // 100 psi in bar
        case 'class2': return 65 / 14.5038;  // 65 psi in bar
        case 'sprinklerOnly': return appliedResidualPressure / 14.5038; // residualPressure is in psi
        default: return 100 / 14.5038;
      }
    }
  };
  const requiredResidualBar = getRequiredResidualBar();
  const requiredResidualPsi = requiredResidualBar * 14.5038;

  const totalPumpHeadBar = staticHeadBar + frictionLossBar + requiredResidualBar;
  const totalPumpHeadPsi = totalPumpHeadBar * 14.5038;
  const totalPumpHeadMeters = totalPumpHeadBar * 10.197; // 1 bar ≈ 10.197 meters of water

  // Motor power (HP) = Flow(GPM) * Head(psi) / (1714 * efficiency)
  const pumpHP = (totalWaterDemandGPM * totalPumpHeadPsi) / (1714 * (appliedPumpEfficiency / 100));
  const pumpKW = pumpHP * 0.746; // HP to kW

  // Jockey Pump standards
  // NFPA: ~1% of fire pump GPM, 10% higher psi
  // BS: ~1% of fire pump Lpm, 10% higher bar
  const jockeyFlowLpm = Math.max(15, Math.round(totalWaterDemandLpm * 0.01 * 10) / 10);
  const jockeyFlowGPM = Math.max(5, Math.round(totalWaterDemandGPM * 0.01 * 10) / 10);
  const jockeyHeadBar = Math.round(totalPumpHeadBar * 1.10 * 10) / 10;
  const jockeyHeadPsi = Math.round(totalPumpHeadPsi * 1.10);

  // NFPA 20 Fire Pump Piping sizing lookup (GPM)
  const getNFPA20PipeSizes = (gpm: number) => {
    if (gpm <= 0) return { suction: 'N/A', discharge: 'N/A' };
    if (gpm <= 50) return { suction: 'DN50 (2")', discharge: 'DN40 (1.5")' };
    if (gpm <= 100) return { suction: 'DN65 (2.5")', discharge: 'DN50 (2")' };
    if (gpm <= 150) return { suction: 'DN80 (3")', discharge: 'DN80 (3")' };
    if (gpm <= 200) return { suction: 'DN80 (3")', discharge: 'DN80 (3")' };
    if (gpm <= 250) return { suction: 'DN100 (4")', discharge: 'DN80 (3")' };
    if (gpm <= 300) return { suction: 'DN100 (4")', discharge: 'DN100 (4")' };
    if (gpm <= 400) return { suction: 'DN100 (4")', discharge: 'DN100 (4")' };
    if (gpm <= 450) return { suction: 'DN125 (5")', discharge: 'DN125 (5")' };
    if (gpm <= 500) return { suction: 'DN125 (5")', discharge: 'DN125 (5")' };
    if (gpm <= 750) return { suction: 'DN150 (6")', discharge: 'DN150 (6")' };
    if (gpm <= 1000) return { suction: 'DN200 (8")', discharge: 'DN150 (6")' };
    if (gpm <= 1250) return { suction: 'DN200 (8")', discharge: 'DN200 (8")' };
    if (gpm <= 1500) return { suction: 'DN200 (8")', discharge: 'DN200 (8")' };
    if (gpm <= 2000) return { suction: 'DN250 (10")', discharge: 'DN250 (10")' };
    if (gpm <= 2500) return { suction: 'DN250 (10")', discharge: 'DN250 (10")' };
    if (gpm <= 3000) return { suction: 'DN300 (12")', discharge: 'DN300 (12")' };
    return { suction: 'DN350 (14")', discharge: 'DN300 (12")' };
  };

  // BS EN 12845 Fire Pump piping sizing lookup (Lpm)
  const getBS12845PipeSizes = (lpm: number) => {
    if (lpm <= 0) return { suction: 'N/A', discharge: 'N/A' };
    if (lpm <= 250) return { suction: 'DN50 (2")', discharge: 'DN40 (1.5")' };
    if (lpm <= 500) return { suction: 'DN65 (2.5")', discharge: 'DN50 (2")' };
    if (lpm <= 900) return { suction: 'DN80 (3")', discharge: 'DN65 (2.5")' };
    if (lpm <= 1250) return { suction: 'DN100 (4")', discharge: 'DN80 (3")' };
    if (lpm <= 1750) return { suction: 'DN125 (5")', discharge: 'DN100 (4")' };
    if (lpm <= 3000) return { suction: 'DN150 (6")', discharge: 'DN125 (5")' };
    if (lpm <= 5000) return { suction: 'DN200 (8")', discharge: 'DN150 (6")' };
    return { suction: 'DN250 (10")', discharge: 'DN200 (8")' };
  };

  const firePumpPipes = standard === 'bs' 
    ? getBS12845PipeSizes(totalWaterDemandLpm)
    : getNFPA20PipeSizes(totalWaterDemandGPM);

  const getRiserSize = (sysType: string, heightM: number, heads: number) => {
    if (standard === 'bs') {
      if (sysType === 'class1') {
        return heightM > 50 ? 'DN150 (6") Wet Riser' : 'DN100 (4") Dry Riser';
      } else if (sysType === 'class2') {
        return 'DN50 (2") Riser';
      } else {
        return heads > 100 ? 'DN150 (6") Main' : 'DN100 (4") Main';
      }
    } else {
      if (sysType === 'class1') {
        return heightM > 30 ? 'DN150 (6")' : 'DN100 (4")';
      } else if (sysType === 'class2') {
        return 'DN65 (2.5")';
      } else {
        return heads > 100 ? 'DN150 (6")' : 'DN100 (4")';
      }
    }
  };

  const recommendedRiserPipe = getRiserSize(standpipeSystem, buildingHeight, sprinklersCount);

  // Pipe Schedule size estimator for branches
  const getPipeScheduleLookup = (heads: number) => {
    if (standard === 'bs') {
      if (heads <= 1) return 'DN25 (1")';
      if (heads <= 2) return 'DN32 (1-1/4")';
      if (heads <= 3) return 'DN40 (1-1/2")';
      if (heads <= 5) return 'DN50 (2")';
      if (heads <= 10) return 'DN65 (2-1/2")';
      if (heads <= 18) return 'DN80 (3")';
      if (heads <= 48) return 'DN100 (4")';
      return 'DN150 (6") or larger';
    } else {
      if (heads <= 2) return '25 mm (1")';
      if (heads <= 3) return '32 mm (1-1/4")';
      if (heads <= 5) return '40 mm (1-1/2")';
      if (heads <= 10) return '50 mm (2")';
      if (heads <= 30) return '65 mm (2-1/2")';
      if (heads <= 60) return '80 mm (3")';
      if (heads <= 100) return '100 mm (4")';
      return '150 mm (6") or larger';
    }
  };

  const handleSave = () => {
    if (onSaveCalculation) {
      let title = '';
      let summary = '';
      let parameters: any = { subTab, hazard, standard };

      if (subTab === 'equipment') {
        title = standard === 'bs' 
          ? `BS EN Fire Demands (${hazard.toUpperCase()})` 
          : `NFPA Fire Demands (${hazard.toUpperCase()})`;
        summary = `Sprinklers: ${sprinklersCount} | Flows: ${(totalWaterDemandLpm || 0).toFixed(0)} Lpm | Heads: ${activeHeadsInDesignArea}`;
        parameters = {
          ...parameters,
          sprinklersCount,
          hoseReelsCount,
          hydrantsCount,
          breechingInletsCount,
          kFactor,
          residualPressure,
          activeHeadsInDesignArea,
        };
      } else if (subTab === 'sizing') {
        title = standard === 'bs' 
          ? `BS Water Storage (${flowDuration}m)` 
          : `Fire Water Storage (${flowDuration}m)`;
        summary = `Tank: ${(storageTankVolumeM3 || 0).toFixed(0)}m³ | Duration: ${flowDuration} mins | Hydrants: ${hydrantsCount}`;
        parameters = {
          ...parameters,
          flowDuration,
          hoseStreamAllowance,
          hydrantsCount,
        };
      } else {
        title = standard === 'bs' 
          ? `BS Fire Pump (Elev. ${buildingHeight}m)` 
          : `NFPA Fire Pump (Elev. ${buildingHeight}m)`;
        summary = `Pump: ${(pumpHP || 0).toFixed(1)} HP | Head: ${(totalPumpHeadMeters || 0).toFixed(1)}m | Flow: ${(totalWaterDemandLpm || 0).toFixed(0)} Lpm`;
        parameters = {
          ...parameters,
          buildingHeight,
          standpipeSystem,
          pipeFrictionPercent,
          pumpEfficiency,
        };
      }

      onSaveCalculation({
        tab: 'fire',
        subType: subTab,
        title,
        summary,
        parameters,
      });
      triggerToast(t('toastCalculationSaved'));
    }
  };

  const handleExportCSV = () => {
    if (subTab === 'equipment') {
      const rows = [
        { section: "Fire Standard", parameter: "Design Standard", value: standard.toUpperCase(), unit: "N/A", notes: standard === 'bs' ? "British Standard EN 12845" : "NFPA 13 Standard" },
        { section: "Hazard Class", parameter: "Hazard Class Level", value: hazard.toUpperCase(), unit: "N/A", notes: "" },
        { section: "Equipment Input", parameter: "Sprinklers Count", value: sprinklersCount, unit: "Heads", notes: "" },
        { section: "Equipment Input", parameter: "Hose Reels Count", value: hoseReelsCount, unit: "Units", notes: "" },
        { section: "Equipment Input", parameter: "Hydrants Count", value: hydrantsCount, unit: "Outlets", notes: "" },
        { section: "Equipment Input", parameter: "Breeching Inlets Count", value: breechingInletsCount, unit: "Inlets", notes: "" },
        
        { section: "Sprinkler Flow Parameter", parameter: "Sprinkler K-Factor", value: kFactor, unit: "Metric / US", notes: "" },
        { section: "Sprinkler Flow Parameter", parameter: "Residual Head Pressure", value: residualPressure, unit: "bar / psi", notes: "" },
        { section: "Sprinkler Flow Parameter", parameter: "Active Heads in Design Area", value: activeHeadsInDesignArea, unit: "Heads", notes: "" },
        
        { section: "Flow Demand Sizing", parameter: "Single Sprinkler Peak Flow", value: (singleSprinklerFlowLpm || 0).toFixed(1), unit: "L/min", notes: "" },
        { section: "Flow Demand Sizing", parameter: "Design Area Sprinklers Flow", value: (designAreaSprinklerFlowLpm || 0).toFixed(0), unit: "L/min", notes: "" },
        { section: "Flow Demand Sizing", parameter: "Total System Flow Demand", value: (totalWaterDemandLpm || 0).toFixed(0), unit: "L/min", notes: "Includes hose stream allowance" },
      ];
      import('../lib/exportCsv').then(({ downloadCsv }) => {
        downloadCsv("fire_equipment_demands", "Fire Sprinkler and Equipment Demand Report", rows);
      });
    } else if (subTab === 'sizing') {
      const rows = [
        { section: "Duration Input", parameter: "Required Flow Duration", value: flowDuration, unit: "minutes", notes: "" },
        { section: "Hose Stream Input", parameter: "Hose Stream Allowance", value: hoseStreamAllowance, unit: "L/min / GPM", notes: "" },
        { section: "Hydrants Input", parameter: "Hydrants Count", value: hydrantsCount, unit: "Outlets", notes: "" },
        
        { section: "Storage Output", parameter: "Total Water Demand Flow Rate", value: (totalWaterDemandLpm || 0).toFixed(0), unit: "L/min", notes: "" },
        { section: "Storage Output", parameter: "Total Fire Water Volume (Liters)", value: (storageTankVolumeLiters || 0).toFixed(0), unit: "Liters", notes: "" },
        { section: "Storage Output", parameter: "Total Fire Water Volume (Gallons)", value: (storageTankVolumeGallons || 0).toFixed(0), unit: "US Gallons", notes: "" },
        { section: "Storage Output", parameter: "Total Fire Water Volume (m³)", value: (storageTankVolumeM3 || 0).toFixed(2), unit: "m³", notes: "Recommended storage tank clear size" },
      ];
      import('../lib/exportCsv').then(({ downloadCsv }) => {
        downloadCsv("fire_water_storage_sizing", "Fire Fighting Water Reservoir Sizing Report", rows);
      });
    } else {
      const rows = [
        { section: "Pump Sizing Input", parameter: "Building Height vertical rise", value: buildingHeight, unit: "meters", notes: "" },
        { section: "Pump Sizing Input", parameter: "Standpipe Category", value: standpipeSystem === 'class1' ? 'Class I (Dry/Wet)' : standpipeSystem === 'class2' ? 'Class II (Hose station)' : 'Class III (Combined)', unit: "N/A", notes: "" },
        { section: "Pump Sizing Input", parameter: "Allowed Pipe Friction Loss", value: pipeFrictionPercent, unit: "%", notes: "" },
        { section: "Pump Sizing Input", parameter: "Pump Mech. Efficiency", value: pumpEfficiency, unit: "%", notes: "" },
        
        { section: "Pump Output", parameter: "Static Pressure", value: ((appliedStandard === 'bs' ? staticHeadBar : staticHeadPsi) || 0).toFixed(2), unit: appliedStandard === 'bs' ? "bar" : "psi", notes: "" },
        { section: "Pump Output", parameter: "Friction Loss", value: ((appliedStandard === 'bs' ? frictionLossBar : frictionLossPsi) || 0).toFixed(2), unit: appliedStandard === 'bs' ? "bar" : "psi", notes: "" },
        { section: "Pump Output", parameter: "Total Dynamic Head (TDH)", value: (totalPumpHeadMeters || 0).toFixed(1), unit: "meters", notes: "" },
        { section: "Pump Output", parameter: "Electric Motor Power", value: (pumpHP || 0).toFixed(2), unit: "HP (Horsepower)", notes: "" },
      ];
      import('../lib/exportCsv').then(({ downloadCsv }) => {
        downloadCsv("fire_pump_sizing", "Fire Sprinkler Booster and Standpipe Pump Report", rows);
      });
    }
    triggerToast('Fire protection calculations exported!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-slate-100">
      
      <FireReferenceModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} />
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg shadow-xl shadow-red-950/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-red-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-md shadow-red-500/50" />
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">
              {standard === 'bs' ? 'BS STANDARD Fire Protection' : 'NFPA Fire Protection Suite'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {standard === 'bs'
              ? 'Engineered compliance matching the BS Handbook (BS EN 12845 / BS 9990) for sprinklers, wet/dry risers, storage, and fire pumps.'
              : 'Engineered compliance matching the NFPA Handbook for sprinklers, wet standpipes, fire water storage, and hydraulic pumping systems.'}
          </p>
        </div>
                <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRefModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-red-400" />
            <span>Reference</span>
          </button>
          <div className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
          <button
            onClick={() => toggleStandard('nfpa')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              standard === 'nfpa'
                ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NFPA Standard
          </button>
          <button
            onClick={() => toggleStandard('bs')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              standard === 'bs'
                ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BS STANDARD
          </button>
        </div>
        </div>
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex flex-wrap bg-slate-950/80 p-1 rounded-xl border border-slate-850 gap-1">
        <button
          onClick={() => setSubTab('equipment')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'equipment' ? 'bg-red-950/50 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          1. Hazard & Equipment
        </button>
        <button
          onClick={() => setSubTab('sizing')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'sizing' ? 'bg-red-950/50 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          2. Sizing & Sump Checks
        </button>
        <button
          onClick={() => setSubTab('pump')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'pump' ? 'bg-red-950/50 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          3. Pumping Station Engine
        </button>
        <button
          onClick={() => setSubTab('formulas')}
          className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'formulas' ? 'bg-red-950/50 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          4. Formulas
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* LEFT COLUMN: HAZARDS & SPECIFIC INPUTS */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6 google-pro-border-red">
          
          {subTab === 'formulas' && (
            <InteractiveFormulaReferenceCard activeTab="fire" defaultExpanded={true} />
          )}

          {subTab === 'equipment' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Award className="h-4.5 w-4.5 text-red-400" />
                  <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase font-sans">Hazard & Equipment Quantities</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleHazardChange('light')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      hazard === 'light' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-500 border border-transparent'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => handleHazardChange('ordinary')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      hazard === 'ordinary' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' : 'bg-slate-950 text-slate-500 border border-transparent'
                    }`}
                  >
                    Ordinary
                  </button>
                  <button
                    onClick={() => handleHazardChange('extra')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      hazard === 'extra' ? 'bg-red-950 text-red-400 border border-red-500/30' : 'bg-slate-950 text-slate-500 border border-transparent'
                    }`}
                  >
                    Extra
                  </button>
                </div>
              </div>

              {/* Equipment Grid Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <TooltipLabel 
                    label="Installed Sprinklers Count"
                    tooltip={t("totalHeadsTooltip")}
                    className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={sprinklersCount || ''}
                    onChange={(e) => setSprinklersCount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      sprinklersCount > 10000
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {sprinklersCount > 10000 && (
                    <InputAlert type="warning" message="Recommended max density: 10,000 heads" />
                  )}
                </div>
                <div>
                  <TooltipLabel 
                    label="Fire Hose Reels Count"
                    tooltip={t("hoseReelsTooltip")}
                    className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={hoseReelsCount || ''}
                    onChange={(e) => setHoseReelsCount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      hoseReelsCount > 200
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {hoseReelsCount > 200 && (
                    <InputAlert type="error" message="Max standard: 200 hose reels" />
                  )}
                </div>
                <div>
                  <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="External Hydrants Count" tooltip="Number of hydrants in the design area. Flow rates per hydrant vary significantly by standard (NFPA 13 vs BS EN 12845)." />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={hydrantsCount || ''}
                    onChange={(e) => setHydrantsCount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      hydrantsCount > 100
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {hydrantsCount > 100 && (
                    <InputAlert type="error" message="Max standard: 100 outlets" />
                  )}
                </div>
                <div>
                  <TooltipLabel className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase" label="Breeching Inlets" tooltip="Connections for fire department apparatus. Does not generally add to the base pump demand but dictates Siamese connection sizing." />
                  <input
                    type="number"
                    value={breechingInletsCount || ''}
                    onChange={(e) => setBreechingInletsCount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      breechingInletsCount > 50
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {breechingInletsCount > 50 && (
                    <InputAlert type="error" message="Max standard: 50 inlets" />
                  )}
                </div>
              </div>

              {/* Active Sprinkler Estimator Settings */}
              <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3 pt-3.5">
                <h4 className="text-[11px] font-bold uppercase text-red-400 tracking-wide">Sprinkler Sizing Estimator Parameters</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                      K-Factor ({standard === 'bs' ? 'Metric' : 'US'})
                    </label>
                    {standard === 'bs' ? (
                      <select
                        value={kFactor}
                        onChange={(e) => setKFactor(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-red-400 rounded px-2.5 py-1.5 text-xs font-mono"
                      >
                        <option value={80}>K80 (Standard)</option>
                        <option value={115}>K115 (Large)</option>
                        <option value={160}>K160 (ESFR)</option>
                        <option value={200}>K200 (Ultra)</option>
                      </select>
                    ) : (
                      <select
                        value={kFactor}
                        onChange={(e) => setKFactor(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-red-400 rounded px-2.5 py-1.5 text-xs font-mono"
                      >
                        <option value={5.6}>5.6 (Standard)</option>
                        <option value={8.0}>8.0 (Large Orifice)</option>
                        <option value={11.2}>11.2 (ESFR)</option>
                        <option value={14.0}>14.0 (Ultra High)</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                      Min Pressure ({standard === 'bs' ? 'bar' : 'psi'})
                    </label>
                    <input
                      type="number"
                    min="0.35"
                    max="12.0"
                      step={standard === 'bs' ? '0.1' : '1'}
                      value={residualPressure || ''}
                      onChange={(e) => setResidualPressure(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                        residualPressure !== 0 && (
                          standard === 'bs' 
                            ? (residualPressure < 0.35 || residualPressure > 12.0)
                            : (residualPressure < 5 || residualPressure > 175)
                        )
                          ? 'border-red-500/70 text-red-200'
                          : 'border-slate-800 focus:border-red-500'
                      } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                    />
                    {residualPressure !== 0 && (
                      standard === 'bs'
                        ? (residualPressure < 0.35 || residualPressure > 12.0)
                        : (residualPressure < 5 || residualPressure > 175)
                    ) && (
                      <InputAlert type="error" message={`Safe range: ${standard === 'bs' ? '0.35 - 12.0 bar' : '5 - 175 psi'}`} />
                    )}
                  </div>
                  <div>
                    <TooltipLabel className="block text-[9px] text-slate-400 font-bold uppercase mb-1" label="Design Area Heads" tooltip="The number of sprinklers calculated to operate simultaneously in the hydraulically most demanding area." />
                    <input
                      type="number"
                    min="1"
                    max="100"
                      value={activeHeadsInDesignArea || ''}
                      onChange={(e) => setActiveHeadsInDesignArea(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors border ${
                        activeHeadsInDesignArea !== 0 && (activeHeadsInDesignArea < 1 || activeHeadsInDesignArea > 100)
                          ? 'border-red-500/70 text-red-200'
                          : 'border-slate-800 focus:border-red-500'
                      } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                    />
                    {activeHeadsInDesignArea !== 0 && (activeHeadsInDesignArea < 1 || activeHeadsInDesignArea > 100) && (
                      <InputAlert type="error" message="Safe range: 1 - 100" />
                    )}
                  </div>
                </div>

              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Hydraulic Audit Report</h3>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-center">
                  <span className="block text-[9px] text-slate-500 uppercase font-semibold">Single Sprinkler Performance</span>
                  <p className="text-xl font-bold text-white mt-1.5 font-mono">
                    {(singleSprinklerFlowLpm || 0).toFixed(1)} <span className="text-xs text-slate-400">Lpm</span>{' '}
                    <span className="text-xs text-slate-500">({(singleSprinklerFlowGPM || 0).toFixed(1)} GPM)</span>
                  </p>
                  <span className="block text-[9px] text-slate-500 leading-normal mt-2">
                    * Evaluated at K={kFactor} and residual pressure P={residualPressure} {standard === 'bs' ? 'bar' : 'psi'}.
                  </span>
                </div>
                
                <div className="lg:col-span-3 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                    <div className="flex flex-col justify-center">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Design Area Sprinkler Flow</span>
                      <p className="text-lg font-extrabold text-red-400 font-mono mt-0.5">
                        {designAreaSprinklerFlowLpm.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-xs text-slate-400">Lpm</span>{' '}
                        <span className="text-xs text-slate-500">({(designAreaSprinklerFlowGPM || 0).toFixed(0)} GPM)</span>
                      </p>
                      <span className="block text-[9px] text-slate-500 mt-1">
                        (Flow demand of {activeHeadsInDesignArea} simultaneously active heads)
                      </span>
                    </div>
                    <div className="md:border-l border-t md:border-t-0 border-slate-800 md:pl-4 pt-3 md:pt-0 flex flex-col justify-center">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Hose Stream Allowance</span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {standard === 'bs' ? (
                          <>
                            {hoseStreamAllowance} Lpm <span className="text-[10px] text-slate-500 font-mono">({((hoseStreamAllowance / 3.7854) || 0).toFixed(0)} GPM)</span>
                          </>
                        ) : (
                          <>
                            {((hoseStreamAllowance * 3.7854) || 0).toFixed(0)} Lpm <span className="text-[10px] text-slate-500 font-mono">({hoseStreamAllowance} GPM)</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="md:border-l border-t md:border-t-0 border-slate-800 md:pl-4 pt-3 md:pt-0 flex flex-col justify-center">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Combined Peak System Demand</span>
                      <p className="text-base font-extrabold text-red-400 mt-0.5 font-mono">
                        {totalWaterDemandLpm.toLocaleString(undefined, {maximumFractionDigits:0})} Lpm <span className="text-xs text-slate-500">({(totalWaterDemandGPM || 0).toFixed(0)} GPM)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            

            
              </div>
              </div>
            </div>
          )}

          {subTab === 'sizing' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Compass className="h-4.5 w-4.5 text-red-400" />
                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                  {standard === 'bs' ? 'BS Pipe & Water Storage' : 'NFPA Pipe & Storage Tank'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">
                    {standard === 'bs' ? 'BS EN 12845 Duration (mins)' : 'NFPA Minimum Duration (mins)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="240"
                    value={flowDuration || ''}
                    onChange={(e) => setFlowDuration(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      flowDuration !== 0 && (flowDuration < 10 || flowDuration > 240)
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {flowDuration !== 0 && (flowDuration < 10 || flowDuration > 240) && (
                    <InputAlert type="error" message="Safe range: 10 to 240 minutes" />
                  )}
                  <span className="text-[9px] text-slate-500 leading-normal mt-1 block">
                    {standard === 'bs' 
                      ? '* BS EN 12845 dictates 30 mins for Light, 60 mins for Ordinary, 90 mins for High hazards.'
                      : '* NFPA 13 dictates 30m for Light, 60-90m for Ordinary, 90-120m for Extra hazards.'}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">
                    Hose Stream Allowance ({standard === 'bs' ? 'Lpm' : 'GPM'})
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="4000"
                    step={standard === 'bs' ? '50' : '10'}
                    value={hoseStreamAllowance || ''}
                    onChange={(e) => setHoseStreamAllowance(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      hoseStreamAllowance !== 0 && (
                        standard === 'bs'
                          ? (hoseStreamAllowance < 50 || hoseStreamAllowance > 4000)
                          : (hoseStreamAllowance < 10 || hoseStreamAllowance > 1000)
                      )
                        ? 'border-red-500/70 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {hoseStreamAllowance !== 0 && (
                    standard === 'bs'
                      ? (hoseStreamAllowance < 50 || hoseStreamAllowance > 4000)
                      : (hoseStreamAllowance < 10 || hoseStreamAllowance > 1000)
                  ) && (
                    <InputAlert type="error" message={`Safe range: ${standard === 'bs' ? '50 to 4,000 Lpm' : '10 to 1,000 GPM'}`} />
                  )}
                  <span className="text-[9px] text-slate-500 leading-normal mt-1 block">
                    {standard === 'bs'
                      ? '* BS 9990 wet-riser standard recommends adding 300 to 600 Lpm for firefighter hose support.'
                      : '* Standard NFPA allowance adds 100 to 500 GPM for local fire service brigade connections.'}
                  </span>
                </div>
              </div>

              {/* Dynamic Pipe Sizing Table Schedule */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-[11px] font-bold uppercase text-red-400 tracking-wide">
                  {standard === 'bs' ? 'BS EN 12845 Branch Pipe Sizing' : 'NFPA 13 Branch Pipe Schedule (Wet System)'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(standard === 'bs' ? [1, 2, 3, 5, 10, 18, 48] : [2, 3, 5, 10, 30, 100]).map((num) => (
                    <div key={num} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg flex flex-col justify-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Up to {num} Heads</span>
                      <span className="text-xs font-extrabold text-white font-mono mt-0.5">{getPipeScheduleLookup(num)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === 'pump' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Activity className="h-4.5 w-4.5 text-red-400" />
                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                  Pumping Station Specifications ({standard === 'bs' ? 'BS EN 12845 / BS 9990' : 'NFPA 20'})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <TooltipLabel 
                    label="Building Static Height (meters)"
                    tooltip={t("staticHeadTooltip")}
                    className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={buildingHeight}
                    onChange={(e) => setBuildingHeight(Number(e.target.value) || 0)}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      buildingHeight !== 0 && (buildingHeight < 1 || buildingHeight > 300)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {buildingHeight !== 0 && (buildingHeight < 1 || buildingHeight > 300) && (
                    <InputAlert type="error" message="Safe range: 1 to 300 meters" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">
                    {standard === 'bs' ? 'BS 9990 Landing / Hose Class' : 'NFPA Standpipe System Class'}
                  </label>
                  <select
                    value={standpipeSystem}
                    onChange={(e) => setStandpipeSystem(e.target.value as 'class1' | 'class2' | 'sprinklerOnly')}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none"
                  >
                    {standard === 'bs' ? (
                      <>
                        <option value="class1">BS 9990 Landing Valve (Residual: 6.0 bar)</option>
                        <option value="class2">BS EN 671 Fire Hose Reel (Residual: 3.0 bar)</option>
                        <option value="sprinklerOnly">Sprinkler System Only (Residual: Sprinkler Head bar)</option>
                      </>
                    ) : (
                      <>
                        <option value="class1">Class I Standpipe / Hydrants (Residual: 100 psi)</option>
                        <option value="class2">Class II Standpipe / Hose Reels (Residual: 65 psi)</option>
                        <option value="sprinklerOnly">Sprinkler System Only (Residual: Sprinkler Head psi)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <TooltipLabel className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" label="Static Head Friction Loss (%)" tooltip="An estimated percentage of static head to add as dynamic pipe friction for initial pump sizing." />
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={pipeFrictionPercent}
                    onChange={(e) => setPipeFrictionPercent(Number(e.target.value) || 0)}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      pipeFrictionPercent !== 0 && (pipeFrictionPercent < 5 || pipeFrictionPercent > 50)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {pipeFrictionPercent !== 0 && (pipeFrictionPercent < 5 || pipeFrictionPercent > 50) && (
                    <InputAlert type="error" message="Absolute calculation limits: 5% to 50%" />
                  )}
                  {pipeFrictionPercent !== 0 && pipeFrictionPercent >= 5 && pipeFrictionPercent <= 50 && (pipeFrictionPercent < 10 || pipeFrictionPercent > 30) && (
                    <InputAlert type="warning" message={`Typical NFPA/BS standard friction allowance is 10% - 30%.`} />
                  )}
                </div>
                <div>
                  <TooltipLabel 
                    label="Fire Pump Hydraulic Efficiency (%)"
                    tooltip={t("pumpEffTooltip")}
                    className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase" 
                  />
                  <input
                    type="number"
                    min="30"
                    max="95"
                    value={pumpEfficiency}
                    onChange={(e) => setPumpEfficiency(Number(e.target.value) || 0)}
                    className={`w-full bg-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      pumpEfficiency !== 0 && (pumpEfficiency < 30 || pumpEfficiency > 95)
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/20 text-red-200'
                        : 'border-slate-800 focus:border-red-500'
                    } invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                  />
                  {pumpEfficiency !== 0 && (pumpEfficiency < 30 || pumpEfficiency > 95) && (
                    <InputAlert type="error" message="Safe range: 30% to 95%" />
                  )}
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

        {/* RIGHT COLUMN: REVIEWS & CALCULATIONS SUMMARY */}
        {subTab !== 'formulas' && (
          <motion.div
            key={`${subTab}-${(totalWaterDemandLpm || 0).toFixed(2)}-${(storageTankVolumeLiters || 0).toFixed(2)}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden google-pro-border-red"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Hydraulic Audit Report</span>
              <span className="text-[9px] text-slate-500 font-mono">Active Run</span>
            </h3>
            
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {(() => {
                    let summaryText = '';
                    if (subTab === 'equipment') {
                      summaryText = `- Standard: ${standard.toUpperCase()}\n` +
                        `- Hazard Class: ${hazard.toUpperCase()}\n\n` +
                        `- Single Sprinkler Flow: ${(singleSprinklerFlowLpm || 0).toFixed(1)} Lpm (${(singleSprinklerFlowGPM || 0).toFixed(1)} GPM)\n` +
                        `- Design Area Sprinkler Flow: ${(designAreaSprinklerFlowLpm || 0).toFixed(1)} Lpm\n` +
                        `- Hose Stream Allowance: ${standard === 'bs' ? hoseStreamAllowance : ((hoseStreamAllowance * 3.7854) || 0).toFixed(1)} Lpm\n\n` +
                        `- COMBINED PEAK SYSTEM DEMAND: ${(totalWaterDemandLpm || 0).toFixed(1)} Lpm (${(totalWaterDemandGPM || 0).toFixed(1)} GPM)`;
                    } else if (subTab === 'sizing') {
                      summaryText = `- Standard: ${standard.toUpperCase()}\n` +
                        `- Min Flow Duration: ${flowDuration} mins\n` +
                        `- Combined Peak Demand: ${(totalWaterDemandLpm || 0).toFixed(1)} Lpm\n\n` +
                        `- RESERVOIR STORAGE REQ: ${(storageTankVolumeM3 || 0).toFixed(1)} m³\n` +
                        `  (${(storageTankVolumeLiters || 0).toFixed(1)} Liters)\n\n` +
                        `- Hydrant Connections Needed: ${hydrantRequiredOutlets}\n` +
                        `- Breeching Inlets: ${minBreechingInletsNeeded} (${suggestedBreechingType})`;
                    } else if (subTab === 'pump') {
                      summaryText = `- Fire Pump Rating: ${(totalWaterDemandGPM || 0).toFixed(1)} GPM @ ${(totalPumpHeadPsi || 0).toFixed(1)} psi\n` +
                        `- Estimated Motor Power: ${(pumpHP || 0).toFixed(1)} HP (${(pumpKW || 0).toFixed(1)} kW)\n\n` +
                        `- Jockey Pump Rating: ${(jockeyFlowGPM || 0).toFixed(1)} GPM @ ${(jockeyHeadPsi || 0).toFixed(1)} psi\n\n` +
                        `- Recommended Pipe Sizes:\n` +
                        `  * Suction: ${firePumpPipes.suction}\n` +
                        `  * Discharge: ${firePumpPipes.discharge}\n` +
                        `  * Riser: ${recommendedRiserPipe}`;
                    }
                    return summaryText;
                  })()}
                </pre>
            </div>
          </div>
</motion.div>
        )}

      </div>

      {/* Interactive Trend Chart Section */}
      <TrendVisualizer 
        type="fire_sizing"
        currentParams={{
          totalWaterDemandLpm: totalWaterDemandLpm,
          storageTankVolumeLiters: storageTankVolumeLiters,
          flowDuration: appliedFlowDuration,
          hazard: appliedHazard
        }}
      />
    </div>
  );
}
