/**
 * Explicit Standard Selection and State Model for CKY_MEPF Ventilation.
 * 
 * PROJECT BASELINE FREEZE:
 * Active production calculation engine is strictly frozen to:
 * - ASHRAE 62.1-2022 (Commercial/Institutional)
 * - ASHRAE 62.2-2022 (Residential Dwelling Units)
 * 
 * 2025 standards are marked as [DISABLED / FUTURE] and must NOT be used for active calculations.
 */

export type ActiveStandardId = 'ASHRAE 62.1-2022' | 'ASHRAE 62.2-2022';
export type FutureStandardId = 'ASHRAE 62.1-2025' | 'ASHRAE 62.2-2025';
export type VentilationStandardId = ActiveStandardId | FutureStandardId;

export type StandardScope = 'commercial' | 'residential';

export interface StandardDefinition {
  id: VentilationStandardId;
  name: string;
  scope: StandardScope;
  standardName: 'ASHRAE 62.1' | 'ASHRAE 62.2';
  edition: '2022' | '2025';
  status: 'ACTIVE_PRODUCTION' | 'DISABLED_FUTURE';
  disabledReason?: string;
  uiLabel: string;
  basisDisplay: string;
}

export const VENTILATION_STANDARDS: Record<VentilationStandardId, StandardDefinition> = {
  'ASHRAE 62.1-2022': {
    id: 'ASHRAE 62.1-2022',
    name: 'ASHRAE Standard 62.1-2022',
    scope: 'commercial',
    standardName: 'ASHRAE 62.1',
    edition: '2022',
    status: 'ACTIVE_PRODUCTION',
    uiLabel: 'ASHRAE 62.1-2022 (Commercial)',
    basisDisplay: 'Calculation Basis: ASHRAE 62.1-2022'
  },
  'ASHRAE 62.2-2022': {
    id: 'ASHRAE 62.2-2022',
    name: 'ASHRAE Standard 62.2-2022',
    scope: 'residential',
    standardName: 'ASHRAE 62.2',
    edition: '2022',
    status: 'ACTIVE_PRODUCTION',
    uiLabel: 'ASHRAE 62.2-2022 (Residential)',
    basisDisplay: 'Calculation Basis: ASHRAE 62.2-2022'
  },
  'ASHRAE 62.1-2025': {
    id: 'ASHRAE 62.1-2025',
    name: 'ASHRAE Standard 62.1-2025',
    scope: 'commercial',
    standardName: 'ASHRAE 62.1',
    edition: '2025',
    status: 'DISABLED_FUTURE',
    disabledReason: 'ASHRAE 62.1-2025 is deferred. Active production calculation baseline is ASHRAE 62.1-2022.',
    uiLabel: 'ASHRAE 62.1-2025 [DISABLED / FUTURE]',
    basisDisplay: 'Calculation Basis: ASHRAE 62.1-2025 [DISABLED / FUTURE]'
  },
  'ASHRAE 62.2-2025': {
    id: 'ASHRAE 62.2-2025',
    name: 'ASHRAE Standard 62.2-2025',
    scope: 'residential',
    standardName: 'ASHRAE 62.2',
    edition: '2025',
    status: 'DISABLED_FUTURE',
    disabledReason: 'ASHRAE 62.2-2025 is deferred. Active production calculation baseline is ASHRAE 62.2-2022.',
    uiLabel: 'ASHRAE 62.2-2025 [DISABLED / FUTURE]',
    basisDisplay: 'Calculation Basis: ASHRAE 62.2-2025 [DISABLED / FUTURE]'
  }
};

export const ACTIVE_PRODUCTION_STANDARDS: ActiveStandardId[] = [
  'ASHRAE 62.1-2022',
  'ASHRAE 62.2-2022'
];

export const FUTURE_STANDARDS: FutureStandardId[] = [
  'ASHRAE 62.1-2025',
  'ASHRAE 62.2-2025'
];

export const DEFAULT_COMMERCIAL_STANDARD: ActiveStandardId = 'ASHRAE 62.1-2022';
export const DEFAULT_RESIDENTIAL_STANDARD: ActiveStandardId = 'ASHRAE 62.2-2022';
export const PRODUCTION_EDITION = '2022' as const;

/**
 * Validates whether a standard ID or edition string is eligible for active production calculations.
 */
export function isStandardActive(standardId: string): boolean {
  const std = (VENTILATION_STANDARDS as Record<string, StandardDefinition>)[standardId];
  return !!std && std.status === 'ACTIVE_PRODUCTION';
}

/**
 * Asserts that a standard edition is 2022. Throws if 2025 is passed.
 */
export function assertProductionEdition(edition: string): void {
  if (edition === '2025') {
    throw new Error('PRODUCTION_BASELINE_VIOLATION: ASHRAE 2025 standards are deferred and cannot be used in active production calculations.');
  }
}

/**
 * Returns the UI display label for the active calculation basis.
 */
export function getCalculationBasisDisplay(standardOrScope: string): string {
  if (standardOrScope === 'residential' || standardOrScope.includes('62.2')) {
    return VENTILATION_STANDARDS['ASHRAE 62.2-2022'].basisDisplay;
  }
  return VENTILATION_STANDARDS['ASHRAE 62.1-2022'].basisDisplay;
}
