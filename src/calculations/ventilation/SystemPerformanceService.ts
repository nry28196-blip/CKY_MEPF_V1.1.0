import { ValidationStatus } from './VentilationValidationService';
import { 
  CalculationAuditRecord, 
  EngineeringAuditService, 
  InputProvenanceRecord 
} from '../audit/EngineeringAuditContract';
import { SourceType } from '../../data/ventilation/ashrae621/types';

export interface SystemPerformanceInput {
  qOutdoorAir: number | null | undefined;
  qReturnAir: number | null | undefined;
  densityRatio: number | null | undefined;
  criticalDuctLength: number | null | undefined;
  ductFrictionRate: number | null | undefined;
  fittingLosses: number | null | undefined;
  equipmentPressureDrop: number | null | undefined;
  fanEfficiency: number | null | undefined; // Fraction (0 to 1.0) or percentage (0 to 100)
  motorEfficiency: number | null | undefined; // Fraction (0 to 1.0) or percentage (0 to 100)
  isMetric: boolean;
}

export interface SystemPerformanceResult {
  qSupplyStandard: number | null;
  qSupplyActual: number | null;
  totalStaticPressure: number | null;
  fanBrakeHorsepower: number | null; // BHP in IP, mechanical kW in Metric
  motorElectricalPower: number | null; // kW in both IP and Metric
  status: ValidationStatus;
  isAuthoritative: boolean;
  isApprovedForEngineeringUse: boolean;
  complianceNotice: string;
  reasons: string[];
  warnings: string[];
  auditRecord?: CalculationAuditRecord;
}

const UTILITY_NOTICE = 
  'Fan & Duct Aerodynamic Performance Diagnostic Utility only. Not an ANSI/ASHRAE Standard 62.1 compliance procedure. Cannot be used for official code compliance or engineering sign-off.';

/**
 * SystemPerformanceService
 * 
 * Hardened as an Engineering Fan and Duct System Aerodynamic Performance Estimator.
 * 
 * Strict safety rules:
 * - Rejects non-finite, missing, zero, or negative inputs with INCOMPLETE or FAIL.
 * - Rejects non-positive density ratio (densityRatio <= 0) with FAIL (never silently falls back).
 * - Rejects efficiencies <= 0 or > 1.0 (or > 100%) with FAIL.
 * - Rejects negative lengths, friction rates, fitting losses, equipment drops with FAIL.
 * - Rejects total supply air <= 0 with FAIL.
 * - Non-PASS results yield null numeric values.
 * - Explicit status lifecycle: PASS, INCOMPLETE, FAIL, BLOCKED, NOT_VERIFIED.
 * - Non-authoritative: isAuthoritative = false, isApprovedForEngineeringUse = false.
 */
export class SystemPerformanceService {
  static calculateFanPerformance(input: SystemPerformanceInput): SystemPerformanceResult {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Missing checks -> INCOMPLETE
    if (
      input.qOutdoorAir === undefined || input.qOutdoorAir === null ||
      input.qReturnAir === undefined || input.qReturnAir === null ||
      input.densityRatio === undefined || input.densityRatio === null ||
      input.criticalDuctLength === undefined || input.criticalDuctLength === null ||
      input.ductFrictionRate === undefined || input.ductFrictionRate === null ||
      input.fittingLosses === undefined || input.fittingLosses === null ||
      input.equipmentPressureDrop === undefined || input.equipmentPressureDrop === null ||
      input.fanEfficiency === undefined || input.fanEfficiency === null ||
      input.motorEfficiency === undefined || input.motorEfficiency === null
    ) {
      reasons.push('Missing required system performance parameters.');
      return {
        qSupplyStandard: null,
        qSupplyActual: null,
        totalStaticPressure: null,
        fanBrakeHorsepower: null,
        motorElectricalPower: null,
        status: 'INCOMPLETE',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: UTILITY_NOTICE,
        reasons,
        warnings
      };
    }

    const {
      qOutdoorAir,
      qReturnAir,
      densityRatio,
      criticalDuctLength,
      ductFrictionRate,
      fittingLosses,
      equipmentPressureDrop,
      isMetric
    } = input;

    // 2. Finite checks
    if (
      !Number.isFinite(qOutdoorAir) ||
      !Number.isFinite(qReturnAir) ||
      !Number.isFinite(densityRatio) ||
      !Number.isFinite(criticalDuctLength) ||
      !Number.isFinite(ductFrictionRate) ||
      !Number.isFinite(fittingLosses) ||
      !Number.isFinite(equipmentPressureDrop) ||
      !Number.isFinite(input.fanEfficiency) ||
      !Number.isFinite(input.motorEfficiency)
    ) {
      reasons.push('All engineering parameters must be finite numbers.');
      return {
        qSupplyStandard: null,
        qSupplyActual: null,
        totalStaticPressure: null,
        fanBrakeHorsepower: null,
        motorElectricalPower: null,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: UTILITY_NOTICE,
        reasons,
        warnings
      };
    }

    // 3. Efficiency normalization & range check (must be > 0 and <= 1.0 fraction, or >= 5% and <= 100% percentage)
    const normalizeEfficiency = (val: number, name: string): number => {
      if (val <= 0) {
        reasons.push(`${name} (${val}) must be strictly greater than 0%.`);
        return 0;
      }
      if (val > 100) {
        reasons.push(`${name} (${val}) exceeds 100%.`);
        return 0;
      }
      if (val > 1.0 && val < 5.0) {
        reasons.push(`${name} (${val}) is invalid: fraction exceeds 1.0 (100%), and percentage is below minimum practical efficiency (5%).`);
        return 0;
      }
      return val > 1.0 ? val / 100 : val;
    };

    const fanEff = normalizeEfficiency(input.fanEfficiency, 'Fan efficiency');
    const motorEff = normalizeEfficiency(input.motorEfficiency, 'Motor efficiency');

    // 4. Physical checks
    if (qOutdoorAir < 0 || qReturnAir < 0) {
      reasons.push('Airflow rates cannot be negative.');
    }
    const qSupplyStandard = qOutdoorAir + qReturnAir;
    if (qSupplyStandard <= 0) {
      reasons.push('Total supply airflow (qOutdoorAir + qReturnAir) must be strictly greater than zero.');
    }

    // Strict density ratio check - NEVER silently substitute a fallback
    if (densityRatio <= 0) {
      reasons.push(`Air density ratio (${densityRatio}) must be strictly greater than zero.`);
    }

    if (criticalDuctLength <= 0) {
      reasons.push('Critical duct length must be strictly greater than zero.');
    }
    if (ductFrictionRate <= 0) {
      reasons.push('Duct friction rate must be strictly greater than zero.');
    }
    if (fittingLosses < 0) {
      reasons.push('Fitting dynamic pressure loss cannot be negative.');
    }
    if (equipmentPressureDrop < 0) {
      reasons.push('Equipment internal pressure drop cannot be negative.');
    }

    if (reasons.length > 0) {
      return {
        qSupplyStandard: null,
        qSupplyActual: null,
        totalStaticPressure: null,
        fanBrakeHorsepower: null,
        motorElectricalPower: null,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: UTILITY_NOTICE,
        reasons,
        warnings
      };
    }

    // 5. Rigorous Calculations
    // Actual airflow corrected for air density: Q_act = Q_std / densityRatio
    const qSupplyActual = qSupplyStandard / densityRatio;

    // Total static pressure calculation
    let ductFriction = 0;
    if (isMetric) {
      // metric: criticalDuctLength (m) * ductFrictionRate (Pa/m) -> Pa
      ductFriction = criticalDuctLength * ductFrictionRate;
    } else {
      // imperial: (criticalDuctLength (ft) / 100) * ductFrictionRate (in.wg/100ft) -> in.wg.
      ductFriction = (criticalDuctLength / 100) * ductFrictionRate;
    }
    const totalStaticPressure = ductFriction + fittingLosses + equipmentPressureDrop;

    // Fan Power Calculation
    let fanBHP = 0; // mechanical power: kW in Metric, BHP in Imperial
    let motorElectricalPower = 0; // electrical input power in kW

    if (isMetric) {
      // Metric: Q in L/s -> m^3/s = Q / 1000.
      // Fan mechanical power (kW) = (Q_m3_s * deltaP_Pa) / (1000 * fanEff) = (Q_L_s * deltaP_Pa) / (1_000_000 * fanEff)
      fanBHP = (qSupplyActual * totalStaticPressure) / (1_000_000 * fanEff);
      motorElectricalPower = fanBHP / motorEff;
    } else {
      // Imperial: Q in CFM, deltaP in in.wg.
      // Fan BHP = (CFM * in.wg.) / (6356 * fanEff)
      fanBHP = (qSupplyActual * totalStaticPressure) / (6356 * fanEff);
      // Motor electrical power (kW) = BHP * 0.7457 / motorEff
      motorElectricalPower = (fanBHP * 0.7457) / motorEff;
    }

    // 6. Audit Trail
    const flowUnit = isMetric ? 'L/s' : 'CFM';
    const presUnit = isMetric ? 'Pa' : 'in.wg.';
    const lenUnit = isMetric ? 'm' : 'ft';
    const frictUnit = isMetric ? 'Pa/m' : 'in.wg./100ft';

    const provenance: Record<string, InputProvenanceRecord> = {
      qSupplyStandard: {
        key: 'qSupplyStandard',
        name: 'Standard Supply Airflow',
        value: qSupplyStandard,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      densityRatio: {
        key: 'densityRatio',
        name: 'Air Density Ratio (Eρ)',
        value: densityRatio,
        unit: 'ratio',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      criticalDuctLength: {
        key: 'criticalDuctLength',
        name: 'Critical Duct Run Length',
        value: criticalDuctLength,
        unit: lenUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      ductFrictionRate: {
        key: 'ductFrictionRate',
        name: 'Design Duct Friction Rate',
        value: ductFrictionRate,
        unit: frictUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      totalStaticPressure: {
        key: 'totalStaticPressure',
        name: 'Total Fan Static Pressure',
        value: totalStaticPressure,
        unit: presUnit,
        source: 'DERIVED',
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'DERIVED'
      }
    };

    const auditRecord = EngineeringAuditService.fromGenericMepCalculation({
      system: 'Ventilation',
      standard: 'Non-Standard Utility',
      edition: 'Diagnostic',
      revisionBasis: 'Fan and Duct Aerodynamic Sizing Utility (Non-ASHRAE Compliance)',
      calculationPath: {
        id: 'fan_duct_performance_diagnostic',
        name: 'Fan & Duct Aerodynamic Duty Point Estimator',
        description: 'Estimates system static pressure and fan/motor power requirements'
      },
      inputs: {
        qOutdoorAir,
        qReturnAir,
        densityRatio,
        criticalDuctLength,
        ductFrictionRate,
        fittingLosses,
        equipmentPressureDrop,
        fanEfficiency: fanEff,
        motorEfficiency: motorEff
      },
      provenance,
      equations: [
        {
          symbol: 'Q_act',
          name: 'Actual Airflow Density Correction',
          equation: 'Q_act = Q_std / Eρ',
          reference: 'Fan affinity / mass flow conservation'
        },
        {
          symbol: 'SP_total',
          name: 'Total Static Pressure',
          equation: isMetric 
            ? 'SP = (Length × FrictionRate) + FittingLosses + EquipmentDrop'
            : 'SP = ((Length / 100) × FrictionRate) + FittingLosses + EquipmentDrop',
          reference: 'Duct network friction loss'
        },
        {
          symbol: 'Power_motor',
          name: 'Motor Electrical Power',
          equation: isMetric
            ? 'P_elec = (Q_act × SP) / (1,000,000 × η_fan × η_motor)'
            : 'P_elec = ((CFM × SP) / (6356 × η_fan)) × 0.7457 / η_motor',
          reference: 'AMCA / ASHRAE Fundamentals Fan Power Equations'
        }
      ],
      intermediateResults: [
        { symbol: 'Q_act', name: 'Density-Corrected Actual Flow', value: qSupplyActual, unit: flowUnit },
        { symbol: 'SP_duct', name: 'Duct Friction Loss', value: ductFriction, unit: presUnit },
        { symbol: 'SP_total', name: 'Total Static Pressure', value: totalStaticPressure, unit: presUnit },
        { symbol: 'P_fan', name: 'Fan Shaft Power', value: fanBHP, unit: isMetric ? 'kW' : 'BHP' }
      ],
      finalResult: {
        symbol: 'P_motor',
        name: 'Motor Electrical Power',
        value: motorElectricalPower,
        unit: 'kW',
        complianceSummary: UTILITY_NOTICE
      },
      validationStatus: 'PASS',
      authorityPolicy: 'DIAGNOSTIC',
      authoritativeEligible: false,
      warnings: [...warnings, UTILITY_NOTICE]
    });

    return {
      qSupplyStandard,
      qSupplyActual,
      totalStaticPressure,
      fanBrakeHorsepower: fanBHP,
      motorElectricalPower,
      status: 'PASS',
      isAuthoritative: false,
      isApprovedForEngineeringUse: false,
      complianceNotice: UTILITY_NOTICE,
      reasons,
      warnings,
      auditRecord
    };
  }
}
