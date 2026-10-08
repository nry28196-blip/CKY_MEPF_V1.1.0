/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Info, HelpCircle, Sparkles, BarChart2, PieChart as PieIcon, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface TrendVisualizerProps {
  type: 
    | 'ductSizing' 
    | 'cooling' 
    | 'electrical' 
    | 'plumbing_fixtures' 
    | 'plumbing_tanks' 
    | 'plumbing_pumps' 
    | 'fire_sizing' 
    | 'fire_pump';
  currentParams: any;
}

export default function TrendVisualizer({ type, currentParams }: TrendVisualizerProps) {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeCurve, setActiveCurve] = useState<string>('default');
  const [viewType, setViewType] = useState<'trend' | 'results'>('trend');
  const [coolingBenchmarks, setCoolingBenchmarks] = useState([
    { id: 1, value: 100, enabled: true },
    { id: 2, value: 120, enabled: true },
    { id: 3, value: 150, enabled: true },
    { id: 4, value: 180, enabled: true },
    { id: 5, value: 200, enabled: true }
  ]);

  // Sync isDarkMode with system or local storage
  useEffect(() => {
    const checkTheme = () => {
      const saved = localStorage.getItem('cky_mepf_theme');
      setIsDark(saved !== 'light');
    };
    checkTheme();

    const observer = new MutationObserver(() => {
      const hasDarkClass = document.documentElement.classList.contains('dark') || 
                           document.body.classList.contains('dark') ||
                           localStorage.getItem('cky_mepf_theme') !== 'light';
      setIsDark(hasDarkClass);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', checkTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  // Theme-sensitive styling tokens
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const labelColor = isDark ? '#94a3b8' : '#475569'; // slate-400 / slate-600
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#cbd5e1';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  // ----------------------------------------------------
  // DATA GENERATION ENGINES FOR EACH PHYSICS MODEL
  // ----------------------------------------------------

  
  
  // Helper function to validate IPC Data Table against standard constants
  const validateIPCHuntersCurve = () => {
    // Standard baseline values to verify against
    const CONSTANTS = {
      TANK_10: 14.6, TANK_100: 43.5, TANK_500: 124,
      VALVE_10: 27, VALVE_100: 67.5, VALVE_500: 143
    };
    
    let isValid = true;
    
    const checkPoint = (data, x, expectedY, label) => {
      const point = data.find(p => p[0] === x);
      if (!point || point[1] !== expectedY) {
        console.error(`IPC Validation Error (${label}): Expected ${expectedY} at ${x} WSFU, found ${point ? point[1] : 'undefined'}`);
        isValid = false;
      }
    };
    
    // Test sets (using the same arrays defined inside the function below)
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

    checkPoint(ipcTankData, 10, CONSTANTS.TANK_10, 'Tank 10 WSFU');
    checkPoint(ipcTankData, 100, CONSTANTS.TANK_100, 'Tank 100 WSFU');
    checkPoint(ipcTankData, 500, CONSTANTS.TANK_500, 'Tank 500 WSFU');
    
    checkPoint(ipcValveData, 10, CONSTANTS.VALVE_10, 'Valve 10 WSFU');
    checkPoint(ipcValveData, 100, CONSTANTS.VALVE_100, 'Valve 100 WSFU');
    checkPoint(ipcValveData, 500, CONSTANTS.VALVE_500, 'Valve 500 WSFU');
    
    if (isValid) {
      console.log('IPC Hunter\'s Curve (Visualizer) validated against standard constants.');
    }
    
    return isValid;
  };

  const getHuntersFlowGPM = (wsfu: number, type: 'valve' | 'tank') => {
    validateIPCHuntersCurve();
    
    if (wsfu <= 0) return 0;
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

    const data = type === 'valve' ? ipcValveData : ipcTankData;

    if (wsfu >= 500) {
      const baseGPM = type === 'valve' ? 143 : 124;
      return baseGPM + ((wsfu - 500) * 0.15);
    }

    for (let i = 0; i < data.length - 1; i++) {
      const [x1, y1] = data[i];
      const [x2, y2] = data[i + 1];
      if (wsfu >= x1 && wsfu <= x2) {
        if (wsfu === x1) return y1;
        if (wsfu === x2) return y2;
        return y1 + ((wsfu - x1) * (y2 - y1) / (x2 - x1));
      }
    }
    return 0;
  };

  const generateData = () => {
    const list: any[] = [];

    switch (type) {
      case 'electrical': {
        const power = Number(currentParams.power) || 15;
        const voltage = Number(currentParams.voltage) || 400;
        const pf = Number(currentParams.powerFactor) || 0.85;

        // Generate FLC current vs Power from 1 kW up to max(50, power * 2)
        const maxKw = Math.max(50, power * 2);
        const steps = 10;
        const stepSize = maxKw / steps;

        for (let i = 0; i <= steps; i++) {
          const kw = Math.max(1, Math.round(i * stepSize * 10) / 10);
          
          // 3-Phase Current: I = P * 1000 / (V * PF * sqrt(3))
          const current3P = (kw * 1000) / (voltage * pf * Math.sqrt(3));
          
          // 1-Phase Current: I = P * 1000 / (230 * PF)
          const current1P = (kw * 1000) / (230 * pf);

          list.push({
            powerKw: kw,
            '3-Phase FLC (A)': parseFloat((current3P || 0).toFixed(2)),
            '1-Phase FLC (A)': parseFloat((current1P || 0).toFixed(2)),
          });
        }
        break;
      }

      case 'cooling': {
        const area = Number(currentParams.area) || 50;
        const maxArea = Math.max(100, area * 2);
        const steps = 10;
        const stepSize = maxArea / steps;
        const res = currentParams.results;
        
        for (let i = 0; i <= steps; i++) {
          const a = Math.max(5, Math.round(i * stepSize));
          if (a === area) continue; // We add the exact area point below
          
          const point: any = { areaM2: a };
          coolingBenchmarks.filter(b => b.enabled).forEach(b => {
             point[`${b.value} W/m² Benchmark`] = parseFloat(((a * b.value / 1000) || 0).toFixed(2));
          });
          list.push(point);
        }
        
        const exactPoint: any = { areaM2: area };
        coolingBenchmarks.filter(b => b.enabled).forEach(b => {
             exactPoint[`${b.value} W/m² Benchmark`] = parseFloat(((area * b.value / 1000) || 0).toFixed(2));
        });
        
        if (res && res.calculatedTotal !== undefined) {
           const actualKw = res.calculatedTotal / 1000;
           const finalKw = res.finalTotal / 1000;
           exactPoint['Actual Calculated Load'] = parseFloat((actualKw || 0).toFixed(3));
           exactPoint['Final Design Load'] = parseFloat((finalKw || 0).toFixed(3));
           exactPoint['Actual Load Density (W/m²)'] = Math.round(res.calculatedTotal / area);
           exactPoint['Final Load Density (W/m²)'] = Math.round(res.finalTotal / area);
        }
        
        list.push(exactPoint);
        list.sort((a, b) => a.areaM2 - b.areaM2);
        
        break;
      }

      case 'ductSizing': {
        // Equal Friction duct sizing: Width (in) vs Airflow (CFM) at constant friction and constant Height
        const airflow = Number(currentParams.airflow) || 2500;
        const height = Number(currentParams.ductHeight) || 12;
        const friction = Number(currentParams.frictionRate) || 0.1;

        const maxCfm = Math.max(5000, airflow * 1.8);
        const steps = 12;
        const stepSize = maxCfm / steps;

        for (let i = 1; i <= steps; i++) {
          const cfm = Math.round(i * stepSize);
          
          // 1. Compute round duct diameter 'de' using friction rate & CFM:
          // de = 0.1091 * (CFM^1.9) / (friction^0.38) or similar standard hydraulic approx:
          // Standard ASHRAE: de = 1.63 * (cfm^0.38) / (friction^0.19) -- let's use standard approximation
          const de = Math.pow((0.1091 * Math.pow(cfm, 1.9)) / friction, 0.2); // approx inches diameter
          
          // 2. Rectangular duct Width 'w' keeping Height constant:
          // ASHRAE Huebscher relation: de = 1.30 * ((a*b)^0.625) / ((a+b)^0.25)
          // For simplicity and stability, we use proportional area matching with friction friction factors
          const areaReq = cfm / (currentParams.velocityLimit || 1200); // sq ft
          let w = Math.round((areaReq * 144) / height);
          w = Math.max(4, Math.round(w / 2) * 2); // rounded to nearest even inch

          // Velocity round & rect
          const velFpm = cfm / ((w * height) / 144);

          list.push({
            cfm,
            'Equivalent Diameter (in)': parseFloat((de || 0).toFixed(1)),
            'Calculated Width (in)': w,
            'Velocity (FPM)': parseFloat((velFpm || 0).toFixed(0)),
          });
        }
        break;
      }

      case 'plumbing_fixtures': {
        const isBS = currentParams.standard === 'bs';
        const activeLoad = isBS ? (currentParams.totalLU !== undefined ? Number(currentParams.totalLU) : 20) : (currentParams.totalWSFU !== undefined ? Number(currentParams.totalWSFU) : 20);
        const maxLu = Math.max(150, activeLoad * 1.8);
        
        const ipcXValues = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250, 275, 300, 400, 500];
        const xValuesSet = new Set(ipcXValues.filter(x => x <= maxLu));
        xValuesSet.add(activeLoad);
        
        const sortedX = Array.from(xValuesSet).sort((a, b) => a - b);
        
        for (const lu of sortedX) {
          const q_bs = 0.09 * Math.sqrt(lu);
          const q_ipc_valve = getHuntersFlowGPM(lu, 'valve') * 0.06309;
          const q_ipc_tank = getHuntersFlowGPM(lu, 'tank') * 0.06309;

          list.push({
            loadingUnits: lu,
            'BS EN 806-3 Standard (L/s)': parseFloat((q_bs || 0).toFixed(3)),
            'IPC Hunter - Flush Valve (L/s)': parseFloat((q_ipc_valve || 0).toFixed(3)),
            'IPC Hunter - Flush Tank (L/s)': parseFloat((q_ipc_tank || 0).toFixed(3)),
          });
        }
        break;
      }

      case 'plumbing_tanks': {
        const occupants = Number(currentParams.occupants) || 120;
        const rate = Number(currentParams.consumptionRate) || 120;
        const days = Number(currentParams.storageDays) || 2;

        // Storage Volume vs Occupants
        const maxOcc = Math.max(250, occupants * 1.8);
        const steps = 10;
        const stepSize = maxOcc / steps;

        for (let i = 0; i <= steps; i++) {
          const occ = Math.max(10, Math.round(i * stepSize));
          
          const waterStorage = (occ * rate * days) / 1000; // m³
          const septicVolume = (occ * Number(currentParams.septicDischarge || 80) * 1.5 + occ * 30 * Number(currentParams.septicDesludgeInterval || 3)) / 1000; // m³

          list.push({
            occupantsCount: occ,
            'Potable Water Tank (m³)': parseFloat((waterStorage || 0).toFixed(1)),
            'Sewerage Septic Tank (m³)': parseFloat((septicVolume || 0).toFixed(1)),
          });
        }
        break;
      }

      case 'plumbing_pumps': {
        const height = Number(currentParams.boosterStaticHead) || 35;
        const peakLps = Number(currentParams.peakFlowLps) || 1.5;
        const efficiency = Number(currentParams.boosterEfficiency) || 68;
        const residual = Number(currentParams.boosterResidualPress) || 2.0;

        // Pump Motor HP vs Building Height (Static Lift) from 10m to 100m
        const steps = 10;
        const maxH = 100;
        const stepSize = maxH / steps;

        for (let i = 1; i <= steps; i++) {
          const h = Math.round(i * stepSize);
          
          // Booster pump head calculation: Head = static + friction (15%) + residual pressure (1 bar ≈ 10.2m)
          const totalHead = h + (h * (Number(currentParams.boosterFrictionPercent || 15) / 100)) + (residual * 10.197);
          
          // Booster HP:
          const flowLps = peakLps || 1.5;
          const hydraulicPower = (flowLps * 9.81 * totalHead) / 1000; // kW
          const shaftPower = hydraulicPower / (efficiency / 100);
          const hp = shaftPower * 1.341;

          list.push({
            buildingHeightM: h,
            'Required Booster Pump (HP)': parseFloat((Math.max(0.1, hp) || 0).toFixed(2)),
          });
        }
        break;
      }

      case 'fire_sizing': {
        // Fire Storage Tank Volume vs Duration (minutes) comparing Hazard classes
        const flowLpm = Number(currentParams.totalWaterDemandLpm) || 1500;
        const duration = Number(currentParams.flowDuration) || 60;

        // Plot Water Tank Volume (m³) vs Duration from 10 to 120 mins
        const steps = 12;
        const stepSize = 120 / steps;

        for (let i = 1; i <= steps; i++) {
          const mins = Math.round(i * stepSize);

          // Volume = Flow (L/min) * Duration (min) / 1000 = m³
          // Compare Light (e.g. 500 Lpm), Ordinary (1500 Lpm) and Extra Hazard (3000 Lpm)
          const volLight = (500 * mins) / 1000;
          const volOrdinary = (1500 * mins) / 1000;
          const volExtra = (3000 * mins) / 1000;

          list.push({
            durationMins: mins,
            'Light Hazard (m³)': parseFloat((volLight || 0).toFixed(1)),
            'Ordinary Hazard (m³)': parseFloat((volOrdinary || 0).toFixed(1)),
            'Extra Hazard (m³)': parseFloat((volExtra || 0).toFixed(1)),
          });
        }
        break;
      }

      default:
        break;
    }

    return list;
  };

  const data = generateData();

  const generateResultsData = () => {
    switch (type) {
      case 'cooling': {
        const res = currentParams.results;
        if (!res) return []; // Fallback
        
        return [
          { name: 'People', value: res.peopleSensible + res.peopleLatent, color: '#f43f5e', display: `${Math.round(res.peopleSensible + res.peopleLatent).toLocaleString()} W` },
          { name: 'Lighting', value: res.lightingSensible, color: '#facc15', display: `${Math.round(res.lightingSensible).toLocaleString()} W` },
          { name: 'Equipment', value: res.equipmentSensible, color: '#818cf8', display: `${Math.round(res.equipmentSensible).toLocaleString()} W` },
          { name: 'Envelope', value: res.wallSensible + res.roofSensible + res.windowCondSensible, color: '#4ade80', display: `${Math.round(res.wallSensible + res.roofSensible + res.windowCondSensible).toLocaleString()} W` },
          { name: 'Solar', value: res.solarSensible, color: '#fb923c', display: `${Math.round(res.solarSensible).toLocaleString()} W` },
          { name: 'Ventilation', value: res.ventSensible + res.ventLatent, color: '#38bdf8', display: `${Math.round(res.ventSensible + res.ventLatent).toLocaleString()} W` },
          { name: 'Infiltration', value: res.infiltrationSensible + res.infiltrationLatent, color: '#94a3b8', display: `${Math.round(res.infiltrationSensible + res.infiltrationLatent).toLocaleString()} W` }
        ];
      }

      case 'ductSizing': {
        const airflow = Number(currentParams.airflow) || 2500;
        const friction = Number(currentParams.frictionRate) || 0.1;
        const velocityLimit = Number(currentParams.velocityLimit) || 1200;
        const areaReq = airflow / velocityLimit; // sq ft
        
        return [8, 10, 12, 14, 16, 18, 20].map((h, idx) => {
          let w = Math.round((areaReq * 144) / h);
          w = Math.max(4, Math.round(w / 2) * 2);
          const vel = Math.round(airflow / ((w * h) / 144));
          return {
            name: `${h}" H`,
            'Required Width (in)': w,
            'Velocity (FPM)': vel,
            color: idx % 2 === 0 ? '#10b981' : '#06b6d4'
          };
        });
      }

      case 'electrical': {
        const power = Number(currentParams.power) || 15;
        const pf = Number(currentParams.powerFactor) || 0.85;
        return [
          { name: '120V (1-Ph)', 'Current (Amps)': parseFloat((((power * 1000) / (120 * pf)) || 0).toFixed(1)), color: '#ef4444' },
          { name: '230V (1-Ph)', 'Current (Amps)': parseFloat((((power * 1000) / (230 * pf)) || 0).toFixed(1)), color: '#f59e0b' },
          { name: '230V (3-Ph)', 'Current (Amps)': parseFloat((((power * 1000) / (230 * pf * Math.sqrt(3))) || 0).toFixed(1)), color: '#3b82f6' },
          { name: '400V (3-Ph)', 'Current (Amps)': parseFloat((((power * 1000) / (400 * pf * Math.sqrt(3))) || 0).toFixed(1)), color: '#10b981' },
          { name: '480V (3-Ph)', 'Current (Amps)': parseFloat((((power * 1000) / (480 * pf * Math.sqrt(3))) || 0).toFixed(1)), color: '#8b5cf6' }
        ];
      }

      case 'plumbing_fixtures': {
        const isBS = currentParams.standard === 'bs';
        const activeLoad = isBS ? (currentParams.totalLU !== undefined ? Number(currentParams.totalLU) : 20) : (currentParams.totalWSFU !== undefined ? Number(currentParams.totalWSFU) : 20);
        const q_bs = 0.09 * Math.sqrt(activeLoad);
        const q_ipc_valve = getHuntersFlowGPM(activeLoad, 'valve') * 0.06309;
        const q_ipc_tank = getHuntersFlowGPM(activeLoad, 'tank') * 0.06309;

        return [
          { name: 'BS EN 806-3 Standard', 'Flow Rate (L/s)': parseFloat((q_bs || 0).toFixed(2)), color: '#06b6d4' },
          { name: 'IPC Hunter Valve', 'Flow Rate (L/s)': parseFloat((q_ipc_valve || 0).toFixed(2)), color: '#ef4444' },
          { name: 'IPC Hunter Tank', 'Flow Rate (L/s)': parseFloat((q_ipc_tank || 0).toFixed(2)), color: '#f59e0b' }
        ];
      }

      case 'plumbing_tanks': {
        const occupants = Number(currentParams.occupants) || 120;
        const rate = Number(currentParams.consumptionRate) || 120;
        const days = Number(currentParams.storageDays) || 2;
        const potableVol = (occupants * rate * days) / 1000;
        const septicVol = (occupants * Number(currentParams.septicDischarge || 80) * 1.5 + occupants * 30 * Number(currentParams.septicDesludgeInterval || 3)) / 1000;
        
        return [
          { name: 'Potable Water Tank', 'Volume (m³)': parseFloat((potableVol || 0).toFixed(1)), color: '#06b6d4' },
          { name: 'Sewerage Septic Tank', 'Volume (m³)': parseFloat((septicVol || 0).toFixed(1)), color: '#f59e0b' }
        ];
      }

      case 'plumbing_pumps': {
        const height = Number(currentParams.boosterStaticHead) || 35;
        const peakLps = Number(currentParams.peakFlowLps) || 1.5;
        const residual = Number(currentParams.boosterResidualPress) || 2.0;
        const totalHead = height + (height * (Number(currentParams.boosterFrictionPercent || 15) / 100)) + (residual * 10.197);
        const hydraulicPower = (peakLps * 9.81 * totalHead) / 1000;

        return [40, 55, 70, 85].map((eff, idx) => {
          const shaftPower = hydraulicPower / (eff / 100);
          const hp = shaftPower * 1.341;
          return {
            name: `${eff}% Eff`,
            'Required Power (HP)': parseFloat((Math.max(0.1, hp) || 0).toFixed(2)),
            color: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : '#10b981'
          };
        });
      }

      case 'fire_sizing': {
        const flowLpm = Number(currentParams.totalWaterDemandLpm) || 1500;
        const duration = Number(currentParams.flowDuration) || 60;
        const volLight = (500 * duration) / 1000;
        const volOrdinary = (1500 * duration) / 1000;
        const volExtra = (3000 * duration) / 1000;
        const currentVol = (flowLpm * duration) / 1000;

        return [
          { name: 'Light Hazard', 'Tank Volume (m³)': parseFloat((volLight || 0).toFixed(1)), color: '#10b981' },
          { name: 'Ordinary Hazard', 'Tank Volume (m³)': parseFloat((volOrdinary || 0).toFixed(1)), color: '#f59e0b' },
          { name: 'Extra Hazard', 'Tank Volume (m³)': parseFloat((volExtra || 0).toFixed(1)), color: '#ef4444' },
          { name: 'Your Calculated', 'Tank Volume (m³)': parseFloat((currentVol || 0).toFixed(1)), color: '#3b82f6' }
        ];
      }

      default:
        return [];
    }
  };

  const resultsData: any[] = generateResultsData();

  // Determine current operating value for drawing the current point indicator
  let currentXValue: number | null = null;
  let currentYValue: number | null = null;
  let referenceName = '';

  if (type === 'electrical') {
    currentXValue = Number(currentParams.power) || 15;
    // calculate current
    const p = currentXValue;
    const pf = Number(currentParams.powerFactor) || 0.85;
    const v = Number(currentParams.voltage) || 400;
    if (currentParams.phase === 'three') {
      currentYValue = parseFloat((((p * 1000) / (v * pf * Math.sqrt(3))) || 0).toFixed(2));
      referenceName = '3-Phase FLC (A)';
    } else {
      currentYValue = parseFloat((((p * 1000) / (230 * pf)) || 0).toFixed(2));
      referenceName = '1-Phase FLC (A)';
    }
  } else if (type === 'cooling') {
    // Relying on native Line dot rendering for actual and final loads
    currentXValue = null;
    currentYValue = null;
  } else if (type === 'ductSizing') {
    currentXValue = Number(currentParams.airflow) || 2500;
    const height = Number(currentParams.ductHeight) || 12;
    const friction = Number(currentParams.frictionRate) || 0.1;
    const de = Math.pow((0.1091 * Math.pow(currentXValue, 1.9)) / friction, 0.2);
    currentYValue = parseFloat((de || 0).toFixed(1));
    referenceName = 'Equivalent Diameter (in)';
  } else if (type === 'plumbing_fixtures') {
    const isBS = currentParams.standard === 'bs';
    const isValve = currentParams.systemType === 'valve';
    currentXValue = isBS ? (currentParams.totalLU !== undefined ? Number(currentParams.totalLU) : 20) : (currentParams.totalWSFU !== undefined ? Number(currentParams.totalWSFU) : 20);
    currentYValue = currentParams.peakFlowLps !== undefined ? Number(currentParams.peakFlowLps) : 0;
    referenceName = isBS ? 'BS EN 806-3 Standard (L/s)' : (isValve ? 'IPC Hunter - Flush Valve (L/s)' : 'IPC Hunter - Flush Tank (L/s)');
    console.log('[TrendVisualizer Debug] plumbing_fixtures');
    console.log('  isBS:', isBS);
    console.log('  totalLU:', currentParams.totalLU);
    console.log('  totalWSFU:', currentParams.totalWSFU);
    console.log('  currentXValue:', currentXValue);
    console.log('  currentYValue:', currentYValue);
  } else if (type === 'plumbing_tanks') {
    currentXValue = Number(currentParams.occupants) || 120;
    currentYValue = Number(currentParams.totalWaterStorageLiters || 0) / 1000;
    referenceName = 'Potable Water Tank (m³)';
  } else if (type === 'plumbing_pumps') {
    currentXValue = Number(currentParams.boosterStaticHead) || 35;
    currentYValue = Number(currentParams.boosterHP) || 0;
    referenceName = 'Required Booster Pump (HP)';
  } else if (type === 'fire_sizing') {
    currentXValue = Number(currentParams.flowDuration) || 60;
    currentYValue = Number(currentParams.storageTankVolumeLiters || 0) / 1000;
    referenceName = currentParams.hazard === 'light' ? 'Light Hazard (m³)' : currentParams.hazard === 'extra' ? 'Extra Hazard (m³)' : 'Ordinary Hazard (m³)';
  }

  // Render descriptive header elements depending on type
  const getHeaderInfo = () => {
    switch (type) {
      case 'electrical':
        return {
          title: 'Power Demand & FLC scaling',
          yAxisLabel: 'Amperage (Amps)',
          xAxisLabel: 'Equip. Load Power (kW)',
          description: `Visualizes full load current. Notice how 3-Phase lines maintain much lower line current than 1-Phase lines under identical load power, which minimizes transformer strain and cable diameter.`,
          iconColor: 'text-amber-400',
        };
      case 'cooling': {
        const isVolume = currentParams.estimationBasis === 'volume';
        return {
          title: viewType === 'trend' ? 'COOLING CAPACITY VS. AREA TRENDS' : 'ESTIMATED COOLING CAPACITY',
          yAxisLabel: 'Cooling Load (kW)',
          xAxisLabel: isVolume ? 'Room Volume (m³)' : 'Floor Area (m²)',
          description: viewType === 'trend' 
            ? 'Compares the calculated room cooling requirement with selectable area-based benchmark values. Benchmark values are preliminary rule-of-thumb references and are not a substitute for detailed cooling-load calculations.' 
            : 'Visualizes the composition of the total room cooling requirement.',
          iconColor: 'text-emerald-400',
        };
      }
      case 'ductSizing':
        return {
          title: 'Dynamic Equal Friction Airflow Curves',
          yAxisLabel: 'Equivalent Dia / Width (inches)',
          xAxisLabel: 'Volumetric Airflow (CFM)',
          description: `Visualizes round equivalent diameter and width required for a constant duct height of ${currentParams.ductHeight} inches at ${currentParams.frictionRate} in.wg friction rate.`,
          iconColor: 'text-emerald-400',
        };
      case 'plumbing_fixtures':
        return {
          title: 'BS EN 806-3 vs IPC Hunter\'s Curves',
          yAxisLabel: 'Flow Rate (L/s)',
          xAxisLabel: 'Design Loading Units (LU / WSFU)',
          description: 'Compare peak water demand standards. Hunter\'s Curve (US) integrates higher statistical load buffer margins for flash flush loads than British/European standards.',
          iconColor: 'text-cyan-400',
        };
      case 'plumbing_tanks':
        return {
          title: 'Water & Waste Storage Scaling',
          yAxisLabel: 'Storage Tank Volume (m³)',
          xAxisLabel: 'Building Occupant Count',
          description: 'Calculates necessary volume capacity for drinking water reservoirs and septic digestion tanks relative to building occupancy scaling.',
          iconColor: 'text-cyan-400',
        };
      case 'plumbing_pumps':
        return {
          title: 'Booster Pump Motor Sizing Curve',
          yAxisLabel: 'Booster Horsepower (HP)',
          xAxisLabel: 'Static Height of Building (meters)',
          description: `Calculates required booster pump size to lift ${currentParams.peakFlowLps?.toFixed(2) || '1.5'} L/s with ${currentParams.boosterResidualPress || '2.0'} bar fixture residual pressure, as a factor of building heights.`,
          iconColor: 'text-cyan-400',
        };
      case 'fire_sizing':
        return {
          title: 'Fire Water Reservoir Sizing Trends',
          yAxisLabel: 'Required Reservoir Capacity (m³)',
          xAxisLabel: 'Fire Suppression Flow Duration (minutes)',
          description: 'Visualizes water tank requirements based on BS and NFPA standards. Hazard classification dictates flow rates, which scale up drastically over duration periods.',
          iconColor: 'text-red-400',
        };
      default:
        return {
          title: 'Calculated Parameter Trends',
          yAxisLabel: 'Result Metric',
          xAxisLabel: 'Input Parameter',
          description: 'Visualize the scaling of output values against modifying key structural parameters.',
          iconColor: 'text-sky-400',
        };
    }
  };

  const header = getHeaderInfo();

  // Determine bar chart configuration based on module type
  const getBarChartKeys = () => {
    switch (type) {
      case 'ductSizing':
        return { dataKey: 'Required Width (in)', color: '#10b981', yLabel: 'Inches / FPM' };
      case 'electrical':
        return { dataKey: 'Current (Amps)', color: '#f59e0b', yLabel: 'Amps' };
      case 'plumbing_fixtures':
        return { dataKey: 'Flow Rate (L/s)', color: '#06b6d4', yLabel: 'L/s' };
      case 'plumbing_tanks':
        return { dataKey: 'Volume (m³)', color: '#06b6d4', yLabel: 'Volume (m³)' };
      case 'plumbing_pumps':
        return { dataKey: 'Required Power (HP)', color: '#3b82f6', yLabel: 'Horsepower (HP)' };
      case 'fire_sizing':
        return { dataKey: 'Tank Volume (m³)', color: '#ef4444', yLabel: 'Volume (m³)' };
      default:
        return { dataKey: 'value', color: '#3b82f6', yLabel: 'Value' };
    }
  };

  const barConfig = getBarChartKeys();


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (type === 'plumbing_fixtures') {
        const isCurrentPoint = currentXValue === label;
        return (
          <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 p-3.5 rounded-xl shadow-2xl min-w-[220px]">
            <p className="text-white font-bold mb-2 pb-2 border-b border-slate-800 text-sm">
              <span className="text-slate-400 font-medium">Load:</span> {label} WSFU / LU
            </p>
            {payload.map((entry: any, index: number) => {
              const gpm = ((entry.value / 0.06309) || 0).toFixed(1);
              return (
                <div key={index} className="flex justify-between items-center gap-6 text-xs my-1.5">
                  <span style={{ color: entry.color }} className="font-semibold">{entry.name}</span>
                  <div className="text-right flex flex-col">
                    <span className="text-white font-mono font-bold">{entry.value} L/s</span>
                    <span className="text-slate-400 font-mono text-[10px]">({gpm} GPM)</span>
                  </div>
                </div>
              );
            })}
            {isCurrentPoint && (
              <div className="mt-3 pt-2 border-t border-slate-800/80 bg-slate-900/50 -mx-1 -mb-1 p-2 rounded-lg">
                 <p className="text-[11px] text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5"/> Interpolated Calc Point
                 </p>
                 <p className="text-[10px] text-slate-400 leading-tight">
                   This exact WSFU load is interpolated linearly between adjacent standard points on the Hunter's curve.
                 </p>
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-xl">
          <p className="text-white font-bold mb-2 pb-2 border-b border-slate-800 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-xs my-1">
              <span style={{ color: entry.color }} className="font-semibold">{entry.name}:</span>
              <span className="text-white font-mono">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-slate-700 via-sky-500/40 to-slate-700" />
      
      {/* Header Info */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2.5">
            <TrendingUp className={`h-4.5 w-4.5 ${header.iconColor}`} />
            <h4 className="text-sm font-bold uppercase text-white tracking-wide whitespace-nowrap">{header.title}</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans" style={{ width: '519.15px' }}>{header.description}</p>
        </div>
        
        {/* Dynamic Chart Mode Switcher & Metric Selectors */}
        <div className="flex flex-col gap-3 items-start xl:items-end w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-3 justify-start xl:justify-end">
            <div className="flex items-center space-x-1.5 text-[10px] bg-sky-950/40 border border-sky-800/40 text-sky-400 px-3 py-1.5 rounded-full font-sans font-semibold">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>Sensitivity Analysis</span>
            </div>
            
            {/* Main Chart Type Selector */}
            <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1">
              <button
                onClick={() => setViewType('trend')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewType === 'trend' ? 'bg-sky-600 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Sensitivity Curve</span>
              </button>
              <button
                onClick={() => setViewType('results')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewType === 'results' ? 'bg-sky-600 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {type === 'cooling' ? <PieIcon className="h-3 w-3" /> : <BarChart2 className="h-3 w-3" />}
                <span>Results Chart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-selectors (Moved OUTSIDE the top flex row so they can span full width and truly center) */}
      {viewType === 'trend' && type === 'cooling' && (
        <div className="flex flex-wrap justify-center w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-[10px] font-bold uppercase gap-2 items-center mb-6">
          <div className="px-3 py-1.5 text-slate-500 w-full text-center sm:w-auto">Benchmarks:</div>
          
          {coolingBenchmarks.map(b => (
            <div key={b.id} className={`flex items-center rounded-md border ${b.enabled ? 'bg-slate-800 border-slate-700' : 'opacity-60 border-transparent'} overflow-hidden`}>
              
              <button
                onClick={() => {
                  const newB = [...coolingBenchmarks];
                  const idx = newB.findIndex(x => x.id === b.id);
                  newB[idx].enabled = !newB[idx].enabled;
                  setCoolingBenchmarks(newB);
                }}
                className={`px-3 py-1.5 transition-all cursor-pointer ${b.enabled ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'}`}
              >
                {b.enabled ? '✓' : 'X'}
              </button>
              
              <input
                type="number"
                value={b.value}
                onChange={(e) => {
                  const newB = [...coolingBenchmarks];
                  const idx = newB.findIndex(x => x.id === b.id);
                  newB[idx].value = Number(e.target.value);
                  setCoolingBenchmarks(newB);
                }}
                className="w-12 bg-transparent text-white focus:outline-none text-center py-1.5"
                disabled={!b.enabled}
              />
              
              <span className="pr-3 text-[10px] text-slate-400 normal-case">W/m²</span>
            </div>
          ))}
        </div>
      )}

      {viewType === 'trend' && type === 'ductSizing' && (
        <div className="flex flex-wrap justify-center w-full bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1 mb-6">
          <button
            onClick={() => setActiveCurve('default')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeCurve === 'default' ? 'bg-emerald-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Diameter vs Flow
          </button>
          <button
            onClick={() => setActiveCurve('velocity')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeCurve === 'velocity' ? 'bg-emerald-650 text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Velocity vs Flow
          </button>
        </div>
      )}
      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full font-mono text-[10px]">
        {viewType === 'results' && type === 'cooling' ? (
          <div className="w-full h-full relative -mt-2 mb-2 flex flex-col">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={resultsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {resultsData.map((d: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={d.color || '#38bdf8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}`, 'Load']}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col items-center justify-center gap-2 mt-[-10px] mb-2 relative z-10">
               <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Data Series: Cooling Capacity vs. Area Trends</div>
               <div className="flex justify-center flex-wrap gap-4 text-[10px] font-bold uppercase">
                 {resultsData.map((d: any, i: number) => (
                   <div key={i} className="flex items-center gap-1.5">
                     <span className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                     <span className="text-slate-400">{d.name.split(' ')[0]}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={260}>
          {viewType === 'results' ? (
            type === 'cooling' ? null : (
              <BarChart data={resultsData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={labelColor} tickLine={false} />
                <YAxis stroke={labelColor} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }} />
                <Legend verticalAlign="top" height={36} iconType="rect" />
                <Bar dataKey={barConfig.dataKey} name={barConfig.dataKey} radius={[6, 6, 0, 0]}>
                  {resultsData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || barConfig.color} />
                  ))}
                </Bar>
                {type === 'ductSizing' && (
                  <Bar dataKey="Velocity (FPM)" name="Velocity (FPM)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            )
          ) : (
            type === 'fire_sizing' || type === 'plumbing_tanks' ? (
              <AreaChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorArea1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorArea2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorArea3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  dataKey={type === 'fire_sizing' ? 'durationMins' : 'occupantsCount'} 
                  stroke={labelColor} 
                  tickLine={false}
                />
                <YAxis stroke={labelColor} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                
                {type === 'fire_sizing' ? (
                  <>
                    <Area type="monotone" dataKey="Extra Hazard (m³)" stroke="#ef4444" fillOpacity={1} fill="url(#colorArea1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Ordinary Hazard (m³)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorArea2)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Light Hazard (m³)" stroke="#10b981" fillOpacity={1} fill="url(#colorArea3)" strokeWidth={2} />
                  </>
                ) : (
                  <>
                    <Area type="monotone" dataKey="Potable Water Tank (m³)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorArea3)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Sewerage Septic Tank (m³)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorArea2)" strokeWidth={2} />
                  </>
                )}

                {currentXValue !== null && currentYValue !== null && (
                  <ReferenceDot 
                    x={currentXValue} 
                    y={currentYValue} 
                    r={5} 
                    fill="#ef4444" 
                    stroke="#ffffff" 
                    strokeWidth={2} 
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  dataKey={
                    type === 'electrical' ? 'powerKw' :
                    type === 'cooling' ? (currentParams.estimationBasis === 'volume' ? 'roomVolumeM3' : 'areaM2') :
                    type === 'ductSizing' ? 'cfm' :
                    type === 'plumbing_fixtures' ? 'loadingUnits' :
                    'buildingHeightM'
                  } 
                  stroke={labelColor}
                  tickLine={false}
                />
                <YAxis stroke={labelColor} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />

                {type === 'electrical' && (
                  <>
                    <Line type="monotone" dataKey="3-Phase FLC (A)" stroke="#f59e0b" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="1-Phase FLC (A)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" />
                  </>
                )}

                {type === 'cooling' && (
                  <>
                    {coolingBenchmarks.filter(b => b.enabled).map((b, idx) => {
                       const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
                       return (
                         <Line key={b.id} type="monotone" dataKey={`${b.value} W/m² Benchmark`} stroke={colors[idx % colors.length]} strokeWidth={2} strokeDasharray={idx > 1 ? "4 4" : ""} activeDot={{ r: 4 }} dot={false} />
                       );
                    })}
                    <Line type="monotone" dataKey="Actual Calculated Load" stroke="#ef4444" strokeWidth={0} dot={{ r: 6, fill: '#ef4444' }} activeDot={{ r: 8, fill: '#ef4444' }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Final Design Load" stroke="#06b6d4" strokeWidth={0} dot={{ r: 6, fill: '#06b6d4' }} activeDot={{ r: 8, fill: '#06b6d4' }} isAnimationActive={false} />
                  </>
                )}

                {type === 'ductSizing' && activeCurve === 'default' && (
                  <>
                    <Line type="monotone" dataKey="Equivalent Diameter (in)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Calculated Width (in)" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="2 2" />
                  </>
                )}

                {type === 'ductSizing' && activeCurve === 'velocity' && (
                  <>
                    <Line type="monotone" dataKey="Velocity (FPM)" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    {currentParams.velocityLimit && (
                      <ReferenceLine y={currentParams.velocityLimit} stroke="#b91c1c" strokeDasharray="4 4" label={{ value: `Velocity Limit (${currentParams.velocityLimit} FPM)`, fill: '#ef4444', position: 'insideBottomLeft', fontSize: 10 }} />
                    )}
                  </>
                )}

                {type === 'plumbing_fixtures' && (
                  <>
                    <Line type="linear" dataKey="IPC Hunter - Flush Valve (L/s)" stroke="#ef4444" strokeWidth={currentParams.systemType === 'valve' && currentParams.standard !== 'bs' ? 3.5 : 1} strokeDasharray={currentParams.systemType === 'valve' && currentParams.standard !== 'bs' ? "" : "4 4"} opacity={currentParams.standard === 'bs' ? 0.3 : (currentParams.systemType === 'valve' ? 1 : 0.5)} style={{ transition: 'all 0.5s ease-in-out' }} animationDuration={1000} />
                    <Line type="linear" dataKey="IPC Hunter - Flush Tank (L/s)" stroke="#f59e0b" strokeWidth={currentParams.systemType === 'tank' && currentParams.standard !== 'bs' ? 3.5 : 1} strokeDasharray={currentParams.systemType === 'tank' && currentParams.standard !== 'bs' ? "" : "4 4"} opacity={currentParams.standard === 'bs' ? 0.3 : (currentParams.systemType === 'tank' ? 1 : 0.5)} style={{ transition: 'all 0.5s ease-in-out' }} animationDuration={1000} />
                    <Line type="monotone" dataKey="BS EN 806-3 Standard (L/s)" stroke="#06b6d4" strokeWidth={currentParams.standard === 'bs' ? 3.5 : 1.5} strokeDasharray={currentParams.standard === 'bs' ? "" : "4 4"} activeDot={{ r: 6 }} opacity={currentParams.standard !== 'bs' ? 0.3 : 1} style={{ transition: 'all 0.5s ease-in-out' }} animationDuration={1000} />
                  </>
                )}

                {type === 'plumbing_pumps' && (
                  <Line type="monotone" dataKey="Required Booster Pump (HP)" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 6 }} />
                )}

                {/* Show point of interest overlay */}
                {currentXValue !== null && currentYValue !== null && (
                  <ReferenceDot 
                    x={currentXValue} 
                    y={currentYValue} 
                    r={6} 
                    label={{ value: 'Calculated Flow', fill: '#ffffff', position: 'top', fontSize: 11 }}
                    fill="#ef4444" 
                    stroke="#ffffff" 
                    strokeWidth={2} 
                    style={{ transition: 'all 0.5s ease-in-out' }}
                  />
                )}
              </LineChart>
            )
          )}
        </ResponsiveContainer>
        )}
      </div>
      
      {/* Interactive Legend Footnote */}
      <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-sans gap-2">
        <div className="flex items-center space-x-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {viewType === 'trend' ? (
            <span>The red dot (<span className="text-red-500 font-bold font-mono">●</span>) represents your current calculated design state. Try changing input parameters to watch the system scale dynamically!</span>
          ) : (
            <span>This results breakdown chart isolates your specific configuration parameters. Adjust your inputs to dynamically recalculate the breakdown!</span>
          )}
        </div>
        {viewType === 'trend' && currentXValue !== null && currentYValue !== null && (
          <div className="font-mono text-slate-400 shrink-0">
            X: {currentXValue} | Y: {currentYValue} ({referenceName})
          </div>
        )}
      </div>
    </div>
  );
}
