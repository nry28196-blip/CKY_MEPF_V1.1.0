
import { AuditStatus } from '../../types';

/**
 * ValidationStatus represents whether the calculation may proceed.
 * It is distinct from AuditStatus, which classifies the audit-trail item.
 * 
 * - PASS: Calculation may proceed (inputs are valid and VERIFIED).
 * - BLOCKED: Calculation cannot proceed due to unverified required ASHRAE input.
 * - INCOMPLETE: Calculation cannot proceed due to missing required user input.
 * - FAIL: Calculation cannot proceed due to invalid engineering input.
 * - NOT_VERIFIED: (Legacy/Intermediate) Equivalent to BLOCKED in most aggregation.
 * - WARNING: Deprecated/Informational.
 * - NOT_EVALUATED: Initial state.
 */
export type ValidationStatus = 'PASS' | 'WARNING' | 'INCOMPLETE' | 'FAIL' | 'NOT_EVALUATED' | 'NOT_VERIFIED' | 'BLOCKED';

export class VentilationValidationService {
  /**
   * Helper to determine ValidationStatus and AuditStatus based on conditions.
   * Centralizes the mapping to prevent duplication across services.
   */
  static determineStatus(
    isVerifiedAshraeInput: boolean,
    isMissingUserInput: boolean,
    isInvalidEngineeringInput: boolean,
    isDerivedResult: boolean
  ): { validationStatus: ValidationStatus; auditStatus: AuditStatus } {
    if (isInvalidEngineeringInput) {
      return { validationStatus: 'FAIL', auditStatus: AuditStatus.FAIL };
    }
    if (isMissingUserInput) {
      return { validationStatus: 'INCOMPLETE', auditStatus: AuditStatus.BLOCKED };
    }
    if (!isVerifiedAshraeInput) {
      return { validationStatus: 'BLOCKED', auditStatus: isDerivedResult ? AuditStatus.BLOCKED : AuditStatus.INPUT_NOT_VERIFIED };
    }
    if (isDerivedResult) {
      // If we got this far as a derived result, we assume inputs were verified (or we wouldn't be calculating)
      return { validationStatus: 'PASS', auditStatus: AuditStatus.DERIVED };
    }
    
    // Default valid input
    return { validationStatus: 'PASS', auditStatus: AuditStatus.INPUT_VERIFIED };
  }

  static aggregateStatus(statuses: ValidationStatus[]): ValidationStatus {
    if (statuses.length === 0) return 'NOT_EVALUATED';
    
    if (statuses.includes('FAIL')) return 'FAIL';
    if (statuses.includes('BLOCKED')) return 'BLOCKED';
    if (statuses.includes('NOT_VERIFIED')) return 'BLOCKED'; // Map to BLOCKED for safety
    if (statuses.includes('INCOMPLETE')) return 'INCOMPLETE';
    if (statuses.includes('WARNING')) return 'WARNING';
    
    const validStatuses = statuses.filter(s => s !== 'NOT_EVALUATED');
    if (validStatuses.length === 0) return 'NOT_EVALUATED';
    if (statuses.includes('NOT_EVALUATED')) return 'NOT_EVALUATED';
    
    return 'PASS';
  }
}
