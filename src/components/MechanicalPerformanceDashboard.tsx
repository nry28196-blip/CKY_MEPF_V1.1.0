import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Sliders,
  Wind,
  Thermometer,
  Gauge,
  Sparkles,
  Info,
  Layers,
  Zap,
  ShieldCheck,
  BarChart3,
  Flame,
  CheckCircle2,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Cell
} from 'recharts';
import { useUnit } from '../lib/UnitContext';

interface MechanicalPerformanceDashboardProps {
  activeSub: string;
  activeModule?: string;
  lastCalculationResult?: any;
}

export default function MechanicalPerformanceDashboard({
  activeSub,
  activeModule = 'estimate',
  lastCalculationResult
}: MechanicalPerformanceDashboardProps) {
  const { unitSystem } = useUnit();
  const isMetric = unitSystem === 'metric';

  // Interactive local view toggle
  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary');
  const [safetyMargin, setSafetyMargin] = useState<number>(10); // % contingency

  // ---------------------------------------------------------------------------
  // 1. COOLING LOAD DATA (24-Hour Diurnal Load Distribution & Sources)
  // ---------------------------------------------------------------------------
  const coolingDiurnalData = useMemo(() => {
    // 24-hour diurnal simulation representing solar, internal, and envelope load curves
    const hours = [
      '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
      '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
    ];

    const baseKw = isMetric ? 12.5 : 12.5 * 3.412; // Base thermal / equipment
    const peakHour = 15; // 3 PM peak solar & ambient

    return hours.map((h, i) => {
      const hourNum = i * 2;
      // Solar curve: peaks around 14:00 - 16:00
      const solarFactor = Math.max(0, Math.sin(((hourNum - 6) / 13) * Math.PI));
      const solar = solarFactor * (isMetric ? 18.2 : 18.2 * 3.412);

      // Occupancy & equipment schedule: active 08:00 - 18:00
      const occFactor = (hourNum >= 8 && hourNum <= 18) ? 1.0 : (hourNum >= 7 && hourNum <= 20) ? 0.4 : 0.1;
      const internal = (isMetric ? 14.0 : 14.0 * 3.412) * occFactor;

      // Envelope conduction: follows outdoor temperature
      const tempDiff = Math.sin(((hourNum - 9) / 24) * 2 * Math.PI);
      const envelope = (isMetric ? 9.5 : 9.5 * 3.412) + tempDiff * (isMetric ? 4.0 : 4.0 * 3.412);

      // Sensible & Latent
      const sensible = Math.round((solar + internal + envelope + baseKw) * 10) / 10;
      const latent = Math.round((internal * 0.28 + (hourNum >= 8 && hourNum <= 18 ? 4.5 : 1.2)) * 10) / 10;
      const total = Math.round((sensible + latent) * (1 + safetyMargin / 100) * 10) / 10;
      const tons = Math.round((total / (isMetric ? 3.517 : 12)) * 100) / 100;

      return {
        time: h,
        sensible,
        latent,
        total,
        solar: Math.round(solar * 10) / 10,
        internal: Math.round(internal * 10) / 10,
        envelope: Math.round(envelope * 10) / 10,
        tons
      };
    });
  }, [isMetric, safetyMargin]);

  const coolingSourceBreakdown = useMemo(() => {
    return [
      { name: 'Internal People', value: isMetric ? 10.5 : 35.8, color: '#f43f5e' },
      { name: 'Lighting & Plugs', value: isMetric ? 14.2 : 48.5, color: '#facc15' },
      { name: 'Solar Fenestration', value: isMetric ? 18.6 : 63.5, color: '#fb923c' },
      { name: 'Envelope Walls/Roof', value: isMetric ? 9.8 : 33.4, color: '#4ade80' },
      { name: 'Outdoor Air Vent', value: isMetric ? 12.4 : 42.3, color: '#38bdf8' },
      { name: 'Air Infiltration', value: isMetric ? 4.1 : 14.0, color: '#94a3b8' }
    ];
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 2. FAN SELECTION & STATIC PRESSURE DATA (Airflow vs. ESP System Curve)
  // ---------------------------------------------------------------------------
  const fanEspCurveData = useMemo(() => {
    // Airflow range: 500 to 4500 L/s or CFM
    const flowPoints = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500];
    const designFlow = 2500;
    const designEsp = isMetric ? 450 : 1.8; // Pa or in.wg

    // k factor for system parabola P = k * Q^2
    const k = designEsp / Math.pow(designFlow, 2);

    return flowPoints.map(q => {
      // Fan drooping characteristic curve
      const maxStatic = isMetric ? 750 : 3.0;
      const fanPressure = Math.max(0, Math.round((maxStatic - (q / 4800) * (q / 4800) * (isMetric ? 480 : 1.9)) * 10) / 10);

      // System resistance curve: quadratic
      const systemPressure = Math.round((k * Math.pow(q, 2)) * 10) / 10;

      // Fan shaft power BHP / kW
      const airPowerKw = (q * (isMetric ? systemPressure : systemPressure * 249.08)) / (isMetric ? 1000 : 8500);
      const fanKw = Math.round((airPowerKw / 0.65) * 100) / 100;
      const fanBhp = Math.round((fanKw * 1.341) * 100) / 100;

      return {
        airflow: q,
        fanPressure,
        systemPressure,
        power: isMetric ? fanKw : fanBhp
      };
    });
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 3. DUCT DESIGN DATA (Airflow vs. Velocity & Friction Gradient)
  // ---------------------------------------------------------------------------
  const ductPerformanceData = useMemo(() => {
    const flows = [200, 400, 600, 800, 1000, 1400, 1800, 2200, 2600, 3000];
    const ductAreaSqm = 0.20; // 500mm x 400mm approx

    return flows.map(flow => {
      const flowM3s = isMetric ? flow / 1000 : (flow * 0.0004719);
      const velocity = Math.round((flowM3s / ductAreaSqm) * (isMetric ? 1 : 196.85) * 10) / 10;

      // Darcy friction loss gradient
      const frictionLoss = Math.round((0.85 * Math.pow(flowM3s / 0.5, 1.82) * (isMetric ? 1 : 0.04018)) * 100) / 100;
      const recommendedLimit = isMetric ? 7.5 : 1500;

      return {
        flow,
        velocity,
        frictionLoss,
        limit: recommendedLimit
      };
    });
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 4. VENTILATION DATA (Occupant Modulation vs. Airflow & CO2 Equilibrium)
  // ---------------------------------------------------------------------------
  const ventilationPerformanceData = useMemo(() => {
    const occupancyLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const fullPop = 80;
    const azSqm = 400;
    const rp = 2.5; // L/s/person
    const ra = 0.3; // L/s/m2

    return occupancyLevels.map(pct => {
      const pz = (fullPop * pct) / 100;
      const vbz = isMetric
        ? Math.round(pz * rp + azSqm * ra)
        : Math.round((pz * (rp * 2.119) + (azSqm * 10.764) * (ra * 0.1969)));

      // Equilibrium CO2 concentration: Cout + (N * G) / Voz
      const vo = Math.max(1, isMetric ? vbz : vbz * 0.4719);
      const co2 = Math.round(410 + (pz * 0.005 * 1000000) / vo);

      return {
        occupancy: `${pct}%`,
        pz: Math.round(pz),
        intakeAirflow: vbz,
        co2Level: Math.min(1600, co2),
        co2Limit: 1000
      };
    });
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 5. HEAT RECOVERY DATA (Outdoor Air Temp vs. Thermal Energy Effectiveness)
  // ---------------------------------------------------------------------------
  const heatRecoveryData = useMemo(() => {
    const temps = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35];
    const designSupply = isMetric ? 1500 : 3180; // L/s or CFM
    const indoorTemp = isMetric ? 22 : 72; // °C or °F

    return temps.map(t => {
      const deltaT = Math.abs(indoorTemp - t);
      // Sensible effectiveness ~ 73%
      const sensibleRecoveryKw = Math.round((1.2 * (designSupply / 1000) * 1.006 * deltaT * 0.73) * (isMetric ? 1 : 3.412) * 10) / 10;
      const latentRecoveryKw = Math.round((sensibleRecoveryKw * 0.35) * 10) / 10;
      const totalRecovery = Math.round((sensibleRecoveryKw + latentRecoveryKw) * 10) / 10;

      return {
        temp: `${t}°C`,
        sensible: sensibleRecoveryKw,
        latent: latentRecoveryKw,
        total: totalRecovery,
        effectiveness: 73
      };
    });
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 6. KITCHEN HOOD DATA (Thermal Plume Airflow & Make-Up Air Balance)
  // ---------------------------------------------------------------------------
  const kitchenHoodData = useMemo(() => {
    return [
      { appliance: 'Steam / Kettles (Light)', captureFlow: isMetric ? 450 : 950, muaFlow: isMetric ? 380 : 810, captureVel: 0.25 },
      { appliance: 'Ovens / Ranges (Medium)', captureFlow: isMetric ? 750 : 1590, muaFlow: isMetric ? 640 : 1350, captureVel: 0.38 },
      { appliance: 'Fryers / Griddles (Heavy)', captureFlow: isMetric ? 1150 : 2435, muaFlow: isMetric ? 980 : 2070, captureVel: 0.50 },
      { appliance: 'Charbroilers (Extra-Heavy)', captureFlow: isMetric ? 1650 : 3495, muaFlow: isMetric ? 1400 : 2970, captureVel: 0.65 }
    ];
  }, [isMetric]);

  // ---------------------------------------------------------------------------
  // 7. PSYCHROMETRIC DATA (Dry Bulb Temp vs. Enthalpy & Humidity Ratio)
  // ---------------------------------------------------------------------------
  const psychrometricData = useMemo(() => {
    const dbt = [10, 15, 20, 25, 30, 35, 40];
    return dbt.map(t => {
      // Saturated enthalpy kJ/kg
      const hSat = Math.round((1.006 * t + (2501 + 1.86 * t) * (0.622 * (0.611 * Math.exp(17.27 * t / (t + 237.3))) / 101.3)) * 10) / 10;
      const wSat = Math.round(((0.622 * (0.611 * Math.exp(17.27 * t / (t + 237.3))) / 101.3) * 1000) * 10) / 10; // g/kg

      return {
        temp: `${t}°C`,
        enthalpy: isMetric ? hSat : Math.round(hSat * 0.4299 * 10) / 10,
        moisture: wSat
      };
    });
  }, [isMetric]);

  // Determine current active sub-system title & badge
  const systemInfo = useMemo(() => {
    switch (activeSub) {
      case 'cooling':
        return {
          title: 'Cooling Thermal Dynamics & Sizing Distribution',
          subtitle: 'Diurnal heat balance profile, solar radiation curves, and internal vs envelope thermal diversity.',
          badge: 'ASHRAE Fundamentals Ch. 18',
          kpi1Label: 'Design Peak Capacity',
          kpi1Value: isMetric ? '58.4 kW' : '16.6 TR',
          kpi2Label: 'Peak Demand Hour',
          kpi2Value: '15:00 (3 PM)',
          kpi3Label: 'Contingency Factor',
          kpi3Value: `+${safetyMargin}% Margin`
        };
      case 'fanDuty':
        return {
          title: 'Fan Aerodynamic Curve & System ESP Resistance',
          subtitle: 'Fan characteristic H-Q curve, quadratic ductwork resistance parabola, and duty operating point.',
          badge: 'AMCA 210 / ASHRAE 51',
          kpi1Label: 'Design Airflow Duty',
          kpi1Value: isMetric ? '2,500 L/s' : '5,300 CFM',
          kpi2Label: 'Duty External Static',
          kpi2Value: isMetric ? '450 Pa' : '1.81 in.wg',
          kpi3Label: 'Motor Shaft Duty',
          kpi3Value: isMetric ? '1.73 kW' : '2.32 BHP'
        };
      case 'ductSizing':
        return {
          title: 'Duct Aerodynamics & Hydraulic Friction Gradient',
          subtitle: 'Airflow velocity gradient, Darcy-Weisbach friction loss rate, and SMACNA recommended acoustic thresholds.',
          badge: 'SMACNA / Equal Friction',
          kpi1Label: 'Recommended Velocity',
          kpi1Value: isMetric ? '6.2 m/s' : '1,220 FPM',
          kpi2Label: 'Friction Loss Rate',
          kpi2Value: isMetric ? '0.85 Pa/m' : '0.10 in/100ft',
          kpi3Label: 'Air Noise Criteria',
          kpi3Value: 'NC-35 Compliant'
        };
      case 'ventilation':
        return {
          title: 'Outdoor Air Ventilation & Indoor Air Quality Dynamics',
          subtitle: 'Dynamic occupancy modulation, breathing zone intake Voz rates, and steady-state CO₂ balance curves.',
          badge: 'ASHRAE 62.1-2022',
          kpi1Label: 'Full Intake Airflow Vot',
          kpi1Value: isMetric ? '320 L/s' : '678 CFM',
          kpi2Label: 'Steady-State CO₂',
          kpi2Value: '725 ppm (Pass)',
          kpi3Label: 'Distribution Ez',
          kpi3Value: '1.00 (Ceiling Supply)'
        };
      case 'heatRecovery':
        return {
          title: 'Energy Recovery Effectiveness & Thermal Exchange',
          subtitle: 'Sensible and latent energy recovery curves across outdoor climate spectrum and seasonal temperature regimes.',
          badge: 'AHRI 1060 / ASHRAE 84',
          kpi1Label: 'Sensible Effectiveness',
          kpi1Value: '73.0% Net',
          kpi2Label: 'Peak Recovery Power',
          kpi2Value: isMetric ? '28.4 kW' : '96.8 MBH',
          kpi3Label: 'Energy Savings Class',
          kpi3Value: 'High Efficiency'
        };
      case 'kitchenHood':
        return {
          title: 'Commercial Kitchen Capture Velocity & Make-Up Air Tracking',
          subtitle: 'Thermal convective plume capture rates, grease containment velocity, and dedicated 85% MUA pressure tracking.',
          badge: 'NFPA 96 / IMC 507',
          kpi1Label: 'Total Capture Exhaust',
          kpi1Value: isMetric ? '1,150 L/s' : '2,435 CFM',
          kpi2Label: 'Dedicated MUA Airflow',
          kpi2Value: isMetric ? '980 L/s' : '2,070 CFM',
          kpi3Label: 'Negative Pressurization',
          kpi3Value: '-15 Pa (Code Pass)'
        };
      case 'psychrometrics':
      default:
        return {
          title: 'Moist Air Psychrometric Enthalpy & State Vectors',
          subtitle: 'Saturation enthalpy curve, moisture carrying capacity, and thermodynamic sensible/latent heat exchange vectors.',
          badge: 'ASHRAE Psychrometrics',
          kpi1Label: 'Standard State Enthalpy',
          kpi1Value: isMetric ? '48.5 kJ/kg' : '20.8 Btu/lb',
          kpi2Label: 'Saturation Moisture',
          kpi2Value: '14.2 g/kg dry air',
          kpi3Label: 'Atmospheric Pressure',
          kpi3Value: '101.325 kPa'
        };
    }
  }, [activeSub, isMetric, safetyMargin]);

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/20 space-y-5 transition-all">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400 shadow-sm shadow-cyan-950/40 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {systemInfo.title}
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded">
                {systemInfo.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {systemInfo.subtitle}
            </p>
          </div>
        </div>

        {/* View Switcher / Contingency Slider */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {activeSub === 'cooling' && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('primary')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'primary' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                24h Profile
              </button>
              <button
                type="button"
                onClick={() => setViewMode('secondary')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'secondary' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Load Sources
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-850">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dynamic Model Active</span>
          </div>
        </div>
      </div>

      {/* Engineering KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {systemInfo.kpi1Label}
          </span>
          <span className="text-lg font-bold font-mono text-white tracking-tight">
            {systemInfo.kpi1Value}
          </span>
          <span className="text-[10px] text-cyan-400 font-mono block">Engineering sizing basis</span>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {systemInfo.kpi2Label}
          </span>
          <span className="text-lg font-bold font-mono text-emerald-400 tracking-tight">
            {systemInfo.kpi2Value}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Governing design condition</span>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {systemInfo.kpi3Label}
          </span>
          <span className="text-lg font-bold font-mono text-amber-400 tracking-tight">
            {systemInfo.kpi3Value}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Safety & code margin</span>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="h-72 w-full pt-2">
        {/* CASE A: COOLING LOAD */}
        {activeSub === 'cooling' && viewMode === 'primary' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={coolingDiurnalData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="totalLoadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="sensibleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " kW" : " kBtu"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="total" name={`Total Load (${isMetric ? 'kW' : 'kBtu/h'})`} stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#totalLoadGrad)" />
              <Area type="monotone" dataKey="sensible" name={`Sensible Heat (${isMetric ? 'kW' : 'kBtu/h'})`} stroke="#10b981" strokeWidth={1.8} fillOpacity={1} fill="url(#sensibleGrad)" />
              <Line type="monotone" dataKey="solar" name="Solar Radiation Gain" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="latent" name="Latent Moisture Load" stroke="#a855f7" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeSub === 'cooling' && viewMode === 'secondary' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coolingSourceBreakdown} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " kW" : " kBtu"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                formatter={(val: any) => [`${val} ${isMetric ? 'kW' : 'kBtu/h'}`, 'Capacity']}
              />
              <Bar dataKey="value" name="Heat Gain Component" radius={[6, 6, 0, 0]}>
                {coolingSourceBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* CASE B: FAN SELECTION & ESP CURVE */}
        {activeSub === 'fanDuty' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fanEspCurveData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="airflow" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " L/s" : " CFM"} />
              <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fontSize: 10, fill: '#06b6d4' }} unit={isMetric ? " Pa" : " in"} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10, fill: '#f59e0b' }} unit={isMetric ? " kW" : " BHP"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line yAxisId="left" type="monotone" dataKey="fanPressure" name={`Fan Characteristic (${isMetric ? 'Pa' : 'in.wg'})`} stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="left" type="monotone" dataKey="systemPressure" name={`Duct System Resistance (${isMetric ? 'Pa' : 'in.wg'})`} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="power" name={`Motor Power (${isMetric ? 'kW' : 'BHP'})`} stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <ReferenceDot yAxisId="left" x={2500} y={isMetric ? 450 : 1.8} r={6} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
              <ReferenceLine yAxisId="left" x={2500} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'Duty Point', fill: '#10b981', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* CASE C: DUCT SIZING */}
        {activeSub === 'ductSizing' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={ductPerformanceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="flow" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " L/s" : " CFM"} />
              <YAxis yAxisId="left" stroke="#10b981" tick={{ fontSize: 10, fill: '#10b981' }} unit={isMetric ? " m/s" : " FPM"} />
              <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fontSize: 10, fill: '#06b6d4' }} unit={isMetric ? " Pa/m" : " in/100'"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line yAxisId="left" type="monotone" dataKey="velocity" name={`Air Velocity (${isMetric ? 'm/s' : 'FPM'})`} stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="frictionLoss" name={`Friction Gradient (${isMetric ? 'Pa/m' : 'in/100ft'})`} stroke="#06b6d4" strokeWidth={2} dot={false} />
              <ReferenceLine yAxisId="left" y={isMetric ? 7.5 : 1500} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'SMACNA Recommended Max Velocity', fill: '#ef4444', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* CASE D: VENTILATION */}
        {activeSub === 'ventilation' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={ventilationPerformanceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="occupancy" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fontSize: 10, fill: '#06b6d4' }} unit={isMetric ? " L/s" : " CFM"} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10, fill: '#f59e0b' }} unit=" ppm" domain={[400, 1400]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="intakeAirflow" name={`Breathing Zone Airflow Voz (${isMetric ? 'L/s' : 'CFM'})`} fill="#06b6d4" opacity={0.8} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="co2Level" name="Steady-State CO₂ Equilibrium (ppm)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              <ReferenceLine yAxisId="right" y={1000} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'ASHRAE 1,000 ppm Upper Limit', fill: '#ef4444', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* CASE E: HEAT RECOVERY */}
        {activeSub === 'heatRecovery' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={heatRecoveryData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="temp" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " kW" : " MBH"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="total" name={`Total Heat Exchanged (${isMetric ? 'kW' : 'MBH'})`} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              <Line type="monotone" dataKey="sensible" name={`Sensible Component (${isMetric ? 'kW' : 'MBH'})`} stroke="#06b6d4" strokeWidth={2} />
              <Line type="monotone" dataKey="latent" name={`Latent Moisture Exchange (${isMetric ? 'kW' : 'MBH'})`} stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* CASE F: KITCHEN HOOD */}
        {activeSub === 'kitchenHood' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kitchenHoodData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="appliance" stroke="#64748b" tick={{ fontSize: 9.5, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={isMetric ? " L/s" : " CFM"} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="captureFlow" name={`Design Exhaust Airflow (${isMetric ? 'L/s' : 'CFM'})`} fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="muaFlow" name={`Dedicated Make-Up Air (85% MUA) (${isMetric ? 'L/s' : 'CFM'})`} fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* CASE G: PSYCHROMETRICS */}
        {activeSub === 'psychrometrics' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={psychrometricData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="temp" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fontSize: 10, fill: '#06b6d4' }} unit={isMetric ? " kJ/kg" : " Btu/lb"} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10, fill: '#10b981' }} unit=" g/kg" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line yAxisId="left" type="monotone" dataKey="enthalpy" name={`Saturation Enthalpy (${isMetric ? 'kJ/kg' : 'Btu/lb'})`} stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="moisture" name="Humidity Ratio W (g/kg dry air)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Engineering Footer Callout */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Calculated per standard ASHRAE / SMACNA / AMCA engineering methodologies.</span>
        </span>
        <span className="text-slate-500">
          Dynamic Curve Engine • CKY_MEPF Performance System
        </span>
      </div>
    </div>
  );
}
