import { ValidationStatus } from '../ventilation/VentilationValidationService';

/**
 * Status of a calculation standard or path within the engineering production lifecycle.
 */
export type CalculationProductionStatus = 
  | 'ACTIVE_PRODUCTION' 
  | 'DISABLED_FUTURE' 
  | 'SUPERSEDED_LEGACY' 
  | 'NON_PRODUCTION' 
  | 'BLOCKED';

/**
 * Explicit descriptor for a supported calculation path.
 */
export interface SupportedCalculationPath {
  readonly id: string;
  readonly name: string;
  readonly section: string;
  readonly description: string;
  readonly governingBasis: string;
}

/**
 * Explicit descriptor for an unsupported or blocked calculation path.
 */
export interface BlockedCalculationPath {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
  readonly blockedStatus: ValidationStatus;
}

/**
 * Structured validation outcome for production scope checks.
 */
export interface ScopeValidationResult {
  readonly allowed: boolean;
  readonly status: ValidationStatus;
  readonly reasons: readonly string[];
}

/**
 * Generic Production Calculation Scope Contract.
 * 
 * Reusable across MEP engineering systems (ventilation, electrical, plumbing, fire protection, hydronics).
 * Establishes an operational contract distinguishing the frozen project baseline
 * from the broader published standard universe.
 */
export interface ProductionCalculationScope<TPathId extends string = string> {
  readonly discipline: 'ventilation' | 'hydronics' | 'electrical' | 'plumbing' | 'fire';
  readonly standard: string;
  readonly edition: string;
  readonly mainBasis: string;
  readonly exhaustBasis?: string;
  readonly revisionBasis: string;
  readonly allowedAddenda: readonly string[];
  readonly publishedAddendaApplied: readonly string[];
  readonly blockedEditions: readonly string[];
  readonly blockedStandards: readonly string[];
  readonly supportedPaths: readonly SupportedCalculationPath[];
  readonly blockedPaths: readonly BlockedCalculationPath[];
  readonly unsupportedCalculationPaths: readonly BlockedCalculationPath[];
  readonly productionStatus: CalculationProductionStatus;
  readonly sourceStatus: string;
  readonly revisionDate: string;
  readonly sourceReferences: readonly string[];
  readonly controlledProjectBasisDescription: string;
  readonly publishedStandardUniverseDistinction: string;
  readonly notes?: string;
}

/**
 * Supported active ventilation calculation paths for ANSI/ASHRAE Standard 62.1-2022.
 */
export const VENTILATION_SUPPORTED_PATHS: readonly SupportedCalculationPath[] = [
  {
    id: 'single_zone',
    name: 'Single-Zone Ventilation',
    section: 'Section 6.2.1 & 6.2.2',
    description: 'Outdoor airflow calculation for single-zone systems (Voz = (Vbz / Ez) * Ep)',
    governingBasis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum j'
  },
  {
    id: 'multi_zone_simplified',
    name: 'Multi-Zone Simplified Procedure',
    section: 'Section 6.2.4.2 & Appendix A',
    description: 'Simplified multiple-zone recirculating system outdoor air intake determination',
    governingBasis: 'ANSI/ASHRAE Standard 62.1-2022'
  },
  {
    id: 'multi_zone_alternative',
    name: 'Multi-Zone Alternative Procedure',
    section: 'Section 6.2.4.3 & Normative Appendix A',
    description: 'Alternative multiple-zone recirculating system outdoor air intake determination',
    governingBasis: 'ANSI/ASHRAE Standard 62.1-2022'
  },
  {
    id: 'prescriptive_exhaust_table_6_2',
    name: 'Prescriptive Exhaust (Table 6-2)',
    section: 'Section 6.5.1, Table 6-2',
    description: 'Prescriptive exhaust airflow calculation where a verified numeric Table 6-2 rate exists',
    governingBasis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum x'
  },
  {
    id: 'table_6_3_air_class',
    name: 'Table 6-3 Air Class Classification',
    section: 'Section 5.16 & Table 6-3',
    description: 'Classification of air quality and recirculation/transfer restrictions',
    governingBasis: 'ANSI/ASHRAE Standard 62.1-2022'
  },
  {
    id: 'air_density_correction',
    name: 'Air-Density Correction (Ep)',
    section: 'Section 6.2.1.1 & Addendum j',
    description: 'Atmospheric pressure and air density mass-to-volume airflow ratio adjustment',
    governingBasis: 'Addendum j to ANSI/ASHRAE Standard 62.1-2022'
  }
] as const;

/**
 * Explicitly blocked or unsupported ventilation calculation paths.
 */
export const VENTILATION_BLOCKED_PATHS: readonly BlockedCalculationPath[] = [
  {
    id: 'ashrae_62_1_2019',
    name: 'ASHRAE 62.1-2019',
    reason: 'ASHRAE 62.1-2019 is a superseded legacy edition. Active production calculation engine is strictly frozen to 2022.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'ashrae_62_1_2025',
    name: 'ASHRAE 62.1-2025',
    reason: 'ASHRAE 62.1-2025 is a deferred future standard. Calculations are disabled until formal code cycle adoption.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'ashrae_62_2_in_commercial_engine',
    name: 'ASHRAE 62.2 inside the commercial 62.1 engine',
    reason: 'Scope boundary violation: residential dwelling standard (ASHRAE 62.2) cannot run inside the commercial ASHRAE 62.1 engine. Dedicated Ashrae622Service must be used.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'unverified_table_6_4_ez',
    name: 'Unverified / unimplemented Table 6-4 configurations',
    reason: 'Unverified Table 6-4 configurations (such as ez-unidirectional-flow) are NOT_VERIFIED / UNIMPLEMENTED and cannot be used in production calculations.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'manual_ez_override_as_standard',
    name: 'Manual Ez override as a certified standard result',
    reason: 'Manual engineering overrides carry NOT_VERIFIED provenance and cannot be certified as standard ASHRAE Table 6-4 results.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'performance_exhaust_path_6_5_2',
    name: 'Performance Exhaust Path 6.5.2',
    reason: 'Performance Exhaust Path 6.5.2 requires specialized laboratory contaminant generation analysis and is not implemented or verified in the prescriptive engine.',
    blockedStatus: 'BLOCKED'
  },
  {
    id: 'unapproved_2022_addenda',
    name: 'Unapproved 62.1-2022 addenda beyond approved baseline',
    reason: 'Controlled project baseline is strictly frozen to Addenda j and x. Subsequent 62.1-2022 addenda published by ASHRAE are not approved or activated for active production.',
    blockedStatus: 'BLOCKED'
  }
] as const;

/**
 * Concrete Production Scope Contract for Ventilation:
 * Frozen strictly to ANSI/ASHRAE Standard 62.1-2022 + Addendum j (Main) and Addendum x (Exhaust).
 */
export const VENTILATION_PRODUCTION_SCOPE: ProductionCalculationScope = {
  discipline: 'ventilation',
  standard: 'ASHRAE 62.1',
  edition: '2022',
  mainBasis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum j',
  exhaustBasis: 'ANSI/ASHRAE Standard 62.1-2022 + Addendum x',
  revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022 (Addendum j for Outdoor Air, Addendum x for Prescriptive Exhaust)',
  allowedAddenda: ['Addendum j', 'Addendum x'],
  publishedAddendaApplied: ['Addendum j', 'Addendum x'],
  blockedEditions: ['2019', '2025'],
  blockedStandards: ['ASHRAE 62.2', 'ASHRAE 62.1-2019', 'ASHRAE 62.1-2025'],
  supportedPaths: VENTILATION_SUPPORTED_PATHS,
  blockedPaths: VENTILATION_BLOCKED_PATHS,
  unsupportedCalculationPaths: VENTILATION_BLOCKED_PATHS,
  productionStatus: 'ACTIVE_PRODUCTION',
  sourceStatus: 'VERIFIED',
  revisionDate: '2026-09-28',
  sourceReferences: [
    'ANSI/ASHRAE Standard 62.1-2022: Ventilation for Acceptable Indoor Air Quality',
    'ANSI/ASHRAE Addendum j to ANSI/ASHRAE Standard 62.1-2022 (Air Density Factor Ep)',
    'ANSI/ASHRAE Addendum x to ANSI/ASHRAE Standard 62.1-2022 (Table 6-2 Prescriptive Exhaust Rates)'
  ],
  controlledProjectBasisDescription: 'Controlled Project Baseline: strictly frozen to ANSI/ASHRAE Standard 62.1-2022 with published Addendum j (air density factor Ep) and published Addendum x (prescriptive exhaust). Later published addenda are not activated.',
  publishedStandardUniverseDistinction: 'The application distinguishes the controlled project basis from the broader published standard universe: using the 2022 edition does NOT imply that all subsequent addenda published in the 62.1-2022 lifecycle are activated or certified.',
  notes: 'Main ventilation calculations conform to ANSI/ASHRAE Standard 62.1-2022 with published Addendum j (air density factor Ep); prescriptive exhaust conforms to ANSI/ASHRAE Standard 62.1-2022 with published Addendum x. No other 2022 addenda or 2025 provisions are activated.'
};

/**
 * Reusable Production Scope Service.
 * Provides operational validation and boundary enforcement for calculation scopes.
 */
export class ProductionScopeService {
  /**
   * Returns the frozen production scope contract for ASHRAE 62.1 ventilation.
   */
  static getVentilationScope(): ProductionCalculationScope {
    return VENTILATION_PRODUCTION_SCOPE;
  }

  /**
   * Validates whether a standard and edition combination is permitted by the production scope.
   */
  static validateStandardAndEdition(standard: string, edition: string): ScopeValidationResult {
    const scope = this.getVentilationScope();

    // Check standard mismatch or blocked standards
    if (standard !== scope.standard) {
      if (scope.blockedStandards.includes(standard) || standard === 'ASHRAE 62.2' || standard === '62.2') {
        return {
          allowed: false,
          status: 'BLOCKED',
          reasons: [`Standard '${standard}' is outside the commercial ${scope.standard} production calculation path.`]
        };
      }
      return {
        allowed: false,
        status: 'BLOCKED',
        reasons: [`Standard '${standard}' does not match expected production standard '${scope.standard}'.`]
      };
    }

    // Check edition mismatch or blocked editions
    if (edition !== scope.edition) {
      if (scope.blockedEditions.includes(edition)) {
        return {
          allowed: false,
          status: 'BLOCKED',
          reasons: [`Edition '${edition}' is explicitly blocked. Active production basis is strictly ${scope.standard}-${scope.edition}.`]
        };
      }
      return {
        allowed: false,
        status: 'BLOCKED',
        reasons: [`Edition '${edition}' is not approved for production use. Active edition is ${scope.edition}.`]
      };
    }

    return { allowed: true, status: 'PASS', reasons: [] };
  }

  /**
   * Validates whether a specific calculation path is supported.
   */
  static validateCalculationPath(pathId: string): ScopeValidationResult {
    const scope = this.getVentilationScope();
    const blocked = scope.blockedPaths.find(p => p.id === pathId);
    if (blocked) {
      return {
        allowed: false,
        status: blocked.blockedStatus,
        reasons: [blocked.reason]
      };
    }

    const supported = scope.supportedPaths.some(p => p.id === pathId);
    if (!supported) {
      return {
        allowed: false,
        status: 'BLOCKED',
        reasons: [`Calculation path '${pathId}' is not supported in the active production scope.`]
      };
    }

    return { allowed: true, status: 'PASS', reasons: [] };
  }

  /**
   * Verifies if a calculation path is supported.
   */
  static isPathSupported(pathId: string): boolean {
    return this.getVentilationScope().supportedPaths.some(p => p.id === pathId);
  }

  /**
   * Verifies if a calculation path is blocked.
   */
  static isPathBlocked(pathId: string): boolean {
    return this.getVentilationScope().blockedPaths.some(p => p.id === pathId);
  }

  /**
   * Validates an addendum against the approved project baseline.
   * Rejects unapproved addenda from the broader published standard universe.
   */
  static isAddendumAllowed(addendum: string): boolean {
    const norm = normalizeAddendumIdentifier(addendum);
    return this.getVentilationScope().allowedAddenda.some(
      allowed => normalizeAddendumIdentifier(allowed) === norm
    );
  }

  /**
   * Validates whether a given addendum is approved in the project basis.
   */
  static validateAddendum(addendum: string): ScopeValidationResult {
    const scope = this.getVentilationScope();
    const norm = normalizeAddendumIdentifier(addendum);
    const isAllowed = scope.allowedAddenda.some(
      allowed => normalizeAddendumIdentifier(allowed) === norm
    );
    if (isAllowed) {
      return { allowed: true, status: 'PASS', reasons: [] };
    }
    return {
      allowed: false,
      status: 'BLOCKED',
      reasons: [
        `Addendum '${addendum}' is not part of the active production project basis (${scope.allowedAddenda.join(', ')}). Later addenda in the published standard universe are not active.`
      ]
    };
  }

  /**
   * Operational gate: throws if standard or edition violates production baseline.
   */
  static assertProductionBasis(standard: string, edition: string): void {
    const validation = this.validateStandardAndEdition(standard, edition);
    if (!validation.allowed) {
      throw new Error(`PRODUCTION_SCOPE_VIOLATION: ${validation.reasons.join('; ')}`);
    }
  }
}

/**
 * Universal Addendum Identifier Normalization Helper.
 * Normalizes equivalent representations of an addendum identifier to a canonical lowercase token.
 * Examples:
 * - "Addendum j" -> "j"
 * - " addendum J " -> "j"
 * - "J" -> "j"
 * - "j" -> "j"
 * - "Addendum x" -> "x"
 * - "X" -> "x"
 * - "x" -> "x"
 */
export function normalizeAddendumIdentifier(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(/^(?:addend(?:um|a)[\s\-_:]*)?([a-z0-9]+)$/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return trimmed;
}
