import React, { useState, useEffect } from 'react';
import ValidationBanner, { ValidationItem } from './ValidationBanner';
import { Wind, Copy, FileSpreadsheet, AlertTriangle, AlertCircle, XCircle, CheckCircle2, Sliders, Settings, Layers, HelpCircle, Bookmark, Mail, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import TrendVisualizer from './TrendVisualizer';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import InputAlert from './InputAlert';
import ValidatedInput from './ValidatedInput';
import { useLanguage } from '../lib/translations';
import { useUnit } from '../lib/UnitContext';
import EngineeringStatusHeader from './common/EngineeringStatusHeader';
import { useUnitValue } from '../lib/useUnitValue';
import { exportDuctSizingToCsv } from '../lib/exportCsv';
import { scrollWorkspaceToTop } from '../lib/scrollUtils';

interface BranchResult {
  id: number;
  cfm: number;
  pct: number;
  de: number;
  width: number;
  height: number;
  velocityRound: number;
  velocityRect: number;
  status: 'optimal' | 'warning' | 'danger';
}

interface DuctSizingCalcProps {
  restoredParams?: any;
  onSaveCalculation?: any;
  autoCalculate?: boolean;
}

export default function DuctSizingCalc({ restoredParams, onSaveCalculation, autoCalculate = true }: DuctSizingCalcProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';
  const flowUnit = isMetric ? 'L/s' : 'CFM';
  const velUnit = isMetric ? 'm/s' : 'FPM';
  const lenUnit = isMetric ? 'mm' : 'in';
  const fricUnit = isMetric ? 'Pa/m' : 'in. wg/100 ft';
  const airflowUnitHook = useUnitValue(0, 'flow_air');
  const fricUnitHook = useUnitValue(0, 'friction');
  const velUnitHook = useUnitValue(0, 'velocity_air');

  useEffect(() => {
    scrollWorkspaceToTop();
  }, []);
  const lenUnitHook = useUnitValue(0, 'length');
  const { t } = useLanguage();
  // Inputs
  const [airflow, setAirflow] = useState<number>(2500); // CFM
  const [frictionRate, setFrictionRate] = useState<number>(0.1); // in. wg/100 ft
  const [velocityLimit, setVelocityLimit] = useState<number>(1200); // FPM
  const [sizingMode, setSizingMode] = useState<'equal-friction' | 'static-pressure'>('equal-friction');
  const [ductType, setDuctType] = useState<'supply' | 'return' | 'exhaust'>('supply');
  const [ductHeight, setDuctHeight] = useState<number>(12); // inches (default fixed height)

  // Splitting Engine
  const [enableSplitting, setEnableSplitting] = useState<boolean>(true);
  const [numBranches, setNumBranches] = useState<number>(3);
  const [branchPercentages, setBranchPercentages] = useState<number[]>([40, 35, 25]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Applied states (decoupled for manual calculation)
  const [appliedAirflow, setAppliedAirflow] = useState<number>(2500);
  const [appliedFrictionRate, setAppliedFrictionRate] = useState<number>(0.1);
  const [appliedVelocityLimit, setAppliedVelocityLimit] = useState<number>(1200);
  const [appliedDuctType, setAppliedDuctType] = useState<'supply' | 'return' | 'exhaust'>('supply');
  const [appliedDuctHeight, setAppliedDuctHeight] = useState<number>(12);
  const [appliedEnableSplitting, setAppliedEnableSplitting] = useState<boolean>(true);
  const [appliedNumBranches, setAppliedNumBranches] = useState<number>(3);
  const [appliedBranchPercentages, setAppliedBranchPercentages] = useState<number[]>([40, 35, 25]);

  // Sync state automatically when autoCalculate is true
  useEffect(() => {
    if (autoCalculate) {
      setAppliedAirflow(airflow);
      setAppliedFrictionRate(frictionRate);
      setAppliedVelocityLimit(velocityLimit);
    setAppliedDuctType(ductType);
      setAppliedDuctHeight(ductHeight);
      setAppliedEnableSplitting(enableSplitting);
      setAppliedNumBranches(numBranches);
      setAppliedBranchPercentages(branchPercentages);
    }
  }, [
    autoCalculate,
    airflow,
    frictionRate,
    velocityLimit,
    ductHeight,
    enableSplitting,
    numBranches,
    branchPercentages
  ]);

  // Auto-adjust percentages when number of branches changes
  useEffect(() => {
    if (numBranches === 2) {
      setBranchPercentages([60, 40]);
    } else if (numBranches === 3) {
      setBranchPercentages([40, 35, 25]);
    } else if (numBranches === 4) {
      setBranchPercentages([35, 25, 22, 18]);
    } else if (numBranches === 5) {
      setBranchPercentages([30, 25, 20, 15, 10]);
    } else if (numBranches === 6) {
      setBranchPercentages([25, 20, 18, 15, 12, 10]);
    } else if (numBranches === 7) {
      setBranchPercentages([22, 18, 16, 14, 12, 10, 8]);
    } else if (numBranches === 8) {
      setBranchPercentages([20, 16, 14, 13, 11, 10, 9, 7]);
    }
  }, [numBranches]);

  // Handle manual ratio adjustment
  const handlePercentChange = (index: number, val: number) => {
    const updated = [...branchPercentages];
    updated[index] = val;

    // Normalize others so they sum to 100 or keep it simple
    // Let's compute sum of all except this one
    const otherSum = updated.reduce((acc, curr, idx) => idx === index ? acc : acc + curr, 0);
    const targetOtherSum = 100 - val;

    if (otherSum > 0) {
      const factor = targetOtherSum / otherSum;
      for (let i = 0; i < updated.length; i++) {
        if (i !== index) {
          updated[i] = Math.round(updated[i] * factor * 10) / 10;
        }
      }
    } else {
      // fallback even split
      const remainCount = updated.length - 1;
      const valEach = remainCount > 0 ? (100 - val) / remainCount : 0;
      for (let i = 0; i < updated.length; i++) {
        if (i !== index) updated[i] = valEach;
      }
    }

    // Set updated percentages
    setBranchPercentages(updated);
  };

  // ASHRAE Formula solvers
  // 1. Calculate Equivalent Round Duct Diameter De (inches) using Equal Friction
  // De = ((0.10913 * Q^1.9) / F)^(1 / 5.02)
  const calculateDe = (cfm: number, friction: number): number => {
    if (cfm <= 0 || friction <= 0) return 0;
    try {
      const de = Math.pow((0.10913 * Math.pow(cfm, 1.9)) / friction, 1 / 5.02);
      return Number.isNaN(de) ? 0 : de;
    } catch {
      return 0;
    }
  };

  // 2. Huebscher's formula solver for rectangular duct width W given De and H:
  // De = 1.30 * ((W * H)^0.625) / ((W + H)^0.25)
  // We use binary search to solve for W given H and De
  const solveWidth = (deTarget: number, height: number): number => {
    if (deTarget <= 0 || height <= 0) return 0;
    let low = 1;
    let high = 300; // max width 300 inches
    let width = (low + high) / 2;

    for (let i = 0; i < 25; i++) {
      // Huebscher's formula
      const deCalc = 1.30 * Math.pow(width * height, 0.625) / Math.pow(width + height, 0.25);
      if (deCalc < deTarget) {
        low = width;
      } else {
        high = width;
      }
      width = (low + high) / 2;
    }
    // Round to nearest whole inch or half inch for trade standard sizes
    return Math.ceil(width);
  };

  // Calculate velocity: V = Q / A
  // For round duct: V = (Q * 144) / (pi * r^2) = Q * 576 / (pi * De^2)
  const calculateVelocityRound = (cfm: number, de: number): number => {
    if (de <= 0) return 0;
    return (cfm * 576) / (Math.PI * de * de);
  };

  // For rectangular duct: V = (Q * 144) / (W * H)
  const calculateVelocityRect = (cfm: number, w: number, h: number): number => {
    if (w <= 0 || h <= 0) return 0;
    return (cfm * 144) / (w * h);
  };

  // Determine status based on velocity limit
  const getVelocityStatus = (velocity: number): 'optimal' | 'warning' | 'danger' => {
    if (appliedAirflow <= 0 || appliedDuctHeight <= 0) return 'danger';
    if (velocity <= 0) return 'danger';
    if (velocity <= appliedVelocityLimit) return 'optimal';
    if (velocity <= appliedVelocityLimit * 1.2) return 'warning';
    return 'danger';
  };

  // Calculate results for MAIN duct
  const deMain = calculateDe(appliedAirflow, appliedFrictionRate);
  const widthMain = solveWidth(deMain, appliedDuctHeight);
  const velRoundMain = calculateVelocityRound(appliedAirflow, deMain);
  const velRectMain = calculateVelocityRect(appliedAirflow, widthMain, appliedDuctHeight);
  const statusMain = getVelocityStatus(velRectMain);
  const aspectRatioMain = appliedDuctHeight > 0 && widthMain > 0 ? (widthMain / appliedDuctHeight) : 0;
  const isAppliedWidthOversized = appliedAirflow > 0 && widthMain > 96;
  const isAppliedAspectOversized = appliedAirflow > 0 && aspectRatioMain > 4.0;
  const isAppliedDuctOversized = isAppliedWidthOversized || isAppliedAspectOversized;

  // Live calculations for current user inputs before or during calculation
  const liveDe = calculateDe(airflow > 0 ? airflow : 0, frictionRate > 0 ? frictionRate : 0.1);
  const liveWidth = solveWidth(liveDe, ductHeight > 0 ? ductHeight : 12);
  const liveAspectRatio = ductHeight > 0 && liveWidth > 0 ? (liveWidth / ductHeight) : 0;
  const isLiveWidthOversized = airflow > 0 && liveWidth > 96;
  const isLiveAspectOversized = airflow > 0 && liveAspectRatio > 4.0;
  const isLiveDuctOversized = isLiveWidthOversized || isLiveAspectOversized;

  // Calculate results for BRANCHES
  const branches: BranchResult[] = appliedBranchPercentages.map((pct, idx) => {
    const branchCfm = (appliedAirflow * pct) / 100;
    const de = calculateDe(branchCfm, appliedFrictionRate);

    // Height for branches matches main duct height for consistent drop-ceiling depth
    const width = solveWidth(de, appliedDuctHeight);
    const velocityRound = calculateVelocityRound(branchCfm, de);
    const velocityRect = calculateVelocityRect(branchCfm, width, appliedDuctHeight);
    const status = getVelocityStatus(velocityRect);

    return {
      id: idx + 1,
      cfm: branchCfm,
      pct,
      de,
      width,
      height: appliedDuctHeight,
      velocityRound,
      velocityRect,
      status
    };
  });

  // Actions
  const handleCopy = () => {
    let text = `CKY_MEPF - HVAC DUCT SIZING REPORT (Equal Friction Method)\n`;
    text += `=========================================================\n`;
    text += `DESIGN PARAMETERS:\n`;
    text += `- Main Airflow: ${airflow} CFM\n`;
    text += `- Design Friction Rate: ${frictionRate} in. wg/100 ft\n`;
    text += `- Velocity Limit: ${velocityLimit} FPM\n`;
    text += `- Assigned Duct Height: ${ductHeight} in\n\n`;
    text += `MAIN DUCT RESULTS:\n`;
    text += `- Equivalent Round Diameter: ${(lenUnitHook.getDisplayValue(deMain) || 0).toFixed(1)} in (${Math.round(deMain * 25.4)} mm)\n`;
    text += `- Rectangular Sizing: ${widthMain}" x ${ductHeight}" (${Math.round(widthMain * 25.4)} x ${Math.round(ductHeight * 25.4)} mm)\n`;
    text += `- Rectangular Velocity: ${(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)} FPM (Status: ${statusMain.toUpperCase()})\n\n`;

    if (enableSplitting) {
      text += `BRANCH DUCT RESULTS:\n`;
      branches.forEach(b => {
        text += `- Branch #${b.id} (${b.pct}%): ${(airflowUnitHook.getDisplayValue(b.cfm) || 0).toFixed(0)} CFM\n`;
        text += `  * Eq. Round Dia: ${(lenUnitHook.getDisplayValue(b.de) || 0).toFixed(1)} in\n`;
        text += `  * Rect Size: ${b.width}" x ${b.height}"\n`;
        text += `  * Velocity: ${(velUnitHook.getDisplayValue(b.velocityRect) || 0).toFixed(0)} FPM\n`;
      });
    }

    navigator.clipboard.writeText(text);
    triggerToast('Data Copied to Clipboard!');
  };

  const handleExportBOQ = () => {
    exportDuctSizingToCsv({
      airflow: appliedAirflow,
      frictionRate: appliedFrictionRate,
      velocityLimit: appliedVelocityLimit,
      ductHeight: appliedDuctHeight,
      widthMain,
      deMain,
      velRoundMain,
      velRectMain,
      branches: branches.map(b => ({
        id: b.id,
        pct: b.pct,
        cfm: b.cfm,
        de: b.de,
        width: b.width,
        velocityRound: b.velocityRound,
        velocityRect: b.velocityRect
      }))
    });
    triggerToast('MEPF Duct Sizing Exported successfully!');
  };

  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (restoredParams && restoredParams.tab === 'mechanical' && restoredParams.subType === 'ductSizing' && restoredParams.id !== loadedHistoryId) {
      setLoadedHistoryId(restoredParams.id);
      const p = restoredParams.parameters;
      if (p) {
        if (typeof p.airflow === 'number') { setAirflow(p.airflow); setAppliedAirflow(p.airflow); }
        if (typeof p.frictionRate === 'number') { setFrictionRate(p.frictionRate); setAppliedFrictionRate(p.frictionRate); }
        if (typeof p.velocityLimit === 'number') { setVelocityLimit(p.velocityLimit); setAppliedVelocityLimit(p.velocityLimit); }
        if (typeof p.ductType === 'string') { setDuctType(p.ductType as any); setAppliedDuctType(p.ductType as any); }
        if (typeof p.ductHeight === 'number') { setDuctHeight(p.ductHeight); setAppliedDuctHeight(p.ductHeight); }
        if (typeof p.enableSplitting === 'boolean') { setEnableSplitting(p.enableSplitting); setAppliedEnableSplitting(p.enableSplitting); }
        if (typeof p.numBranches === 'number') { setNumBranches(p.numBranches); setAppliedNumBranches(p.numBranches); }
        if (Array.isArray(p.branchPercentages)) { setBranchPercentages(p.branchPercentages); setAppliedBranchPercentages(p.branchPercentages); }
        triggerToast('Duct sizing parameters loaded!');
      }
    }
  }, [restoredParams, loadedHistoryId]);

  const hasPendingChanges = !autoCalculate && (
    airflow !== appliedAirflow ||
    frictionRate !== appliedFrictionRate ||
    velocityLimit !== appliedVelocityLimit ||
    ductType !== appliedDuctType ||
    ductHeight !== appliedDuctHeight ||
    enableSplitting !== appliedEnableSplitting ||
    numBranches !== appliedNumBranches ||
    JSON.stringify(branchPercentages) !== JSON.stringify(appliedBranchPercentages)
  );

  const handleApplyCalculations = () => {
    setAppliedAirflow(airflow);
    setAppliedFrictionRate(frictionRate);
    setAppliedVelocityLimit(velocityLimit);
    setAppliedDuctType(ductType);
    setAppliedDuctHeight(ductHeight);
    setAppliedEnableSplitting(enableSplitting);
    setAppliedNumBranches(numBranches);
    setAppliedBranchPercentages(branchPercentages);
    triggerToast('Calculations updated!');
  };

  const handleSave = () => {
    if (onSaveCalculation) {
      onSaveCalculation({
        tab: 'mechanical',
        subType: 'ductSizing',
        title: `Duct Sizing (${airflow} CFM)`,
        summary: `${airflow} CFM | ${widthMain}"x${ductHeight}" | ${(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)} FPM`,
        parameters: {
          airflow,
          frictionRate,
          velocityLimit,
          ductType,
          ductHeight,
          enableSplitting,
          numBranches,
          branchPercentages
        }
      });
      triggerToast('Saved to Recent Calculations!');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  // Validation Engine
  const validations: ValidationItem[] = [];
  if (appliedAirflow < 0) {
    validations.push({
      id: 'airflow-neg',
      severity: 'error',
      message: `Main airflow is negative (${appliedAirflow} CFM). Duct design requires positive air volume.`,
    });
  } else if (appliedAirflow === 0) {
    validations.push({
      id: 'airflow-zero',
      severity: 'error',
      message: 'Main airflow is zero. Please enter a positive airflow rate (standard range: 100 to 50,000 CFM).',
    });
  } else if (appliedAirflow < 100 || appliedAirflow > 50000) {
    validations.push({
      id: 'airflow-bounds',
      severity: 'warning',
      message: `Main airflow (${appliedAirflow.toLocaleString()} CFM) is outside typical standard commercial single-duct envelope (100 to 50,000 CFM).`,
    });
  }

  if (appliedDuctHeight <= 0) {
    validations.push({
      id: 'height-invalid',
      severity: 'error',
      message: 'Assigned duct height must be greater than zero.',
    });
  } else if (appliedDuctHeight < 4 || appliedDuctHeight > 60) {
    validations.push({
      id: 'height-bounds',
      severity: 'error',
      message: `Assigned duct height (${appliedDuctHeight}") is outside standard commercial sheet metal range (4" to 60").`,
    });
  }

  if (isAppliedDuctOversized) {
    validations.push({
      id: 'duct-oversized',
      severity: 'error',
      message: `Oversized duct error: Calculated width (${widthMain}") ${widthMain > 96 ? 'exceeds 96" maximum standard sheet metal fabrication limit' : ''}${widthMain > 96 && aspectRatioMain > 4.0 ? ' and ' : ''}${aspectRatioMain > 4.0 ? `aspect ratio (${aspectRatioMain.toFixed(1)}:1) exceeds SMACNA 4:1 standard limit` : ''}. Increase duct height or split airflow into parallel branches.`,
    });
  }

  if (appliedFrictionRate <= 0 || appliedFrictionRate > 1.5) {
    validations.push({
      id: 'fric-bounds',
      severity: 'error',
      message: `Friction rate (${appliedFrictionRate} in.wg/100ft) is outside absolute calculation limits (0.01 to 1.5 in. wg/100 ft).`,
    });
  } else if (appliedFrictionRate > 0.15) {
    validations.push({
      id: 'fric-high',
      severity: 'warning',
      message: `Friction rate (${appliedFrictionRate} in.wg/100ft) is above the typical maximum for commercial systems (0.15). This may cause high energy consumption and noise.`,
    });
  }

  if (appliedVelocityLimit <= 0 || appliedVelocityLimit < 400 || appliedVelocityLimit > 6000) {
    validations.push({
      id: 'vel-limit-bounds',
      severity: 'error',
      message: `Velocity limit (${appliedVelocityLimit} FPM) is outside absolute calculation limits (400 to 6,000 FPM).`,
    });
  }

  if (velRectMain > appliedVelocityLimit && appliedAirflow > 0) {
    validations.push({
      id: 'vel-main',
      severity: 'error',
      message: `Main duct velocity (${Math.round(velRectMain)} FPM) exceeds the design limit (${appliedVelocityLimit} FPM). Increase duct size or reduce airflow.`,
    });
  }
  if (enableSplitting) {
    const highVelBranches = branches.filter(b => b.status === 'danger');
    if (highVelBranches.length > 0) {
       validations.push({
         id: 'vel-branch-danger',
         severity: 'error',
         message: `${highVelBranches.length} branch(es) exceed the velocity limit.`,
       });
    }
    const warnVelBranches = branches.filter(b => b.status === 'warning');
    if (warnVelBranches.length > 0) {
       validations.push({
         id: 'vel-branch-warning',
         severity: 'warning',
         message: `${warnVelBranches.length} branch(es) are nearing the velocity limit.`,
       });
    }
  }

  // Preset heights standard in duct manufacturing
  const standardHeights = [8, 10, 12, 14, 16, 18, 20, 24];

  return (
    <div className="space-y-8 text-slate-100">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg shadow-xl shadow-emerald-950/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header section with Emerald accent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">HVAC Duct Sizing & Splitting Engine</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Equal Friction Method solver with recursive multi-branch air flow splitting.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="export-duct-sizing-header-csv-btn"
            type="button"
            onClick={handleExportBOQ}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors shadow-sm"
            title="Download current duct sizing input parameters, main trunk dimensions, and branch schedule to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 rounded-full font-mono">
            <Wind className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>ASHRAE Standard Air Flow Dynamics</span>
          </div>
        </div>
      </div>

      {/* Main Grid split layout */}
      <div className="flex flex-col gap-8">

        {/* Left Side: Frosted glass controls */}
        <div className="w-full space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden border border-slate-800">

            {/* Subtle neon glowing accent corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center space-x-2 mb-6">
              <Sliders className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-300 tracking-wider uppercase">System Parameters</h3>
            </div>

            {(() => {
              // Engineering Threshold Validations for UI Visual Error States
              // 1. Airflow (Q)
              const isAirflowNegative = airflow < 0;
              const isAirflowZero = airflow === 0 || isNaN(airflow);
              const isAirflowExtreme = airflow > 100000;
              const isAirflowDuctOversized = airflow > 0 && isLiveDuctOversized;
              const isAirflowError = isAirflowNegative || isAirflowZero || isAirflowExtreme || isAirflowDuctOversized;
              const isAirflowWarning = !isAirflowError && (airflow < 100 || airflow > 50000);

              let airflowAlert: { type: 'error' | 'warning'; message: string } | null = null;
              if (isAirflowNegative) {
                airflowAlert = {
                  type: 'error',
                  message: `Engineering Error: Negative airflow (${airflow} ${flowUnit}) is invalid. Ductwork requires positive airflow volume.`
                };
              } else if (isAirflowZero) {
                airflowAlert = {
                  type: 'error',
                  message: `Engineering Error: Airflow cannot be zero. Enter positive airflow (standard range: 100 to 50,000 ${flowUnit}).`
                };
              } else if (isAirflowExtreme) {
                airflowAlert = {
                  type: 'error',
                  message: `Engineering Error: Airflow (${(airflowUnitHook.getDisplayValue(airflow) || 0).toLocaleString()} ${flowUnit}) exceeds practical single-duct capacity (100,000 ${flowUnit}). Split into primary headers or risers.`
                };
              } else if (isAirflowDuctOversized) {
                airflowAlert = {
                  type: 'error',
                  message: isLiveWidthOversized
                    ? `Oversized Duct Error: Airflow of ${(airflowUnitHook.getDisplayValue(airflow) || 0).toLocaleString()} ${flowUnit} produces duct width (${liveWidth}" / ${Math.round(liveWidth * 25.4)} mm) exceeding 96" (2,400 mm) standard fabrication threshold (Aspect ratio ${liveAspectRatio.toFixed(1)}:1). Reduce airflow, increase duct height, or enable branch splitting.`
                    : `Oversized Duct Error: Airflow of ${(airflowUnitHook.getDisplayValue(airflow) || 0).toLocaleString()} ${flowUnit} produces aspect ratio (${liveAspectRatio.toFixed(1)}:1) exceeding SMACNA 4:1 standard limit (resulting size: ${liveWidth}" x ${ductHeight}"). Reduce airflow, increase duct height, or enable branch splitting.`
                };
              } else if (airflow < 100) {
                airflowAlert = {
                  type: 'warning',
                  message: `Engineering Warning: Airflow (${airflow} ${flowUnit}) is below typical standard commercial HVAC range (min 100 ${flowUnit}).`
                };
              } else if (airflow > 50000) {
                airflowAlert = {
                  type: 'warning',
                  message: `Engineering Warning: Airflow (${(airflowUnitHook.getDisplayValue(airflow) || 0).toLocaleString()} ${flowUnit}) exceeds standard single-duct envelope (max 50,000 ${flowUnit}). Consider dual risers or parallel mains.`
                };
              }

              // 2. Friction Loss Rate (F)
              const isFrictionNegative = frictionRate <= 0 || isNaN(frictionRate);
              const isFrictionOutOfBounds = frictionRate > 0 && (frictionRate < 0.01 || frictionRate > 1.5);
              const isFrictionError = isFrictionNegative || isFrictionOutOfBounds;
              const isFrictionWarning = !isFrictionError && (frictionRate < 0.05 || frictionRate > 0.15);

              let frictionAlert: { type: 'error' | 'warning'; message: string } | null = null;
              if (isFrictionNegative) {
                frictionAlert = {
                  type: 'error',
                  message: 'Engineering Error: Friction loss rate must be greater than 0.'
                };
              } else if (isFrictionOutOfBounds) {
                frictionAlert = {
                  type: 'error',
                  message: 'Engineering Error: Friction rate outside calculation limits: 0.01 to 1.5 in. wg/100 ft (0.08 to 12 Pa/m).'
                };
              } else if (isFrictionWarning) {
                frictionAlert = {
                  type: 'warning',
                  message: `Typical standard design range is 0.05 - 0.15 in. wg/100 ft. ${
                    frictionRate > 0.15
                      ? 'Higher rates increase fan energy and aerodynamic noise.'
                      : 'Lower rates (< 0.05) result in economically oversized ducts.'
                  }`
                };
              }

              // 3. Velocity Limit (V)
              const isVelocityNegative = velocityLimit <= 0 || isNaN(velocityLimit);
              const isVelocityOutOfBounds = velocityLimit > 0 && (velocityLimit < 400 || velocityLimit > 6000);
              const isVelocityError = isVelocityNegative || isVelocityOutOfBounds;
              const isVelocityWarning = !isVelocityError && (velocityLimit < 500 || velocityLimit > 2500);

              let velocityAlert: { type: 'error' | 'warning'; message: string } | null = null;
              if (isVelocityNegative) {
                velocityAlert = {
                  type: 'error',
                  message: 'Engineering Error: Velocity limit must be greater than 0 FPM.'
                };
              } else if (isVelocityOutOfBounds) {
                velocityAlert = {
                  type: 'error',
                  message: 'Engineering Error: Velocity limit outside calculation limits: 400 to 6,000 FPM (2 to 30 m/s).'
                };
              } else if (isVelocityWarning) {
                velocityAlert = {
                  type: 'warning',
                  message: `Typical standard design range is 500 - 2,500 FPM. ${
                    velocityLimit > 2500
                      ? 'Velocities above 2,500 FPM cause severe acoustic noise and NC rating failure.'
                      : 'Velocities below 500 FPM result in economically oversized ducts.'
                  }`
                };
              }

              // 4. Assigned Duct Height (H) & Oversized Ducts
              const isHeightNegative = ductHeight <= 0 || isNaN(ductHeight);
              const isHeightBelowMin = ductHeight > 0 && ductHeight < 4;
              const isHeightAboveMax = ductHeight > 60;
              const isHeightBoundsError = isHeightNegative || isHeightBelowMin || isHeightAboveMax;
              const isHeightDuctOversized = ductHeight > 0 && isLiveDuctOversized;
              const isHeightError = isHeightBoundsError || isHeightDuctOversized;
              const isHeightWarning = !isHeightError && (ductHeight < 6 || ductHeight > 36);

              let heightAlert: { type: 'error' | 'warning'; message: string } | null = null;
              if (isHeightNegative) {
                heightAlert = {
                  type: 'error',
                  message: 'Engineering Error: Duct height must be greater than 0 inches.'
                };
              } else if (isHeightBelowMin) {
                heightAlert = {
                  type: 'error',
                  message: 'Engineering Error: Duct height is below minimum fabrication depth of 4 inches (100 mm).'
                };
              } else if (isHeightAboveMax) {
                heightAlert = {
                  type: 'error',
                  message: 'Engineering Error: Duct height exceeds 60 inches (1,500 mm) maximum commercial depth limit.'
                };
              } else if (isLiveWidthOversized) {
                heightAlert = {
                  type: 'error',
                  message: `Oversized Duct Error: Resulting width (${liveWidth}" / ${Math.round(liveWidth * 25.4)} mm) exceeds 96" (2,400 mm) standard fabrication threshold (Aspect ratio ${liveAspectRatio.toFixed(1)}:1). Increase duct height or split airflow into parallel branches.`
                };
              } else if (isLiveAspectOversized) {
                heightAlert = {
                  type: 'error',
                  message: `Oversized Duct Error: Aspect ratio (${liveAspectRatio.toFixed(1)}:1) exceeds SMACNA 4:1 standard limit (resulting size: ${liveWidth}" x ${ductHeight}"). Increase duct height to eliminate air turbulence and wall fluttering.`
                };
              } else if (isHeightWarning) {
                heightAlert = {
                  type: 'warning',
                  message: `Engineering Warning: Duct height (${ductHeight}") is outside typical commercial range (6" to 36"). Unusual depths may require custom fabrication.`
                };
              }

              return (
                <>
                  {/* Parameter 1: Airflow */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center text-xs">
                      <TooltipLabel label="Main Airflow (Q)" tooltip={t("mainAirflowTooltip")} className="text-slate-400 font-medium" />
                      <div className="flex items-center space-x-1.5">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={airflow === 0 ? '' : airflow}
                            placeholder="0"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || v === '-') {
                                setAirflow(0);
                              } else {
                                const num = Number(v);
                                setAirflow(isNaN(num) ? 0 : airflowUnitHook.getInternalValue(num));
                              }
                            }}
                            className={`w-24 text-center font-mono text-xs rounded py-1 px-2 pr-6 focus:outline-none transition-all bg-slate-950 border ${
                              isAirflowError
                                ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500 focus:ring-red-500/50'
                                : isAirflowWarning
                                ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 ring-1 ring-amber-500/20 focus:border-amber-500 focus:ring-amber-500/40'
                                : 'text-emerald-400 border-slate-800 focus:border-emerald-500'
                            }`}
                          />
                          <div className="absolute right-1.5 pointer-events-none">
                            {isAirflowError ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            ) : isAirflowWarning ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{flowUnit}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="15000"
                      step="50"
                      value={Math.max(200, Math.min(15000, airflowUnitHook.getDisplayValue(airflow) || 200))}
                      onChange={(e) => setAirflow(airflowUnitHook.getInternalValue(Number(e.target.value)))}
                      className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-colors ${
                        isAirflowError ? 'accent-red-500' : isAirflowWarning ? 'accent-amber-500' : 'accent-emerald-500'
                      }`}
                    />
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                      <span>200 CFM</span>
                      <span>7,500 CFM</span>
                      <span>15,000 CFM</span>
                    </div>
                    {airflowAlert && (
                      <InputAlert type={airflowAlert.type} message={airflowAlert.message} />
                    )}
                  </div>

                  {/* Parameter 2: Friction rate */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center text-xs">
                      <TooltipLabel label="Friction Loss Rate (F)" tooltip={t("frictionLossTooltip")} className="text-slate-400 font-medium" />
                      <div className="flex items-center space-x-1.5">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            value={frictionRate || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || v === '-') {
                                setFrictionRate(0);
                              } else {
                                const num = Number(v);
                                setFrictionRate(isNaN(num) ? 0 : fricUnitHook.getInternalValue(num));
                              }
                            }}
                            className={`w-24 text-center font-mono text-xs rounded py-1 px-2 pr-6 focus:outline-none transition-all bg-slate-950 border ${
                              isFrictionError
                                ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500 focus:ring-red-500/50'
                                : isFrictionWarning
                                ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 ring-1 ring-amber-500/20 focus:border-amber-500 focus:ring-amber-500/40'
                                : 'text-emerald-400 border-slate-800 focus:border-emerald-500'
                            }`}
                          />
                          <div className="absolute right-1.5 pointer-events-none">
                            {isFrictionError ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            ) : isFrictionWarning ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">in/100ft</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.40"
                      step="0.01"
                      value={Math.max(0.04, Math.min(0.40, frictionRate || 0.04))}
                      onChange={(e) => setFrictionRate(fricUnitHook.getInternalValue(Number(e.target.value)))}
                      className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-colors ${
                        isFrictionError ? 'accent-red-500' : isFrictionWarning ? 'accent-amber-500' : 'accent-emerald-500'
                      }`}
                    />
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                      <span>0.04 (Low Noise)</span>
                      <span>0.10 (Standard)</span>
                      <span>0.40 (High Velocity)</span>
                    </div>
                    {frictionAlert && (
                      <InputAlert type={frictionAlert.type} message={frictionAlert.message} />
                    )}
                  </div>

                  {/* Parameter 3: Duct Type & Velocity Limit */}
                  <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <div><TooltipLabel label="System / Duct Type" tooltip={t("ductTypeTooltip")} className="text-xs text-slate-400 font-medium mb-1" />
                        <span className="text-xs text-slate-500 font-normal">For reference guidelines</span></div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDuctType('supply')}
                          className={`flex-1 text-[11px] py-1.5 rounded font-mono border transition-all ${
                            ductType === 'supply'
                              ? 'bg-sky-950/50 border-sky-500/50 text-sky-300'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          Supply
                        </button>
                        <button
                          onClick={() => setDuctType('return')}
                          className={`flex-1 text-[11px] py-1.5 rounded font-mono border transition-all ${
                            ductType === 'return'
                              ? 'bg-purple-950/50 border-purple-500/50 text-purple-300'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          Return
                        </button>
                        <button
                          onClick={() => setDuctType('exhaust')}
                          className={`flex-1 text-[11px] py-1.5 rounded font-mono border transition-all ${
                            ductType === 'exhaust'
                              ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          Exhaust
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <TooltipLabel label="Max Velocity Limit" tooltip={ductType === 'supply' ? t("maxVelSupply") : ductType === 'return' ? t("maxVelReturn") : t("maxVelExhaust")} className="text-slate-400 font-medium" />
                        <div className="flex items-center space-x-1.5">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              value={velocityLimit || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || v === '-') {
                                  setVelocityLimit(0);
                                } else {
                                  const num = Number(v);
                                  setVelocityLimit(isNaN(num) ? 0 : velUnitHook.getInternalValue(num));
                                }
                              }}
                              className={`w-24 text-center font-mono text-xs rounded py-1 px-2 pr-6 focus:outline-none transition-all bg-slate-950 border ${
                                isVelocityError
                                  ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500 focus:ring-red-500/50'
                                  : isVelocityWarning
                                  ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 ring-1 ring-amber-500/20 focus:border-amber-500 focus:ring-amber-500/40'
                                  : 'text-emerald-400 border-slate-800 focus:border-emerald-500'
                              }`}
                            />
                            <div className="absolute right-1.5 pointer-events-none">
                              {isVelocityError ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                              ) : isVelocityWarning ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              ) : null}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{velUnit}</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="600"
                        max="2500"
                        step="50"
                        value={Math.max(600, Math.min(2500, velocityLimit || 600))}
                        onChange={(e) => setVelocityLimit(velUnitHook.getInternalValue(Number(e.target.value)))}
                        className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-colors ${
                          isVelocityError ? 'accent-red-500' : isVelocityWarning ? 'accent-amber-500' : 'accent-emerald-500'
                        }`}
                      />
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>600 (Quiet)</span>
                        <span>1,200 (Office)</span>
                        <span>2,500 (Ind.)</span>
                      </div>
                      {velocityAlert && (
                        <InputAlert type={velocityAlert.type} message={velocityAlert.message} />
                      )}
                    </div>

                    {/* Interactive Reference Table */}
                    <div className="bg-slate-950/40 rounded-lg border border-slate-800/80 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-800/80 flex items-center">
                        <Info className="w-3 h-3 text-slate-400 mr-1.5" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Velocity Guidelines</span>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800/50 text-slate-500">
                              <th className="px-3 py-1.5 font-medium">Application</th>
                              <th className="px-3 py-1.5 font-medium text-right">Main Duct</th>
                              <th className="px-3 py-1.5 font-medium text-right">Branch</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            <tr className={`transition-colors cursor-pointer hover:bg-slate-800/30 ${ductType === 'supply' ? 'bg-sky-950/30 text-sky-200' : 'text-slate-400'}`} onClick={() => setDuctType('supply')}>
                              <td className="px-3 py-2 flex items-center">
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ductType === 'supply' ? 'bg-sky-500' : 'bg-transparent'}`}></div>
                                Supply Air
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(1000) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(2000) || 0).toFixed(0)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(600) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(1200) || 0).toFixed(0)}
                              </td>
                            </tr>
                            <tr className={`transition-colors cursor-pointer hover:bg-slate-800/30 ${ductType === 'return' ? 'bg-purple-950/30 text-purple-200' : 'text-slate-400'}`} onClick={() => setDuctType('return')}>
                              <td className="px-3 py-2 flex items-center">
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ductType === 'return' ? 'bg-purple-500' : 'bg-transparent'}`}></div>
                                Return Air
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(800) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(1500) || 0).toFixed(0)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(400) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(1000) || 0).toFixed(0)}
                              </td>
                            </tr>
                            <tr className={`transition-colors cursor-pointer hover:bg-slate-800/30 ${ductType === 'exhaust' ? 'bg-amber-950/30 text-amber-200' : 'text-slate-400'}`} onClick={() => setDuctType('exhaust')}>
                              <td className="px-3 py-2 flex items-center">
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ductType === 'exhaust' ? 'bg-amber-500' : 'bg-transparent'}`}></div>
                                General Exhaust
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(1500) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(2000) || 0).toFixed(0)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(velUnitHook.getDisplayValue(1000) || 0).toFixed(0)} - {(velUnitHook.getDisplayValue(1500) || 0).toFixed(0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="px-3 py-1.5 bg-slate-900/30 text-xs text-slate-500 flex justify-between border-t border-slate-800/50">
                          <span>* Values in {velUnit}. Varies by noise constraint.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parameter 4: Assigned Height */}
                  <div className="space-y-3 mb-6 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                      <TooltipLabel label="Assigned Duct Height (H)" tooltip={t("ductHeightTooltip")} className="text-xs text-slate-400 font-medium" />
                      <div className="flex items-center space-x-1.5">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={ductHeight === 0 ? '' : ductHeight}
                            placeholder="0"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || v === '-') {
                                setDuctHeight(0);
                              } else {
                                const num = Number(v);
                                setDuctHeight(isNaN(num) ? 0 : lenUnitHook.getInternalValue(num));
                              }
                            }}
                            className={`w-20 text-center font-mono text-xs rounded py-1 px-2 pr-6 focus:outline-none transition-all bg-slate-950 border ${
                              isHeightError
                                ? 'border-red-500 bg-red-950/30 text-red-400 ring-1 ring-red-500/30 focus:border-red-500 focus:ring-red-500/50'
                                : isHeightWarning
                                ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 ring-1 ring-amber-500/20 focus:border-amber-500 focus:ring-amber-500/40'
                                : 'text-emerald-400 border-slate-800 focus:border-emerald-500'
                            }`}
                          />
                          <div className="absolute right-1.5 pointer-events-none">
                            {isHeightError ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            ) : isHeightWarning ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">IN</span>
                      </div>
                    </div>

                    {heightAlert && (
                      <InputAlert type={heightAlert.type} message={heightAlert.message} />
                    )}

                    {/* standard height shortcuts */}
                    <div className="flex flex-wrap gap-1.5">
                      {standardHeights.map((h) => {
                        const presetWidth = solveWidth(liveDe, h);
                        const presetAspect = h > 0 && presetWidth > 0 ? (presetWidth / h) : 0;
                        const isPresetOversized = airflow > 0 && (presetWidth > 96 || presetAspect > 4.0);

                        return (
                          <button
                            key={h}
                            onClick={() => setDuctHeight(h)}
                            title={isPresetOversized ? `Width ${presetWidth.toFixed(0)}" exceeds 96" or 4:1 aspect ratio at current airflow` : undefined}
                            className={`text-xs px-2 py-1 rounded font-mono border transition-all relative ${
                              ductHeight === h
                                ? isHeightError
                                  ? 'bg-red-950/60 border-red-500/80 text-red-300 shadow-sm ring-1 ring-red-500/40'
                                  : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                                : isPresetOversized
                                ? 'bg-slate-950/40 border-red-900/40 text-red-400/80 hover:border-red-700/60 hover:text-red-300'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {h}"
                            {isPresetOversized && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 mb-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Custom Toggle: Enable Splitting Engine */}
            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-850">
              <div className="flex items-center space-x-2.5">
                <Layers className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="block text-xs font-semibold text-slate-200">Branch Splitting Engine</span>
                  <span className="block text-xs text-slate-500">Solve downstream branch sizes</span>
                </div>
              </div>
              <button
                onClick={() => setEnableSplitting(!enableSplitting)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enableSplitting ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${enableSplitting ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Splitting engine custom proportions panel */}
            {enableSplitting && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Number of Branches</span>
                  <div className="flex items-center bg-slate-950 border border-slate-850 rounded-lg overflow-hidden p-0.5 shadow-inner gap-0.5">
                    {[2, 3, 4, 5, 6, 7, 8].map(num => (
                      <button
                        key={num}
                        onClick={() => setNumBranches(num)}
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-mono rounded transition-all duration-200 cursor-pointer ${numBranches === num
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Adjust Split Proportions</span>
                  {branchPercentages.map((pct, idx) => {
                    const branchCfm = (airflow * pct) / 100;
                    const branchDe = calculateDe(branchCfm > 0 ? branchCfm : 0, frictionRate > 0 ? frictionRate : 0.1);
                    const branchW = solveWidth(branchDe, ductHeight > 0 ? ductHeight : 12);
                    const branchAspect = ductHeight > 0 && branchW > 0 ? (branchW / ductHeight) : 0;
                    const isBranchWidthOversized = branchCfm > 0 && branchW > 96;
                    const isBranchAspectOversized = branchCfm > 0 && branchAspect > 4.0;
                    const isBranchOversized = isBranchWidthOversized || isBranchAspectOversized;
                    const branchVel = calculateVelocityRect(branchCfm, branchW, ductHeight > 0 ? ductHeight : 12);
                    const isBranchVelDanger = branchVel > velocityLimit && branchCfm > 0;
                    const hasBranchError = isBranchOversized || isBranchVelDanger;

                    return (
                      <div key={idx} className={`p-2 rounded-lg border transition-all ${
                        hasBranchError
                          ? 'bg-red-950/20 border-red-900/50'
                          : 'bg-slate-950/30 border-slate-850/60'
                      }`}>
                        <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
                          <span className={hasBranchError ? 'text-red-400 font-semibold flex items-center gap-1.5' : 'text-slate-400'}>
                            Branch #{idx + 1} ({Math.round(airflowUnitHook.getDisplayValue(branchCfm))} {flowUnit})
                            {isBranchOversized && (
                              <span className="text-[9px] text-red-400 font-bold bg-red-950/60 px-1 py-0.5 rounded border border-red-800/50">
                                OVERSIZED ({Math.round(branchW)}")
                              </span>
                            )}
                            {isBranchVelDanger && (
                              <span className="text-[9px] text-red-400 font-bold bg-red-950/60 px-1 py-0.5 rounded border border-red-800/50">
                                VELOCITY EXCEEDED
                              </span>
                            )}
                          </span>
                          <span className={hasBranchError ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {(pct || 0).toFixed(1)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="85"
                          step="0.5"
                          value={pct}
                          onChange={(e) => handlePercentChange(idx, Number(e.target.value))}
                          className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-colors ${
                            hasBranchError ? 'accent-red-500' : 'accent-emerald-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                  <div className="text-xs text-slate-500 flex items-center justify-between font-mono bg-slate-950/30 p-2 rounded border border-slate-850">
                    <span>Proportion Integrity</span>
                    <span className="text-emerald-400/90">Sum total: 100% (Balanced)</span>
                  </div>
                </div>
              </div>
            )}

            {!autoCalculate && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={handleApplyCalculations}
                  disabled={!hasPendingChanges}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${hasPendingChanges
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                    }`}
                >
                  <span>{hasPendingChanges ? 'Apply & Calculate' : 'Calculations Up To Date'}</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Live output cards and dynamic visualizer */}
        <div className="w-full space-y-6">

          {/* Main Glassmorphic output panel */}
          <motion.div
            key={`${(deMain || 0).toFixed(4)}-${widthMain}-${ductHeight}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden relative border border-slate-800"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            <div className="p-6 sm:p-8 space-y-6">

              {/* Output top summary */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/40 p-6 md:px-10 rounded-xl border border-slate-850/80">

                {/* Block 1: EQUIV. DIAMETER */}
                <div className="flex md:justify-start">
                  <div className="flex flex-col">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Equiv. Diameter</span>
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-bold text-white font-mono leading-none">
                        {(lenUnitHook.getDisplayValue(deMain) || 0).toFixed(1)}
                      </span>
                      <span className="text-sm text-slate-500 font-bold mb-1">in</span>
                    </div>
                    <div className="mt-2 flex items-center h-6">
                      <span className="text-xs text-slate-500 font-mono">
                        ({Math.round(deMain * 25.4)} mm)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Block 2: RECTANGULAR SIZING */}
                <div className="flex md:justify-center">
                  <div className="flex flex-col">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Rectangular Sizing</span>
                    <div className="flex items-end gap-1.5">
                      <span className={`text-4xl font-bold font-mono leading-none ${
                        isAppliedDuctOversized ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {(lenUnitHook.getDisplayValue(widthMain) || 0).toFixed(0)}x{(lenUnitHook.getDisplayValue(ductHeight) || 0).toFixed(0)}
                      </span>
                      <span className="text-sm text-slate-500 font-bold mb-1">in</span>
                    </div>
                    <div className="mt-2 flex items-center h-6">
                      {isAppliedDuctOversized ? (
                        <span className="text-xs text-red-400 font-mono flex items-center bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50 uppercase tracking-wider">
                          <AlertCircle className="h-3 w-3 mr-1 text-red-400" />
                          {widthMain > 96 ? 'OVERSIZED WIDTH (>96")' : 'HIGH ASPECT (>4:1)'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">
                          ({Math.round(widthMain * 25.4)}x{Math.round(ductHeight * 25.4)} mm)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block 3: VELOCITY (RECT) */}
                <div className="flex md:justify-end">
                  <div className="flex flex-col">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Velocity (Rect)</span>
                    <div className="flex items-end gap-1.5">
                      <span className={`text-4xl font-bold font-mono leading-none ${
                        statusMain === 'optimal' ? 'text-emerald-400' : statusMain === 'warning' ? 'text-amber-400' : 'text-red-500'
                      }`}>
                        {(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)}
                      </span>
                      <span className="text-sm text-slate-500 font-bold mb-1">{velUnit}</span>
                    </div>
                    <div className="mt-2 flex items-center h-6">
                      {statusMain === 'optimal' ? (
                        <span className="text-xs text-emerald-400 font-mono flex items-center bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/30 uppercase tracking-wider">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> OPTIMAL
                        </span>
                      ) : statusMain === 'warning' ? (
                        <span className="text-xs text-amber-400 font-mono flex items-center bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/30 uppercase tracking-wider">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" /> SLIGHTLY HIGH
                        </span>
                      ) : (
                        <span className="text-xs text-red-500 font-mono flex items-center bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30 uppercase tracking-wider">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" /> CRITICAL VELOCITY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              
              {/* System Flow Schematic */}
              <div className="bg-slate-950/60 border border-slate-850/80 rounded-xl p-5 flex flex-col min-h-[220px] relative overflow-hidden">
                 <span className="absolute top-3 left-3 text-xs text-slate-500 uppercase tracking-wider font-semibold font-mono z-10">System Flow Schematic</span>
                 
                 <div className="w-full flex-1 flex items-center justify-center mt-6">
                   <svg viewBox="0 0 400 160" className="w-full h-auto drop-shadow-md">
                     <defs>
                       <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                         <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3"/>
                       </pattern>
                     </defs>
                     
                     <rect width="400" height="160" fill="url(#gridPattern)" rx="8" />
                     
                     {/* Left Box */}
                     <rect x="20" y="50" width="70" height="60" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="6" />
                     <text x="55" y="84" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                        {ductType === 'supply' ? 'AHU / RTU' : ductType === 'return' ? 'AHU / RTU' : 'Exhaust Fan'}
                     </text>
                     
                     {/* Main Airflow */}
                     <path d="M 90 80 L 170 80" fill="none" 
                           stroke={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} 
                           strokeWidth="16" opacity="0.7" />
                     {ductType === 'supply' ? (
                       <polygon points="155,68 175,80 155,92" fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                     ) : (
                       <polygon points="105,68 85,80 105,92" fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                     )}
                     
                     <text x="130" y="65" fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} fontSize="12" textAnchor="middle" fontWeight="bold" className="font-mono">
                       {Math.round(airflowUnitHook.getDisplayValue(airflow))} {flowUnit}
                     </text>
                     
                     {/* Right side (Splitting vs Single) */}
                     {enableSplitting ? (
                       <g>
                         {/* Manifold */}
                         <rect x="175" y="40" width="20" height="80" fill="#334155" rx="4" />
                         
                         {branches.slice(0, 4).map((b, i, arr) => {
                           const num = arr.length;
                           const spacing = 80 / (num + 1);
                           const yPos = 40 + spacing * (i + 1);
                           const branchVal = airflowUnitHook.getDisplayValue(b.cfm);
                           
                           return (
                             <g key={i}>
                               <path d={`M 195 ${yPos} L 270 ${yPos}`} fill="none" stroke={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} strokeWidth="6" opacity="0.7" />
                               {ductType === 'supply' ? (
                                 <polygon points={`260,${yPos - 5} 270,${yPos} 260,${yPos + 5}`} fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                               ) : (
                                 <polygon points={`205,${yPos - 5} 195,${yPos} 205,${yPos + 5}`} fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                               )}
                               <rect x="270" y={yPos - 12} width="65" height="24" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="2" />
                               <text x="302.5" y={yPos + 3} fill="#94a3b8" fontSize="8" textAnchor="middle">Branch {i+1}</text>
                               <text x="235" y={yPos - 6} fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} fontSize="8" textAnchor="middle" className="font-mono">{Math.round(branchVal)}</text>
                               
                               {/* Branch Interactive Node */}
                               <g className="group cursor-pointer">
                                 <circle cx="235" cy={yPos} r="10" fill="transparent" />
                                 <circle cx="235" cy={yPos} r="3" fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} stroke="#0f172a" strokeWidth="1" className="group-hover:scale-150 transition-transform" style={{ transformOrigin: `235px ${yPos}px` }} />
                                 
                                 <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-xl">
                                   <rect x={155} y={yPos + 8} width="85" height="32" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="3" />
                                   <text x={160} y={yPos + 19} fill="#e2e8f0" fontSize="7" fontWeight="bold">Size: {(lenUnitHook.getDisplayValue(b.width) || 0).toFixed(1)}{lenUnit} x {(lenUnitHook.getDisplayValue(b.height) || 0).toFixed(1)}{lenUnit}</text>
                                   <text x={160} y={yPos + 29} fill="#94a3b8" fontSize="7">Vel: {(velUnitHook.getDisplayValue(b.velocityRect) || 0).toFixed(0)} {velUnit}</text>
                                 </g>
                               </g>
                             </g>
                           )
                         })}
                         {branches.length > 4 && (
                            <text x="302.5" y="140" fill="#64748b" fontSize="10" textAnchor="middle" fontStyle="italic">+ {branches.length - 4} more...</text>
                         )}
                       </g>
                     ) : (
                       <g>
                         <path d="M 175 80 L 290 80" fill="none" stroke={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} strokeWidth="16" opacity="0.7" />
                         {ductType === 'supply' ? (
                           <polygon points="275,68 295,80 275,92" fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                         ) : (
                           <polygon points="190,68 170,80 190,92" fill={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} />
                         )}
                         <rect x="295" y="50" width="80" height="60" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="6" />
                         <text x="335" y="84" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                           {ductType === 'supply' ? 'Zone / Diffuser' : ductType === 'return' ? 'Return Grille' : 'Hood / Intake'}
                         </text>
                         
                         {/* Terminal Run Interactive Node */}
                         <g className="group cursor-pointer">
                           <circle cx="235" cy="80" r="10" fill="transparent" />
                           <circle cx="235" cy="80" r="3" fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} stroke="#0f172a" strokeWidth="1" className="group-hover:scale-150 transition-transform origin-[235px_80px]" />
                           
                           <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-xl z-50">
                             <rect x="190" y="92" width="90" height="42" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="4" />
                             <text x="197" y="105" fill="#e2e8f0" fontSize="8" fontWeight="bold">Terminal Run</text>
                             <text x="197" y="116" fill="#94a3b8" fontSize="7.5">Size: {(lenUnitHook.getDisplayValue(widthMain) || 0).toFixed(1)}{lenUnit} x {(lenUnitHook.getDisplayValue(ductHeight) || 0).toFixed(1)}{lenUnit}</text>
                             <text x="197" y="126" fill="#94a3b8" fontSize="7.5">Vel: {(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)} {velUnit}</text>
                           </g>
                         </g>
                       </g>
                     )}
                     
                     {/* Type Badge */}
                     <rect x="290" y="10" width="90" height="20" fill="#0f172a" stroke={ductType === 'supply' ? '#0ea5e9' : ductType === 'return' ? '#9333ea' : '#d97706'} strokeWidth="1" rx="4" />
                     <text x="335" y="24" fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} fontSize="9" textAnchor="middle" fontWeight="bold" letterSpacing="1">
                       {ductType === 'supply' ? 'SUPPLY AIR' : ductType === 'return' ? 'RETURN AIR' : 'EXHAUST AIR'}
                     </text>

                     {/* INTERACTIVE NODES */}
                     {/* Main Duct Node */}
                     <g className="group cursor-pointer">
                       <circle cx="130" cy="80" r="14" fill="transparent" />
                       <circle cx="130" cy="80" r="4.5" fill={ductType === 'supply' ? '#38bdf8' : ductType === 'return' ? '#c084fc' : '#fbbf24'} stroke="#0f172a" strokeWidth="1.5" className="group-hover:scale-150 transition-transform origin-[130px_80px]" />
                       
                       <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-xl z-50">
                         <rect x="85" y="92" width="90" height="42" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="4" />
                         <text x="92" y="105" fill="#e2e8f0" fontSize="8" fontWeight="bold">Main Duct</text>
                         <text x="92" y="116" fill="#94a3b8" fontSize="7.5">Size: {(lenUnitHook.getDisplayValue(widthMain) || 0).toFixed(1)}{lenUnit} x {(lenUnitHook.getDisplayValue(ductHeight) || 0).toFixed(1)}{lenUnit}</text>
                         <text x="92" y="126" fill="#94a3b8" fontSize="7.5">Vel: {(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)} {velUnit}</text>
                       </g>
                     </g>

                   </svg>
                 </div>
              </div>
              
              {/* Duct visual cross-section representation using dynamic SVG shape */}
              <div className="bg-slate-950/60 border border-slate-850/80 rounded-xl p-5 flex flex-col items-center justify-center min-h-[220px] relative">
                <span className="absolute top-3 left-3 text-xs text-slate-500 uppercase tracking-wider font-semibold font-mono">Interactive Flow Visualization</span>

                {/* SVG representing round (dashed blue outline) and calculated rectangular duct side-by-side or overlaid */}
                <div className="w-full max-w-sm flex items-center justify-around gap-6 mt-4">

                  {/* Round Equivalent */}
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="h-32 w-32" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="roundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r={Math.min(48, Math.max(12, (deMain / 40) * 48))} fill="url(#roundGrad)" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
                      <text x="60" y="64" fill="#10b981" fontSize="9" textAnchor="middle" fontWeight="bold" className="font-mono">
                        Ø {(lenUnitHook.getDisplayValue(deMain) || 0).toFixed(1)}"
                      </text>
                    </svg>
                    <span className="text-xs text-slate-500 font-mono">Round Equivalent</span>
                  </div>

                  {/* Rectangular cross-section (solid chrome border) */}
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="h-32 w-32" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="rectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                      {/* Calculate width/height representation ratio */}
                      {(() => {
                        const maxDim = Math.max(widthMain, ductHeight);
                        const boxW = (widthMain / maxDim) * 90;
                        const boxH = (ductHeight / maxDim) * 90;
                        const x = (120 - boxW) / 2;
                        const y = (120 - boxH) / 2;

                        return (
                          <g>
                            <rect x={x} y={y} width={boxW} height={boxH} fill="url(#rectGrad)" stroke="#34d399" strokeWidth="2.5" rx="2" />
                            {/* Dimension lines */}
                            <text x={60} y={y - 6} fill="#34d399" fontSize="8" textAnchor="middle" className="font-mono font-bold">
                              W: {widthMain}"
                            </text>
                            <text x={x - 6} y={64} fill="#34d399" fontSize="8" textAnchor="end" className="font-mono font-bold" transform={`rotate(-90 ${x - 6} 64)`}>
                              H: {ductHeight}"
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                    <span className="text-xs text-emerald-400 font-mono font-semibold">Rectangular Profile</span>
                  </div>

                </div>

                <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                    <span>Perimeter: {2 * (widthMain + ductHeight)} in</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-2.5 h-2.5 bg-teal-500 rounded-full" />
                    <span>Aspect Ratio: {((widthMain / ductHeight) || 0).toFixed(2)}:1</span>
                  </div>
                </div>

              </div>

              {/* Downstream branches display */}
              {enableSplitting && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold font-mono">Downstream Splitting Balance sheet</span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {branches.map(b => (
                      <div
                        key={b.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-950/40 hover:bg-slate-950/60 rounded-xl border border-slate-850/60 transition-all gap-3"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-7 w-7 rounded-lg bg-emerald-950/80 border border-emerald-900/40 flex items-center justify-center text-[11px] font-bold text-emerald-400 font-mono">
                            B{b.id}
                          </div>
                          <div>
                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-xs font-bold text-white">Branch #{b.id}</span>
                              <span className="text-xs text-emerald-400 font-bold font-mono">({b.pct}%)</span>
                            </div>
                            <span className="block text-xs text-slate-400 font-mono">{(airflowUnitHook.getDisplayValue(b.cfm) || 0).toFixed(0)} CFM</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6 text-left w-full sm:w-auto">
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase font-bold">Eq. Dia</span>
                            <span className="block text-xs font-bold font-mono text-white mt-0.5">{(lenUnitHook.getDisplayValue(b.de) || 0).toFixed(1)}"</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase font-bold">Rect Size</span>
                            <span className="block text-xs font-bold font-mono text-emerald-400 mt-0.5">{b.width}"x{b.height}"</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase font-bold">Velocity</span>
                            <span className={`block text-xs font-bold font-mono mt-0.5 ${b.status === "optimal" ? "text-emerald-400" : b.status === "warning" ? "text-amber-400" : "text-red-500"}`}>
                              {b.status === "danger" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {(velUnitHook.getDisplayValue(b.velocityRect) || 0).toFixed(0)} FPM
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Visual Chart for Section Distribution */}
                  <div className="mt-6 pt-4 border-t border-slate-850">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold font-mono mb-4">Branch Airflow Distribution (CFM)</span>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branches} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="id" tickFormatter={(id) => `B${id}`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                          <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                            formatter={(value: number) => [`${(value || 0).toFixed(0)} CFM`, 'Airflow']}
                            labelFormatter={(label) => `Branch #${label}`}
                          />
                          <Bar dataKey="cfm" radius={[4, 4, 0, 0]}>
                            {branches.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.status === 'danger' ? '#ef4444' : entry.status === 'warning' ? '#fbbf24' : '#10b981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              {/* Validation Engine Banner */}
              <ValidationBanner validations={validations} />

              {/* Bottom utilities */}
              <div className="pt-4 border-t border-slate-850 flex flex-col md:flex-row gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <Bookmark className="h-4 w-4" />
                  <span>{t('saveIteration')}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>{t('copyReport')}</span>
                </button>
                <button
                  onClick={handleExportBOQ}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 border border-emerald-500/50 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{t('exportBOQ')}</span>
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`CKY_MEPF - Duct Sizing Estimate Report`);
                    const body = encodeURIComponent(
                      `Dear Team,\n\nHere is the Duct Sizing Estimate Report generated from CKY_MEPF:\n\n` +
                      `- Design Airflow: ${appliedAirflow} CFM\n` +
                      `- Design Friction Rate: ${appliedFrictionRate} in. wg/100 ft\n` +
                      `- Round Equivalent Diameter: ${(lenUnitHook.getDisplayValue(deMain) || 0).toFixed(1)}"\n` +
                      `- Rectangular Dimensions: ${widthMain}" x ${appliedDuctHeight}"\n` +
                      `- Velocity (Round Duct): ${Math.round(velRoundMain)} FPM\n` +
                      `- Velocity (Rectangular Duct): ${(velUnitHook.getDisplayValue(velRectMain) || 0).toFixed(0)} FPM\n` +
                      (enableSplitting ? `- Branches: Splitting Enabled with ${branches.length} balanced branches\n` : '') +
                      `\nGenerated on ${new Date().toLocaleString()}\n` +
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

            </div>
          </motion.div>

          {/* Quick Guidance Card */}
          <div className="bg-slate-900/30 border border-slate-850 p-4.5 rounded-xl flex items-start space-x-3 text-xs text-slate-400 leading-relaxed font-sans">
            <HelpCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="block font-semibold text-slate-200 mb-1">Equal Friction Design Guidelines</span>
              <span>
                Standard design practice for ductwork: <strong>0.10 in. wg/100 ft</strong> friction rate represents a high-efficiency balance of cost, velocity, and dynamic noise. Main trunk lines usually target velocities under <strong>1,200 - 1,500 FPM</strong> for standard commercial spaces to eliminate structural sound reverberations.
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Trend Chart Section */}
      <TrendVisualizer
        type="ductSizing"
        currentParams={{
          airflow: appliedAirflow,
          ductHeight: appliedDuctHeight,
          frictionRate: appliedFrictionRate,
          velocityLimit: appliedVelocityLimit
        }}
      />
    </div>
  );
}
