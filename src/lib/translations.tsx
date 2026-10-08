import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageType = 'en' | 'km';

export const translations: Record<LanguageType, Record<string, string>> = {
  en: {
    appTitle: "CKY_MEPF",
    appSubtitle: "Engineering Calculation Suite",
    formulaBtn: "Engineering Formulas",
    formulaBtnShort: "Formulas",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    autoCalc: "Auto-Calc",
    assistantTitle: "Advanced Design Assistant",
    recentRuns: "Recent Runs",
    clear: "Clear",
    noRecentRuns: "No recent calculations. Run a calculation to save.",
    quickConverters: "Quick Unit Converters",
    saveCalculation: "Save Run",
    calculateBtn: "Calculate Now",
    loading: "Loading...",
    
    // Tabs
    mechanical: "Mechanical / HVAC",
    electrical: "Electrical FLC",
    plumbing: "Plumbing",
    fire: "FIRE FIGHTING",

    // Mechanical
    thermalInputs: "Thermal Inputs",
    estimationBasisTooltip: "Estimation basis logic per ASHRAE Fundamentals Chapter 18 (Non-residential Cooling and Heating Load Calculations).",
    floorAreaTooltip: "Total conditioned floor area. Used to estimate generalized sensible cooling loads (W/m²) per ASHRAE 90.1 standard building types.",
    roomVolumeTooltip: "Room volumetric footprint used for psychrometric air change rates (ACH) and precise infiltration load estimations.",
    occupantTooltip: "ASHRAE Standard 62.1 dictates breathing zone outdoor air per person. Adjust to calculate precise sensible and latent human loads.",
    vrfDiversityTooltip: "Accounts for non-coincidence of peak loads across multiple zones (Standard: 1.1 - 1.25).",
    refrigerantTooltip: "Select refrigerant fluid type to adjust density and global warming potential (GWP) thresholds based on modern compliance standards.",
    pipingMatTooltip: "Type of piping material. Determines internal roughness coefficient for pressure drop calculations and refrigerant friction losses.",
    pipeLenTooltip: "Physical length of the main refrigerant liquid line. Impacts additional refrigerant charge.",
    syncTopologyTooltip: "Automatically sync piping length from the drawn 2D topology canvas diagram.",
    autoSizeTooltip: "Auto-sized logic applies standard diversity factoring. Manual override lets you specify exact HP condensing unit hardware.",
    unitCapTooltip: "Standard industry capacities for variable refrigerant flow condensing units. Overriding may trigger capacity ratio warnings.",
    capRatioTooltip: "Capacity Ratio limit. 130% is standard for VRF to prevent compressor short-cycling and ensure adequate part-load efficiency.",
    manualUnitTooltip: "Manually define an indoor unit capacity and location for the VRF circuit.",
    mechCoolingTitle: "Cooling Load Sizing",
    // Tooltips
    powerFactorTooltip: "Influences the total Apparent Power (kVA). Typical design range for server/IT loads: 0.90 to 0.99.",
    safetyFactorTooltip: "Safety factor applied to the total load. Typical design range: 1.2 to 1.3 (20% to 30% margin) to accommodate future expansion.",
    autonomyTooltip: "Required autonomy time. Determines the total Ampere-hour (Ah) capacity required from the battery string.",
    wallMountedTooltip: "Wall-mounted canopies require less airflow than island canopies due to the wall preventing cross-drafts.",
    dutyLevelTooltip: "Light (ovens, steamers), Medium (griddles, fryers), Heavy (charbroilers), Extra Heavy (solid fuel).",
    cookLineTooltip: "Total length of the cooking equipment line.",
    hoodExtTooltip: "Hood extension beyond the equipment on each side (Standard minimum is 6 inches or 0.15m).",
    ductVelTooltip: "Code typically requires a minimum grease duct velocity of 500 FPM (2.5 m/s). Typical design range: 1500 - 2200 FPM (7.6 - 11 m/s) to keep grease particulates entrained.",
    floorAreaVentTooltip: "Total occupiable floor area of the zone.",
    occupantsTooltip: "Number of people in the zone.",
    ezTooltip: "Table 6.2.2.2 typical design limits: 1.0 (Ceiling cooling), 0.8 (Ceiling heating, T_sup > T_room + 15°F), 1.2 (Floor supply).",
    airTempTooltip: "Adjust calculations to reflect actual air density based on temperature, converting Standard volume to Actual volume.",
    vbzTooltip: "ASHRAE 62.1-2019 Sec 6.2.2.1: Vbz represents the ventilation required directly in the breathing zone for occupants, before accounting for distribution losses.",
    vozTooltip: "ASHRAE 62.1-2019 Sec 6.2.2.3: Voz represents the total ventilation that must be provided to the zone by the supply system to ensure Vbz is satisfied, accounting for mixing effectiveness (Ez).",
    phaseTooltip: "Electrical phase distribution. Three-phase formulas include the square root of 3 (1.732) in standard power calculations.",
    loadPowerTooltip: "Apparent Power (kVA) or Real Power (kW) input requirement of the mechanical or electrical equipment.",
    voltageTooltipThree: "Line-to-Line voltage for 3-phase systems. Typical design range: 400V (EU/UK/Asia/ME) or 480V (US).",
    voltageTooltipSingle: "Line-to-Neutral voltage for single-phase systems. Typical design range: 230V (EU/UK/Asia/ME) or 120V (US).",
    pfTooltip: "Ratio of real working power to apparent power. Typical values: 0.85 (motors), 0.95 (lighting), 1.0 (resistive heating).",
    waterVelTooltip: "Maximum allowable velocity in water distribution pipes to prevent water hammer and excessive noise. Typical range: 1.2 to 2.4 m/s (4 to 8 ft/s).",
    slopeTooltip: "Minimum slope per IPC to maintain self-cleansing velocity. Typical design range: 1% (1/8 in/ft) for pipes ≥ 3 inches, or 2% (1/4 in/ft) for pipes < 3 inches.",
    dailyConsumpTooltip: "Average daily domestic cold water consumption. Values vary by building class (e.g. 150-250 L/p/d for residential).",
    soilAbsTooltip: "Soil absorption rate per person. Used to size primary anaerobic breakdown chambers per WHO/local health standards.",
    residualPresTooltip: "Required residual pressure at the highest/most hydraulically remote fixture per IPC (typically 1.0 - 2.0 bar).",
    mainAirflowTooltip: "Total air volume flow rate entering the main duct branch.",
    frictionLossTooltip: "Target pressure drop per unit length. Typical design range: 0.08 to 0.12 in. wg/100 ft (0.8 - 1.2 Pa/m) for standard low-pressure systems.",
    ductTypeTooltip: "Determines the target reference velocity ranges based on the application.",
    maxVelSupply: "Maximum allowable air velocity. Typical Supply Range: 1000 - 2000 FPM (5 - 10 m/s).",
    maxVelReturn: "Maximum allowable air velocity. Typical Return Range: 800 - 1500 FPM (4 - 7.5 m/s).",
    maxVelExhaust: "Maximum allowable air velocity. Typical Exhaust Range: 1500 - 2500 FPM (7.5 - 12.5 m/s).",
    ductHeightTooltip: "Fixed vertical dimension of rectangular duct. Width will be calculated.",
    totalHeadsTooltip: "Total facility sprinkler heads. Used to estimate total system volume and secondary water reserve mandates.",
    hoseReelsTooltip: "Class II/III standpipe hose reels. Adds supplemental concurrent flow demands per NFPA 14.",
    staticHeadTooltip: "Vertical distance from the fire pump to the highest hydraulic sprinkler or hose connection. Determines minimum static pressure.",
    pumpEffTooltip: "Pump mechanical efficiency factor (typically 65-75% for horizontal split-case pumps) used to calculate motor brake horsepower.",

    mechDuctSizingTitle: "Duct Sizing",
    mechVentilationTitle: "Ventilation System",
    estimationBasis: "Estimation Basis",
    floorArea: "Floor Area",
    roomVolume: "Room Volume",
    occupantDensity: "Occupants Count",
    coolingLoadResult: "Estimated Cooling Capacity",
    totalPower: "Total Power",
    watts: "Watts",
    btuHr: "BTU/hr",
    tonsRef: "Tons (TR)",
    ductAirflow: "Design Airflow",
    frictionRate: "Friction Rate",
    ductHeight: "Duct Height",
    mainDuctCirc: "Circular Main Duct",
    hydraulicDiam: "Hydraulic Diam.",
    mainDuctRect: "Rectangular Main Duct",
    aspectRatio: "Aspect Ratio",
    velocityRound: "Velocity (Round)",
    velocityRect: "Velocity (Rect)",
    downstreamBranches: "Downstream Branches",
    numBranches: "Number of Branches",
    branchSizing: "Branch Sizing Breakdown",
    ductSizingVelocityHeader: "Duct Sizing (Velocity Method)",
    coolingThermalHeader: "Cooling Thermal Load Sizing",

    // Electrical
    elecTitle: "Electrical Load Calculation",
    elecDesc: "Determine full load current (FLC) and recommended circuit breaker sizes.",
    loadPower: "Load Power",
    phaseType: "Phase Configuration",
    singlePhase: "1-Phase (230V)",
    threePhase: "3-Phase (400V)",
    voltage: "System Voltage",
    powerFactor: "Power Factor (Cos φ)",
    currentAmps: "Full Load Current (FLC)",
    amps: "Amps",
    circuitBreaker: "Suggested Breaker",
    breakerDesc: "Sized at 125% of FLC according to standard engineering margins.",

    // Plumbing
    plumbingTitle: "Plumbing Fixture Unit Demand",
    plumbingDesc: "Calculate total water demand in loading units and flow rate according to DIN 1988/BS 6700.",
    fixtureType: "Fixture Classification",
    domestic: "Domestic (Residential)",
    commercial: "Commercial (Office/Retail)",
    industrial: "Industrial / Public",
    loadingUnits: "Total Loading Units (LU)",
    estimatedFlow: "Estimated Water Demand",
    flowLps: "Flow Rate (L/s)",
    pipeDiameter: "Suggested Pipe Diameter",
    pipeDiamDesc: "Sized to maintain water velocity below recommended limit (~1.5 m/s).",

    // Fire
    fireTitle: "Fire Sprinkler Sizing",
    fireDesc: "Calculate target water pressure, flow rates, and tank sizing for fire protection systems.",
    hazardClassification: "Hazard Classification",
    lightHazard: "Light Hazard (LH)",
    ordinaryHazard: "Ordinary Hazard (OH)",
    extraHazard: "Extra Hazard (EH)",
    designArea: "Design Protection Area",
    dischargeDensity: "Discharge Density",
    requiredFlow: "Required Sprinkler Flow",
    sprinklerDuration: "Required Duration",
    waterStorage: "Minimum Water Storage",
    m3: "m³",
    liters: "Liters",

    // Notifications
    toastParamsRestored: "Parameters loaded!",
    toastCalculationSaved: "Calculation saved to history!",
    toastCalculationsUpdated: "Calculations updated!",

    // Buttons & Actions
    saveIteration: "Save Iteration",
    copyReport: "Copy Report",
    exportCsv: "Export CSV",
    exportBOQ: "Export BOQ",
    shareEmail: "Share Email",

    // Sidebar units
    unitFlow: "Flow Rate",
    unitPressure: "Pressure",
    unitTemp: "Temperature",
    unitPower: "Power",
  },
  km: {
    appTitle: "CKY_MEPF",
    appSubtitle: "ប្រព័ន្ធគណនាវិស្វកម្ម MEPF",
    formulaBtn: "រូបមន្តវិស្វកម្ម",
    formulaBtnShort: "រូបមន្ត",
    lightMode: "ពន្លឺ",
    darkMode: "ងងឹត",
    autoCalc: "គណនាស្វ័យប្រវត្ត",
    assistantTitle: "ជំនួយការរចនាកម្រិតខ្ពស់",
    recentRuns: "ការគណនាថ្មីៗ",
    clear: "សម្អាត",
    noRecentRuns: "មិនទាន់មានការគណនាថ្មីៗទេ។ គណនាដើម្បីរក្សាទុក។",
    quickConverters: "បម្លែងឯកតារហ័ស",
    saveCalculation: "រក្សាទុកការគណនា",
    calculateBtn: "គណនាឥឡូវនេះ",
    loading: "កំពុងដំណើរការ...",

    // Tabs
    mechanical: "មេកានិច / HVAC",
    electrical: "អគ្គិសនី FLC",
    plumbing: "ទឹក និងលូ",
    fire: "ប្រព័ន្ធពន្លត់អគ្គីភ័យ",

    // Mechanical
    thermalInputs: "ទិន្នន័យកម្តៅ (THERMAL INPUTS)",
    estimationBasisTooltip: "ការប៉ាន់ស្មានផ្អែកលើ ASHRAE Fundamentals Chapter 18 (Non-residential Cooling and Heating Load Calculations)។",
    floorAreaTooltip: "ផ្ទៃក្រឡាសរុបដែលបានកំណត់។ ប្រើដើម្បីប៉ាន់ស្មានបន្ទុកកម្តៅទូទៅ (W/m²) យោងតាម ASHRAE 90.1 standard building types។",
    roomVolumeTooltip: "ទំហំមាឌបន្ទប់ដែលប្រើប្រាស់សម្រាប់អត្រាផ្លាស់ប្តូរខ្យល់ (ACH) និងការប៉ាន់ស្មានបន្ទុកជ្រៀតចូលច្បាស់លាស់។",
    occupantTooltip: "ស្តង់ដារ ASHRAE 62.1 កំណត់ខ្យល់ខាងក្រៅសម្រាប់មនុស្សម្នាក់។ លៃតម្រូវដើម្បីគណនាបន្ទុកកម្តៅមនុស្សជាក់លាក់។",
    vrfDiversityTooltip: "គិតគូរពីការមិនស្របគ្នានៃបន្ទុកអតិបរមានៅទូទាំងតំបន់ច្រើន (ស្តង់ដារ: 1.1 - 1.25)។",
    refrigerantTooltip: "ជ្រើសរើសប្រភេទសារធាតុរាវត្រជាក់ ដើម្បីលៃតម្រូវដង់ស៊ីតេ និងកម្រិតឡើងកម្តៅផែនដី (GWP) ផ្អែកលើស្តង់ដារ។",
    pipingMatTooltip: "ប្រភេទសម្ភារៈបំពង់។ កំណត់មេគុណកកិតខាងក្នុងសម្រាប់ការគណនាការធ្លាក់ចុះសម្ពាធ និងការបាត់បង់កកិត។",
    pipeLenTooltip: "ប្រវែងជាក់ស្តែងនៃបំពង់រាវត្រជាក់មេ។ ប៉ះពាល់ដល់ការបញ្ចូលសារធាតុត្រជាក់បន្ថែម។",
    syncTopologyTooltip: "ធ្វើសមកាលកម្មប្រវែងបំពង់ដោយស្វ័យប្រវត្តិពីគំនូរបណ្តាញ 2D។",
    autoSizeTooltip: "ការគណនាទំហំស្វ័យប្រវត្តិអនុវត្តកត្តាផ្សេងៗស្តង់ដារ។ ការបដិសេធដោយដៃអនុញ្ញាតឱ្យអ្នកបញ្ជាក់ពីផ្នែករឹងម៉ាស៊ីនពិតប្រាកដ។",
    unitCapTooltip: "សមត្ថភាពឧស្សាហកម្មស្តង់ដារសម្រាប់ម៉ាស៊ីនត្រជាក់ VRF។ ការបដិសេធអាចបណ្តាលឱ្យមានការព្រមានអំពីសមាមាត្រសមត្ថភាព។",
    capRatioTooltip: "ដែនកំណត់សមាមាត្រសមត្ថភាព។ 130% គឺជាស្តង់ដារសម្រាប់ VRF ដើម្បីការពារបញ្ហា និងធានាប្រសិទ្ធភាព។",
    manualUnitTooltip: "កំណត់សមត្ថភាពម៉ាស៊ីនក្នុង និងទីតាំងដោយដៃសម្រាប់ប្រព័ន្ធ VRF។",
    mechCoolingTitle: "ទំហំបន្ទុកម៉ាស៊ីនត្រជាក់",
    // Tooltips
    powerFactorTooltip: "ជះឥទ្ធិពលដល់ថាមពលសរុប (kVA)។ កម្រិតស្តង់ដារសម្រាប់ IT/Server: 0.90 ដល់ 0.99។",
    safetyFactorTooltip: "កត្តាសុវត្ថិភាពអនុវត្តលើបន្ទុកសរុប។ កម្រិតរចនាស្តង់ដារ: 1.2 ដល់ 1.3 (20% ទៅ 30%) សម្រាប់ការប្រើប្រាស់ពេលអនាគត។",
    autonomyTooltip: "ពេលវេលាដំណើរការទាមទារ។ កំណត់សមត្ថភាពសរុប Ampere-hour (Ah) ដែលទាមទារពីថ្ម។",
    wallMountedTooltip: "គម្របហឺតជាប់ជញ្ជាំងត្រូវការខ្យល់តិចជាងគម្របកណ្តាល ព្រោះជញ្ជាំងការពារខ្យល់បោកបក់។",
    dutyLevelTooltip: "ស្រាល (ឡ, ម៉ាស៊ីនចំហុយ), មធ្យម (ខ្ទះ, ឆ្នាំងបំពង), ធ្ងន់ (ចង្ក្រានអាំង), ធ្ងន់ខ្លាំង (ឥន្ធនៈរឹង)។",
    cookLineTooltip: "ប្រវែងសរុបនៃខ្សែឧបករណ៍ចម្អិនអាហារ។",
    hoodExtTooltip: "ការពង្រីកគម្របហឺតឱ្យផុតឧបករណ៍ទាំងសងខាង (ស្តង់ដារអប្បបរមា 6 inches ឬ 0.15m)។",
    ductVelTooltip: "ស្តង់ដារទាមទារល្បឿនបំពង់ខ្លាញ់អប្បបរមា 500 FPM (2.5 m/s)។ កម្រិតរចនាស្តង់ដារ: 1500 - 2200 FPM ដើម្បីរក្សាភាគល្អិតខ្លាញ់កុំឲ្យស្ទះ។",
    floorAreaVentTooltip: "ផ្ទៃក្រឡាកម្រាលដែលអាចរស់នៅបានសរុបនៅក្នុងតំបន់។",
    occupantsTooltip: "ចំនួនមនុស្សនៅក្នុងតំបន់។",
    ezTooltip: "Table 6.2.2.2 កម្រិតរចនាស្តង់ដារ: 1.0 (ម៉ាស៊ីនត្រជាក់ពិដាន), 0.8 (កម្ដៅពិដាន, T_sup > T_room + 15°F), 1.2 (ប្រព័ន្ធបញ្ចេញខ្យល់តាមកម្រាល)។",
    airTempTooltip: "លៃតម្រូវការគណនាដើម្បីឆ្លុះបញ្ចាំងពីដង់ស៊ីតេខ្យល់ជាក់ស្តែងផ្អែកលើសីតុណ្ហភាព ដោយបំប្លែងពីមាឌស្តង់ដារទៅជាមាឌជាក់ស្តែង។",
    vbzTooltip: "ASHRAE 62.1-2019 Sec 6.2.2.1: Vbz តំណាងឱ្យខ្យល់ដែលត្រូវការដោយផ្ទាល់នៅក្នុងតំបន់ដកដង្ហើមសម្រាប់អ្នករស់នៅ មុនពេលគិតពីការបាត់បង់តាមប្រព័ន្ធខ្យល់។",
    vozTooltip: "ASHRAE 62.1-2019 Sec 6.2.2.3: Voz តំណាងឱ្យខ្យល់សរុបដែលត្រូវផ្គត់ផ្គង់ទៅក្នុងតំបន់ ដើម្បីធានាថា Vbz ត្រូវបានបំពេញ ដោយគិតគូរពីប្រសិទ្ធភាពនៃការលាយបញ្ចូល (Ez)។",
    phaseTooltip: "ប្រភេទប្រព័ន្ធអគ្គិសនី។ រូបមន្ត 3-Phase រួមបញ្ចូលឫសទី 3 (1.732) ក្នុងការគណនាថាមពលស្តង់ដារ។",
    loadPowerTooltip: "តម្រូវការថាមពល (kVA) ឬ ថាមពលពិត (kW) នៃឧបករណ៍មេកានិច ឬអគ្គិសនី។",
    voltageTooltipThree: "តង់ស្យុង Line-to-Line សម្រាប់ប្រព័ន្ធ 3-Phase។ កម្រិតរចនាស្តង់ដារ: 400V (EU/UK/Asia) ឬ 480V (US)។",
    voltageTooltipSingle: "តង់ស្យុង Line-to-Neutral សម្រាប់ប្រព័ន្ធ 1-Phase។ កម្រិតរចនាស្តង់ដារ: 230V (EU/UK/Asia) ឬ 120V (US)។",
    pfTooltip: "សមាមាត្រនៃថាមពលធ្វើការជាក់ស្តែងទៅនឹងថាមពលសរុប។ តម្លៃស្តង់ដារ: 0.85 (ម៉ូទ័រ), 0.95 (ភ្លើង), 1.0 (ឧបករណ៍កម្ដៅ)។",
    waterVelTooltip: "ល្បឿនទឹកអតិបរមានៅក្នុងបំពង់ ដើម្បីការពារការទង្គិចទឹក (water hammer) និងសំឡេងរំខាន។ កម្រិតស្តង់ដារ: 1.2 ដល់ 2.4 m/s។",
    slopeTooltip: "ជម្រាលអប្បបរមាតាម IPC ដើម្បីធានាល្បឿនហូរស្អាតដោយឯកឯង។ កម្រិតរចនាស្តង់ដារ: 1% សម្រាប់បំពង់ ≥ 3 inches ឬ 2% សម្រាប់បំពង់ < 3 inches។",
    dailyConsumpTooltip: "ការប្រើប្រាស់ទឹកត្រជាក់ប្រចាំថ្ងៃជាមធ្យម។ តម្លៃប្រែប្រួលតាមប្រភេទអគារ (ឧ. 150-250 L/p/d សម្រាប់លំនៅដ្ឋាន)។",
    soilAbsTooltip: "អត្រាស្រូបយករបស់ដីសម្រាប់មនុស្សម្នាក់។ ប្រើដើម្បីកំណត់ទំហំអាងប្រព្រឹត្តកម្មតាមស្តង់ដារ WHO។",
    residualPresTooltip: "សម្ពាធទឹកដែលទាមទារនៅឧបករណ៍ដែលខ្ពស់បំផុត ឬឆ្ងាយបំផុតតាម IPC (ជាទូទៅ 1.0 - 2.0 bar)។",
    mainAirflowTooltip: "បរិមាណខ្យល់សរុបដែលហូរចូលបំពង់មេ។",
    frictionLossTooltip: "សម្ពាធធ្លាក់ចុះគោលដៅក្នុងមួយឯកតាប្រវែង។ កម្រិតរចនាស្តង់ដារ: 0.08 ដល់ 0.12 in. wg/100 ft សម្រាប់ប្រព័ន្ធសម្ពាធទាប។",
    ductTypeTooltip: "កំណត់កម្រិតល្បឿនយោងផ្អែកលើប្រភេទការប្រើប្រាស់។",
    maxVelSupply: "ល្បឿនខ្យល់អតិបរមាអនុញ្ញាត។ ល្បឿនផ្គត់ផ្គង់ស្តង់ដារ: 1000 - 2000 FPM (5 - 10 m/s)។",
    maxVelReturn: "ល្បឿនខ្យល់អតិបរមាអនុញ្ញាត។ ល្បឿនត្រលប់ស្តង់ដារ: 800 - 1500 FPM (4 - 7.5 m/s)។",
    maxVelExhaust: "ល្បឿនខ្យល់អតិបរមាអនុញ្ញាត។ ល្បឿនបញ្ចេញស្តង់ដារ: 1500 - 2500 FPM (7.5 - 12.5 m/s)។",
    ductHeightTooltip: "ទំហំបញ្ឈរថេរនៃបំពង់ចតុកោណ។ ទទឹងនឹងត្រូវបានគណនា។",
    totalHeadsTooltip: "ចំនួនក្បាល Sprinkler សរុប។ ប្រើដើម្បីប៉ាន់ស្មានមាឌប្រព័ន្ធសរុប និងតម្រូវការបម្រុងទឹកបន្ថែម។",
    hoseReelsTooltip: "ទុយោទឹក Class II/III។ បន្ថែមតម្រូវការលំហូរទឹកស្របគ្នាតាម NFPA 14។",
    staticHeadTooltip: "ចម្ងាយបញ្ឈរពីម៉ាស៊ីនបូមទៅកាន់ក្បាល Sprinkler ឬទុយោដែលខ្ពស់បំផុត។ កំណត់សម្ពាធឋិតិវន្តអប្បបរមា។",
    pumpEffTooltip: "កត្តាប្រសិទ្ធភាពមេកានិចរបស់ម៉ាស៊ីនបូម (ជាទូទៅ 65-75%) ប្រើដើម្បីគណនាថាមពលម៉ូទ័រ។",

    mechDuctSizingTitle: "ទំហំបំពង់ខ្យល់",
    mechVentilationTitle: "ប្រព័ន្ធខ្យល់ចេញចូល",
    estimationBasis: "មូលដ្ឋានប៉ាន់ស្មាន",
    floorArea: "ផ្ទៃក្រឡាកម្រាល",
    roomVolume: "មាឌបន្ទប់",
    occupantDensity: "ចំនួនមនុស្សនៅក្នុងបន្ទប់",
    coolingLoadResult: "សមត្ថភាពម៉ាស៊ីនត្រជាក់ប៉ាន់ស្មាន",
    totalPower: "ថាមពលសរុប",
    watts: "វ៉ាត់ (W)",
    btuHr: "BTU/ម៉ោង",
    tonsRef: "តោនត្រជាក់ (TR)",
    navyAirflow: "លំហូរខ្យល់រចនា",
    frictionRate: "អត្រាកកិត",
    ductHeight: "កម្ពស់បំពង់ខ្យល់",
    mainDuctCirc: "បំពង់ខ្យល់មេរង្វង់",
    hydraulicDiam: "អង្កត់ផ្ចិតអ៊ីដ្រូលីក",
    mainDuctRect: "បំពង់ខ្យល់មេចតុកោណ",
    aspectRatio: "សមាមាត្រជ្រុង",
    velocityRound: "ល្បឿនខ្យល់ (បំពង់មូល)",
    velocityRect: "ល្បឿនខ្យល់ (បំពង់ចតុកោណ)",
    downstreamBranches: "បំពង់ខ្នែងបន្តបន្ទាប់",
    numBranches: "ចំនួនបំពង់ខ្នែង",
    branchSizing: "ទំហំបំពង់ខ្នែងលម្អិត",
    ductSizingVelocityHeader: "ការគណនាបំពង់ខ្យល់ (Velocity Method)",
    coolingThermalHeader: "ការគណនាបន្ទុកកម្ដៅម៉ាស៊ីនត្រជាក់",

    // Electrical
    elecTitle: "ការគណនាបន្ទុកអគ្គិសនី",
    elecDesc: "គណនាចរន្តបន្ទុកពេញលេញ (FLC) និងទំហំឌីសង់ទ័រដែលសមស្រប។",
    loadPower: "ថាមពលបន្ទុក",
    phaseType: "ការកំណត់ហ្វារ",
    singlePhase: "ហ្វារទោល 1-Phase (230V)",
    threePhase: "ហ្វារបី 3-Phase (400V)",
    voltage: "តង់ស្យុងប្រព័ន្ធ",
    powerFactor: "កត្តាថាមពល (Cos φ)",
    currentAmps: "ចរន្តបន្ទុកពេញលេញ (FLC)",
    amps: "អំពែរ (A)",
    circuitBreaker: "ឌីសង់ទ័រដែលណែនាំ",
    breakerDesc: "ទំហំស្មើនឹង ១២៥% នៃចរន្ត FLC តាមស្តង់ដារវិស្វកម្ម។",

    // Plumbing
    plumbingTitle: "បន្ទុកឧបករណ៍ផ្គត់ផ្គង់ទឹក",
    plumbingDesc: "គណនាតម្រូវការទឹកសរុបជាឯកតាបន្ទុក (LU) និងលំហូរទឹកតាមស្តង់ដារ DIN 1988/BS 6700។",
    fixtureType: "ប្រភេទអគារ/ឧបករណ៍",
    domestic: "លំនៅដ្ឋាន (Residential)",
    commercial: "ការិយាល័យ/ពាណិជ្ជកម្ម",
    industrial: "ឧស្សហកម្ម / សាធារណៈ",
    loadingUnits: "ឯកតាបន្ទុករួម (LU)",
    estimatedFlow: "តម្រូវការទឹកប៉ាន់ស្មាន",
    flowLps: "អត្រាលំហូរ (L/s)",
    pipeDiameter: "ទំហំបំពង់ទឹកដែលណែនាំ",
    pipeDiamDesc: "រចនាឡើងដើម្បីរក្សាល្បឿនទឹកឱ្យនៅក្រោមដែនកំណត់ (~1.5 m/s)។",

    // Fire
    fireTitle: "ទំហំប្រព័ន្ធពន្លត់អគ្គីភ័យ",
    fireDesc: "គណនាសម្ពាធទឹក អត្រាលំហូរ និងទំហំអាងស្តុកទឹកសម្រាប់ប្រព័ន្ធពន្លត់អគ្គីភ័យ។",
    hazardClassification: "ចំណាត់ថ្នាក់គ្រោះថ្នាក់",
    lightHazard: "គ្រោះថ្នាក់កម្រិតស្រាល (LH)",
    ordinaryHazard: "គ្រោះថ្នាក់កម្រិតមធ្យម (OH)",
    extraHazard: "គ្រោះថ្នាក់កម្រិតខ្ពស់ (EH)",
    designArea: "ផ្ទៃដីការពារពន្លត់",
    dischargeDensity: "កំហាប់ទឹកបាញ់ចេញ",
    requiredFlow: "លំហូរទឹកពន្លត់ដែលត្រូវការ",
    sprinklerDuration: "រយៈពេលបាញ់ទឹកបញ្ជាក់",
    waterStorage: "មាឌអាងស្តុកទឹកអប្បបរមា",
    m3: "ម៉ែត្រគូប (m³)",
    liters: "លីត្រ (L)",

    // Notifications
    toastParamsRestored: "បានបញ្ចូលប៉ារ៉ាម៉ែត្ររួចរាល់!",
    toastCalculationSaved: "បានរក្សាទុកការគណនាទៅក្នុងប្រវត្តិ!",
    toastCalculationsUpdated: "បានធ្វើបច្ចុប្បន្នភាពការគណនា!",

    // Buttons & Actions
    saveIteration: "រក្សាទុកការគណនា",
    copyReport: "ចម្លងរបាយការណ៍",
    exportCsv: "នាំចេញជា CSV",
    exportBOQ: "នាំចេញតារាង BOQ",
    shareEmail: "ចែករំលែកអ៊ីមែល",

    // Sidebar units
    unitFlow: "អត្រាលំហូរ",
    unitPressure: "សម្ពាធ",
    unitTemp: "សីតុណ្ហភាព",
    unitPower: "ថាមពល",
  }
};

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
  isKhmer: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    try {
      const saved = localStorage.getItem('cky_mepf_language');
      return (saved === 'km' ? 'km' : 'en') as LanguageType;
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('cky_mepf_language', lang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string): string => {
    const section = translations[language];
    if (section && section[key]) {
      return section[key];
    }
    // Fallback to English
    const fallbackSection = translations['en'];
    if (fallbackSection && fallbackSection[key]) {
      return fallbackSection[key];
    }
    return key;
  };

  const isKhmer = language === 'km';

  // Set document lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'km') {
      document.body.classList.add('font-khmer');
      document.body.classList.remove('font-sans');
    } else {
      document.body.classList.remove('font-khmer');
      document.body.classList.add('font-sans');
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isKhmer }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
