import { describe, it, expect } from 'vitest';
import { Ashrae621SimplifiedSystemService } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621AlternativeSystemService } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { DensityCorrectionService } from '../../lib/DensityCorrectionService';

describe('ASHRAE 62.1-2022 SOFTWARE VALIDATION TEST', () => {

  describe('Simplified System Population Boundary Tests', () => {
    it('A. Ps > ΣPz -> Expected: FAIL', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: 15,
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' },
          { id: '2', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('FAIL');
      expect(result.d).toBe(0); // Safely overridden to 0
    });

    it('B. Ps = ΣPz -> Expected: D = 1.0', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: 10,
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' },
          { id: '2', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('PASS');
      expect(result.d).toBe(1.0);
    });

    it('C. Ps = 0 -> Expected: D = 0', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: 0,
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' },
          { id: '2', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('PASS');
      expect(result.d).toBe(0);
    });

    it('D. Ps < 0 -> Expected: FAIL', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: -5,
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('FAIL');
    });

    it('E. ΣPz < 0 -> Expected: FAIL', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: 5,
        zones: [
          { id: '1', pz: -10, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('FAIL');
    });

    it('F. ΣPz = 0 with no valid population -> Expected: INCOMPLETE', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        ps: 0,
        zones: [
          { id: '1', pz: 0, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: null, vpzMinDesign: null, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('INCOMPLETE');
    });
  });

  describe('Alternative System Ep/Er and Ev Tests', () => {
    it('G. Secondary-recirculation with missing Ep -> Expected: INCOMPLETE', () => {
      const result = Ashrae621AlternativeSystemService.calculate({
        ps: 5,
        systemType: 'secondary_recirculation',
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: 100, vpzMinRequired: 50, vpzMinDesign: null, ep: null, er: 0.5, ez: 1.0, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('INCOMPLETE');
      expect(result.ev).toBeNull();
    });

    it('H. Secondary-recirculation with missing Er -> Expected: INCOMPLETE', () => {
      const result = Ashrae621AlternativeSystemService.calculate({
        ps: 5,
        systemType: 'secondary_recirculation',
        zones: [
          { id: '1', pz: 5, rp: 2.5, ra: 0.3, az: 100, voz: 50, vpz: 100, vpzMinRequired: 50, vpzMinDesign: null, ep: 1.0, er: null, ez: 1.0, dMode: 'CV' }
        ]
      });
      expect(result.status).toBe('INCOMPLETE');
      expect(result.ev).toBeNull();
    });

    it('I & J. Alternative solver fails to converge or returns Ev <= 0 -> Expected: ev = null, status = FAIL', () => {
      // Intentionally configure a starved VAV system to drive Ev negative and fail
      const result = Ashrae621AlternativeSystemService.calculate({
        ps: 10,
        systemType: 'single_supply',
        zones: [
          { id: '1', pz: 10, rp: 2.5, ra: 0.3, az: 100, voz: 1000, vpz: 10, vpzMinRequired: 5, vpzMinDesign: 5, ep: 1.0, er: 0.0, ez: 1.0, dMode: 'VAV' }
        ]
      });
      expect(result.status).toBe('FAIL');
      expect(result.ev).toBeNull();
    });
  });

  describe('Density Correction Safety Tests', () => {
    it('K. Density temperature producing T(K) <= 0 -> Expected: FAIL', () => {
      const result = DensityCorrectionService.calculate({
        elevation: 0,
        temperature: -280
      });
      expect(result.status).toBe('FAIL');
    });

    it('L. Density input NaN -> Expected: FAIL', () => {
      const result = DensityCorrectionService.calculate({
        elevation: NaN,
        temperature: 20
      });
      expect(result.status).toBe('FAIL');
    });

    it('M. Density input Infinity -> Expected: FAIL', () => {
      const result = DensityCorrectionService.calculate({
        elevation: Infinity,
        temperature: 20
      });
      expect(result.status).toBe('FAIL');
    });
  });

});
