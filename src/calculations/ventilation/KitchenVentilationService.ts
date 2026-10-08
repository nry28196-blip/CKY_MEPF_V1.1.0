import { ValidationStatus } from './VentilationValidationService';
import { 
  CalculationAuditRecord, 
  EngineeringAuditService, 
  InputProvenanceRecord 
} from '../audit/EngineeringAuditContract';
import { SourceType } from '../../data/ventilation/ashrae621/types';

export type KitchenHoodStandard = 'unlisted' | 'listed' | 'performance';
export type KitchenHoodType = 'wall' | 'single_island' | 'double_island' | 'backshelf' | 'eyebrow';
export type KitchenThermalDuty = 'light' | 'medium' | 'heavy' | 'extra';

export interface KitchenVentilationInput {
  hoodStandard: KitchenHoodStandard;
  hoodType: KitchenHoodType;
  duty: KitchenThermalDuty;
  equipmentLength: number | null | undefined; // meters or feet
  overhang: number | null | undefined; // meters or feet
  hoodDepth: number | null | undefined; // meters or feet
  captureVelocity?: number | null | undefined; // m/s or FPM (for performance)
  listedFlowPerLength?: number | null | undefined; // L/s-m or CFM/ft (for listed)
  ductVelocity: number | null | undefined; // m/s or FPM
  muaTransfer?: number; // %
  muaCeiling?: number; // %
  muaPerimeter?: number; // %
  muaInternal?: number; // %
  isMetric: boolean;
}

export interface KitchenVentilationResult {
  exhaustAirflow: number | null; // L/s or CFM
  hoodLength: number | null; // m or ft
  faceVelocity: number | null; // m/s or FPM
  ductArea: number | null; // cm² or sq.in
  status: ValidationStatus;
  isAuthoritative: boolean;
  isApprovedForEngineeringUse: boolean;
  complianceNotice: string;
  reasons: string[];
  warnings: string[];
  auditRecord?: CalculationAuditRecord;
}

export const KITCHEN_DIAGNOSTIC_NOTICE = 
  'Kitchen Exhaust Engineering Diagnostic Utility only. Sizing estimate based on IMC 507 / ASHRAE 154 guidelines. Not an official code-compliance determination or engineering sign-off.';

// IMC 507.5 Base Prescriptive Rates (CFM per linear foot of hood)
// 0 indicates not permitted by code for unlisted hoods
export const IMC_UNLISTED_RATES: Record<KitchenHoodType, Record<KitchenThermalDuty, number>> = {
  wall: { light: 200, medium: 300, heavy: 400, extra: 550 },
  single_island: { light: 400, medium: 500, heavy: 600, extra: 700 },
  double_island: { light: 250, medium: 300, heavy: 400, extra: 550 },
  backshelf: { light: 250, medium: 300, heavy: 400, extra: 0 },
  eyebrow: { light: 250, medium: 250, heavy: 250, extra: 0 },
};

/**
 * KitchenVentilationService
 * 
 * Classified strictly as a Kitchen Exhaust Engineering Diagnostic Utility.
 * 
 * Safety invariants:
 * - Full input validation (missing -> INCOMPLETE, non-finite/negative -> FAIL).
 * - IMC 507 unlisted duty restriction checks.
 * - Non-PASS results yield null numeric values.
 * - isAuthoritative = false, isApprovedForEngineeringUse = false.
 * - Embedded audit record enforces authoritativeEligible = false.
 */
export class KitchenVentilationService {
  static calculate(input: KitchenVentilationInput): KitchenVentilationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const isMetric = input.isMetric;

    const flowUnit = isMetric ? 'L/s' : 'CFM';
    const lenUnit = isMetric ? 'm' : 'ft';
    const velUnit = isMetric ? 'm/s' : 'FPM';
    const areaUnit = isMetric ? 'cm²' : 'sq.in';

    // 1. Missing checks -> INCOMPLETE
    if (
      input.equipmentLength === undefined || input.equipmentLength === null ||
      input.overhang === undefined || input.overhang === null ||
      input.hoodDepth === undefined || input.hoodDepth === null ||
      input.ductVelocity === undefined || input.ductVelocity === null
    ) {
      reasons.push('Missing required kitchen hood geometric or duct velocity parameters.');
      return this.emptyResult('INCOMPLETE', reasons, warnings);
    }

    if (input.hoodStandard === 'listed' && (input.listedFlowPerLength === undefined || input.listedFlowPerLength === null)) {
      reasons.push('Listed hood airflow rate per length is required for listed hood mode.');
      return this.emptyResult('INCOMPLETE', reasons, warnings);
    }

    if (input.hoodStandard === 'performance' && (input.captureVelocity === undefined || input.captureVelocity === null)) {
      reasons.push('Capture velocity is required for performance hood mode.');
      return this.emptyResult('INCOMPLETE', reasons, warnings);
    }

    const { equipmentLength, overhang, hoodDepth, ductVelocity } = input;

    // 2. Finite checks -> FAIL
    if (
      !Number.isFinite(equipmentLength) ||
      !Number.isFinite(overhang) ||
      !Number.isFinite(hoodDepth) ||
      !Number.isFinite(ductVelocity) ||
      (input.listedFlowPerLength !== undefined && input.listedFlowPerLength !== null && !Number.isFinite(input.listedFlowPerLength)) ||
      (input.captureVelocity !== undefined && input.captureVelocity !== null && !Number.isFinite(input.captureVelocity))
    ) {
      reasons.push('All engineering parameters must be finite numbers.');
      return this.emptyResult('FAIL', reasons, warnings);
    }

    // 3. Positive / Non-negative checks -> FAIL
    if (equipmentLength <= 0) {
      reasons.push('Equipment length must be strictly greater than zero.');
    }
    if (overhang < 0) {
      reasons.push('Hood overhang cannot be negative.');
    }
    if (hoodDepth <= 0) {
      reasons.push('Hood depth must be strictly greater than zero.');
    }
    if (ductVelocity <= 0) {
      reasons.push('Exhaust duct velocity must be strictly greater than zero.');
    }

    // Check unlisted duty permissions per IMC 507
    if (input.hoodStandard === 'unlisted') {
      const baseRateCfm = IMC_UNLISTED_RATES[input.hoodType]?.[input.duty] ?? 0;
      if (baseRateCfm === 0) {
        reasons.push(`Unlisted ${input.hoodType} hood is not permitted for ${input.duty}-duty cooking equipment under IMC Section 507.`);
      }
    } else if (input.hoodStandard === 'listed') {
      if (input.listedFlowPerLength! <= 0) {
        reasons.push('Listed hood airflow rate must be strictly greater than zero.');
      }
      warnings.push('Listed hood calculation relies on manufacturer UL 710 listing data (Project/Manufacturer input, not standard table).');
    } else if (input.hoodStandard === 'performance') {
      if (input.captureVelocity! <= 0) {
        reasons.push('Capture velocity must be strictly greater than zero.');
      }
      warnings.push('Performance mode uses diagnostic capture-velocity sizing (Diagnostic estimate, not an approved ASHRAE 154 performance path).');
    }

    if (reasons.length > 0) {
      return this.emptyResult('FAIL', reasons, warnings);
    }

    // 4. Calculations
    const eqLenFt = isMetric ? equipmentLength * 3.28084 : equipmentLength;
    const overhangFt = isMetric ? overhang * 3.28084 : overhang;
    const depthFt = isMetric ? hoodDepth * 3.28084 : hoodDepth;
    const hLenFt = eqLenFt + (2 * overhangFt);

    let cfm = 0;
    if (input.hoodStandard === 'unlisted') {
      const baseRateCfm = IMC_UNLISTED_RATES[input.hoodType][input.duty];
      cfm = hLenFt * baseRateCfm;
    } else if (input.hoodStandard === 'listed') {
      if (isMetric) {
        const flowLs = input.listedFlowPerLength! * (equipmentLength + 2 * overhang);
        cfm = flowLs * 2.11888;
      } else {
        cfm = input.listedFlowPerLength! * hLenFt;
      }
    } else if (input.hoodStandard === 'performance') {
      const faceAreaSqFt = hLenFt * depthFt;
      const targetVelFpm = isMetric ? input.captureVelocity! * 196.85 : input.captureVelocity!;
      cfm = targetVelFpm * faceAreaSqFt;
    }

    const exhaustAirflow = isMetric ? (cfm / 2.11888) : cfm;
    const hoodLength = isMetric ? (hLenFt / 3.28084) : hLenFt;

    const faceAreaSqFt = hLenFt * depthFt;
    const actualVelFpm = faceAreaSqFt > 0 ? cfm / faceAreaSqFt : 0;
    const faceVelocity = isMetric ? (actualVelFpm / 196.85) : actualVelFpm;

    // Duct Area: Q / V
    let ductArea = 0;
    if (ductVelocity > 0) {
      if (isMetric) {
        // m3/s / (m/s) -> m2 -> cm2 (* 10,000)
        const m3s = exhaustAirflow / 1000;
        const areaM2 = m3s / ductVelocity;
        ductArea = areaM2 * 10000;
      } else {
        // CFM / FPM -> sq.ft -> sq.in (* 144)
        const areaSqFt = cfm / ductVelocity;
        ductArea = areaSqFt * 144;
      }
    }

    // 5. Audit Record
    const provenance: Record<string, InputProvenanceRecord> = {
      equipmentLength: {
        key: 'equipmentLength',
        name: 'Cooking Equipment Length',
        value: equipmentLength,
        unit: lenUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      hoodLength: {
        key: 'hoodLength',
        name: 'Calculated Hood Length (incl. overhangs)',
        value: hoodLength,
        unit: lenUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'DERIVED'
      },
      hoodDepth: {
        key: 'hoodDepth',
        name: 'Hood Depth',
        value: hoodDepth,
        unit: lenUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      ductVelocity: {
        key: 'ductVelocity',
        name: 'Design Exhaust Duct Velocity',
        value: ductVelocity,
        unit: velUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      }
    };

    if (input.hoodStandard === 'unlisted') {
      provenance['imcRate'] = {
        key: 'imcRate',
        name: 'IMC 507.5 Prescriptive Exhaust Rate',
        value: IMC_UNLISTED_RATES[input.hoodType][input.duty],
        unit: 'CFM/linear ft',
        source: SourceType.ADOPTED_CODE,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'ENGINEERING_STANDARD',
        reference: 'IMC Section 507.5'
      };
    } else if (input.hoodStandard === 'listed') {
      provenance['listedRate'] = {
        key: 'listedRate',
        name: 'UL 710 Listed Hood Unit Rate',
        value: input.listedFlowPerLength!,
        unit: isMetric ? 'L/s-m' : 'CFM/ft',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED',
        reference: 'Manufacturer UL 710 Listing'
      };
    } else if (input.hoodStandard === 'performance') {
      provenance['captureVelocity'] = {
        key: 'captureVelocity',
        name: 'Target Hood Capture Velocity',
        value: input.captureVelocity!,
        unit: velUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED',
        reference: 'Engineering Diagnostic (Capture Velocity)'
      };
    }

    const auditRecord = EngineeringAuditService.fromGenericMepCalculation({
      system: 'Ventilation',
      standard: 'Non-Standard Diagnostic Utility',
      edition: 'Diagnostic',
      revisionBasis: 'Kitchen Exhaust Diagnostic Utility (IMC 507 / ASHRAE 154)',
      calculationPath: {
        id: 'kitchen_exhaust_diagnostic',
        name: 'Kitchen Exhaust Hood Sizing Diagnostic Utility',
        description: 'Commercial kitchen hood volumetric exhaust and duct sizing diagnostic estimate'
      },
      inputs: {
        hoodStandard: input.hoodStandard,
        hoodType: input.hoodType,
        duty: input.duty,
        equipmentLength,
        overhang,
        hoodDepth,
        ductVelocity
      },
      provenance,
      equations: [
        {
          symbol: 'Q_exhaust',
          name: 'Kitchen Exhaust Airflow',
          equation: input.hoodStandard === 'unlisted' 
            ? 'Q = Length_hood × IMC_Rate' 
            : input.hoodStandard === 'listed' 
              ? 'Q = Length_hood × Listed_Rate' 
              : 'Q = Area_face × Velocity_capture',
          reference: 'IMC 507 / ASHRAE 154 (Diagnostic Estimate)'
        },
        {
          symbol: 'A_duct',
          name: 'Exhaust Duct Cross-Sectional Area',
          equation: 'A_duct = Q_exhaust / V_duct',
          reference: 'Continuity equation'
        }
      ],
      intermediateResults: [
        { symbol: 'L_hood', name: 'Total Hood Length', value: hoodLength, unit: lenUnit },
        { symbol: 'V_face', name: 'Calculated Hood Face Velocity', value: faceVelocity, unit: velUnit },
        { symbol: 'A_duct', name: 'Minimum Duct Area', value: ductArea, unit: areaUnit }
      ],
      finalResult: {
        symbol: 'Q_exhaust',
        name: 'Kitchen Hood Exhaust Airflow',
        value: exhaustAirflow,
        unit: flowUnit,
        complianceSummary: KITCHEN_DIAGNOSTIC_NOTICE
      },
      validationStatus: 'PASS',
      authorityPolicy: 'DIAGNOSTIC',
      authoritativeEligible: false,
      warnings: [...warnings, KITCHEN_DIAGNOSTIC_NOTICE]
    });

    return {
      exhaustAirflow,
      hoodLength,
      faceVelocity,
      ductArea,
      status: 'PASS',
      isAuthoritative: false,
      isApprovedForEngineeringUse: false,
      complianceNotice: KITCHEN_DIAGNOSTIC_NOTICE,
      reasons,
      warnings,
      auditRecord
    };
  }

  private static emptyResult(status: ValidationStatus, reasons: string[], warnings: string[]): KitchenVentilationResult {
    return {
      exhaustAirflow: null,
      hoodLength: null,
      faceVelocity: null,
      ductArea: null,
      status,
      isAuthoritative: false,
      isApprovedForEngineeringUse: false,
      complianceNotice: KITCHEN_DIAGNOSTIC_NOTICE,
      reasons,
      warnings
    };
  }
}
