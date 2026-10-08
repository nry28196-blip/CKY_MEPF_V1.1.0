import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wind,
  Users,
  Activity,
  Settings,
  Info,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Layers,
  Building2,
  Sliders,
  Scale,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ArrowRight
} from 'lucide-react';
import { useUnit } from '../lib/UnitContext';
import TooltipLabel from './TooltipLabel';
import AuditTrailTable from './AuditTrailTable';
import { VentilationEngine, MultiZoneInput, SingleZoneInput, SingleZoneResult, MultiZoneResult } from '../lib/VentilationEngine';
import { UnitConversionService, ft2ToM2 } from '../lib/UnitConversionService';
import { StandardDataProvider } from '../data/ventilation/StandardDataProvider';
import { exportVentilationToCsv } from '../lib/exportCsv';
import IAQCalc from './IAQCalc';

interface ZoneState {
  id: string;
  name: string;
  spaceTypeId: string;
  area: number;
  occupants: number | '';
  useDefaultOccupancy: boolean;
  ezId: string;
  primaryAirflow: number | '';
  vpzMin: number | '';
  vdzMinDesign?: number | '';
  ep?: number | '';
  er?: number | '';
}

interface Ashrae621VentilationCalcProps {
  onVentilationChange?: (flow: number, details?: any) => void;
  edition?: '2019' | '2022' | '2025';
}

export default function Ashrae621VentilationCalc({
  onVentilationChange,
  edition = '2022'
}: Ashrae621VentilationCalcProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  const [systemType, setSystemType] = useState<'single' | 'multi_simplified' | 'multi_alternative'>('single');
  const [isVAV, setIsVAV] = useState<boolean>(true);
  const [systemVps, setSystemVps] = useState<number | ''>(isMetric ? 1000 : 2000);
  const [designCondition, setDesignCondition] = useState<string>('Cooling design');
  const [alternativeConfig, setAlternativeConfig] = useState<'single-supply' | 'secondary-recirculation'>('single-supply');
  const [systemPopulation, setSystemPopulation] = useState<number | ''>('');
  const [showIAQAnalysis, setShowIAQAnalysis] = useState<boolean>(false);

  const spaceTypes = StandardDataProvider.get621SpaceTypes(edition);
  const ezValues = StandardDataProvider.get621EzValues(edition);

  // Authoritative default Ez: verified Table 6-4 ceiling cool air distribution (ez-1)
  const defaultEzId = ezValues.find(e => e.id === 'ez-1' && e.verificationStatus === 'VERIFIED')?.id 
    || ezValues.find(e => e.verificationStatus === 'VERIFIED')?.id 
    || 'ez-1';

  const [altitude, setAltitude] = useState<number>(0);
  const [airTemp, setAirTemp] = useState<number>(isMetric ? 20 : 68);
  const [showFullAuditLog, setShowFullAuditLog] = useState<boolean>(false);

  // Responsive layout: Collapsible side-drawer state for smaller screens and expanded table mode
  const [isInputDrawerOpen, setIsInputDrawerOpen] = useState<boolean>(false);
  const [isDesktopSplitView, setIsDesktopSplitView] = useState<boolean>(true);

  // Keyboard navigation: Escape key closes side-drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInputDrawerOpen) {
        setIsInputDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputDrawerOpen]);

  // Body scroll lock while mobile drawer is open
  useEffect(() => {
    if (isInputDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isInputDrawerOpen]);

  const [zones, setZones] = useState<ZoneState[]>([
    {
      id: '1',
      name: 'Zone 1',
      spaceTypeId: 'office',
      area: isMetric ? 100 : 1000,
      occupants: 5,
      useDefaultOccupancy: true,
      ezId: 'ez-1',
      primaryAirflow: isMetric ? 400 : 800,
      vpzMin: '',
      ep: 1.0,
      er: 0.0,
      vdzMinDesign: ''
    }
  ]);

  const addZone = () => {
    setZones([
      ...zones,
      {
        id: Math.random().toString(),
        name: `Zone ${zones.length + 1}`,
        spaceTypeId: 'office',
        area: isMetric ? 100 : 1000,
        occupants: 5,
        useDefaultOccupancy: true,
        ezId: defaultEzId,
        primaryAirflow: isMetric ? 400 : 800,
        vpzMin: '',
        ep: 1.0,
        er: 0.0,
        vdzMinDesign: ''
      }
    ]);
  };

  const removeZone = (id: string) => {
    if (zones.length > 1) {
      setZones(zones.filter(z => z.id !== id));
    }
  };

  const updateZone = (id: string, field: keyof ZoneState, value: any) => {
    setZones(zones.map(z => (z.id === id ? { ...z, [field]: value } : z)));
  };

  const engineResult = useMemo(() => {
    const elevationM = isMetric ? altitude : UnitConversionService.ftToM(altitude);
    const tempC = isMetric ? airTemp : UnitConversionService.fToC(airTemp);
    const densityInput = { elevation: elevationM, temperature: tempC };

    if (systemType === 'single') {
      const z = zones[0];
      const spaceType = spaceTypes.find(s => s.id === z.spaceTypeId) || null;
      const ezConfig = ezValues.find(e => e.id === z.ezId) || null;
      const areaM2 = isMetric ? z.area : ft2ToM2(z.area);

      const input: SingleZoneInput = {
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: edition,
          spaceType,
          area: areaM2,
          designOccupancy: z.occupants === '' ? null : z.occupants,
          useDefaultOccupancy: z.useDefaultOccupancy,
          ezConfig
        },
        density: densityInput
      };

      return VentilationEngine.runSingleZone(input);
    } else {
      let vps = (systemVps === '' || systemVps === null) ? null : Number(systemVps);
      if (vps !== null && !isMetric) vps = UnitConversionService.cfmToLs(vps);

      const mzInput: MultiZoneInput = {
        zones: zones.map(z => {
          const spaceType = spaceTypes.find(s => s.id === z.spaceTypeId) || null;
          const ezConfig = ezValues.find(e => e.id === z.ezId) || null;
          const areaM2 = isMetric ? z.area : ft2ToM2(z.area);

          let vpz = z.primaryAirflow === '' ? null : z.primaryAirflow;
          if (vpz !== null && !isMetric) vpz = UnitConversionService.cfmToLs(vpz);

          let vpzMin = z.vpzMin === '' ? null : z.vpzMin;
          if (vpzMin !== null && !isMetric) vpzMin = UnitConversionService.cfmToLs(vpzMin);

          return {
            id: z.id,
            spaceType,
            area: areaM2,
            designOccupancy: z.occupants === '' ? null : z.occupants,
            useDefaultOccupancy: z.useDefaultOccupancy,
            ezConfig,
            dMode: isVAV ? 'VAV' : 'CV',
            vpz,
            vpzMinDesign: vpzMin,
            vdzMinDesign: typeof z.vdzMinDesign === 'number' ? z.vdzMinDesign : null,
            ep: typeof z.ep === 'number' ? z.ep : null,
            er: typeof z.er === 'number' ? z.er : null
          };
        }),
        density: densityInput,
        method: systemType === 'multi_simplified' ? 'Simplified' : 'Alternative',
        systemPopulation: systemPopulation === '' ? null : Number(systemPopulation),
        systemType: alternativeConfig,
        airDistributionType: isVAV ? 'VAV' : 'CV',
        vps: isVAV ? vps : null,
        vpsDesignBasis: 'Highest expected system primary airflow at analyzed design condition',
        designCondition: designCondition,
        edition: edition
      };
      return VentilationEngine.runMultiZone(mzInput);
    }
  }, [zones, systemType, isVAV, systemVps, designCondition, alternativeConfig, systemPopulation, altitude, airTemp, isMetric, spaceTypes, ezValues, edition]);

  const onVentilationChangeRef = useRef(onVentilationChange);
  useEffect(() => {
    onVentilationChangeRef.current = onVentilationChange;
  });

  useEffect(() => {
    if (onVentilationChangeRef.current) {
      let finalAirflow = engineResult.finalDesignOutdoorAir;
      if (!isMetric && finalAirflow !== null && finalAirflow > 0) {
        finalAirflow = UnitConversionService.lsToCfm(finalAirflow);
      }
      onVentilationChangeRef.current(finalAirflow ?? 0, engineResult);
    }
  }, [engineResult, isMetric]);

  const activeZone = zones[0];
  const activeSpaceType = spaceTypes.find(s => s.id === activeZone?.spaceTypeId) || spaceTypes[0];
  const activeEzConfig = ezValues.find(e => e.id === activeZone?.ezId) || ezValues[0];

  // Rates
  const rpDisplay = activeSpaceType ? (isMetric ? activeSpaceType.rpMetric : UnitConversionService.lsToCfm(activeSpaceType.rpMetric)) : 2.5;
  const raDisplay = activeSpaceType ? (isMetric ? activeSpaceType.raMetric : activeSpaceType.raMetric * 0.19685) : 0.3;
  const ezDisplay = activeEzConfig ? activeEzConfig.ez : 1.0;
  const epDisplay = (engineResult as SingleZoneResult)?.density?.eRho ?? 1.0;

  // Single zone intermediate values
  const singleZone = (engineResult as SingleZoneResult)?.zone;
  const vbzVal = singleZone?.vbz ?? null;
  const vbpVal = singleZone?.vbp ?? null;
  const vbaVal = singleZone?.vba ?? null;
  const vozVal = singleZone?.voz ?? null;
  const finalOutdoorAir = engineResult.finalDesignOutdoorAir;

  const finalAirflowDisplay = finalOutdoorAir === null
    ? null
    : (isMetric ? finalOutdoorAir : UnitConversionService.lsToCfm(finalOutdoorAir));

  const vbzDisplay = vbzVal === null ? null : (isMetric ? vbzVal : UnitConversionService.lsToCfm(vbzVal));
  const vbpDisplay = vbpVal === null ? null : (isMetric ? vbpVal : UnitConversionService.lsToCfm(vbpVal));
  const vbaDisplay = vbaVal === null ? null : (isMetric ? vbaVal : UnitConversionService.lsToCfm(vbaVal));
  const vozDisplay = vozVal === null ? null : (isMetric ? vozVal : UnitConversionService.lsToCfm(vozVal));

  // Extract all audit trails
  const allAuditTrails = useMemo(() => {
    const list: any[] = [];
    if (systemType === 'single') {
      const sr = engineResult as SingleZoneResult;
      list.push(...(sr.zone?.auditTrail || []), ...(sr.density?.auditTrail || []), ...(sr.auditTrail || []));
    } else {
      const mr = engineResult as MultiZoneResult;
      if (mr.zoneResults) {
        mr.zoneResults.forEach(z => {
          if (z?.auditTrail) list.push(...z.auditTrail);
        });
      }
      if (mr.simplifiedSystem?.auditTrail) list.push(...mr.simplifiedSystem.auditTrail);
      if (mr.alternativeSystem?.auditTrail) list.push(...mr.alternativeSystem.auditTrail);
      if (mr.density?.auditTrail) list.push(...mr.density.auditTrail);
      if (mr.auditTrail) list.push(...mr.auditTrail);
    }
    return list;
  }, [engineResult, systemType]);

  // Dynamic Validation items derived from engine validation state
  const isPass = engineResult.status === 'PASS';
  const validationItems = [
    {
      label: 'Space information',
      status: activeSpaceType ? 'Valid' : 'Incomplete',
      isValid: Boolean(activeSpaceType)
    },
    {
      label: 'Ventilation parameters',
      status: activeZone.area > 0 && (activeZone.occupants !== '' || activeZone.useDefaultOccupancy) ? 'Valid' : 'Incomplete',
      isValid: activeZone.area > 0
    },
    {
      label: 'Ez configuration',
      status: activeEzConfig && activeEzConfig.verificationStatus === 'VERIFIED' ? 'Valid' : 'Not verified',
      isValid: activeEzConfig && activeEzConfig.verificationStatus === 'VERIFIED'
    },
    {
      label: 'Stratified prerequisites',
      status: activeEzConfig?.isStratified ? (isPass ? 'Valid' : 'Incomplete') : 'Not applicable',
      isValid: true
    },
    {
      label: 'Personalized prerequisites',
      status: activeEzConfig?.isPersonalized ? (isPass ? 'Valid' : 'Incomplete') : 'Not applicable',
      isValid: true
    },
    {
      label: 'Table 6-1 / 6-2 / 6-3',
      status: activeSpaceType?.verificationStatus === 'VERIFIED' ? 'Valid' : 'Not verified',
      isValid: activeSpaceType?.verificationStatus === 'VERIFIED'
    },
    {
      label: 'Manual overrides',
      status: activeEzConfig?.isManualOverride ? 'Active' : 'Not used',
      isValid: true
    }
  ];

  // Reusable Input Configuration Cards for desktop layout, collapsible side-drawer, and PDF print
  const renderInputCardsContent = (isDrawer = false) => (
    <div className="space-y-4">
      {/* Card 1: Zone & Space Information */}
      <div data-pdf-section="zone-info" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Zone & Space Information
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">1. Space Category & Geometry</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
              {activeSpaceType?.airClass ? `Air Class ${activeSpaceType.airClass}` : 'Class 1'}
            </span>
            {!isDrawer && (
              <button
                type="button"
                onClick={() => setIsDesktopSplitView(false)}
                className="hidden lg:inline-flex items-center p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 rounded transition-colors cursor-pointer"
                title="Collapse inputs into side-drawer for full table view"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Space Category Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Space Type / Occupancy Category
            </label>
            <select
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs border border-slate-800 focus:border-cyan-500 transition-colors"
              value={activeZone.spaceTypeId}
              onChange={(e) => updateZone(activeZone.id, 'spaceTypeId', e.target.value)}
            >
              {spaceTypes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Floor Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Floor Area (Az)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {isMetric ? 'Square meters' : 'Square feet'}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 focus:border-cyan-500 pr-12"
                value={activeZone.area}
                onChange={(e) => updateZone(activeZone.id, 'area', e.target.value ? Number(e.target.value) : 0)}
              />
              <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-500">
                {isMetric ? 'm²' : 'ft²'}
              </span>
            </div>
          </div>

          {/* Occupancy / Design Population */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Design Population (Pz)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 w-3.5 h-3.5"
                  checked={activeZone.useDefaultOccupancy}
                  onChange={(e) => updateZone(activeZone.id, 'useDefaultOccupancy', e.target.checked)}
                />
                <span className="text-[10px] text-slate-400 font-medium">Code Default</span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                disabled={activeZone.useDefaultOccupancy}
                className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-mono border border-slate-800 disabled:opacity-50 focus:border-cyan-500 pr-14"
                value={activeZone.occupants}
                onChange={(e) => updateZone(activeZone.id, 'occupants', e.target.value ? Number(e.target.value) : '')}
              />
              <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-500">
                people
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              Default Density: {activeSpaceType?.defaultOccupancyMetric ?? 5} people / 100 m²
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Ventilation Parameters */}
      <div data-pdf-section="vent-params" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-3.5">
          <div className="p-1.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ventilation Parameters
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">2. ASHRAE Table 6-1 Rates & Ez</span>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Rp and Ra Display */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">People Rate (Rp)</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {rpDisplay.toFixed(1)} {isMetric ? 'L/s·person' : 'cfm/person'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Area Rate (Ra)</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {raDisplay.toFixed(3)} {isMetric ? 'L/s·m²' : 'cfm/ft²'}
              </span>
            </div>
          </div>

          {/* Ez Selection Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Air Distribution Effectiveness (Ez)
            </label>
            <select
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs border border-slate-800 focus:border-cyan-500 transition-colors"
              value={activeZone.ezId}
              onChange={(e) => updateZone(activeZone.id, 'ezId', e.target.value)}
            >
              {ezValues.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} (Ez = {e.ez})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              Table 6-4 Effectiveness Factor: <span className="text-white font-bold">{ezDisplay.toFixed(2)}</span>
            </p>
          </div>

          {/* Atmospheric Density Inputs */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300">
                Air Density Correction (Eρ)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                Factor: {epDisplay.toFixed(3)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  Elevation ({isMetric ? 'm' : 'ft'})
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-950 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono border border-slate-800 focus:border-cyan-500"
                  value={altitude}
                  onChange={(e) => setAltitude(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  Design Temp ({isMetric ? '°C' : '°F'})
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-950 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono border border-slate-800 focus:border-cyan-500"
                  value={airTemp}
                  onChange={(e) => setAirTemp(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Advanced / Optional */}
      <div data-pdf-section="advanced-params" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-3.5">
          <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Advanced / Optional
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">3. System & Air Volume Topology</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Architecture Configuration
            </label>
            <select
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-xs border border-slate-800 focus:border-cyan-500"
              value={systemType}
              onChange={(e) => setSystemType(e.target.value as any)}
            >
              <option value="single">Single-Zone System (Eq 6-1 / 6-2)</option>
              <option value="multi_simplified">Multi-Zone (Simplified Procedure)</option>
              <option value="multi_alternative">Multi-Zone (Alternative Appendix A)</option>
            </select>
          </div>

          {systemType !== 'single' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Air Volume Modulation
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVAV(false)}
                  className={`py-1 text-xs font-medium rounded transition-colors ${
                    !isVAV ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Constant Volume (CV)
                </button>
                <button
                  type="button"
                  onClick={() => setIsVAV(true)}
                  className={`py-1 text-xs font-medium rounded transition-colors ${
                    isVAV ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Variable Air Volume (VAV)
                </button>
              </div>
            </div>
          )}

          {systemType !== 'single' && (
            <div className="pt-2 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Zones in System: {zones.length}</span>
              <button
                onClick={addZone}
                className="btn-micro-action flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add Zone
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Responsive Input Parameters Control Bar */}
      <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-cyan-950/70 border border-cyan-800/60 rounded-lg text-cyan-400 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {activeSpaceType?.name || 'Office space'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded shrink-0">
                Air Class {activeSpaceType?.airClass || 1}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                {systemType === 'single' ? 'Single-Zone' : systemType === 'multi_simplified' ? 'Multi-Zone (Simplified)' : 'Multi-Zone (Appendix A)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              Area: <span className="text-slate-200">{activeZone.area} {isMetric ? 'm²' : 'ft²'}</span> · Occ: <span className="text-slate-200">{activeZone.occupants || 5}</span> ({activeZone.useDefaultOccupancy ? 'Default' : 'Design'}) · Ez: <span className="text-cyan-400">{ezDisplay.toFixed(2)}</span> · Eρ: <span className="text-emerald-400">{epDisplay.toFixed(3)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {/* Collapsible Side-Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => setIsInputDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm shadow-cyan-950/50 transition-all cursor-pointer"
            title="Open collapsible side-drawer for input parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameters Drawer</span>
          </button>

          {/* Desktop Layout Switcher: 3-Col Split vs Full Table View */}
          <button
            type="button"
            onClick={() => setIsDesktopSplitView(!isDesktopSplitView)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title={isDesktopSplitView ? 'Collapse input cards for full output tables view' : 'Show 3-column split layout with inputs inline'}
          >
            {isDesktopSplitView ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Table View</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Split View (3-Col)</span>
              </>
            )}
          </button>

          {/* Export CSV Button */}
          <button
            id="export-ashrae621-ventilation-csv-btn"
            type="button"
            onClick={() => exportVentilationToCsv({ isMetric, systemType, result: engineResult, zones })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Download current space parameters, ventilation rates, and multi-zone performance data to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Floating Action Button for smaller screens: Instant access to input drawer from anywhere */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsInputDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-full shadow-xl shadow-cyan-950/90 border border-cyan-400/40 transition-transform active:scale-95 cursor-pointer"
          title="Open Input Parameters Drawer"
        >
          <Sliders className="w-4 h-4" />
          <span>Edit Inputs</span>
          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
        </button>
      </div>

      {/* Collapsible Side-Drawer for Input Parameters */}
      <AnimatePresence>
        {isInputDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Input Parameters Drawer">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsInputDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            />

            {/* Slide-over Drawer Panel */}
            <div className="fixed inset-y-0 left-0 max-w-full flex pr-10 sm:pr-16 z-50">
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                className="w-screen max-w-md sm:max-w-lg bg-[#0B132B] border-r border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Drawer Header */}
                <div className="px-5 py-4 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-950/70 border border-cyan-800/60 rounded-lg text-cyan-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        <span>Input Parameters</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded font-normal">
                          Side-Drawer
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Adjust space parameters, airflow rates, and system topology
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsInputDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                    title="Close Side-Drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {renderInputCardsContent(true)}
                </div>

                {/* Sticky Drawer Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0 font-mono">
                    <span className="text-[9px] text-slate-500 uppercase block">Required OA (Voz)</span>
                    <span className="text-xs font-bold text-cyan-400 truncate">
                      {finalAirflowDisplay !== null ? `${finalAirflowDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'} · {isPass ? 'PASS' : engineResult.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInputDrawerOpen(false)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>View Output Tables</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.aside>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden print container: Guarantees input parameter cards are present during PDF capture */}
      <div className="hidden pdf-print-mode:block print:block space-y-4 mb-6">
        {renderInputCardsContent(true)}
      </div>

      {/* Main Engineering Calculation Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ============================================================== */}
        {/* COLUMN 1: INPUT / CONFIGURATION CARDS (col-span-4)              */}
        {/* Visible on desktop in split view; on smaller screens or        */}
        {/* full table view, accessible via the Collapsible Side-Drawer    */}
        {/* ============================================================== */}
        {isDesktopSplitView && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block lg:col-span-4 space-y-4"
          >
            {renderInputCardsContent(false)}
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* COLUMN 2: VERIFICATION & TRACE (col-span-12 / col-span-6 / col-span-4) */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.04 }}
          className={`space-y-4 ${
            isDesktopSplitView ? 'col-span-12 md:col-span-6 lg:col-span-4' : 'col-span-12 md:col-span-6'
          }`}
        >
          
          {/* Card 1: Validation Status */}
          <div data-pdf-section="validation-status" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${
                  isPass ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Validation Status
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Code Rule Checklist</span>
                </div>
              </div>
              <motion.span
                key={isPass ? 'pass-badge' : 'status-badge'}
                initial={{ scale: 0.94, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isPass
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                }`}
              >
                {isPass ? 'PASS' : engineResult.status}
              </motion.span>
            </div>

            {/* Prominent Header Banner */}
            <div className={`p-3 rounded-lg border mb-3 flex items-center justify-between ${
              isPass
                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                : 'bg-amber-950/30 border-amber-900/50 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <motion.div
                  key={isPass ? 'check-icon' : 'warn-icon'}
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                >
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </motion.div>
                <span className="text-xs font-bold tracking-tight">
                  {isPass ? 'Configuration Valid' : `Status: ${engineResult.status}`}
                </span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {isPass ? 'VRP Requirements Met' : 'Review Parameters'}
              </span>
            </div>

            {/* Individual Validation Checklist */}
            <div className="space-y-1.5 text-xs font-mono">
              {validationItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-950/50 border border-slate-850"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${item.isValid ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-slate-300 text-[11px] font-sans">{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${
                    item.status === 'Valid'
                      ? 'text-emerald-400'
                      : item.status === 'Not applicable' || item.status === 'Not used'
                        ? 'text-slate-500'
                        : 'text-amber-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Error / Warning Notice if any */}
            {(engineResult.zone?.reason || (engineResult as any).reason) && (
              <div className="mt-3 p-2.5 bg-red-950/30 border border-red-900/50 rounded-lg text-red-300 text-[11px] flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{engineResult.zone?.reason || (engineResult as any).reason}</span>
              </div>
            )}
          </div>

          {/* Card 2: Calculation Details Trace */}
          <div data-pdf-section="calculation-details" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-3.5">
              <div className="p-1.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Calculation Details
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Mathematical Step Trace</span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Step 1: Vbz */}
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-850">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans mb-1">
                  <span>Vbz Calculation (Breathing Zone)</span>
                  <span className="text-cyan-400">Eq 6-1</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Vbz = Rp × Pz + Ra × Az
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-900 text-white font-bold">
                  <span className="text-[10px] text-slate-500 font-sans">Computed Vbz</span>
                  <span className="text-cyan-300">
                    {vbzDisplay !== null ? `${vbzDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                  </span>
                </div>
              </div>

              {/* Step 2: Ez Adjustment */}
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-850">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans mb-1">
                  <span>Ez Adjustment (Distribution)</span>
                  <span className="text-cyan-400">Table 6-4</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Vbz / Ez = {vbzDisplay !== null ? vbzDisplay.toFixed(1) : '--'} / {ezDisplay.toFixed(2)}
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-900 text-white font-bold">
                  <span className="text-[10px] text-slate-500 font-sans">Distribution Adjusted</span>
                  <span className="text-cyan-300">
                    {vbzDisplay !== null ? `${(vbzDisplay / ezDisplay).toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                  </span>
                </div>
              </div>

              {/* Step 3: Density Correction */}
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-850">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans mb-1">
                  <span>Density Correction (Eρ)</span>
                  <span className="text-cyan-400">Addendum j</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  × Ep (Eρ) = × {epDisplay.toFixed(3)}
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-900 text-white font-bold">
                  <span className="text-[10px] text-slate-500 font-sans">Density Corrected</span>
                  <span className="text-emerald-400">
                    {vozDisplay !== null ? `${vozDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                  </span>
                </div>
              </div>

              {/* Step 4: Final Voz */}
              <div className="p-2.5 bg-cyan-950/30 rounded-lg border border-cyan-900/50 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-cyan-400 uppercase font-sans font-bold">
                    Required Outdoor Air (Voz)
                  </span>
                  <span className="text-[10px] text-slate-400">Final Design Value</span>
                </div>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {vozDisplay !== null ? `${vozDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Audit Information */}
          <div data-pdf-section="audit-info" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-800 rounded-lg text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Audit Information
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Traceability & Code Basis</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullAuditLog(!showFullAuditLog)}
                className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>{showFullAuditLog ? 'Hide Trail' : 'Show Trail'}</span>
                {showFullAuditLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Standard</span>
                <span className="text-white font-bold">ANSI/ASHRAE 62.1-2022</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Engine</span>
                <span className="text-slate-300">Ashrae621ZoneService</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Addenda</span>
                <span className="text-cyan-400 font-bold">Addendum j (Approved)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Authority</span>
                <span className={engineResult?.isAuthoritative ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {engineResult?.isAuthoritative ? 'Authoritative Production' : 'Preliminary / Authority Not Verified'}
                </span>
              </div>
            </div>

            {showFullAuditLog && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <AuditTrailTable title="Engine Step-By-Step Audit Trail" trail={allAuditTrails} />
              </div>
            )}
          </div>

        </motion.div>

        {/* ============================================================== */}
        {/* COLUMN 3: RESULTS (col-span-12 / col-span-6 / col-span-4)      */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className={`space-y-4 ${
            isDesktopSplitView ? 'col-span-12 md:col-span-6 lg:col-span-4' : 'col-span-12 md:col-span-6'
          }`}
        >
          
          {/* Card 1: Results Hero Card */}
          <div data-pdf-section="results-hero" className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
            {/* Subtle glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Results</span>
              </div>
              <motion.span
                key={isPass ? 'pass-result' : 'warn-result'}
                initial={{ scale: 0.94, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isPass
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                }`}
              >
                {isPass ? 'PASS' : engineResult.status}
              </motion.span>
            </div>

            <div className="text-center py-2">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Required Outdoor Air (Voz)
              </span>
              <div className="flex items-baseline justify-center gap-2 font-mono">
                <motion.span
                  key={finalAirflowDisplay}
                  initial={{ opacity: 0.85, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl sm:text-5xl font-extrabold text-cyan-400 tracking-tight"
                >
                  {finalAirflowDisplay === null || isNaN(finalAirflowDisplay) ? '--' : finalAirflowDisplay.toFixed(1)}
                </motion.span>
                <span className="text-lg font-bold text-slate-500">
                  {isMetric ? 'L/s' : 'cfm'}
                </span>
              </div>
              {isPass ? (
                engineResult?.isAuthoritative ? (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Calculation PASS — Production Authority Verified</span>
                  </div>
                ) : (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Calculation PASS — Preliminary / Authority Not Verified</span>
                  </div>
                )
              ) : (
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Validation Incomplete — Check Parameters</span>
                </div>
              )}
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-2 pt-4 mt-3 border-t border-slate-800/80 font-mono text-center">
              <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-850">
                <span className="block text-[9px] text-slate-500 uppercase">Vbz (Breathing)</span>
                <span className="text-xs font-bold text-white">
                  {vbzDisplay !== null ? `${vbzDisplay.toFixed(1)}` : '--'}
                </span>
                <span className="block text-[9px] text-slate-500">{isMetric ? 'L/s' : 'cfm'}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-850">
                <span className="block text-[9px] text-slate-500 uppercase">Ez (Effectiveness)</span>
                <span className="text-xs font-bold text-cyan-400">
                  {ezDisplay.toFixed(2)}
                </span>
                <span className="block text-[9px] text-slate-500">ratio</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-850">
                <span className="block text-[9px] text-slate-500 uppercase">Ep (Density)</span>
                <span className="text-xs font-bold text-emerald-400">
                  {epDisplay.toFixed(2)}
                </span>
                <span className="block text-[9px] text-slate-500">Eρ factor</span>
              </div>
            </div>
          </div>

          {/* Card 2: Result Summary */}
          <div data-pdf-section="result-summary" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="pb-2.5 border-b border-slate-800/80 mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Result Summary
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 font-sans">People Outdoor Air (Vbp)</span>
                <span className="text-slate-200">
                  {vbpDisplay !== null ? `${vbpDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 font-sans">Area Outdoor Air (Vba)</span>
                <span className="text-slate-200">
                  {vbaDisplay !== null ? `${vbaDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 font-sans">Breathing Zone Total (Vbz)</span>
                <span className="text-cyan-400 font-bold">
                  {vbzDisplay !== null ? `${vbzDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 font-sans">Zone Outdoor Airflow (Voz)</span>
                <span className="text-white font-bold">
                  {vozDisplay !== null ? `${vozDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-sans">Total System Intake (Vot)</span>
                <span className="text-emerald-400 font-bold">
                  {finalAirflowDisplay !== null ? `${finalAirflowDisplay.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Input Summary */}
          <div data-pdf-section="input-summary" className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="pb-2.5 border-b border-slate-800/80 mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Input Summary
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Selected Space</span>
                <span className="text-white font-medium text-right truncate max-w-[170px]" title={activeSpaceType?.name}>
                  {activeSpaceType?.name || 'Office space'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850 font-mono">
                <span className="text-slate-400 font-sans">Design Area</span>
                <span className="text-slate-200">
                  {activeZone.area} {isMetric ? 'm²' : 'ft²'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850 font-mono">
                <span className="text-slate-400 font-sans">Design Occupancy</span>
                <span className="text-slate-200">
                  {activeZone.occupants || 5} people ({activeZone.useDefaultOccupancy ? 'Default' : 'Design'})
                </span>
              </div>
              <div className="flex justify-between py-1 font-mono">
                <span className="text-slate-400 font-sans">Elevation / Temp</span>
                <span className="text-slate-200">
                  {altitude} {isMetric ? 'm' : 'ft'} / {airTemp} {isMetric ? '°C' : '°F'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Engineering / Standards Note */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Engineering & Standards Note</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              ANSI/ASHRAE Standard 62.1-2022 Section 6.2 (Ventilation Rate Procedure) with Addendum j density correction.
              Calculations reflect minimum outdoor air required for acceptable indoor air quality. Actual design supply rates must account for cooling/heating loads, system distribution losses, and AHJ requirements.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => exportVentilationToCsv({ isMetric, systemType, result: engineResult, zones })}
                className="btn-micro-action flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                Export CSV
              </button>
            </div>
          </div>

        </motion.div>

      </div>

      {/* Embedded CO2 & Demand-Controlled Ventilation (DCV) Engineering Analysis */}
      <div className="mt-8 pt-6 border-t border-slate-800/80">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
            onClick={() => setShowIAQAnalysis(!showIAQAnalysis)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/70 text-cyan-400 rounded-xl border border-cyan-800/60 shadow-sm shadow-cyan-950/40">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    CO₂ & Demand-Controlled Ventilation (DCV) Engineering Analysis
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                    ASHRAE 62.1 Appendix D
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transient and steady-state occupant CO₂ generation, outdoor air modulation, and MERV filtration standards.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-all cursor-pointer self-start sm:self-center"
            >
              <span>{showIAQAnalysis ? 'Hide Analysis' : 'Show DCV Analysis'}</span>
              {showIAQAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showIAQAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-6 pt-6 border-t border-slate-800/80"
            >
              <IAQCalc />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
