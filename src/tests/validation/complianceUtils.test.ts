import { describe, it, expect } from 'vitest';
import {
  normalizeComplianceText,
  isExplicitNegativeCompliance,
  isExplicitPositiveCompliance,
  isDiagnosticCompliance,
  parseComplianceString,
  parseComplianceSummary
} from '../../lib/complianceUtils';

describe('Compliance Utilities & String Normalization Suite', () => {
  describe('normalizeComplianceText', () => {
    it('handles null, undefined, and non-strings safely', () => {
      expect(normalizeComplianceText(null)).toBe('');
      expect(normalizeComplianceText(undefined)).toBe('');
      expect(normalizeComplianceText('' as any)).toBe('');
      expect(normalizeComplianceText(123 as any)).toBe('');
    });

    it('trims whitespace and converts to uppercase', () => {
      expect(normalizeComplianceText('  compliant  ')).toBe('COMPLIANT');
      expect(normalizeComplianceText('non-compliant\n')).toBe('NON-COMPLIANT');
    });
  });

  describe('isExplicitNegativeCompliance', () => {
    it('detects standard negative compliance variations', () => {
      expect(isExplicitNegativeCompliance('NON-COMPLIANT')).toBe(true);
      expect(isExplicitNegativeCompliance('non compliant')).toBe(true);
      expect(isExplicitNegativeCompliance('NOT-COMPLIANT')).toBe(true);
      expect(isExplicitNegativeCompliance('not compliant')).toBe(true);
      expect(isExplicitNegativeCompliance('NOT IN COMPLIANCE')).toBe(true);
      expect(isExplicitNegativeCompliance('OUT OF COMPLIANCE')).toBe(true);
      expect(isExplicitNegativeCompliance('noncompliant')).toBe(true);
    });

    it('detects failure indicators paired with compliance terms', () => {
      expect(isExplicitNegativeCompliance('FAIL: COMPLIANCE CHECK')).toBe(true);
      expect(isExplicitNegativeCompliance('FAILED COMPLIANT VERIFICATION')).toBe(true);
      expect(isExplicitNegativeCompliance('FAILURE TO ACHIEVE COMPLIANCE')).toBe(true);
    });

    it('returns false for positive or neutral compliance statements', () => {
      expect(isExplicitNegativeCompliance('COMPLIANT')).toBe(false);
      expect(isExplicitNegativeCompliance('IN COMPLIANCE')).toBe(false);
      expect(isExplicitNegativeCompliance('Table 6-1 VRP calculation PASS')).toBe(false);
      expect(isExplicitNegativeCompliance(null)).toBe(false);
      expect(isExplicitNegativeCompliance(undefined)).toBe(false);
    });
  });

  describe('isDiagnosticCompliance', () => {
    it('detects diagnostic or preliminary markers', () => {
      expect(isDiagnosticCompliance('DIAGNOSTIC RUN')).toBe(true);
      expect(isDiagnosticCompliance('NON-AUTHORITATIVE MODE')).toBe(true);
      expect(isDiagnosticCompliance('NON AUTHORITATIVE')).toBe(true);
      expect(isDiagnosticCompliance('PRELIMINARY ESTIMATE')).toBe(true);
      expect(isDiagnosticCompliance('UNVERIFIED RUN')).toBe(true);
      expect(isDiagnosticCompliance('NOT APPROVED FOR PRODUCTION')).toBe(true);
    });

    it('returns false for authoritative production text', () => {
      expect(isDiagnosticCompliance('AUTHORITATIVE_PRODUCTION')).toBe(false);
      expect(isDiagnosticCompliance('COMPLIANT')).toBe(false);
      expect(isDiagnosticCompliance(null)).toBe(false);
    });
  });

  describe('isExplicitPositiveCompliance', () => {
    it('recognizes explicit positive compliance statements', () => {
      expect(isExplicitPositiveCompliance('COMPLIANT')).toBe(true);
      expect(isExplicitPositiveCompliance('FULL COMPLIANCE')).toBe(true);
      expect(isExplicitPositiveCompliance('IN COMPLIANCE')).toBe(true);
      expect(isExplicitPositiveCompliance('Verified: COMPLIANT per Table 6-1')).toBe(true);
    });

    it('strictly rejects negative phrasing even if COMPLIANT word is present', () => {
      expect(isExplicitPositiveCompliance('NON-COMPLIANT')).toBe(false);
      expect(isExplicitPositiveCompliance('NON COMPLIANT')).toBe(false);
      expect(isExplicitPositiveCompliance('NOT-COMPLIANT')).toBe(false);
      expect(isExplicitPositiveCompliance('NOT COMPLIANT')).toBe(false);
      expect(isExplicitPositiveCompliance('NOT IN COMPLIANCE')).toBe(false);
      expect(isExplicitPositiveCompliance('FAIL: COMPLIANT CHECK FAILED')).toBe(false);
    });

    it('strictly rejects diagnostic or preliminary wording even if COMPLIANT is present', () => {
      expect(isExplicitPositiveCompliance('DIAGNOSTIC: COMPLIANT')).toBe(false);
      expect(isExplicitPositiveCompliance('PRELIMINARY COMPLIANT ESTIMATE')).toBe(false);
      expect(isExplicitPositiveCompliance('UNVERIFIED COMPLIANCE')).toBe(false);
      expect(isExplicitPositiveCompliance('NON-AUTHORITATIVE COMPLIANT')).toBe(false);
    });

    it('returns false for generic calculation pass text lacking compliance assertions', () => {
      expect(isExplicitPositiveCompliance('PASS')).toBe(false);
      expect(isExplicitPositiveCompliance('CALCULATION COMPLETE')).toBe(false);
      expect(isExplicitPositiveCompliance(null)).toBe(false);
      expect(isExplicitPositiveCompliance(undefined)).toBe(false);
      expect(isExplicitPositiveCompliance('')).toBe(false);
    });
  });

  describe('parseComplianceString & parseComplianceSummary', () => {
    it('parses positive compliance string accurately', () => {
      const res = parseComplianceSummary('Table 6-1 COMPLIANT');
      expect(res.isPositive).toBe(true);
      expect(res.isNegative).toBe(false);
      expect(res.isDiagnostic).toBe(false);
      expect(res.normalizedText).toBe('TABLE 6-1 COMPLIANT');
    });

    it('parses negative compliance string accurately', () => {
      const res = parseComplianceSummary('SYSTEM IS NON-COMPLIANT');
      expect(res.isPositive).toBe(false);
      expect(res.isNegative).toBe(true);
      expect(res.isDiagnostic).toBe(false);
      expect(res.normalizedText).toBe('SYSTEM IS NON-COMPLIANT');
    });

    it('parses diagnostic compliance string accurately', () => {
      const res = parseComplianceSummary('DIAGNOSTIC RUN ONLY');
      expect(res.isPositive).toBe(false);
      expect(res.isNegative).toBe(false);
      expect(res.isDiagnostic).toBe(true);
      expect(res.normalizedText).toBe('DIAGNOSTIC RUN ONLY');
    });

    it('parseComplianceString and parseComplianceSummary give identical results', () => {
      const input = 'NON-COMPLIANT: CFM TOO LOW';
      expect(parseComplianceSummary(input)).toEqual(parseComplianceString(input));
    });

    it('handles empty or undefined inputs safely', () => {
      const res = parseComplianceSummary(undefined);
      expect(res.isPositive).toBe(false);
      expect(res.isNegative).toBe(false);
      expect(res.isDiagnostic).toBe(false);
      expect(res.normalizedText).toBe('');
    });
  });
});
