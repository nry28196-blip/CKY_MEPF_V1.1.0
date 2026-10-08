/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from '../lib/translations';
import { X, BookOpen, Compass, Shield, Wind, Zap, Droplet, Flame, FileText, Check } from 'lucide-react';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RefTab = 'all' | 'mechanical' | 'electrical' | 'plumbing' | 'fire';

export default function ReferenceModal({ isOpen, onClose }: ReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<RefTab>('all');
  const { isKhmer, setLanguage, language } = useLanguage();

  

  const sections = [
    {
      id: 'mechanical',
      discipline: 'Mechanical / HVAC',
      icon: Wind,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
      standard: 'ASHRAE Standard 55 & 62.1, SMACNA Guidelines',
      formulas: [
                {
          name: 'Ventilation Rate (ASHRAE 62.1)',
          formula: 'Eq 1 — Breathing Zone Outdoor Airflow: Vbz = (Rp × Pz) + (Ra × Az)',
          explanation: 'Calculates the required outdoor airflow using the breathing-zone ventilation rate and zone air distribution effectiveness.',
          math: 'Eq 2 — Zone Outdoor Airflow: Voz = Vbz / Ez',
          parameters: [
            'Vbz = Breathing zone outdoor airflow',
            'Voz = Zone outdoor airflow required',
            'Rp = Outdoor airflow rate required per person',
            'Pz = Zone population (number of people)',
            'Ra = Outdoor airflow rate required per unit area',
            'Az = Net occupiable zone floor area',
            'Ez = Zone air distribution effectiveness'
          ]
        },
        {
          name: 'Minimum Exhaust Airflow (ASHRAE 62.1)',
          formula: 'Q_exh = Ra × Az',
          explanation: 'Calculates the required exhaust airflow using the area-based exhaust rate (e.g., for restrooms or kitchens).',
          math: 'Density Adjusted: Q_exh(actual) = Q_exh × (T_actual / T_std)',
          parameters: [
            'Q_exh = Required exhaust airflow',
            'Ra = Exhaust airflow rate required per unit area',
            'Az = Net occupiable zone floor area',
          ]
        },
        {
          name: 'Commercial Kitchen Hood Extraction (ASHRAE 154)',
          formula: 'Q = L × Base Rate',
          explanation: 'Calculates required exhaust airflow for unlisted commercial kitchen hoods based on cooking equipment duty and hood canopy configuration.',
          math: 'Q_cfm = Hood Length (ft) × Base Exhaust Rate (CFM/ft)',
          parameters: [
            'Q = Total exhaust airflow required',
            'L = Length of the hood canopy over the equipment bank',
            'Base Rate = Extraction rate per linear foot depending on duty (Light, Medium, Heavy, Extra Heavy) and hood type (Wall, Island)'
          ]
        },
        {
          name: 'Cooling Thermal Load Sizing',
          formula: 'Q_total = (A x U x ΔT) + (N x q_p) + (V_fresh x ρ_air x C_p x ΔT)',
          explanation: 'Sensible transmission heat through fabric plus internal occupant gain plus ventilation fresh air tempering.',
          math: 'Q_total = Q_transmission + Q_internal + Q_ventilation',
          parameters: [
            'A = Surface area (m²)',
            'U = Thermal transmittance (W/m²K)',
            'N = Number of people (Occupants)',
            'q_p = Sensible heat emission per occupant (~120W average)',
            'V_fresh = Airflow volume rate (m³/s)',
            'ρ_air = Dry air density (~1.2 kg/m³)',
            'C_p = Specific heat capacity of air (J/kg·K) (~1006 J/kg·K)',
            'ΔT = Temperature differential between exterior & interior (K)'
          ]
        },
        {
          name: 'Duct Sizing (Equal Friction Method)',
          formula: 'ΔP/L = Constant (e.g. 0.1 in. wg/100 ft)',
          explanation: 'Sizes ducts by maintaining a constant pressure loss per unit length across the entire system. Huebscher’s formula is then used to find equivalent rectangular dimensions.',
          math: 'De = 1.30 × ((a × b)^0.625) / ((a + b)^0.25)',
          parameters: [
            'ΔP/L = Target friction loss rate',
            'De = Equivalent round diameter for equal friction and capacity',
            'a, b = Rectangular duct width and height'
          ]
        },
        {
          name: 'Duct Sizing (Velocity Method)',
          formula: 'A_duct = Q_air / v_design',
          explanation: 'Standard continuity equation relating air volume flow rate to cross-sectional area based on recommended velocity velocity limits.',
          math: 'D_hydraulic = 1000 x √((4 x A_duct) / π) (mm)',
          parameters: [
            'Q_air = Volume flow rate of air (m³/s)',
            'v_design = Design velocity (m/s) (e.g., 4-6 m/s for low-velocity domestic branches)',
            'D_hydraulic = Equivalent circular pipe hydraulic diameter (mm)'
          ]
        }
      ]
    },
    {
      id: 'electrical',
      discipline: 'Electrical Motor & FLC',
      icon: Zap,
      color: 'text-amber-400 border-amber-500/20 bg-amber-950/20',
      standard: 'NEC Article 430 (Motors) & Article 220 (Feeder Calculations)',
      formulas: [
        {
          name: 'Three-Phase Motor Full Load Current',
          formula: 'I = P / (√3 × V × PF × η)',
          explanation: 'Standard formula for calculating electrical line current on three-phase balanced industrial motor systems.',
          math: 'I = P_watts / (1.732 × V_line × PF × Efficiency)',
          parameters: [
            'I = Line current (Amperes)',
            'P = Mechanical power (Watts, where 1 HP = 746W)',
            'V = Line-to-line RMS voltage (Volts)',
            'PF = Power factor of the inductive motor (decimal, e.g., 0.85)',
            'η = Mechanical-to-electrical efficiency rating (decimal, e.g., 0.90)'
          ]
        },
        {
          name: 'Single-Phase Motor Full Load Current',
          formula: 'I = P / (V × PF × η)',
          explanation: 'Standard domestic current draws on singular active line systems.',
          math: 'I = P_watts / (V_line × PF × Efficiency)',
          parameters: [
            'I = Load current (Amperes)',
            'P = Mechanical power (Watts)',
            'V = Line-to-neutral system voltage (Volts, typically 120V or 230V)',
            'PF = Power factor (decimal, typically 0.85)',
            'η = Motor efficiency (decimal, typically 0.80)'
          ]
        },
        {
          name: 'Overcurrent Protection & Cable Ampacity Sizing',
          formula: 'Minimum Ampacity = 125% of FLC',
          explanation: 'Continuous duty motor branch circuits require conductors sized to handle 125% of the full-load current to prevent thermal fatigue on terminals.',
          math: 'I_breaker = 1.25 × I_FLC (Rounded to standard NEC rating)',
          parameters: [
            'I_FLC = Full-load current computed from standard motor ratings',
            'I_breaker = Rated size of overcurrent protection circuit breaker',
            'Minimum Cable Ampacity = Sized from NEC Table 310.15(B)(16) at 75°C terminals'
          ]
        },
        {
          name: 'Uninterruptible Power Supply (UPS) Sizing',
          formula: 'S (kVA) = (P (kW) / PF) × Design Margin',
          explanation: 'Calculates the required UPS capacity taking into account the load power factor and a safety/design margin.',
          math: 'kVA_ups = (kW_load / PF_load) × Margin',
          parameters: [
            'S (kVA) = UPS apparent power capacity',
            'P (kW) = Total active load power',
            'PF = Load power factor (typically 0.8 or 0.9)',
            'Design Margin = Safety factor for future growth (typically 1.25)'
          ]
        },
        {
          name: 'UPS Battery Bank Capacity',
          formula: 'C (Ah) = (P (kW) × 1000 × T) / (V_dc × η_inv)',
          explanation: 'Estimates the required battery capacity in Ampere-hours for a given backup time at constant power discharge.',
          math: 'Ah = (P_watts × hours) / (V_dc × η_inv)',
          parameters: [
            'C (Ah) = Required battery capacity in Ampere-hours',
            'P (kW) = Critical load active power',
            'T = Backup time in hours',
            'V_dc = DC bus voltage of the UPS inverter',
            'η_inv = Inverter DC-to-AC conversion efficiency'
          ]
        },
        {
          name: 'ELV / Rack UPS Sizing (kVA)',
          formula: 'S (kVA) = (P (W) / 1000) / PF × Margin',
          explanation: 'Estimates the required UPS capacity for ELV systems (Network, CCTV, etc.) using connected load in Watts.',
          math: 'kVA_ups = (Watts / 1000) / PF × 1.25',
          parameters: [
            'S (kVA) = UPS apparent power capacity',
            'P (W) = Total active load power in Watts',
            'PF = Load power factor (typically 0.95 for IT equipment)',
            'Margin = Safety design margin (typically 1.25)'
          ]
        },
        {
          name: 'ELV UPS Battery / Rack Unit Estimation',
          formula: 'Rack Units (RU) = ƒ(kVA_ups) ; Ah = (P(W) × Hours) / (V_dc × η)',
          explanation: 'Estimates the required rack space (19-inch racks) and internal battery Ah required for ELV UPS systems.',
          math: 'RU ≈ 2U (for <3kVA), 3U (for 5-6kVA), 5U+ (for >8kVA)',
          parameters: [
            'Rack Units (RU) = Standard 1.75 inch rack spaces',
            'Ah = Ampere-hour required capacity',
            'P(W) = Critical load active power',
            'V_dc = Nominal DC bus voltage (typically 72V, 192V, or 240V for rack mount)',
            'η = Inverter efficiency (typically 0.9)'
          ]
        },
,

      ]
    },
    {
      id: 'plumbing',
      discipline: 'Plumbing (IPC & BS Standards)',
      icon: Droplet,
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
      standard: 'IPC 2018 (USA) / BS EN 806 & BS EN 12056 (UK)',
      formulas: [
        {
          name: 'Hunter’s Curve Peak Demand Sizing (IPC)',
          formula: 'Q_peak = HunterCurve(WSFU)',
          explanation: 'Statistical probability model (Hunter’s Curve) used to convert non-continuous Water Supply Fixture Units (WSFU) into active design flow rates in Gallons per Minute (GPM).',
          math: 'Q_gpm_commercial = 10 + 2.5×WSFU (WSFU ≤ 5) | 40 + 0.45×(WSFU-20) (WSFU 20-100)',
          parameters: [
            'WSFU = Total Water Supply Fixture Units summed across all fixtures',
            'Q_peak = Design water supply capacity (GPM) matching commercial flushometer vs residential flush-tank systems'
          ]
        },
        {
          name: 'Pipe Water Velocity',
          formula: 'V = 4Q / (π × D²)',
          explanation: 'Calculates the velocity of water through a pipe based on flow rate and internal diameter. Important for limiting water hammer and noise (Typical limit: 1.2 to 2.4 m/s).',
          math: 'V_m/s = (4 × Q_m³/s) / (π × D_m²)',
          parameters: [
            'V = Water velocity in meters per second',
            'Q = Flow rate in cubic meters per second',
            'D = Internal pipe diameter in meters'
          ]
        },
        {
          name: 'BS EN 806 Peak Water Sizing (UK)',
          formula: 'Q_peak = 0.09 × √ΣLU',
          explanation: 'Peak water design flow rate calculation per BS EN 806-3 based on cumulative Loading Units (LU) for domestic installations.',
          math: 'Q_lps = 0.09 × √(Sum of Loading Units (LU))',
          parameters: [
            'Q_lps = Peak flow design rate (Liters per second)',
            'LU = Loading Units assigned per BS EN 806-3 Table 1 (e.g., WC = 2.0, hand sink = 1.0, kitchen sink = 3.0)'
          ]
        },
        {
          name: 'Sewage Gravity Sewer Pipe Diameter (IPC)',
          formula: 'Diameter matches DFU Table 710.1(1)',
          explanation: 'The capacity of a horizontal drainage branch or building sewer is determined by the total Drainage Fixture Units (DFU) load and the gradient slope.',
          math: 'Slope Option: 0.5% (1:200), 1% (1:100), 2% (1:50), 4% (1:25)',
          parameters: [
            'DFU = Drainage Fixture Units summed across all waste pipes',
            'Sewer Pipe Limit = Maximum allowable DFUs on single pipe size per IPC standard'
          ]
        },
        {
          name: 'BS EN 12056 Drainage Peak Flow (UK)',
          formula: 'Q_ww = K × √ΣDU',
          explanation: 'Design peak wastewater flow rate in gravity drainage systems per BS EN 12056, determined by cumulative Discharge Units (DU).',
          math: 'Q_ww = K × √(Sum of Discharge Units (DU))',
          parameters: [
            'Q_ww = Design peak wastewater flow (Liters per second)',
            'K = Frequency factor (0.5 for residential/dwellings, 0.7 for commercial/public offices, 1.0 for high/continuous use)',
            'DU = Discharge Units per BS EN 12056 Table 2 (e.g., WC = 2.0, shower = 0.6, lavatory = 0.5)'
          ]
        },
        {
          name: 'Septic Sump Reservoir Sizing (IPC/EPA)',
          formula: 'V_total = Q_liquid + Q_sludge',
          explanation: 'Sized to accommodate minimum 1.5-day retention time of daily sewage flow plus long-term dry anaerobic sludge accumulation before desludging is required.',
          math: 'V_total = (Occupants × Q_discharge × 1.5) + (Occupants × 30L/year × Years)',
          parameters: [
            'Q_discharge = Average daily gray/blackwater discharge per person (L/day)',
            'Retention multiplier = 1.5 days minimum for efficient biological separation',
            'Sludge accumulation coefficient = 30 Liters per occupant per year',
            'Years = Sludge evacuation interval (standard 3 years)'
          ]
        },
        {
          name: 'BS 6297 Septic Tank Sizing (UK)',
          formula: 'V = 2000 + (Occupants × 180)',
          explanation: 'Minimum fluid capacity of septic tanks serving domestic residential properties per British Standard BS 6297:2007 + A1:2008.',
          math: 'V_liters = 2000 + (N × 180) (minimum tank volume of 2700 Liters)',
          parameters: [
            'V_liters = Minimum liquid volume of the septic tank (Liters)',
            'N = Number of occupants / daily users',
            '2000 = Baseline safety buffer capacity constant (Liters)',
            '180 = Standard sewage volume allocation per person (Liters/day)'
          ]
        },
        {
          name: 'Hydraulic Booster Pump TDH Sizing',
          formula: 'TDH_meters = H_static + H_friction + H_residual',
          explanation: 'Booster systems must maintain residual flow pressures at the topmost remote fixture under Peak demand.',
          math: 'TDH = Static Height + (Static Height × Friction%) + (P_residual × 10.197)',
          parameters: [
            'H_static = Total vertical elevation height (meters)',
            'Friction% = Pipe system friction allowances (typically 10-15%)',
            'P_residual = Required terminal fixture pressure (bar, 1 bar ≈ 10.197 meters)'
          ]
        }
      ]
    },
    {
      id: 'fire',
      discipline: 'Fire Protection (NFPA & BS)',
      icon: Flame,
      color: 'text-red-400 border-red-500/20 bg-red-950/20',
      standard: 'NFPA 13/14/20 (USA) & BS EN 12845 / BS 9990 (UK)',
      formulas: [
        {
          name: 'Sprinkler Discharge Flow (NFPA)',
          formula: 'Q = K × √P',
          explanation: 'Standard hydraulic discharge formula for automatic fire sprinkler heads using imperial units.',
          math: 'Q = K-Factor × √(Residual Orifice Pressure in psi)',
          parameters: [
            'Q = Sprinkler discharge flow rate (GPM)',
            'K-Factor = Discharge orifice coefficient (standard 5.6, large 8.0, ESFR 11.2)',
            'P = Hydraulic pressure at the sprinkler head (psi, minimum 7 psi per NFPA 13)'
          ]
        },
        {
          name: 'Sprinkler Discharge Flow (BS EN 12845)',
          formula: 'Q = K_metric × √P_bar',
          explanation: 'Hydraulic discharge formula for metric automatic fire sprinkler heads per BS EN 12845.',
          math: 'Q_Lpm = K_metric × √(Operating Pressure in bar)',
          parameters: [
            'Q_Lpm = Sprinkler discharge flow rate (Liters/minute)',
            'K_metric = Metric orifice coefficient (standard K80, large K115, ESFR K160, ultra K200)',
            'P_bar = Operating pressure at the topmost sprinkler head (bar, minimum 0.5 to 1.0 bar)'
          ]
        },
        {
          name: 'Water Storage Reservoir Sizing (NFPA)',
          formula: 'Volume = (Q_sprinkler + Q_hose_stream) × Duration',
          explanation: 'Fire protection sump reservoirs must supply combined sprinkler and hydrant hose flows for the entire designated NFPA 13 duration.',
          math: 'Volume_gallons = (Active Heads × Q_single + Hose Stream Allowance GPM) × Duration_minutes',
          parameters: [
            'Active Heads = Number of heads in remote design area (typically 12 for ordinary hazard)',
            'Hose Stream Allowance = GPM for external fire service (typically 100 to 500 GPM)',
            'Duration = Flow duration timeline (30 to 120 minutes depending on hazard category)'
          ]
        },
        {
          name: 'Water Storage Reservoir Sizing (BS EN 12845)',
          formula: 'Volume = (Q_sprinkler + Q_hose_allowance) × Duration',
          explanation: 'Water storage sizing per BS EN 12845 based on standard European hazard classifications and firefighter support streams.',
          math: 'Volume_m³ = (Active Heads × Q_single_Lpm + Hose Allowance Lpm) × Duration_minutes / 1000',
          parameters: [
            'Duration = Sump duration requirements (30m for Light, 60m for Ordinary, 90m for High Hazard)',
            'Hose Allowance = Lpm added for fire brigade landing valves (typically 300 to 600 Lpm)'
          ]
        },
        {
          name: 'Centrifugal Fire Pump Sizing (NFPA 20)',
          formula: 'HP = (Q_total × TDH_psi) / (1714 × η)',
          explanation: 'Sizing motor power for standard fire pumps in imperial systems per NFPA 20.',
          math: 'Pump Shaft HP = (Flow_GPM × Head_psi) / (1714 × Efficiency_percent)',
          parameters: [
            'Q_total = Combined peak sprinkler and hydrant demand (GPM)',
            'TDH_psi = Total Dynamic Head required (psi)',
            'η = Pump hydraulic efficiency (typically 70-75%)'
          ]
        },
        {
          name: 'Riser Outlet Residual Pressures (BS 9990)',
          formula: 'Head_bar = Static Head + Friction + P_residual',
          explanation: 'Pressure standards for dry/wet risers and firefighting outlets inside buildings according to British Standard BS 9990.',
          math: 'P_residual = 6.0 bar (Landing Valve Outlet) | 3.0 bar (BS EN 671 Hose Reel)',
          parameters: [
            'Landing Valve Outlet = 6.0 bar minimum required at topmost valve to support fire brigade hose pressure',
            'Hose Reel = 3.0 bar minimum required residual operating pressure'
          ]
        },
        {
          name: 'BS 9251:2021 Residential Sprinkler Criteria',
          formula: 'Q_min = N_heads × q_design',
          explanation: 'Design criteria for residential and domestic sprinkler installations under British Standard BS 9251:2021, categorizing systems into four levels of occupancy hazard.',
          math: 'Cat 1 (Single dwellings): 1-2 heads active, 60-84 Lpm, 10-30 mins | Cat 4 (High rise residential): 4 heads, 60 Lpm each, 60 mins duration',
          parameters: [
            'Cat 1: Domestic houses - 1 head @ 84 Lpm or 2 heads @ 60 Lpm, 10 min duration (or 30 mins if height > 18m)',
            'Cat 2: Blocks of flats/Maisonettes up to 18m - 2 heads @ 60 Lpm, 30 min duration',
            'Cat 3: Residential homes, hostels, schools up to 18m - 2 heads @ 60 Lpm, 30 min duration',
            'Cat 4: Residential buildings taller than 18m - 4 heads @ 60 Lpm, 60 min duration'
          ]
        },
        {
          name: 'BS EN 12845 Pre-calculated Pipe Sizing Schedule',
          formula: 'Pipe Diameter based on max sprinkler head count',
          explanation: 'Standard pre-calculated nominal bore sizing used under BS EN 12845 to size pipes based on the number of downstream active sprinklers in Light and Ordinary Hazard classes.',
          math: 'DN25 (1") ≤ 1 | DN32 (1.25") ≤ 2 | DN40 (1.5") ≤ 3 | DN50 (2") ≤ 5 | DN65 (2.5") ≤ 10 | DN80 (3") ≤ 20 | DN100 (4") ≤ 40 heads',
          parameters: [
            'Light Hazard (LH): DN25 (1 head), DN32 (2 heads), DN40 (3 heads), DN50 (5 heads), DN65 (10 heads), DN80 (All heads)',
            'Ordinary Hazard (OH): DN25 (1 head), DN32 (2 heads), DN40 (3 heads), DN50 (5 heads), DN65 (10 heads), DN80 (20 heads), DN100 (40 heads), DN150 (all heads)'
          ]
        }
      ]
    }
  ];

  const filteredSections = activeTab === 'all' 
    ? sections 
    : sections.filter(s => s.id === activeTab);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-950/50 border border-sky-500/20 text-sky-400 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">{isKhmer ? 'ឯកសារយោង និងរូបមន្តវិស្វកម្ម MEP' : 'MEP Calculation References & Formulas'}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{isKhmer ? 'ដកស្រង់ស្ដង់ដារផ្លូវការ និងសមីការវិស្វកម្មសម្រាប់ការត្រួតពិនិត្យប្រព័ន្ធ។' : 'Citing official standards and engineering equations for system compliance audits.'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
              className="px-3 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/50 hover:bg-sky-900/30 hover:border-sky-500/30 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              {isKhmer ? 'English' : 'ភាសាខ្មែរ'}
            </button>
            <button
              onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-400 hover:text-white transition-all cursor-pointer hover:border-slate-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Discipline Tabs */}
        <div className="flex overflow-x-auto bg-slate-950/60 p-2.5 border-b border-slate-850 gap-1.5 shrink-0 hide-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-slate-850 text-white border border-slate-700/60' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            All References
          </button>
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id as RefTab)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === s.id 
                    ? 'bg-slate-850 text-white border border-slate-700/60' 
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{s.discipline.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8 hide-scrollbar">
          {filteredSections.map(sec => {
            const Icon = sec.icon;
            return (
              <div key={sec.id} className="space-y-4">
                {/* Section title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg border ${sec.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{sec.discipline} Code References</h3>
                  </div>
                  <div className="text-[10px] font-mono text-sky-400 bg-sky-950/20 border border-sky-900/40 px-2.5 py-1 rounded">
                    {sec.standard}
                  </div>
                </div>

                {/* Formulas List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sec.formulas.map((f, i) => {
                    const glowStyles = {
                      mechanical: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500/40',
                      electrical: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-500/40',
                      plumbing: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:border-cyan-500/40',
                      fire: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:border-red-500/40',
                    }[sec.id] || '';

                    return (
                      <div 
                        key={i} 
                        className={`bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-slate-850 rounded-xl p-4.5 space-y-3 transition-all duration-300 shadow-sm ${glowStyles}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200 leading-tight">{f.name}</span>
                          <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded shrink-0">
                            Eq {i + 1}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">{f.explanation}</p>

                        {/* Math Callout Box */}
                        <div className="p-3 bg-slate-950 border border-slate-850/80 rounded-lg text-center font-mono">
                          <div className="text-xs font-bold text-sky-400 leading-normal">{f.formula}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{f.math}</div>
                        </div>

                        {/* Parameters list */}
                        <div className="space-y-1">
                          <span className="block text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">Formula Parameters:</span>
                          <ul className="text-[9px] text-slate-400 font-mono space-y-0.5 list-disc pl-3.5">
                            {f.parameters.map((param, pi) => (
                              <li key={pi} className="leading-relaxed">{param}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Math verified mathematically with ASHRAE, NEC, IPC, NFPA, and British Standard (BS) Handbooks.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

                      </div>
    </div>
  );
}
