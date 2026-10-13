/**
 * Engineering Compliance Text Normalization & Parsing Utilities
 * 
 * Safely parses and normalizes compliance strings across VentilationReportsView,
 * the PDF exporters, and audit records.
 *
 * Rules:
 * 1. Negative compliance wording (e.g., 'NON-COMPLIANT', 'NOT COMPLIANT', 'NOT IN COMPLIANCE')
 *    takes precedence over any positive terms.
 * 2. Diagnostic or preliminary wording disqualifies positive compliance claims.
 * 3. Exact word-boundary detection ensures 'NON-COMPLIANT' is never mistaken for 'COMPLIANT'.
 */

export interface ComplianceParsedResult {
  readonly isNegative: boolean;
  readonly isPositive: boolean;
  readonly isDiagnostic: boolean;
  readonly normalizedText: string;
}

export type StructuredComplianceDetermination = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_VERIFIED';

/**
 * Normalizes an audit or result compliance string by trimming and converting to uppercase.
 */
export function normalizeComplianceText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim().toUpperCase();
}

/**
 * Detects whether a compliance text explicitly states non-compliance.
 * Safely recognizes:
 * - NON-COMPLIANT, NON COMPLIANT, NONCOMPLIANT, NON_COMPLIANT
 * - NOT-COMPLIANT, NOT COMPLIANT
 * - NOT IN COMPLIANCE, OUT OF COMPLIANCE
 * - NOT YET COMPLIANT, NOT FULLY COMPLIANT, NOT CURRENTLY COMPLIANT
 * - Failure indicators paired with compliance (e.g. "FAIL: COMPLIANCE CHECK FAILED")
 */
export function isExplicitNegativeCompliance(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const upper = normalizeComplianceText(text);
  if (!upper) return false;

  if (
    upper.includes('NON-COMPLIANT') ||
    upper.includes('NON COMPLIANT') ||
    upper.includes('NON_COMPLIANT') ||
    upper.includes('NOT-COMPLIANT') ||
    upper.includes('NOT COMPLIANT') ||
    upper.includes('NOT IN COMPLIANCE') ||
    upper.includes('NONCOMPLIANT') ||
    upper.includes('OUT OF COMPLIANCE')
  ) {
    return true;
  }

  // Detect negative variations: "NOT YET COMPLIANT", "NOT FULLY COMPLIANT", etc.
  if (/\bNOT\s+(?:YET\s+|FULLY\s+|CURRENTLY\s+|ENTIRELY\s+|QUITE\s+|IN\s+)?COMPLIAN(?:T|CE)\b/.test(upper)) {
    return true;
  }

  // Failure paired with compliance term
  if (/\b(FAIL|FAILED|FAILURE)\b/.test(upper) && /\bCOMPLIAN(?:CE|T)\b/.test(upper)) {
    return true;
  }

  return false;
}

/**
 * Extracts structured compliance determination from a result, audit record, or parameters object.
 * Returns 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_VERIFIED' | null.
 */
export function extractStructuredCompliance(obj: any): StructuredComplianceDetermination | null {
  if (!obj || typeof obj !== 'object') return null;

  const rawFields = [
    obj.complianceDetermination,
    obj.structuredCompliance,
    obj.auditRecord?.complianceDetermination,
    obj.auditRecord?.finalResult?.complianceDetermination,
    obj.finalResult?.complianceDetermination,
    obj.parameters?.complianceDetermination,
    obj.parameters?.lastCalculationResult?.complianceDetermination,
    obj.parameters?.lastCalculationResult?.auditRecord?.complianceDetermination,
    obj.parameters?.lastCalculationResult?.auditRecord?.finalResult?.complianceDetermination
  ];

  const parsedFields: StructuredComplianceDetermination[] = [];
  for (const raw of rawFields) {
    if (typeof raw === 'string') {
      const upper = raw.toUpperCase().trim();
      if (upper === 'COMPLIANT') parsedFields.push('COMPLIANT');
      else if (upper === 'NON_COMPLIANT' || upper === 'NON-COMPLIANT') parsedFields.push('NON_COMPLIANT');
      else if (upper === 'NOT_VERIFIED' || upper === 'NOT-VERIFIED') parsedFields.push('NOT_VERIFIED');
    }
  }

  if (parsedFields.length === 0) return null;

  // Explicit negative strictly overrides any positive structured determination
  if (parsedFields.includes('NON_COMPLIANT')) {
    return 'NON_COMPLIANT';
  }

  // Contradictory determinations (e.g. COMPLIANT mixed with NOT_VERIFIED) fail closed to NOT_VERIFIED
  if (parsedFields.includes('NOT_VERIFIED')) {
    return 'NOT_VERIFIED';
  }

  // All valid provided determinations must be COMPLIANT
  if (parsedFields.every(d => d === 'COMPLIANT')) {
    return 'COMPLIANT';
  }

  return 'NOT_VERIFIED';
}

/**
 * Detects whether a compliance text indicates a non-authoritative diagnostic utility.
 */
export function isDiagnosticCompliance(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const upper = normalizeComplianceText(text);
  if (!upper) return false;

  return (
    upper.includes('DIAGNOSTIC') ||
    upper.includes('NON-AUTHORITATIVE') ||
    upper.includes('NON AUTHORITATIVE') ||
    upper.includes('PRELIMINARY') ||
    upper.includes('UNVERIFIED') ||
    upper.includes('NOT APPROVED')
  );
}

/**
 * Detects whether a compliance text contains clear, explicit positive compliance evidence.
 * Strictly rejects texts with negative, failure, or diagnostic indicators.
 */
export function isExplicitPositiveCompliance(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const upper = normalizeComplianceText(text);
  if (!upper) return false;

  // Negative wording strictly overrides
  if (isExplicitNegativeCompliance(upper)) {
    return false;
  }

  // Diagnostic wording strictly disqualifies
  if (isDiagnosticCompliance(upper)) {
    return false;
  }

  // Explicit positive compliance pattern
  return /\bCOMPLIANT\b/.test(upper) || /\bFULL COMPLIANCE\b/.test(upper) || /\bIN COMPLIANCE\b/.test(upper);
}

/**
 * Parses and classifies an individual compliance text string.
 */
export function parseComplianceString(text: string | null | undefined): ComplianceParsedResult {
  const normalizedText = normalizeComplianceText(text);
  const isNegative = isExplicitNegativeCompliance(normalizedText);
  const isDiagnostic = isDiagnosticCompliance(normalizedText);
  const isPositive = !isNegative && !isDiagnostic && isExplicitPositiveCompliance(normalizedText);

  return {
    isNegative,
    isPositive,
    isDiagnostic,
    normalizedText
  };
}

/**
 * Parses and classifies a compliance summary string from an audit record or calculation result.
 */
export function parseComplianceSummary(text: string | null | undefined): ComplianceParsedResult {
  return parseComplianceString(text);
}
