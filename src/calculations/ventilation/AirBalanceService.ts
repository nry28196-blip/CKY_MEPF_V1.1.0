import { ValidationStatus } from './VentilationValidationService';
import { 
  CalculationAuditRecord, 
  EngineeringAuditService, 
  InputProvenanceRecord 
} from '../audit/EngineeringAuditContract';
import { SourceType } from '../../data/ventilation/ashrae621/types';

export interface AirBalanceInput {
  qSupply: number | null | undefined;
  qExhaust: number | null | undefined;
  qReturn: number | null | undefined;
  qTransferIn: number | null | undefined;
  unit?: 'L/s' | 'CFM';
}

export interface AirBalanceResult {
  qNet: number | null;
  pressureRelationship: 'Positive' | 'Negative' | 'Neutral' | 'Indeterminate';
  transferOut: number | null;
  status: ValidationStatus;
  isAuthoritative: boolean;
  isApprovedForEngineeringUse: boolean;
  complianceNotice: string;
  reasons: string[];
  warnings: string[];
  auditRecord?: CalculationAuditRecord;
}

export interface SystemBalanceInput {
  qSupply: number | null | undefined;
  qOutdoorAir: number | null | undefined;
  qReturn: number | null | undefined;
  qExhaust: number | null | undefined;
  buildingVolume: number | null | undefined;
  isMetric: boolean;
}

export interface SystemBalanceResult {
  buildingPressure: 'Positive' | 'Negative' | 'Neutral' | 'Indeterminate';
  qRecirculated: number | null;
  qRelief: number | null;
  totalExhaustAndRelief: number | null;
  qNetBuilding: number | null;
  isValid: boolean;
  status: ValidationStatus;
  isAuthoritative: boolean;
  isApprovedForEngineeringUse: boolean;
  complianceNotice: string;
  warnings: string[];
  reasons: string[];
  auditRecord?: CalculationAuditRecord;
}

const DIAGNOSTIC_NOTICE = 
  'Ventilation Engineering Diagnostic / Air-Balance Utility only. Not an ANSI/ASHRAE Standard 62.1 compliance determination. Cannot be used for official code compliance or engineering sign-off.';

/**
 * AirBalanceService
 * 
 * Hardened as a Ventilation Engineering Diagnostic / Volumetric Air-Balance Utility.
 * 
 * Strict safety rules:
 * - Complete numeric input validation (finite, positive/non-negative, missing checks).
 * - Finite-number checks; negative flows rejected with FAIL.
 * - Physically contradictory flows rejected with FAIL.
 * - Explicit status lifecycle: PASS, INCOMPLETE, FAIL, BLOCKED, NOT_VERIFIED.
 * - Non-authoritative: isAuthoritative = false, isApprovedForEngineeringUse = false.
 * - Non-PASS results yield null numeric values.
 */
export class AirBalanceService {
  /**
   * Room volumetric air balance calculation.
   */
  static calculateRoomBalance(input: AirBalanceInput): AirBalanceResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flowUnit = input.unit || 'L/s';

    // 1. Missing checks -> INCOMPLETE
    if (
      input.qSupply === undefined || input.qSupply === null ||
      input.qExhaust === undefined || input.qExhaust === null ||
      input.qReturn === undefined || input.qReturn === null ||
      input.qTransferIn === undefined || input.qTransferIn === null
    ) {
      reasons.push('Missing required volumetric flow rate inputs.');
      return {
        qNet: null,
        pressureRelationship: 'Indeterminate',
        transferOut: null,
        status: 'INCOMPLETE',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        reasons,
        warnings
      };
    }

    const { qSupply, qExhaust, qReturn, qTransferIn } = input;

    // 2. Finite numbers check
    if (
      !Number.isFinite(qSupply) ||
      !Number.isFinite(qExhaust) ||
      !Number.isFinite(qReturn) ||
      !Number.isFinite(qTransferIn)
    ) {
      reasons.push('Airflow rates must be finite numbers.');
      return {
        qNet: null,
        pressureRelationship: 'Indeterminate',
        transferOut: null,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        reasons,
        warnings
      };
    }

    // 3. Negative-flow rejection -> FAIL
    if (qSupply < 0 || qExhaust < 0 || qReturn < 0 || qTransferIn < 0) {
      reasons.push('Volumetric airflow rates cannot be negative.');
      return {
        qNet: null,
        pressureRelationship: 'Indeterminate',
        transferOut: null,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        reasons,
        warnings
      };
    }

    // 4. Physical reality: all zero flows check
    if (qSupply === 0 && qExhaust === 0 && qReturn === 0 && qTransferIn === 0) {
      warnings.push('All room airflows are zero. System is in unventilated / off state.');
    }

    // 5. Volumetric Calculation
    const qNet = (qSupply + qTransferIn) - (qExhaust + qReturn);
    
    let pressureRelationship: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
    if (qNet > 1e-4) pressureRelationship = 'Positive';
    else if (qNet < -1e-4) pressureRelationship = 'Negative';

    const transferOut = qNet > 0 ? qNet : 0;

    // 6. Audit & Provenance
    const provenance: Record<string, InputProvenanceRecord> = {
      qSupply: {
        key: 'qSupply',
        name: 'Supply Airflow',
        value: qSupply,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qExhaust: {
        key: 'qExhaust',
        name: 'Exhaust Airflow',
        value: qExhaust,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qReturn: {
        key: 'qReturn',
        name: 'Return Airflow',
        value: qReturn,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qTransferIn: {
        key: 'qTransferIn',
        name: 'Transfer Airflow In',
        value: qTransferIn,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      }
    };

    const auditRecord = EngineeringAuditService.fromGenericMepCalculation({
      system: 'Ventilation',
      standard: 'Non-Standard Diagnostic Utility',
      edition: 'Diagnostic',
      revisionBasis: 'Engineering Diagnostic (Room Volumetric Flow Continuity)',
      calculationPath: {
        id: 'room_air_balance_diagnostic',
        name: 'Room Air Balance Diagnostic Utility',
        description: 'Simplified volumetric continuity check for room differential flow'
      },
      inputs: { qSupply, qExhaust, qReturn, qTransferIn },
      provenance,
      equations: [
        {
          symbol: 'Q_net',
          name: 'Net Room Differential Airflow',
          equation: 'Q_net = (Q_supply + Q_transfer_in) - (Q_exhaust + Q_return)',
          reference: 'Volumetric continuity (Diagnostic)'
        }
      ],
      intermediateResults: [
        { symbol: 'TotalIn', name: 'Total Supply & Transfer In', value: qSupply + qTransferIn, unit: flowUnit },
        { symbol: 'TotalOut', name: 'Total Return & Exhaust Out', value: qExhaust + qReturn, unit: flowUnit }
      ],
      finalResult: {
        symbol: 'Q_net',
        name: 'Room Net Airflow Differential',
        value: qNet,
        unit: flowUnit,
        complianceSummary: DIAGNOSTIC_NOTICE
      },
      validationStatus: 'PASS',
      authorityPolicy: 'DIAGNOSTIC',
      authoritativeEligible: false,
      warnings: [...warnings, DIAGNOSTIC_NOTICE]
    });

    return {
      qNet,
      pressureRelationship,
      transferOut,
      status: 'PASS',
      // Non-authoritative diagnostic
      isAuthoritative: false,
      isApprovedForEngineeringUse: false,
      complianceNotice: DIAGNOSTIC_NOTICE,
      reasons,
      warnings,
      auditRecord
    };
  }

  /**
   * System-level air balance and building pressurization check.
   */
  static calculateSystemBalance(input: SystemBalanceInput): SystemBalanceResult {
    const warnings: string[] = [];
    const reasons: string[] = [];
    const flowUnit = input.isMetric ? 'L/s' : 'CFM';

    // 1. Missing checks -> INCOMPLETE
    if (
      input.qSupply === undefined || input.qSupply === null ||
      input.qOutdoorAir === undefined || input.qOutdoorAir === null ||
      input.qReturn === undefined || input.qReturn === null ||
      input.qExhaust === undefined || input.qExhaust === null ||
      input.buildingVolume === undefined || input.buildingVolume === null
    ) {
      reasons.push('Missing required system volumetric flow rate or building volume inputs.');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'INCOMPLETE',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    const { qSupply, qOutdoorAir, qReturn, qExhaust, buildingVolume, isMetric } = input;

    // 2. Finite checks
    if (
      !Number.isFinite(qSupply) ||
      !Number.isFinite(qOutdoorAir) ||
      !Number.isFinite(qReturn) ||
      !Number.isFinite(qExhaust) ||
      !Number.isFinite(buildingVolume)
    ) {
      reasons.push('System airflow rates and building volume must be finite numbers.');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    // 3. Negative checks
    if (qSupply < 0 || qOutdoorAir < 0 || qReturn < 0 || qExhaust < 0) {
      reasons.push('Airflow rates cannot be negative.');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    if (buildingVolume <= 0) {
      reasons.push('Building volume must be strictly greater than zero.');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    // 4. Physical contradiction checks -> FAIL
    if (qOutdoorAir > qSupply) {
      reasons.push('Physical contradiction: Outdoor air (Q_oa) exceeds total supply air (Q_supply).');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    const qRecirculated = qSupply - qOutdoorAir;
    
    if (qRecirculated > qReturn) {
      reasons.push('Physical contradiction: Required recirculated air exceeds available return air.');
      return {
        buildingPressure: 'Indeterminate',
        qRecirculated: null,
        qRelief: null,
        totalExhaustAndRelief: null,
        qNetBuilding: null,
        isValid: false,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        complianceNotice: DIAGNOSTIC_NOTICE,
        warnings,
        reasons
      };
    }

    // 5. System Volumetric Calculation
    const qRelief = Math.max(0, qReturn - qRecirculated);
    const totalExhaustAndRelief = qExhaust + qRelief;
    const qNetBuilding = qOutdoorAir - totalExhaustAndRelief;

    let buildingPressure: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
    if (qNetBuilding > 1e-4) buildingPressure = 'Positive';
    else if (qNetBuilding < -1e-4) buildingPressure = 'Negative';

    // 6. Audit & Provenance
    const provenance: Record<string, InputProvenanceRecord> = {
      qSupply: {
        key: 'qSupply',
        name: 'System Supply Airflow',
        value: qSupply,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qOutdoorAir: {
        key: 'qOutdoorAir',
        name: 'Outdoor Air Intake Airflow',
        value: qOutdoorAir,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qReturn: {
        key: 'qReturn',
        name: 'Return Airflow',
        value: qReturn,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      qExhaust: {
        key: 'qExhaust',
        name: 'Building Exhaust Airflow',
        value: qExhaust,
        unit: flowUnit,
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      },
      buildingVolume: {
        key: 'buildingVolume',
        name: 'Building Volume',
        value: buildingVolume,
        unit: isMetric ? 'm³' : 'ft³',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: 'VERIFIED',
        engineeringStatus: 'USER_SUPPLIED'
      }
    };

    const auditRecord = EngineeringAuditService.fromGenericMepCalculation({
      system: 'Ventilation',
      standard: 'Non-Standard Diagnostic Utility',
      edition: 'Diagnostic',
      revisionBasis: 'Engineering Diagnostic (Building Volumetric Flow Continuity)',
      calculationPath: {
        id: 'system_air_balance_diagnostic',
        name: 'System Air Balance Diagnostic Utility',
        description: 'Simplified volumetric continuity check for building net pressurization'
      },
      inputs: { qSupply, qOutdoorAir, qReturn, qExhaust, buildingVolume },
      provenance,
      equations: [
        {
          symbol: 'Q_recirc',
          name: 'Recirculated Airflow',
          equation: 'Q_recirc = Q_supply - Q_oa',
          reference: 'Diagnostic utility balance'
        },
        {
          symbol: 'Q_relief',
          name: 'Relief Airflow',
          equation: 'Q_relief = max(0, Q_return - Q_recirc)',
          reference: 'Diagnostic utility balance'
        },
        {
          symbol: 'Q_net_bldg',
          name: 'Net Building Airflow',
          equation: 'Q_net_bldg = Q_oa - (Q_exhaust + Q_relief)',
          reference: 'Diagnostic utility balance'
        }
      ],
      intermediateResults: [
        { symbol: 'Q_recirc', name: 'Recirculated Airflow', value: qRecirculated, unit: flowUnit },
        { symbol: 'Q_relief', name: 'Relief Airflow', value: qRelief, unit: flowUnit },
        { symbol: 'Q_exhaust_relief', name: 'Total Exhaust and Relief', value: totalExhaustAndRelief, unit: flowUnit }
      ],
      finalResult: {
        symbol: 'Q_net_bldg',
        name: 'Net Building Pressurization Flow',
        value: qNetBuilding,
        unit: flowUnit,
        complianceSummary: DIAGNOSTIC_NOTICE
      },
      validationStatus: 'PASS',
      authorityPolicy: 'DIAGNOSTIC',
      authoritativeEligible: false,
      warnings: [...warnings, DIAGNOSTIC_NOTICE]
    });

    return {
      buildingPressure,
      qRecirculated,
      qRelief,
      totalExhaustAndRelief,
      qNetBuilding,
      isValid: true,
      status: 'PASS',
      isAuthoritative: false,
      isApprovedForEngineeringUse: false,
      complianceNotice: DIAGNOSTIC_NOTICE,
      warnings,
      reasons,
      auditRecord
    };
  }
}
