import { ValidationStatus } from './VentilationValidationService';
import { Ashrae621ExhaustType } from '../../data/ventilation/ashrae621/types';
import { DataProvenanceValidationService } from './DataProvenanceValidationService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ft2ToM2, m2ToFt2 } from '../../lib/UnitConversionService';
import { normalizeAddendumIdentifier } from '../scope/ProductionCalculationScope';

export type ExhaustOperationMode = 'continuous' | 'intermittent';
export type ExhaustUnitSystem = 'metric' | 'ip';
export type ExhaustCompliancePath = 'PRESCRIPTIVE' | 'PERFORMANCE';
export type ExhaustPathStatus = 
  | 'SUPPORTED' 
  | 'PERFORMANCE_PATH_UNIMPLEMENTED' 
  | 'BLOCKED' 
  | 'NOT_EVALUATED';
export type ExhaustRateStatus = 
  | 'PRESCRIPTIVE' 
  | 'SPECIAL_REQUIREMENT' 
  | 'NOT_APPLICABLE' 
  | 'PERFORMANCE_PATH_UNIMPLEMENTED';

export interface ExhaustInput {
  expectedStandard: string;
  expectedEdition: string;
  expectedAddenda?: string[];
  addenda?: string[];
  exhaustType: Ashrae621ExhaustType | null;
  qty: number | null; // Quantity depending on unitType (e.g., m2, ft2, fixtures, rooms, showerheads)
  designExhaust: number | null; // User's design value in active unitSystem (L/s or cfm)
  operationMode?: ExhaustOperationMode; // 'continuous' (default) or 'intermittent'
  unitSystem?: ExhaustUnitSystem; // 'metric' (default, L/s) or 'ip' (cfm)
  parkingGarageOpenSides50PercentOrMore?: boolean; // Section 6.5.1 Exception 1
  calculationProcedure?: 'prescriptive' | 'performance' | string;
  compliancePath?: 'prescriptive' | 'performance' | 'PRESCRIPTIVE' | 'PERFORMANCE' | string;
  section?: string;
  referenceSection?: string;
}

export interface ExhaustResult {
  requiredExhaust: number | null; // Active unit system (L/s if metric, cfm if ip)
  requiredExhaustMetric: number | null; // L/s
  requiredExhaustIp: number | null; // cfm
  designExhaust: number | null; // Active unit system
  unitType: string;
  exhaustClass: number | null;
  airClass: number | null;
  operationMode: ExhaustOperationMode;
  rateApplied: number | null;
  rateAppliedMetric: number | null;
  rateAppliedIp: number | null;
  status: ValidationStatus;
  rateStatus: ExhaustRateStatus;
  compliancePath: ExhaustCompliancePath;
  pathStatus: ExhaustPathStatus;
  state?: ExhaustPathStatus | ExhaustRateStatus;
  instructionalMessage?: string;
  message?: string;
  isSpecialStandard: boolean;
  specialStandardReference?: string;
  recirculationClassification: string;
  combustionCondition?: string;
  notes?: string;
  exceptions?: string;
  referenceSection: string;
  referenceTable: string;
  complianceNotes: string[];
  parkingGarageOpenSides50PercentOrMore?: boolean;
}

function getRecirculationClassification(airClass: number | null | undefined): string {
  switch (airClass) {
    case 1:
      return 'Air Class 1: Recirculation or transfer permitted to any space.';
    case 2:
      return 'Air Class 2: Recirculation permitted within same space or similar Class 2/3/4 spaces. Recirculation to Class 1 spaces prohibited.';
    case 3:
      return 'Air Class 3: Recirculation permitted only within the room of origin. Transfer air not permitted to other spaces.';
    case 4:
      return 'Air Class 4: No recirculation or transfer permitted. Air must be exhausted directly outdoors.';
    default:
      return 'Air Class unclassified.';
  }
}

export class Ashrae621ExhaustService {
  /**
   * Reports the active compliance path support for ASHRAE 62.1 exhaust.
   * Explicitly notes that Section 6.5.1 Prescriptive is SUPPORTED,
   * while Section 6.5.2 Performance is PERFORMANCE_PATH_UNIMPLEMENTED.
   */
  static getCompliancePathReport(): {
    prescriptivePath: {
      status: 'SUPPORTED';
      section: '6.5.1';
      basis: string;
      description: string;
    };
    performancePath: {
      status: 'PERFORMANCE_PATH_UNIMPLEMENTED';
      section: '6.5.2';
      description: string;
      requirement: string;
    };
  } {
    return {
      prescriptivePath: {
        status: 'SUPPORTED',
        section: '6.5.1',
        basis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum x (Tables 6-2 & 6-3)',
        description: 'Prescriptive exhaust airflow calculation and Air Class classification.'
      },
      performancePath: {
        status: 'PERFORMANCE_PATH_UNIMPLEMENTED',
        section: '6.5.2',
        description: 'Performance Compliance Path for exhaust systems is not implemented in this module.',
        requirement: 'Section 6.5.2 requires an independent engineering evaluation with contaminant modeling and concentration limit verification.'
      }
    };
  }

  /**
   * Evaluates if any part of the exhaust request involves ASHRAE 62.1 Section 6.5.2 (Performance Path).
   */
  static isPerformancePathRequest(input?: Partial<ExhaustInput> | null): boolean {
    if (!input) return false;

    const checkStr = (val: unknown): boolean => {
      if (typeof val !== 'string') return false;
      const lower = val.trim().toLowerCase();
      return (
        lower === 'performance' ||
        lower === '6.5.2' ||
        lower.includes('6.5.2') ||
        lower.includes('performance')
      );
    };

    if (checkStr(input.calculationProcedure)) return true;
    if (checkStr(input.compliancePath)) return true;
    if (checkStr(input.section)) return true;
    if (checkStr(input.referenceSection)) return true;
    if (checkStr((input as any).path)) return true;
    if (checkStr((input as any).procedure)) return true;
    if (checkStr((input as any).method)) return true;

    if (input.exhaustType) {
      const et = input.exhaustType as any;
      if (checkStr(et.procedure)) return true;
      if (checkStr(et.calculationProcedure)) return true;
      if (checkStr(et.compliancePath)) return true;
      if (checkStr(et.referenceSection)) return true;
      if (checkStr(et.section)) return true;
      if (typeof et.reference === 'string' && (et.reference.includes('6.5.2') || et.reference.toLowerCase().includes('performance'))) return true;
      if (typeof et.id === 'string' && (et.id.includes('6.5.2') || et.id.toLowerCase().includes('performance_path'))) return true;
    }

    return false;
  }

  /**
   * Builds the explicit un-implemented result for Section 6.5.2 requests.
   * Returns a 'PERFORMANCE_PATH_UNIMPLEMENTED' state and provides an instructional message
   * that engineering evaluation is required.
   */
  static createPerformancePathUnimplementedResult(input?: Partial<ExhaustInput>): ExhaustResult {
    const operationMode: ExhaustOperationMode = input?.operationMode || 'continuous';
    const isDesignValid = typeof input?.designExhaust === 'number' && Number.isFinite(input.designExhaust) && input.designExhaust >= 0;
    const exhaustType = input?.exhaustType ?? null;
    const airClass = exhaustType?.airClass ?? exhaustType?.exhaustClass ?? null;
    const exhaustClass = exhaustType?.exhaustClass ?? exhaustType?.airClass ?? null;

    const instructionalMessage =
      'ASHRAE 62.1-2022 Section 6.5.2 Performance Compliance Path requires an independent engineering evaluation. An independent engineering evaluation is required including contaminant source quantification, dispersion modeling, and documented compliance with allowable concentration limits. Performance exhaust calculation is not implemented in this module; calculations must not fall back to Table 6-2 or synthesize unverified airflows.';

    return {
      requiredExhaust: null,
      requiredExhaustMetric: null,
      requiredExhaustIp: null,
      designExhaust: isDesignValid ? input!.designExhaust : (input?.designExhaust ?? null),
      unitType: exhaustType?.unitType || 'special',
      exhaustClass,
      airClass,
      operationMode,
      rateApplied: null,
      rateAppliedMetric: null,
      rateAppliedIp: null,
      status: 'BLOCKED',
      rateStatus: 'PERFORMANCE_PATH_UNIMPLEMENTED',
      compliancePath: 'PERFORMANCE',
      pathStatus: 'PERFORMANCE_PATH_UNIMPLEMENTED',
      state: 'PERFORMANCE_PATH_UNIMPLEMENTED',
      instructionalMessage,
      message: 'Engineering evaluation required: Section 6.5.2 Performance Compliance Path is not implemented in this module.',
      isSpecialStandard: Boolean(exhaustType?.isSpecialStandard),
      specialStandardReference: exhaustType?.specialStandardReference,
      recirculationClassification: getRecirculationClassification(airClass),
      referenceSection: '6.5.2',
      referenceTable: 'None (Section 6.5.2)',
      complianceNotes: [
        'Performance Exhaust Path 6.5.2 requires specialized contaminant generation and concentration analysis and is not implemented or verified in the prescriptive engine.',
        'Section 6.5.2 Performance Compliance Path status: PERFORMANCE_PATH_UNIMPLEMENTED. Independent engineering evaluation is required. Calculations must not fall back silently to Table 6-2 or convert a performance-path request into a prescriptive calculation.',
        'Instructional notice: Engineering evaluation is required for Section 6.5.2 compliance. Contaminant emission rates and indoor air quality concentration limits must be verified by a licensed professional engineer.'
      ]
    };
  }

  /**
   * Explicit handler for Performance Compliance Path requests (Section 6.5.2).
   * Always returns non-PASS (BLOCKED) with PERFORMANCE_PATH_UNIMPLEMENTED status.
   */
  static requestPerformancePath(input?: Partial<ExhaustInput>): ExhaustResult {
    return this.createPerformancePathUnimplementedResult(input);
  }

  /**
   * Explicit handler for any request involving Section 6.5.2.
   * Returns a 'PERFORMANCE_PATH_UNIMPLEMENTED' state and provides an instructional message
   * that engineering evaluation is required.
   */
  static calculateSection652(input?: Partial<ExhaustInput>): ExhaustResult {
    return this.createPerformancePathUnimplementedResult(input);
  }

  /**
   * Enforces the Prescriptive compliance path for verified Table 6-2 numeric rates.
   * If the request involves Section 6.5.2, returns the PERFORMANCE_PATH_UNIMPLEMENTED state.
   */
  static enforcePrescriptivePath(input: ExhaustInput): ExhaustResult | null {
    if (this.isPerformancePathRequest(input)) {
      return this.createPerformancePathUnimplementedResult(input);
    }
    return null;
  }

  static calculate(input: ExhaustInput): ExhaustResult {
    const operationMode: ExhaustOperationMode = input.operationMode || 'continuous';
    const unitSystem: ExhaustUnitSystem = input.unitSystem || 'metric';

    // Check for unapproved addenda
    const requestedAddenda = input.expectedAddenda || input.addenda;
    if (requestedAddenda && requestedAddenda.length > 0) {
      const unapproved = requestedAddenda.filter(a => normalizeAddendumIdentifier(a) !== 'x');
      if (unapproved.length > 0) {
        const msg = `Unapproved exhaust addenda requested: [${unapproved.join(', ')}]. Controlled exhaust basis is restricted to ANSI/ASHRAE Standard 62.1-2022 + Addendum x.`;
        const exhaustType = input.exhaustType;
        const airClass = exhaustType?.airClass ?? exhaustType?.exhaustClass ?? null;
        const exhaustClass = exhaustType?.exhaustClass ?? exhaustType?.airClass ?? null;
        return {
          requiredExhaust: null,
          requiredExhaustMetric: null,
          requiredExhaustIp: null,
          designExhaust: input.designExhaust ?? null,
          unitType: exhaustType?.unitType || 'unknown',
          exhaustClass,
          airClass,
          operationMode,
          rateApplied: null,
          rateAppliedMetric: null,
          rateAppliedIp: null,
          status: 'BLOCKED',
          rateStatus: 'NOT_APPLICABLE',
          compliancePath: 'PRESCRIPTIVE',
          pathStatus: 'BLOCKED',
          instructionalMessage: msg,
          message: msg,
          isSpecialStandard: false,
          recirculationClassification: getRecirculationClassification(airClass),
          referenceSection: '6.5.1',
          referenceTable: exhaustType?.referenceTable || 'Table 6-2',
          complianceNotes: [msg]
        };
      }
    }

    // 0. Performance Compliance Path Check (Section 6.5.2)
    // Section 6.5.2 requires an independent engineering evaluation. It is NOT implemented in the prescriptive engine.
    if (this.isPerformancePathRequest(input)) {
      return this.createPerformancePathUnimplementedResult(input);
    }

    // 0b. Path Enforcement: Table 6-2 strictly enforces the Section 6.5.1 Prescriptive Path
    if (input.compliancePath) {
      const normPath = input.compliancePath.trim().toUpperCase();
      if (normPath !== 'PRESCRIPTIVE' && normPath !== '6.5.1') {
        const exhaustType = input.exhaustType;
        const airClass = exhaustType?.airClass ?? exhaustType?.exhaustClass ?? null;
        const exhaustClass = exhaustType?.exhaustClass ?? exhaustType?.airClass ?? null;
        return {
          requiredExhaust: null,
          requiredExhaustMetric: null,
          requiredExhaustIp: null,
          designExhaust: input.designExhaust ?? null,
          unitType: exhaustType?.unitType || 'unknown',
          exhaustClass,
          airClass,
          operationMode,
          rateApplied: null,
          rateAppliedMetric: null,
          rateAppliedIp: null,
          status: 'BLOCKED',
          rateStatus: 'SPECIAL_REQUIREMENT',
          compliancePath: 'PRESCRIPTIVE',
          pathStatus: 'BLOCKED',
          state: 'BLOCKED',
          instructionalMessage: `Unsupported compliance path '${input.compliancePath}'. Verified Table 6-2 rates strictly enforce the 'PRESCRIPTIVE' path (Section 6.5.1). Any performance-based approach requires Section 6.5.2 engineering evaluation.`,
          message: `Unsupported compliance path '${input.compliancePath}'. Prescriptive path enforced.`,
          isSpecialStandard: Boolean(exhaustType?.isSpecialStandard),
          specialStandardReference: exhaustType?.specialStandardReference,
          recirculationClassification: getRecirculationClassification(airClass),
          referenceSection: '6.5.1',
          referenceTable: exhaustType?.referenceTable || 'Table 6-2',
          complianceNotes: [
            `Compliance path '${input.compliancePath}' is unsupported. Verified Table 6-2 rates strictly enforce the 'PRESCRIPTIVE' path (Section 6.5.1). Any performance-based approach requires Section 6.5.2 engineering evaluation.`
          ]
        };
      }
    }

    // 1. Missing exhaust type check
    if (!input.exhaustType) {
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: 'unknown',
        exhaustClass: null,
        airClass: null,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'NOT_EVALUATED',
        rateStatus: 'NOT_APPLICABLE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'NOT_EVALUATED',
        isSpecialStandard: false,
        recirculationClassification: 'Air Class unclassified.',
        referenceSection: '6.5.1',
        referenceTable: 'Table 6-2',
        complianceNotes: ['No exhaust space type selected.']
      };
    }

    const exhaustType = input.exhaustType;
    const airClass = exhaustType.airClass ?? exhaustType.exhaustClass ?? null;
    const exhaustClass = exhaustType.exhaustClass ?? exhaustType.airClass ?? null;
    const referenceSection = exhaustType.referenceSection || '6.5.1';
    const referenceTable = exhaustType.referenceTable || 'Table 6-2';
    const recirculationClassification = getRecirculationClassification(airClass);

    // Identify Table 6-3 airstreams / sources
    const isTable63Source = 
      referenceTable === 'Table 6-3' ||
      (exhaustType as any).referenceTable === 'Table 6-3' ||
      ((exhaustType as any).description !== undefined && exhaustType.rate === undefined && exhaustType.continuousRate === undefined);

    const isSpecialStandard = Boolean(
      exhaustType.isSpecialStandard ||
      exhaustType.unitType === 'special' ||
      exhaustType.rateStatus === 'SPECIAL_REQUIREMENT' ||
      exhaustType.rate === null ||
      isTable63Source
    );

    // Air Class vs Exhaust Class consistency guard
    if (exhaustType.airClass !== undefined && exhaustType.exhaustClass !== undefined && exhaustType.airClass !== exhaustType.exhaustClass) {
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'BLOCKED',
        rateStatus: 'SPECIAL_REQUIREMENT',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'BLOCKED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        referenceSection,
        referenceTable,
        complianceNotes: [`Record invalid: airClass (${exhaustType.airClass}) diverges from exhaustClass (${exhaustType.exhaustClass}).`]
      };
    }

    // 2. Table 6-3 Airstreams or Sources Handling
    // Table 6-3 designates Air Class classification only. It NEVER invents numeric exhaust rates.
    // Calculations MUST NOT return PASS for numeric airflow merely because engineer entered a large number.
    if (isTable63Source) {
      const specialRef = exhaustType.specialStandardReference || (exhaustType as any).description || 'Governing Standard / Project EHS Evaluation';
      const isDesignValid = typeof input.designExhaust === 'number' && Number.isFinite(input.designExhaust) && input.designExhaust >= 0;
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: isDesignValid ? input.designExhaust : null,
        unitType: exhaustType.unitType || 'special',
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'BLOCKED',
        rateStatus: 'NOT_APPLICABLE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard: true,
        specialStandardReference: specialRef,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection: '6.5.1',
        referenceTable: 'Table 6-3',
        complianceNotes: [
          `Table 6-3 designates Air Class classification only (Class ${airClass ?? 'unclassified'}).`,
          'Table 6-3 does not prescribe numeric exhaust airflow rates; supplementary engineering references are preserved.',
          `Required exhaust airflow must be engineered in accordance with governing standards (${specialRef}).`,
          'Calculation cannot return PASS for numeric airflow based solely on Table 6-3 classification, regardless of entered design airflow.'
        ]
      };
    }

    // 3. Provenance and Authenticity Validation
    const provResult = DataProvenanceValidationService.validateExhaustData(
      exhaustType,
      input.expectedStandard,
      input.expectedEdition
    );

    const isUnknownSource = 
      !exhaustType.id || 
      exhaustType.id === 'unknown' || 
      exhaustType.id.startsWith('unknown_') ||
      (exhaustType as any).sourceType === 'UNKNOWN';

    // Blocked result safety (unverified or unknown exhaust source)
    if (!provResult.valid || provResult.status === 'BLOCKED' || exhaustType.verificationStatus !== 'VERIFIED' || isUnknownSource) {
      const isDesignValid = typeof input.designExhaust === 'number' && Number.isFinite(input.designExhaust) && input.designExhaust >= 0;
      const reasons = [...(provResult.reasons || [])];
      if (isUnknownSource && !reasons.includes('Unknown exhaust source')) {
        reasons.push(`Unknown exhaust source '${exhaustType.id || 'unidentified'}' is not recognized in ASHRAE 62.1 Table 6-2 or Table 6-3`);
      }
      if (exhaustType.verificationStatus !== 'VERIFIED' && !reasons.includes('Unverified exhaust data')) {
        reasons.push('Unverified exhaust data: verificationStatus is not VERIFIED');
      }

      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: isDesignValid ? input.designExhaust : null,
        unitType: exhaustType.unitType || 'unknown',
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'BLOCKED',
        rateStatus: exhaustType.rateStatus || 'SPECIAL_REQUIREMENT',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'BLOCKED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes: [`Exhaust data blocked: ${reasons.join('; ')}`]
      };
    }

    const complianceNotes: string[] = [];
    if (exhaustType.combustionCondition) {
      complianceNotes.push(`Combustion condition: ${exhaustType.combustionCondition}`);
    }
    if (exhaustType.notes) {
      complianceNotes.push(`Table 6-2 Note: ${exhaustType.notes}`);
    }
    if (exhaustType.exceptions) {
      complianceNotes.push(`Exception: ${exhaustType.exceptions}`);
    }

    // Space-specific authoritative guidance notes
    if (exhaustType.id === 'auto_repair') {
      complianceNotes.push('Direct engine exhaust connection requirement: Where vehicle engine stands or running engines are present, direct source capture connection to vehicle exhaust pipes is required in addition to general room exhaust.');
    }
    if (exhaustType.id === 'kitchen_commercial') {
      complianceNotes.push('Commercial cooking exhaust safety: Prescriptive Table 6-2 rate (3.5 L/s·m², Air Class 2) provides minimum general room exhaust only. Per ASHRAE 62.1-2022 Section 6.5.1.2.3 (Addendum x), kitchen exhaust hoods shall comply with ANSI/ASHRAE Standard 154 (external/local code requirements such as NFPA 96 may apply separately as project requirements).');
    }

    // 4. Quantity validation
    if (input.qty === null || input.qty === undefined || Number.isNaN(input.qty)) {
      const status: ValidationStatus = (typeof input.qty === 'number' && Number.isNaN(input.qty)) ? 'FAIL' : 'INCOMPLETE';
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status,
        rateStatus: 'PRESCRIPTIVE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes: [...complianceNotes, 'Quantity input is required.']
      };
    }
    if (typeof input.qty !== 'number' || !Number.isFinite(input.qty) || input.qty < 0) {
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'FAIL',
        rateStatus: 'PRESCRIPTIVE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes: [...complianceNotes, 'Quantity must be a non-negative finite number.']
      };
    }

    // 5. Design exhaust validation
    if (input.designExhaust === null || input.designExhaust === undefined) {
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'INCOMPLETE',
        rateStatus: 'PRESCRIPTIVE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes: [...complianceNotes, 'Design exhaust airflow is required for evaluation.']
      };
    }
    if (typeof input.designExhaust !== 'number' || !Number.isFinite(input.designExhaust) || input.designExhaust < 0) {
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: null,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'FAIL',
        rateStatus: 'PRESCRIPTIVE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes: [...complianceNotes, 'Design exhaust airflow must be a non-negative finite number.']
      };
    }

    // 6. Special Standard handling (NFPA 33, ASHRAE 15, etc.) - CRITICAL RESULT SAFETY
    // Table 6-2 row does not provide a numeric prescriptive rate. Calculation MUST NOT return PASS simply because positive design exhaust was entered.
    if (isSpecialStandard || exhaustType.rate === null || exhaustType.rateStatus === 'SPECIAL_REQUIREMENT') {
      const specialRef = exhaustType.specialStandardReference || 'Referenced Standard';
      complianceNotes.push(
        `Numeric prescriptive exhaust rate is not defined by ASHRAE 62.1-2022 Table 6-2. Verify the applicable referenced standard (${specialRef}) before accepting the design airflow.`
      );
      return {
        requiredExhaust: null,
        requiredExhaustMetric: null,
        requiredExhaustIp: null,
        designExhaust: input.designExhaust,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: null,
        rateAppliedMetric: null,
        rateAppliedIp: null,
        status: 'BLOCKED',
        rateStatus: 'SPECIAL_REQUIREMENT',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'BLOCKED',
        isSpecialStandard: true,
        specialStandardReference: specialRef,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes
      };
    }

    // 7. Intermittent exhaust eligibility verification
    if (operationMode === 'intermittent') {
      const permitsIntermittent = exhaustType.intermittentRate !== null && exhaustType.intermittentRate !== undefined;
      if (!permitsIntermittent) {
        return {
          requiredExhaust: null,
          requiredExhaustMetric: null,
          requiredExhaustIp: null,
          designExhaust: input.designExhaust,
          unitType: exhaustType.unitType,
          exhaustClass,
          airClass,
          operationMode,
          rateApplied: null,
          rateAppliedMetric: null,
          rateAppliedIp: null,
          status: 'FAIL',
          rateStatus: 'PRESCRIPTIVE',
          compliancePath: 'PRESCRIPTIVE',
          pathStatus: 'SUPPORTED',
          isSpecialStandard: false,
          recirculationClassification,
          combustionCondition: exhaustType.combustionCondition,
          notes: exhaustType.notes,
          exceptions: exhaustType.exceptions,
          referenceSection,
          referenceTable,
          complianceNotes: [
            ...complianceNotes,
            `Intermittent exhaust is not permitted for "${exhaustType.name}" under ASHRAE 62.1-2022 Table 6-2. Continuous exhaust operation is required.`
          ]
        };
      }
    }

    // 8. Parking Garage Exception 1 handling (Section 6.5.1 Exception 1 / Table 6-2 Note b)
    const isParkingGarage = exhaustType.id === 'parking_garages' || exhaustType.id === 'parking_garage';
    if (isParkingGarage && input.parkingGarageOpenSides50PercentOrMore === true) {
      complianceNotes.push(
        'Naturally ventilated parking garage exception applied: >=50% open area on 2+ sides. Mechanical exhaust is exempt under ASHRAE 62.1-2022 Section 6.5.1 Exception 1.'
      );
      return {
        requiredExhaust: 0,
        requiredExhaustMetric: 0,
        requiredExhaustIp: 0,
        designExhaust: input.designExhaust,
        unitType: exhaustType.unitType,
        exhaustClass,
        airClass,
        operationMode,
        rateApplied: 0,
        rateAppliedMetric: 0,
        rateAppliedIp: 0,
        status: 'PASS',
        rateStatus: 'PRESCRIPTIVE',
        compliancePath: 'PRESCRIPTIVE',
        pathStatus: 'SUPPORTED',
        isSpecialStandard: false,
        specialStandardReference: exhaustType.specialStandardReference,
        recirculationClassification,
        combustionCondition: exhaustType.combustionCondition,
        notes: exhaustType.notes,
        exceptions: exhaustType.exceptions,
        referenceSection,
        referenceTable,
        complianceNotes,
        parkingGarageOpenSides50PercentOrMore: true
      };
    } else if (isParkingGarage) {
      complianceNotes.push(
        'Enclosed parking garage prescriptive exhaust rate applied: 3.7 L/s·m² (0.75 cfm/ft²). Exception 1 applies if two or more sides have >=50% open wall area.'
      );
    }

    // 9. Prescriptive Rate Determination
    let rateMetric: number;
    let rateIp: number;

    if (operationMode === 'intermittent') {
      rateMetric = exhaustType.intermittentRate!;
      rateIp = exhaustType.intermittentRateIp ?? (rateMetric * 2);
    } else {
      rateMetric = exhaustType.continuousRate ?? exhaustType.rate ?? 0;
      rateIp = exhaustType.continuousRateIp ?? exhaustType.rateIp ?? (rateMetric * 0.2);
    }

    let requiredExhaust: number;
    let requiredExhaustMetric: number;
    let requiredExhaustIp: number;
    let rateApplied: number;

    const isAreaBased = exhaustType.unitType === 'm2';

    if (unitSystem === 'ip') {
      rateApplied = rateIp;
      requiredExhaust = rateIp * input.qty;
      requiredExhaustIp = requiredExhaust;
      // In IP mode, input.qty is in ft2 for area-based spaces. Convert to m2 before multiplying by rateMetric (L/s·m2).
      const areaM2 = isAreaBased ? ft2ToM2(input.qty) : input.qty;
      requiredExhaustMetric = rateMetric * areaM2;
    } else {
      rateApplied = rateMetric;
      requiredExhaust = rateMetric * input.qty;
      requiredExhaustMetric = requiredExhaust;
      // In Metric mode, input.qty is in m2 for area-based spaces. Convert to ft2 before multiplying by rateIp (cfm/ft2).
      const areaFt2 = isAreaBased ? m2ToFt2(input.qty) : input.qty;
      requiredExhaustIp = rateIp * areaFt2;
    }

    // 10. Result status determination
    let status: ValidationStatus = 'PASS';
    if (input.designExhaust < requiredExhaust) {
      status = 'FAIL';
      complianceNotes.push(
        `Design exhaust (${input.designExhaust.toFixed(1)} ${unitSystem === 'ip' ? 'cfm' : 'L/s'}) is less than prescriptive minimum required (${requiredExhaust.toFixed(1)} ${unitSystem === 'ip' ? 'cfm' : 'L/s'}).`
      );
    } else {
      complianceNotes.push(
        `Prescriptive minimum satisfied (${input.designExhaust.toFixed(1)} >= ${requiredExhaust.toFixed(1)} ${unitSystem === 'ip' ? 'cfm' : 'L/s'}).`
      );
    }

    return {
      requiredExhaust,
      requiredExhaustMetric,
      requiredExhaustIp,
      designExhaust: input.designExhaust,
      unitType: exhaustType.unitType,
      exhaustClass,
      airClass,
      operationMode,
      rateApplied,
      rateAppliedMetric: rateMetric,
      rateAppliedIp: rateIp,
      status,
      rateStatus: 'PRESCRIPTIVE',
      compliancePath: 'PRESCRIPTIVE',
      pathStatus: 'SUPPORTED',
      state: 'SUPPORTED',
      isSpecialStandard: false,
      specialStandardReference: exhaustType.specialStandardReference,
      recirculationClassification,
      combustionCondition: exhaustType.combustionCondition,
      notes: exhaustType.notes,
      exceptions: exhaustType.exceptions,
      referenceSection,
      referenceTable,
      complianceNotes: [
        ...complianceNotes,
        'Compliance path enforced: Section 6.5.1 PRESCRIPTIVE path for verified Table 6-2 numeric rates.'
      ],
      parkingGarageOpenSides50PercentOrMore: input.parkingGarageOpenSides50PercentOrMore
    };
  }
}
