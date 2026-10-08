import { ValidationStatus } from '../ventilation/VentilationValidationService';
import { SourceType, VerificationStatus } from '../../data/ventilation/ashrae621/types';
import { ACTIVE_62_1_2022_SCOPE } from '../../data/ventilation/ashrae621/types';
import { ZoneVentilationInput, ZoneVentilationResult } from '../ventilation/Ashrae621ZoneService';
import { ExhaustInput, ExhaustResult } from '../ventilation/Ashrae621ExhaustService';

/**
 * Universal MEP Engineering System Disciplines
 */
export type MepSystem = 
  | 'HVAC' 
  | 'Plumbing' 
  | 'Electrical' 
  | 'Fire Protection' 
  | 'Ventilation'
  | string;

/**
 * Origin classification of an engineering input
 */
export type InputOriginStatus = 
  | 'ENGINEERING_STANDARD'  // Directly from published standard table (e.g. Table 6-1, Table 6-2)
  | 'USER_SUPPLIED'         // Physical project parameter supplied by designer (e.g. Area, Floor height, Design Occupancy)
  | 'USER_OVERRIDE'         // Designer manually overrode a standard default with documented engineering justification
  | 'DERIVED'               // Calculated from upstream equations
  | 'CODE_DEFAULT';         // Standard baseline default when designer input is unspecified

/**
 * Input Provenance record for each critical input
 */
export interface InputProvenanceRecord {
  readonly key: string;
  readonly name: string;
  readonly value: number | string | boolean | null;
  readonly unit: string;
  readonly source: SourceType | string;
  readonly verificationStatus: VerificationStatus;
  readonly engineeringStatus: InputOriginStatus;
  readonly reference?: string;
  readonly isOverride?: boolean;
  readonly overrideJustification?: string;
  readonly notes?: string;
}

/**
 * Formula / Equation record showing the exact governing equation used
 */
export interface CalculationEquationRecord {
  readonly symbol: string;
  readonly name: string;
  readonly equation: string;
  readonly reference: string;
  readonly standardBasis?: string;
}

/**
 * Intermediate calculation value
 */
export interface IntermediateValueRecord {
  readonly symbol: string;
  readonly name: string;
  readonly value: number | string | null;
  readonly unit: string;
  readonly formula?: string;
  readonly reference?: string;
}

/**
 * Final engineering calculation result
 */
export interface FinalResultRecord {
  readonly symbol: string;
  readonly name: string;
  readonly value: number | null;
  readonly unit: string;
  readonly isAuthoritative: boolean;
  readonly complianceSummary: string;
}

/**
 * Calculation Path descriptor
 */
export interface CalculationPathRecord {
  readonly id: string;
  readonly name: string;
  readonly section?: string;
  readonly description?: string;
}

export type AuditAuthorityPolicy = 'AUTHORITATIVE_PRODUCTION' | 'DIAGNOSTIC';

/**
 * Universal Calculation Audit Record
 * 
 * Reusable contract across HVAC, Plumbing, Electrical, Fire Protection, and Ventilation.
 */
export interface CalculationAuditRecord {
  readonly system: MepSystem;
  readonly standard: string;
  readonly edition: string;
  readonly revisionBasis: string;
  readonly calculationPath: CalculationPathRecord;
  readonly authorityPolicy: AuditAuthorityPolicy;
  readonly inputs: Record<string, number | string | boolean | null>;
  readonly provenance: Record<string, InputProvenanceRecord>;
  readonly equations: CalculationEquationRecord[];
  readonly intermediateResults: IntermediateValueRecord[];
  readonly finalResult: FinalResultRecord;
  readonly validationStatus: ValidationStatus;
  readonly isApprovedForEngineeringUse: boolean;
  readonly warnings: string[];
  readonly unsupportedItems: string[];
  readonly timestamp: string;
}

export interface CreateAuditRecordParams {
  system: MepSystem;
  standard: string;
  edition: string;
  revisionBasis: string;
  calculationPath: CalculationPathRecord;
  inputs: Record<string, number | string | boolean | null>;
  provenance: Record<string, InputProvenanceRecord>;
  equations: CalculationEquationRecord[];
  intermediateResults: IntermediateValueRecord[];
  finalResult: {
    symbol: string;
    name: string;
    value: number | null;
    unit: string;
    complianceSummary?: string;
  };
  validationStatus: ValidationStatus;
  authorityPolicy: AuditAuthorityPolicy;
  authoritativeEligible?: boolean;
  warnings?: string[];
  unsupportedItems?: string[];
  timestamp?: string;
}

/**
 * Universal Engineering Audit Service
 * 
 * Enforces the universal contract across MEP disciplines:
 * - Numeric output alone never implies engineering approval.
 * - Non-PASS (BLOCKED, INCOMPLETE, FAIL, NOT_VERIFIED) records cannot be authoritative or approved for engineering use.
 * - If inputs are NOT_VERIFIED, status cannot be converted to PASS.
 * - User/manual overrides are explicitly identified and logged.
 * - Active production basis is strictly documented.
 * - Diagnostic utilities cannot produce authoritative or engineering-approved audit records.
 */
export class EngineeringAuditService {
  /**
   * Constructs a CalculationAuditRecord enforcing all engineering provenance rules.
   */
  static createAuditRecord(params: CreateAuditRecordParams): CalculationAuditRecord {
    let validationStatus: ValidationStatus = params.validationStatus;
    const warnings: string[] = [...(params.warnings || [])];
    const unsupportedItems: string[] = [...(params.unsupportedItems || [])];

    // Rule 1: Check for User Overrides, NOT_VERIFIED, or INVALID inputs
    // CRITICAL: A USER_OVERRIDE must NEVER become authoritative standard data merely because a justification was supplied.
    for (const [key, prov] of Object.entries(params.provenance)) {
      if (prov.isOverride || prov.engineeringStatus === 'USER_OVERRIDE') {
        // Enforce: Overrides remain NOT_VERIFIED under standard production basis
        if (prov.verificationStatus === 'VERIFIED') {
          (prov as any).verificationStatus = 'NOT_VERIFIED';
          warnings.push(`User override on '${prov.name}' (${key}) cannot be labeled VERIFIED standard data.`);
        }
      }

      if (prov.verificationStatus === 'NOT_VERIFIED' || prov.verificationStatus === 'INVALID') {
        if (validationStatus === 'PASS') {
          validationStatus = 'BLOCKED';
          warnings.push(
            `Status converted from PASS to BLOCKED: Input '${prov.name}' (${key}) has verification status '${prov.verificationStatus}'.`
          );
        }
      }
      if (prov.isOverride || prov.engineeringStatus === 'USER_OVERRIDE') {
        if (!prov.overrideJustification) {
          warnings.push(`User override on '${prov.name}' (${key}) lacks documented engineering justification.`);
        }
      }
    }

    // Rule 2: Explicit Authority Policy
    // A calculation is authoritative ONLY if:
    // 1. Explicit production authorization is declared: params.authorityPolicy === 'AUTHORITATIVE_PRODUCTION'
    //    (If authorityPolicy is omitted, fail-safe default MUST be: NOT AUTHORITATIVE).
    // 2. params.authoritativeEligible !== false
    // 3. Not explicitly flagged as a non-standard diagnostic utility
    // 4. Calculation path ID does not represent a diagnostic utility
    // 5. validationStatus === 'PASS'
    const isExplicitlyAuthoritative = params.authorityPolicy === 'AUTHORITATIVE_PRODUCTION';
    const isDiagnostic = 
      params.authorityPolicy === 'DIAGNOSTIC' ||
      params.authoritativeEligible === false ||
      params.standard === 'Non-Standard Diagnostic Utility' ||
      params.standard === 'Non-Standard Utility' ||
      params.edition === 'Diagnostic' ||
      params.calculationPath.id.includes('diagnostic');

    // Rule 3: CRITICAL RULE - Numeric output alone must never imply engineering approval.
    // A BLOCKED, INCOMPLETE, FAIL, or NOT_VERIFIED result must not be presented as a compliant engineering result.
    // Diagnostic utilities MUST NEVER become authoritative, even if calculation status is PASS.
    const isApprovedForEngineeringUse = isExplicitlyAuthoritative && !isDiagnostic && validationStatus === 'PASS';
    const isAuthoritative = isApprovedForEngineeringUse;

    // For authoritative calculations, non-PASS outcomes suppress numeric value.
    // For diagnostic calculations, numeric diagnostic value may be retained if status is PASS, but isAuthoritative = false.
    let finalValue: number | null = null;
    if (isAuthoritative) {
      finalValue = params.finalResult.value;
    } else if (params.authorityPolicy === 'DIAGNOSTIC' && validationStatus === 'PASS') {
      finalValue = params.finalResult.value; // Retained as non-authoritative diagnostic estimate
    } else {
      finalValue = null; // Non-PASS or unapproved omitted authority withholds numeric result
    }

    let complianceSummary = params.finalResult.complianceSummary;
    if (params.authorityPolicy === 'DIAGNOSTIC' || isDiagnostic) {
      if (!complianceSummary) {
        complianceSummary = `DIAGNOSTIC (${validationStatus}): Non-authoritative engineering diagnostic utility only. Not approved for official code compliance or engineering sign-off.`;
      } else if (!complianceSummary.includes('Diagnostic') && !complianceSummary.includes('Non-authoritative') && !complianceSummary.includes('not an ANSI/ASHRAE')) {
        complianceSummary = `[DIAGNOSTIC - NON-AUTHORITATIVE] ${complianceSummary}`;
      }
    } else {
      if (!complianceSummary) {
        if (isApprovedForEngineeringUse) {
          complianceSummary = `COMPLIANT: Verified under ${params.revisionBasis} (${params.calculationPath.name}). Final value ${finalValue} ${params.finalResult.unit} satisfies design criteria.`;
        } else {
          complianceSummary = `NON-COMPLIANT (${validationStatus}): Calculation cannot be approved for engineering use. Not approved for engineering use. Authoritative numeric result is withheld.`;
        }
      } else if (!isApprovedForEngineeringUse && !complianceSummary.includes(validationStatus)) {
        complianceSummary = `[${validationStatus}] ${complianceSummary} — Not approved for engineering use.`;
      }
    }

    const finalResult: FinalResultRecord = {
      symbol: params.finalResult.symbol,
      name: params.finalResult.name,
      value: finalValue,
      unit: params.finalResult.unit,
      isAuthoritative,
      complianceSummary
    };

    return {
      system: params.system,
      standard: params.standard,
      edition: params.edition,
      revisionBasis: params.revisionBasis,
      calculationPath: params.calculationPath,
      authorityPolicy: params.authorityPolicy || 'DIAGNOSTIC',
      inputs: params.inputs,
      provenance: params.provenance,
      equations: params.equations,
      intermediateResults: params.intermediateResults,
      finalResult,
      validationStatus,
      isApprovedForEngineeringUse,
      warnings,
      unsupportedItems,
      timestamp: params.timestamp || new Date().toISOString()
    };
  }

  /**
   * Adapter: Constructs an audit record from an ASHRAE 62.1 Zone Calculation result.
   */
  static fromZoneCalculation(
    input: ZoneVentilationInput,
    result: ZoneVentilationResult
  ): CalculationAuditRecord {
    const space = input.spaceType;
    const ez = input.ezConfig;
    const isOverride = Boolean(ez?.isManualOverride);

    const provenance: Record<string, InputProvenanceRecord> = {};

    if (space) {
      provenance['spaceType'] = {
        key: 'spaceType',
        name: 'Space / Occupancy Category',
        value: space.name,
        unit: 'category',
        source: space.sourceType || SourceType.ASHRAE_PUBLISHED,
        verificationStatus: space.verificationStatus || 'VERIFIED',
        engineeringStatus: 'ENGINEERING_STANDARD',
        reference: space.reference || 'Table 6-1'
      };
      provenance['rp'] = {
        key: 'rp',
        name: 'People Outdoor Air Rate (Rp)',
        value: space.rpMetric,
        unit: 'L/s-person',
        source: space.sourceType || SourceType.ASHRAE_PUBLISHED,
        verificationStatus: space.verificationStatus || 'VERIFIED',
        engineeringStatus: 'ENGINEERING_STANDARD',
        reference: 'Table 6-1'
      };
      provenance['ra'] = {
        key: 'ra',
        name: 'Area Outdoor Air Rate (Ra)',
        value: space.raMetric,
        unit: 'L/s-m²',
        source: space.sourceType || SourceType.ASHRAE_PUBLISHED,
        verificationStatus: space.verificationStatus || 'VERIFIED',
        engineeringStatus: 'ENGINEERING_STANDARD',
        reference: 'Table 6-1'
      };
    }

    provenance['area'] = {
      key: 'area',
      name: 'Zone Floor Area (Az)',
      value: input.area,
      unit: 'm²',
      source: SourceType.PROJECT_SPECIFICATION,
      verificationStatus: (input.area > 0 && Number.isFinite(input.area)) ? 'VERIFIED' : 'INVALID',
      engineeringStatus: 'USER_SUPPLIED'
    };

    const appliedPz = result.pz ?? (input.useDefaultOccupancy ? null : (input.designOccupancy ?? null));
    const pzValid = appliedPz !== null && typeof appliedPz === 'number' && Number.isFinite(appliedPz) && appliedPz >= 0;

    provenance['pz'] = {
      key: 'pz',
      name: 'Zone Population (Pz)',
      value: appliedPz,
      unit: 'people',
      source: input.useDefaultOccupancy ? SourceType.ASHRAE_PUBLISHED : SourceType.PROJECT_SPECIFICATION,
      verificationStatus: pzValid ? 'VERIFIED' : 'INVALID',
      engineeringStatus: input.useDefaultOccupancy ? 'CODE_DEFAULT' : 'USER_SUPPLIED'
    };

    if (ez) {
      // Manual overrides must ALWAYS remain NOT_VERIFIED under standard production basis
      const ezVerificationStatus: VerificationStatus = isOverride
        ? 'NOT_VERIFIED'
        : (ez.verificationStatus || 'VERIFIED');

      provenance['ez'] = {
        key: 'ez',
        name: 'Zone Air Distribution Effectiveness (Ez)',
        value: ez.ez,
        unit: 'dimensionless',
        source: isOverride ? SourceType.USER_OVERRIDE : (ez.sourceType || SourceType.ASHRAE_PUBLISHED),
        verificationStatus: ezVerificationStatus,
        engineeringStatus: isOverride ? 'USER_OVERRIDE' : 'ENGINEERING_STANDARD',
        reference: isOverride ? (ez.manualOverrideBasis || 'Manual Override') : (ez.reference || 'Table 6-4'),
        isOverride,
        overrideJustification: ez.manualJustification || ez.manualOverrideBasis
      };
    }

    const equations: CalculationEquationRecord[] = [
      {
        symbol: 'Vbz',
        name: 'Breathing Zone Outdoor Airflow',
        equation: 'Vbz = Rp × Pz + Ra × Az',
        reference: 'ANSI/ASHRAE Standard 62.1-2022 Section 6.2.2.1, Eq. 6-1'
      },
      {
        symbol: 'Voz',
        name: 'Zone Outdoor Airflow',
        equation: 'Voz = (Vbz / Ez) × Eρ',
        reference: 'ANSI/ASHRAE Standard 62.1-2022 Section 6.2.2.3, Eq. 6-4 (Addendum j)'
      }
    ];

    const intermediateResults: IntermediateValueRecord[] = [
      { symbol: 'Pz', name: 'Design Zone Population', value: result.pz, unit: 'people', reference: 'Section 6.2.2.1.1' },
      { symbol: 'Vbp', name: 'People Component Airflow', value: result.vbp, unit: 'L/s', formula: 'Rp × Pz' },
      { symbol: 'Vba', name: 'Area Component Airflow', value: result.vba, unit: 'L/s', formula: 'Ra × Az' },
      { symbol: 'Vbz', name: 'Breathing Zone Airflow', value: result.vbz, unit: 'L/s', formula: 'Vbp + Vba' },
      { symbol: 'Ez', name: 'Distribution Effectiveness', value: result.ez, unit: 'dimensionless', reference: 'Table 6-4' },
      { symbol: 'Eρ', name: 'Air Density Correction Factor', value: result.epDensity ?? 1.0, unit: 'dimensionless', reference: 'Table 6-5 / Addendum j' }
    ];

    return this.createAuditRecord({
      system: 'Ventilation',
      standard: input.expectedStandard || 'ASHRAE 62.1',
      edition: input.expectedEdition || '2022',
      revisionBasis: ACTIVE_62_1_2022_SCOPE,
      calculationPath: {
        id: 'single_zone',
        name: 'Single-Zone Ventilation',
        section: 'Section 6.2.1 & 6.2.2',
        description: 'Breathing zone outdoor airflow and zone outdoor airflow determination'
      },
      authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
      inputs: {
        spaceType: space?.id || null,
        area: input.area,
        designOccupancy: input.designOccupancy,
        ezConfig: ez?.id || null,
        ez: ez?.ez || null,
        isManualOverride: isOverride
      },
      provenance,
      equations,
      intermediateResults,
      finalResult: {
        symbol: 'Voz',
        name: 'Zone Outdoor Airflow',
        value: result.voz,
        unit: 'L/s'
      },
      validationStatus: result.status
    });
  }

  /**
   * Adapter: Constructs an audit record from an ASHRAE 62.1 Simplified System calculation.
   */
  static fromSimplifiedSystem(
    input: any,
    result: any
  ): CalculationAuditRecord {
    const provenance: Record<string, InputProvenanceRecord> = {
      ps: {
        key: 'ps',
        name: 'System Population (Ps)',
        value: input.ps,
        unit: 'people',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: (typeof input.ps === 'number' && input.ps >= 0) ? 'VERIFIED' : 'INVALID',
        engineeringStatus: 'USER_SUPPLIED'
      },
      zonesCount: {
        key: 'zonesCount',
        name: 'Number of Ventilation Zones',
        value: input.zones?.length ?? 0,
        unit: 'zones',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: (input.zones?.length > 0) ? 'VERIFIED' : 'INVALID',
        engineeringStatus: 'USER_SUPPLIED'
      }
    };

    const equations: CalculationEquationRecord[] = [
      {
        symbol: 'D',
        name: 'Occupant Diversity',
        equation: 'D = Ps / Σ(Pz)',
        reference: 'Section 6.2.4.2 & Appendix A, Eq. 6-7'
      },
      {
        symbol: 'Vou',
        name: 'Uncorrected Outdoor Air Intake',
        equation: 'Vou = D × Σ(Rp × Pz) + Σ(Ra × Az)',
        reference: 'Section 6.2.4.2 & Appendix A, Eq. 6-8'
      },
      {
        symbol: 'Ev',
        name: 'System Ventilation Efficiency (Simplified)',
        equation: 'D < 0.60: Ev = 0.88 × D + 0.22; D >= 0.60: Ev = 0.75',
        reference: 'Table 6-8 / Section 6.2.4.2'
      },
      {
        symbol: 'Vot',
        name: 'Outdoor Air Intake Flow',
        equation: 'Vot = Vou / Ev',
        reference: 'Section 6.2.4.2, Eq. 6-9'
      }
    ];

    const intermediateResults: IntermediateValueRecord[] = [
      { symbol: 'ΣPz', name: 'Sum of Zone Populations', value: result.sumPz, unit: 'people' },
      { symbol: 'D', name: 'Occupant Diversity', value: result.d, unit: 'dimensionless' },
      { symbol: 'Vou', name: 'Uncorrected Outdoor Air Intake', value: result.vou, unit: 'L/s' },
      { symbol: 'Ev', name: 'System Ventilation Efficiency', value: result.ev, unit: 'dimensionless' }
    ];

    return this.createAuditRecord({
      system: 'Ventilation',
      standard: 'ASHRAE 62.1',
      edition: '2022',
      revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
      calculationPath: {
        id: 'multi_zone_simplified',
        name: 'Multi-Zone Simplified Procedure',
        section: 'Section 6.2.4.2 & Appendix A',
        description: 'Simplified multiple-zone recirculating system outdoor air intake determination'
      },
      authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
      inputs: {
        ps: input.ps,
        zonesCount: input.zones?.length ?? 0
      },
      provenance,
      equations,
      intermediateResults,
      finalResult: {
        symbol: 'Vot',
        name: 'Outdoor Air Intake Flow',
        value: result.vot,
        unit: 'L/s'
      },
      validationStatus: result.status
    });
  }

  /**
   * Adapter: Constructs an audit record from an ASHRAE 62.1 Alternative Procedure calculation.
   */
  static fromAlternativeSystem(
    input: any,
    result: any
  ): CalculationAuditRecord {
    const provenance: Record<string, InputProvenanceRecord> = {
      ps: {
        key: 'ps',
        name: 'System Population (Ps)',
        value: input.ps,
        unit: 'people',
        source: SourceType.PROJECT_SPECIFICATION,
        verificationStatus: (typeof input.ps === 'number' && input.ps >= 0) ? 'VERIFIED' : 'INVALID',
        engineeringStatus: 'USER_SUPPLIED'
      },
      vps: {
        key: 'vps',
        name: 'System Supply Airflow (Vps)',
        value: input.vps ?? result.vps ?? null,
        unit: 'L/s',
        source: (input.vps !== undefined && input.vps !== null) ? SourceType.PROJECT_SPECIFICATION : 'DERIVED',
        verificationStatus: ((input.vps ?? result.vps) === null || (input.vps ?? result.vps) === undefined) ? 'NOT_VERIFIED' : 'VERIFIED',
        engineeringStatus: (input.vps !== undefined && input.vps !== null) ? 'USER_SUPPLIED' : 'DERIVED'
      }
    };

    const equations: CalculationEquationRecord[] = [
      {
        symbol: 'Xs',
        name: 'Average Outdoor Air Fraction',
        equation: 'Xs = Vou / Vps',
        reference: 'Normative Appendix A, Eq. A-1'
      },
      {
        symbol: 'Zd',
        name: 'Discharge Outdoor Air Fraction',
        equation: 'Zd = Voz / Vdz',
        reference: 'Normative Appendix A, Eq. A-2'
      },
      {
        symbol: 'Evz',
        name: 'Zone Ventilation Efficiency',
        equation: 'Evz = 1 + (Voz / Vdz) - (Voz / Vpz)',
        reference: 'Normative Appendix A, Eq. A-3'
      },
      {
        symbol: 'Ev',
        name: 'System Ventilation Efficiency (Alternative)',
        equation: 'Ev = min(Evz)',
        reference: 'Normative Appendix A, Eq. A-4'
      }
    ];

    const intermediateResults: IntermediateValueRecord[] = [
      { symbol: 'Vou', name: 'Uncorrected Outdoor Air Intake', value: result.vou, unit: 'L/s' },
      { symbol: 'Xs', name: 'Average Outdoor Air Fraction', value: result.xs, unit: 'dimensionless' },
      { symbol: 'Ev', name: 'System Ventilation Efficiency', value: result.ev, unit: 'dimensionless' }
    ];

    return this.createAuditRecord({
      system: 'Ventilation',
      standard: 'ASHRAE 62.1',
      edition: '2022',
      revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
      calculationPath: {
        id: 'multi_zone_alternative',
        name: 'Multi-Zone Alternative Procedure',
        section: 'Section 6.2.4.3 & Normative Appendix A',
        description: 'Alternative multiple-zone recirculating system outdoor air intake determination'
      },
      authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
      inputs: {
        ps: input.ps,
        vps: input.vps
      },
      provenance,
      equations,
      intermediateResults,
      finalResult: {
        symbol: 'Vot',
        name: 'Outdoor Air Intake Flow',
        value: result.vot,
        unit: 'L/s'
      },
      validationStatus: result.status
    });
  }

  /**
   * Adapter: Constructs an audit record from an ASHRAE 62.1 Exhaust calculation.
   */
  static fromExhaustCalculation(
    input: ExhaustInput,
    result: ExhaustResult
  ): CalculationAuditRecord {
    const exhaust = input.exhaustType;
    const isTable63 = exhaust?.referenceTable === 'Table 6-3';
    const isSpecial = Boolean(result.isSpecialStandard);

    const provenance: Record<string, InputProvenanceRecord> = {};

    if (exhaust) {
      provenance['exhaustType'] = {
        key: 'exhaustType',
        name: 'Exhaust Space / System Type',
        value: exhaust.name,
        unit: 'category',
        source: exhaust.sourceType || SourceType.ASHRAE_PUBLISHED,
        verificationStatus: exhaust.verificationStatus || 'VERIFIED',
        engineeringStatus: 'ENGINEERING_STANDARD',
        reference: exhaust.referenceTable || 'Table 6-2'
      };
      if (result.rateApplied !== null) {
        provenance['exhaustRate'] = {
          key: 'exhaustRate',
          name: 'Unit Prescriptive Exhaust Rate',
          value: result.rateApplied,
          unit: input.unitSystem === 'ip' ? 'cfm/unit' : 'L/s·unit',
          source: SourceType.ASHRAE_PUBLISHED,
          verificationStatus: 'VERIFIED',
          engineeringStatus: 'ENGINEERING_STANDARD',
          reference: 'Table 6-2'
        };
      }
    }

    provenance['quantity'] = {
      key: 'quantity',
      name: 'Exhaust Quantity / Area',
      value: input.qty,
      unit: exhaust?.unitType || 'unit',
      source: SourceType.PROJECT_SPECIFICATION,
      verificationStatus: (input.qty !== null && input.qty >= 0) ? 'VERIFIED' : 'INVALID',
      engineeringStatus: 'USER_SUPPLIED'
    };

    provenance['designExhaust'] = {
      key: 'designExhaust',
      name: 'Design Exhaust Airflow',
      value: input.designExhaust,
      unit: input.unitSystem === 'ip' ? 'cfm' : 'L/s',
      source: SourceType.PROJECT_SPECIFICATION,
      verificationStatus: (input.designExhaust !== null && input.designExhaust >= 0) ? 'VERIFIED' : 'INVALID',
      engineeringStatus: 'USER_SUPPLIED'
    };

    const equations: CalculationEquationRecord[] = [];
    if (!isSpecial && !isTable63 && result.compliancePath === 'PRESCRIPTIVE') {
      equations.push({
        symbol: 'Q_req',
        name: 'Prescriptive Required Exhaust Airflow',
        equation: 'Q_req = Rate × Qty',
        reference: 'ANSI/ASHRAE Standard 62.1-2022 Section 6.5.1, Table 6-2'
      });
    }

    const intermediateResults: IntermediateValueRecord[] = [
      { symbol: 'AirClass', name: 'Air Class Designation', value: result.airClass, unit: 'class', reference: 'Table 6-2 / Table 6-3' },
      { symbol: 'RateApplied', name: 'Applied Unit Rate', value: result.rateApplied, unit: input.unitSystem === 'ip' ? 'cfm/unit' : 'L/s·unit' },
      { symbol: 'PathStatus', name: 'Compliance Path Status', value: result.pathStatus, unit: 'status' }
    ];

    const isPerformance = result.compliancePath === 'PERFORMANCE' || result.pathStatus === 'PERFORMANCE_PATH_UNIMPLEMENTED';

    return this.createAuditRecord({
      system: 'Ventilation',
      standard: input.expectedStandard || 'ASHRAE 62.1',
      edition: input.expectedEdition || '2022',
      revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum x',
      calculationPath: {
        id: isPerformance ? 'performance_exhaust_6_5_2' : 'prescriptive_exhaust_6_5_1',
        name: isPerformance ? 'Section 6.5.2 Performance Path' : 'Section 6.5.1 Prescriptive Path',
        section: isPerformance ? '6.5.2' : '6.5.1'
      },
      authorityPolicy: isPerformance ? 'DIAGNOSTIC' : 'AUTHORITATIVE_PRODUCTION',
      inputs: {
        exhaustType: exhaust?.id || null,
        qty: input.qty,
        designExhaust: input.designExhaust,
        operationMode: input.operationMode || 'continuous'
      },
      provenance,
      equations,
      intermediateResults,
      finalResult: {
        symbol: 'RequiredExhaust',
        name: 'Minimum Prescriptive Exhaust Airflow',
        value: result.requiredExhaust,
        unit: input.unitSystem === 'ip' ? 'cfm' : 'L/s',
        complianceSummary: result.complianceNotes?.join(' ')
      },
      validationStatus: result.status,
      warnings: result.instructionalMessage ? [result.instructionalMessage] : []
    });
  }

  /**
   * Universal Adapter: Constructs an audit record for other MEP systems (Plumbing, Electrical, Fire Protection, HVAC).
   */
  static fromGenericMepCalculation(params: {
    system: 'HVAC' | 'Plumbing' | 'Electrical' | 'Fire Protection' | string;
    standard: string;
    edition: string;
    revisionBasis: string;
    calculationPath: CalculationPathRecord;
    inputs: Record<string, number | string | boolean | null>;
    provenance: Record<string, InputProvenanceRecord>;
    equations: CalculationEquationRecord[];
    intermediateResults: IntermediateValueRecord[];
    finalResult: {
      symbol: string;
      name: string;
      value: number | null;
      unit: string;
      complianceSummary?: string;
    };
    validationStatus: ValidationStatus;
    authorityPolicy: AuditAuthorityPolicy;
    authoritativeEligible?: boolean;
    warnings?: string[];
    unsupportedItems?: string[];
    timestamp?: string;
  }): CalculationAuditRecord {
    return this.createAuditRecord(params);
  }
}
