import { describe, it, expect, vi } from 'vitest';
import { DataProvenanceValidationService } from '../../calculations/ventilation/DataProvenanceValidationService';
import { Ashrae621AlternativeSystemService, AlternativeZoneInput } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { Ashrae621SimplifiedSystemService } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { SourceType } from '../../data/ventilation/ashrae621/types';

describe('ASHRAE 62.1-2022 Alternative Procedure Vdz/Zd INDEPENDENT MATHEMATICAL TESTS', () => {
  const createBaseZone = (id: string, overrides: Partial<AlternativeZoneInput> = {}): AlternativeZoneInput => ({
    id,
    pz: 10,
    rp: 2.5,
    ra: 0.3,
    az: 100,
    voz: 60,
    vpz: 100,
    vpzMinRequired: 60,
    vpzMinDesign: 80,
    ep: null,
    er: null,
    ez: 1.0,
    dMode: 'VAV',
    ...overrides
  });

  it('TEST 1 — Single Supply: Confirm existing behavior remains unchanged', () => {
    const input = {
      zones: [createBaseZone('Z1', { voz: 40, vpzMinDesign: 80 })],
      ps: 10, edition: '2022' as const,
      systemType: 'single_supply' as const,
      vps: 100
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('PASS');
    const z = result.zoneResults[0];
    expect(z.ep).toBe(1.0); // Single supply has Ep = 1.0
    expect(z.vdzMin).toBe(z.vpzMin); // Vdz = Vpz
    expect(z.zd).toBeCloseTo(40 / 80); // Voz / VdzMin
  });

  it('TEST 2 — Secondary Recirculation Valid: Derive Ep and verify Zd', () => {
    const input = {
      zones: [createBaseZone('Z1', { voz: 40, vpzMinDesign: 40, vdzMinDesign: 80, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const,
      vps: 100
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('PASS');
    const z = result.zoneResults[0];
    expect(z.ep).toBe(0.5); // 40 / 80
    expect(z.vdzMin).toBeCloseTo(80);
    expect(z.zd).toBeCloseTo(40 / 80);
  });

  it('TEST 3 — Missing VdzMin', () => {
    const input = {
      zones: [createBaseZone('Z1', { vdzMinDesign: null, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('INCOMPLETE');
  });

  it('TEST 4 — Missing VpzMin', () => {
    const input = {
      zones: [createBaseZone('Z1', { vpzMinDesign: null, vdzMinDesign: 80, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('INCOMPLETE');
  });

  it('TEST 5 — Invalid VdzMin', () => {
    const input = {
      zones: [createBaseZone('Z1', { vpzMinDesign: 40, vdzMinDesign: -10, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('FAIL');
  });

  it('TEST 6 — Invalid VpzMin', () => {
    const input = {
      zones: [createBaseZone('Z1', { vpzMinDesign: -10, vdzMinDesign: 80, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('FAIL');
  });

  it('TEST 7 — Derived Ep', () => {
    const input = {
      zones: [createBaseZone('Z1', { voz: 40, vpzMinDesign: 50, vdzMinDesign: 100, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const,
      vps: 100
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('PASS');
    expect(result.zoneResults[0].ep).toBe(0.5); // 50 / 100
  });

  it('TEST 8 — Condition consistency: Show how invalid Ep > 1 fails', () => {
    // If user inputs a peak Vpz (100) but minimum Vdz (80), Ep = 100/80 = 1.25 > 1.0
    const input = {
      zones: [createBaseZone('Z1', { vpzMinDesign: 100, vdzMinDesign: 80, er: 0.5 })],
      ps: 10, edition: '2022' as const,
      systemType: 'secondary_recirculation' as const
    };
    const result = Ashrae621AlternativeSystemService.calculate(input);
    expect(result.status).toBe('FAIL'); // Because Ep > 1.0 is physically invalid
  });

  it('TEST 9 — Existing Alternative Procedure regression (single zone test)', () => {
    vi.spyOn(DataProvenanceValidationService, 'validateSpaceTypeData').mockReturnValue({ valid: true, status: 'PASS', reasons: [] });
    vi.spyOn(DataProvenanceValidationService, 'validateEzData').mockReturnValue({ valid: true, status: 'PASS', reasons: [] });
    const res = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: { id: 'office', name: 'Office', standard: 'ASHRAE 62.1', edition: '2022', category: 'Office', rpMetric: 2.5, raMetric: 0.3, defaultOccupancyMetric: 5, units: 'L/s', exhaustRequired: false, reference: 'Test', notes: '', sourceType: SourceType.ASHRAE_PUBLISHED, verificationStatus: 'VERIFIED', verificationDate: '2026', revisionState: { source: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: '2022', baseEdition: '2022', publishedAddendaApplied: [], publishedErrataApplied: [], verificationDate: '2026' } } as any,
      area: 100,
      designOccupancy: 10,
      useDefaultOccupancy: false,
      ezConfig: { id: 'ez1', name: 'Ceiling', ez: 1.0, reference: 'Test', standard: 'ASHRAE 62.1', edition: '2022', configuration: '', applicableCondition: '', supplyArrangement: '', returnArrangement: '', sourceType: SourceType.ASHRAE_PUBLISHED, verificationStatus: 'VERIFIED', revisionState: { source: SourceType.ASHRAE_PUBLISHED, standard: 'ASHRAE 62.1', edition: '2022', baseEdition: '2022', publishedAddendaApplied: [], publishedErrataApplied: [], verificationDate: '2026' } } as any
    });
    // This single zone should evaluate based on single zone properties
    expect(res.status).toBe('PASS');
    expect(res.voz).toBeCloseTo((2.5 * 10 + 0.3 * 100) / 1.0); // Voz = (Rp*Pz + Ra*Az) / Ez = (25 + 30)/1.0 = 55
  });

  it('TEST 10 — Existing Simplified Procedure regression', () => {
    const res = Ashrae621SimplifiedSystemService.calculate({
      zones: [
        { id: 'Z1', rp: 2.5, ra: 0.3, az: 100, pz: 10, voz: 55, vpz: 100, vpzMinDesign: 80, dMode: 'CV' }
      ],
      ps: 10
    });
    expect(res.status).toBe('PASS');
    expect(res.vou).toBeDefined();
  });

  describe('ISSUE A: ASHRAE 62.1-2022 Appendix A Regression Suite (Xs = Vou / Vps)', () => {
    it('1. Single-supply Alternative Procedure verifies Xs = Vou / Vps and Evz', () => {
      // 2 zones, single supply, CV
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 6, rp: 2.5, az: 50, ra: 0.3, voz: 30, vpz: 100, vpzMinDesign: 100, dMode: 'CV' }),
          createBaseZone('Z2', { pz: 4, rp: 2.5, az: 33.333333, ra: 0.3, voz: 20, vpz: 100, vpzMinDesign: 100, dMode: 'CV' })
        ],
        ps: 10,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        airDistributionType: 'CV' as const,
        vps: 200
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      // Vou = (6*2.5 + 50*0.3) + (4*2.5 + 33.333333*0.3) = 30 + 20 = 50
      expect(res.vou).toBeCloseTo(50, 2);
      // Vps = 200
      expect(res.vps).toBe(200);
      // Authoritative Appendix A Eq A-1: Xs = Vou / Vps = 50 / 200 = 0.25
      expect(res.xs).toBeCloseTo(0.25, 4);

      // Single supply: Fa = 1, Fb = 1, Fc = Ez = 1.0
      // Zd1 = 30 / 100 = 0.30 -> Evz1 = 1 + 0.25 - 0.30 = 0.95
      // Zd2 = 20 / 100 = 0.20 -> Evz2 = 1 + 0.25 - 0.20 = 1.05
      const z1 = res.zoneResults.find(z => z.id === 'Z1')!;
      const z2 = res.zoneResults.find(z => z.id === 'Z2')!;
      expect(z1.evz).toBeCloseTo(0.95, 4);
      expect(z2.evz).toBeCloseTo(1.05, 4);
      // Ev = min(Evz) = 0.95
      expect(res.ev).toBeCloseTo(0.95, 4);
      // Vot = Vou / Ev = 50 / 0.95 = 52.6316
      expect(res.vot).toBeCloseTo(50 / 0.95, 4);
    });

    it('2. Secondary-recirculation Alternative Procedure verifies Xs = Vou / Vps', () => {
      // Secondary recirculation: Ep = Vpz / Vdz = 40 / 80 = 0.5, Er = 0.5
      // Fa = Ep + (1 - Ep)*Er = 0.5 + 0.5*0.5 = 0.75
      // Fb = Ep = 0.5
      // Fc = 1 - (1 - Ez)*(1 - Er)*(1 - Ep) = 1 - 0 = 1.0 (with Ez = 1)
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 10, rp: 1.0, az: 100, ra: 0.3, voz: 40, vpz: 40, vpzMinDesign: 40, vdzMinDesign: 80, ep: 0.5, er: 0.5, ez: 1.0, dMode: 'CV' })
        ],
        ps: 10,
        edition: '2022' as const,
        systemType: 'secondary_recirculation' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      // Vou = 10*1.0 + 100*0.3 = 40
      expect(res.vou).toBeCloseTo(40, 2);
      expect(res.vps).toBe(100);
      // Xs = Vou / Vps = 40 / 100 = 0.4
      expect(res.xs).toBeCloseTo(0.4, 4);

      // Zd = Voz / Vdz = 40 / 80 = 0.5
      // Evz = (Fa + Xs*Fb - Zd*Fc) / Fa = (0.75 + 0.4*0.5 - 0.5*1.0) / 0.75 = (0.75 + 0.20 - 0.50) / 0.75 = 0.45 / 0.75 = 0.60
      const z1 = res.zoneResults[0];
      expect(z1.evz).toBeCloseTo(0.60, 4);
      expect(res.ev).toBeCloseTo(0.60, 4);
      // Vot = Vou / Ev = 40 / 0.60 = 66.6667
      expect(res.vot).toBeCloseTo(40 / 0.60, 4);
    });

    it('3. VAV multi-zone Alternative Procedure calculation', () => {
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 5, rp: 2.0, az: 50, ra: 0.3, voz: 25, vpz: 120, vpzMinDesign: 50, dMode: 'VAV' }),
          createBaseZone('Z2', { pz: 5, rp: 3.0, az: 50, ra: 0.4, voz: 35, vpz: 150, vpzMinDesign: 70, dMode: 'VAV' })
        ],
        ps: 10,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        airDistributionType: 'VAV' as const,
        vps: 270
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      expect(res.airDistributionType).toBe('VAV');
      // Vou = 25 + 35 = 60
      expect(res.vou).toBeCloseTo(60, 2);
      // Xs = 60 / 270
      expect(res.xs).toBeCloseTo(60 / 270, 4);
      expect(res.ev).toBeGreaterThan(0);
      expect(res.vot).toBeCloseTo(60 / res.ev!, 4);
    });

    it('4. CV multi-zone Alternative Procedure calculation', () => {
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 4, rp: 2.0, az: 40, ra: 0.3, voz: 20, vpz: 100, vpzMinDesign: 100, dMode: 'CV' }),
          createBaseZone('Z2', { pz: 6, rp: 2.0, az: 60, ra: 0.3, voz: 30, vpz: 150, vpzMinDesign: 150, dMode: 'CV' })
        ],
        ps: 10,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        airDistributionType: 'CV' as const,
        vps: 250
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      expect(res.airDistributionType).toBe('CV');
      expect(res.vou).toBeCloseTo(50, 2);
      expect(res.xs).toBeCloseTo(50 / 250, 4);
      expect(res.ev).toBeGreaterThan(0);
      expect(res.vot).toBeCloseTo(50 / res.ev!, 4);
    });

    it('5. Case where Ev != 1.0 proves Xs remains Vou/Vps and NOT Vou/Ev/Vps', () => {
      // Zone with Zd = 0.5, Vps = 100, Vou = 20
      // Xs = Vou / Vps = 20 / 100 = 0.20
      // If Xs is used: Evz = 1 + 0.20 - 0.50 = 0.70 -> Ev = 0.70
      // If erroneous xsSupply was used: xsSupply = (20/0.70)/100 = 0.2857 -> Evz would be 1 + 0.2857 - 0.50 = 0.7857 != 0.70!
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 4, rp: 2.0, az: 40, ra: 0.3, voz: 20, vpz: 100, vpzMinDesign: 40, dMode: 'VAV' }) // Zd = 20 / 40 = 0.50
        ],
        ps: 4,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      expect(res.vou).toBeCloseTo(20, 2);
      expect(res.xs).toBeCloseTo(0.20, 5); // Must strictly be Vou / Vps
      expect(res.ev).toBeCloseTo(0.70, 4); // 1 + 0.20 - 0.50 = 0.70
      // Verify xsSupply is distinct from Xs when Ev != 1.0
      expect(res.xsSupply).toBeCloseTo((20 / 0.70) / 100, 4);
      expect(res.xs).not.toBeCloseTo(res.xsSupply!, 3);

      // Audit trail must have Eq A-1 for Xs
      const xsAudit = res.auditTrail.find(a => a.symbol === 'Xs');
      expect(xsAudit).toBeDefined();
      expect(xsAudit?.formula).toBe('Vou / Vps');
      expect(xsAudit?.reference).toContain('Appendix A Equation A-1');
    });

    it('6. Final Vot = Vou / Ev strictly enforced per Appendix A Eq A-5', () => {
      const input = {
        zones: [
          createBaseZone('Z1', { pz: 7, rp: 2.0, az: 70, ra: 0.3, voz: 35, vpz: 100, vpzMinDesign: 50, dMode: 'VAV' }) // Zd = 35 / 50 = 0.70
        ],
        ps: 7,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      // Vou = 35, Vps = 100 -> Xs = 0.35
      // Evz = 1 + 0.35 - 0.70 = 0.65 -> Ev = 0.65
      expect(res.vou).toBeCloseTo(35, 2);
      expect(res.xs).toBeCloseTo(0.35, 4);
      expect(res.ev).toBeCloseTo(0.65, 4);
      expect(res.vot).toBeCloseTo(35 / 0.65, 4);

      const votAudit = res.auditTrail.find(a => a.symbol === 'Vot');
      expect(votAudit).toBeDefined();
      expect(votAudit?.formula).toBe('Vou / Ev');
      expect(votAudit?.reference).toContain('Appendix A Equation A-5');
    });
  });

  describe('ISSUE B: Direct Alternative Service Edition & Scope Isolation', () => {
    it('1. Direct call with edition 2022 is allowed and succeeds', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2022' as const,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      expect(res.ev).toBeDefined();
      expect(res.vou).toBeDefined();
    });

    it('2. Direct call with omitted edition defaults to controlled production baseline (2022)', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        // edition omitted
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('PASS');
      expect(res.ev).toBeDefined();
      expect(res.vou).toBeDefined();
    });

    it('3. Direct call with edition 2019 is BLOCKED', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2019' as const,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.vou).toBeNull();
      expect(res.message).toContain('ASHRAE 62.1-2019 is archived');
    });

    it('4. Direct call with edition 2025 is BLOCKED', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2025' as const,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.vou).toBeNull();
      expect(res.message).toContain('ASHRAE 62.1-2025 is deferred');
    });

    it('5. Direct call with invalid edition is BLOCKED', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2016' as any,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.message).toContain('Unknown or unapproved standard edition');
    });

    it('6. Direct call with ASHRAE 62.2 scope is BLOCKED', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        standard: 'ASHRAE 62.2' as any,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input as any);
      expect(res.status).toBe('BLOCKED');
      expect(res.message).toContain('ASHRAE 62.2 is outside the scope');
    });

    it('7. Fabricated VERIFIED metadata with 2025 NEVER bypasses edition restriction', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2025' as const,
        systemType: 'single_supply' as const,
        vps: 100,
        // Fabricated VERIFIED metadata injected
        verificationStatus: 'VERIFIED',
        isVerified: true,
        metadata: {
          verificationStatus: 'VERIFIED',
          sourceType: 'ASHRAE_PUBLISHED'
        }
      };
      const res = Ashrae621AlternativeSystemService.calculate(input as any);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.vou).toBeNull();
      expect(res.message).toContain('ASHRAE 62.1-2025 is deferred');
    });

    it('8. Fabricated VERIFIED metadata with 2019 NEVER bypasses edition restriction', () => {
      const input = {
        zones: [createBaseZone('Z1', { voz: 30, vpzMinDesign: 60 })],
        ps: 5,
        edition: '2019' as const,
        systemType: 'single_supply' as const,
        vps: 100,
        verificationStatus: 'VERIFIED',
        isVerified: true
      };
      const res = Ashrae621AlternativeSystemService.calculate(input as any);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.message).toContain('ASHRAE 62.1-2019 is archived');
    });

    it('9. Direct call where a zone requests edition 2025 is BLOCKED even if system edition is omitted', () => {
      const input = {
        zones: [
          createBaseZone('Z1', { voz: 30, vpzMinDesign: 60, expectedEdition: '2025' } as any)
        ],
        ps: 5,
        systemType: 'single_supply' as const,
        vps: 100
      };
      const res = Ashrae621AlternativeSystemService.calculate(input);
      expect(res.status).toBe('BLOCKED');
      expect(res.ev).toBeNull();
      expect(res.message).toContain('ASHRAE 62.1-2025 is deferred');
    });
  });
});