/**
 * Engineering Compliance & Authority Determination Helper
 * 
 * Enforces universal engineering rules across UI views and PDF exporters:
 * 1. Explicit production authorization requires PASS and authorityPolicy === 'AUTHORITATIVE_PRODUCTION'.
 * 2. DIAGNOSTIC, missing policy, or non-PASS calculations can never be authoritative.
 * 3. PASS alone never means COMPLIANT.
 * 4. PASS + authority alone never means COMPLIANT.
 * 5. Negative compliance evidence (NON-COMPLIANT, NOT COMPLIANT, NOT IN COMPLIANCE, etc.) takes precedence.
 * 6. Positive compliance requires explicit positive contract evidence.
 * 7. Conflicting positive and negative evidence cannot produce COMPLIANT.
 */

export interface ComplianceEvaluation {
  readonly status: 'COMPLIANT' | 'NON-COMPLIANT' | 'Compliance Not Verified';
  readonly structuredDetermination: StructuredComplianceDetermination;
  readonly hasExplicitComplianceContract: boolean;
  readonly hasNegativeComplianceContract: boolean;
  readonly hasExplicitPositiveEvidence: boolean;
  readonly isAuthoritativeProduction: boolean;
  readonly primaryEvidenceText: string | null;
}

import {
  isExplicitNegativeCompliance,
  isExplicitPositiveCompliance,
  isDiagnosticCompliance,
  normalizeComplianceText,
  parseComplianceString,
  parseComplianceSummary,
  extractStructuredCompliance,
  type ComplianceParsedResult,
  type StructuredComplianceDetermination
} from './complianceUtils';

export {
  isExplicitNegativeCompliance,
  isExplicitPositiveCompliance,
  isDiagnosticCompliance,
  normalizeComplianceText,
  parseComplianceString,
  parseComplianceSummary,
  extractStructuredCompliance,
  type ComplianceParsedResult,
  type StructuredComplianceDetermination
};

/**
 * Determines whether a calculation result has explicit Authoritative Production standing.
 * Rules:
 * 1. Calculation status must be PASS.
 * 2. Applicable audit record must explicitly specify authorityPolicy === 'AUTHORITATIVE_PRODUCTION'.
 *    Missing authority policy, DIAGNOSTIC, or undefined fails safe to false.
 * 3. Authority/approval fields must agree with the contract:
 *    (isAuthoritative !== false) and (isApprovedForEngineeringUse !== false).
 */
export function isAuthoritativeProductionRun(result: any): boolean {
  if (!result || typeof result !== 'object') return false;

  const status = typeof result.status === 'string' ? result.status.toUpperCase() : null;
  if (status !== 'PASS') {
    return false;
  }

  const auditRecord = result.auditRecord;
  const authorityPolicy = auditRecord?.authorityPolicy ?? result.authorityPolicy;

  // Strict: Must explicitly declare AUTHORITATIVE_PRODUCTION
  if (authorityPolicy !== 'AUTHORITATIVE_PRODUCTION') {
    return false;
  }

  // Conflicting diagnostic flags prevent production authority
  if (result.isDiagnostic === true || auditRecord?.calculationPath?.id?.includes('diagnostic')) {
    return false;
  }

  // Contract approval check: must not be explicitly false
  const isAuthDirect = result.isAuthoritative;
  const isAuthAudit = auditRecord?.finalResult?.isAuthoritative;
  const isApprovedDirect = result.isApprovedForEngineeringUse;
  const isApprovedAudit = auditRecord?.isApprovedForEngineeringUse;

  if (isAuthDirect === false || isAuthAudit === false) {
    return false;
  }
  if (isApprovedDirect === false || isApprovedAudit === false) {
    return false;
  }

  // At least one positive authority/approval confirmation must exist
  const hasPositiveConfirmation =
    isAuthDirect === true ||
    isAuthAudit === true ||
    isApprovedDirect === true ||
    isApprovedAudit === true;

  return hasPositiveConfirmation;
}

/**
 * Gathers all supported compliance evidence strings from result and audit trail structures.
 */
export function extractComplianceCandidates(result: any, auditTrails: any[] = []): string[] {
  if (!result || typeof result !== 'object') {
    return [];
  }

  const candidates: string[] = [];

  const addCandidate = (val: unknown) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      candidates.push(val.trim());
    }
  };

  // 1. Direct result fields
  addCandidate(result.complianceSummary);
  addCandidate(result.complianceNotes);

  // 2. Nested auditRecord fields
  if (result.auditRecord && typeof result.auditRecord === 'object') {
    addCandidate(result.auditRecord.complianceSummary);
    addCandidate(result.auditRecord.finalResult?.complianceSummary);
    if (Array.isArray(result.auditRecord.complianceNotes)) {
      result.auditRecord.complianceNotes.forEach(addCandidate);
    }
  }

  // 3. Result auditTrail array
  if (Array.isArray(result.auditTrail)) {
    result.auditTrail.forEach((item: any) => {
      if (item && typeof item === 'object') {
        addCandidate(item.complianceSummary);
        if (Array.isArray(item.complianceNotes)) {
          item.complianceNotes.forEach(addCandidate);
        } else {
          addCandidate(item.complianceNotes);
        }
      }
    });
  }

  // 4. Nested auditRecord.auditTrail array
  if (Array.isArray(result.auditRecord?.auditTrail)) {
    result.auditRecord.auditTrail.forEach((item: any) => {
      if (item && typeof item === 'object') {
        addCandidate(item.complianceSummary);
        if (Array.isArray(item.complianceNotes)) {
          item.complianceNotes.forEach(addCandidate);
        } else {
          addCandidate(item.complianceNotes);
        }
      }
    });
  }

  // 5. Explicitly passed external auditTrails
  if (Array.isArray(auditTrails)) {
    auditTrails.forEach((item: any) => {
      if (item && typeof item === 'object') {
        addCandidate(item.complianceSummary);
        if (Array.isArray(item.complianceNotes)) {
          item.complianceNotes.forEach(addCandidate);
        } else {
          addCandidate(item.complianceNotes);
        }
      }
    });
  }

  return candidates;
}

/**
 * Universal Unified Compliance Evaluator
 * Shared between VentilationReportsView and exportCollectiveProjectPdf.
 */
export function evaluateComplianceDetermination(
  result: any,
  auditTrails: any[] = []
): ComplianceEvaluation {
  const isAuthProd = isAuthoritativeProductionRun(result);
  const status = typeof result?.status === 'string'
    ? result.status.toUpperCase()
    : typeof result?.validationStatus === 'string'
    ? result.validationStatus.toUpperCase()
    : 'INCOMPLETE';
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';

  const candidates = extractComplianceCandidates(result, auditTrails);
  const structured = extractStructuredCompliance(result);

  // 1. Check for negative compliance evidence first (takes absolute precedence)
  const negativeItem = candidates.find(c => parseComplianceSummary(c).isNegative);
  const hasNegativeStructured = structured === 'NON_COMPLIANT';
  const hasNegativeEvidence = Boolean(hasNegativeStructured || negativeItem);

  if (hasNegativeEvidence) {
    return {
      status: 'NON-COMPLIANT',
      structuredDetermination: 'NON_COMPLIANT',
      hasExplicitComplianceContract: false,
      hasNegativeComplianceContract: true,
      hasExplicitPositiveEvidence: false,
      isAuthoritativeProduction: false,
      primaryEvidenceText: negativeItem || 'Explicit non-compliance in audit contract'
    };
  }

  // 2. Calculation must be PASS; non-PASS can never be compliant
  if (!isPass) {
    return {
      status: 'Compliance Not Verified',
      structuredDetermination: 'NOT_VERIFIED',
      hasExplicitComplianceContract: false,
      hasNegativeComplianceContract: false,
      hasExplicitPositiveEvidence: false,
      isAuthoritativeProduction: false,
      primaryEvidenceText: null
    };
  }

  // 3. Positive compliance strictly requires:
  // - Calculation status is PASS
  // - Explicit Authoritative Production standing (authorityPolicy === 'AUTHORITATIVE_PRODUCTION')
  // - No contradictory negative evidence
  // - TRUSTWORTHY STRUCTURED COMPLIANCE DETERMINATION: structured === 'COMPLIANT'
  //   (CRITICAL: Never determine positive compliance merely because a free-text field contains 'COMPLIANT'.
  //    Legacy records without the new structured field fail closed to 'NOT_VERIFIED'.)
  const hasExplicitComplianceContract = Boolean(
    isPass &&
    isAuthProd &&
    !hasNegativeEvidence &&
    structured === 'COMPLIANT'
  );

  const positiveItem = candidates.find(c => parseComplianceSummary(c).isPositive);

  if (hasExplicitComplianceContract) {
    return {
      status: 'COMPLIANT',
      structuredDetermination: 'COMPLIANT',
      hasExplicitComplianceContract: true,
      hasNegativeComplianceContract: false,
      hasExplicitPositiveEvidence: true,
      isAuthoritativeProduction: true,
      primaryEvidenceText: positiveItem || 'Verified per authoritative audit contract'
    };
  }

  // 4. Default / Fail-safe:
  // PASS without explicit structured determination remains Compliance Not Verified
  return {
    status: 'Compliance Not Verified',
    structuredDetermination: 'NOT_VERIFIED',
    hasExplicitComplianceContract: false,
    hasNegativeComplianceContract: false,
    hasExplicitPositiveEvidence: Boolean(positiveItem),
    isAuthoritativeProduction: isAuthProd,
    primaryEvidenceText: null
  };
}
