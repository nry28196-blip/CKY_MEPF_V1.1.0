import { describe, it, expect } from 'vitest';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621SimplifiedSystemService } from '../../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621AlternativeSystemService } from '../../calculations/ventilation/Ashrae621AlternativeSystemService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { AirBalanceService } from '../../calculations/ventilation/AirBalanceService';
import { SystemPerformanceService } from '../../calculations/ventilation/SystemPerformanceService';
import { Ashrae622Service } from '../../calculations/ventilation/Ashrae622Service';
import { EngineeringAuditService } from '../../calculations/audit/EngineeringAuditContract';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { SourceType, Ashrae621SpaceType } from '../../data/ventilation/ashrae621/types';

describe('FINAL VENTILATION PRODUCTION HARDENING — FALSE PASS REGRESSION SUITE', () => {
  const spaceTypes2022 = StandardDataProvider.get621SpaceTypes('2022');
  const ezValues2022 = StandardDataProvider.get621EzValues('2022');
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');
  const officeSpace = spaceTypes2022.find(s => s.id === 'office_space' || s.id === 'office')!;
  const ceilingCoolingEz = ezValues2022.find(e => e.id === 'ez-1')!;

  // =========================================================================
  // 1. PROVENANCE & USER OVERRIDE CONTRACT (SECTION 6)
  // =========================================================================
  describe('1. Engineering Audit & User Override Invariant Rules', () => {
    it('proves justified user override ≠ VERIFIED standard data and cannot produce authoritative PASS', () => {
      const customEz = {
        ...ceilingCoolingEz,
        id: 'custom-ez-override',
        isManualOverride: true,
        manualOverrideBasis: 'Project CFD Simulation Document #2026-CFD',
        manualJustification: 'CFD verified thermal plume capture under high floor boundary',
        sourceType: SourceType.USER_OVERRIDE,
        ez: 0.65
      };

      const zoneResult = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: customEz
      });

      // Zone service maps manual override to NOT_VERIFIED / BLOCKED
      expect(zoneResult.status).toBe('BLOCKED');
      expect(zoneResult.voz).toBeNull();

      const audit = EngineeringAuditService.fromZoneCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: officeSpace,
          area: 100,
          designOccupancy: 10,
          useDefaultOccupancy: false,
          ezConfig: customEz
        },
        zoneResult
      );

      // Invariant: Justified user override must remain NOT_VERIFIED
      expect(audit.provenance['ez'].engineeringStatus).toBe('USER_OVERRIDE');
      expect(audit.provenance['ez'].verificationStatus).toBe('NOT_VERIFIED');
      expect(audit.provenance['ez'].verificationStatus).not.toBe('VERIFIED');

      // Invariant: Non-PASS must withhold authoritative final numeric value
      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('proves missing input cannot be reported as VERIFIED in the audit record', () => {
      // Zone calculation with missing design occupancy
      const incompleteRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: null as any,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });

      expect(incompleteRes.status).toBe('INCOMPLETE');

      const audit = EngineeringAuditService.fromZoneCalculation(
        {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: officeSpace,
          area: 100,
          designOccupancy: null as any,
          useDefaultOccupancy: false,
          ezConfig: ceilingCoolingEz
        },
        incompleteRes
      );

      // Invariant: Missing population must not be labeled VERIFIED
      expect(audit.provenance['pz'].verificationStatus).not.toBe('VERIFIED');
      expect(audit.provenance['pz'].verificationStatus).toBe('INVALID');
      expect(audit.validationStatus).toBe('INCOMPLETE');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });

    it('proves fabricated VERIFIED provenance on an override is intercepted and demoted to NOT_VERIFIED and BLOCKED', () => {
      // Caller attempts to sneak a fabricated VERIFIED flag on a USER_OVERRIDE
      const audit = EngineeringAuditService.createAuditRecord({
        system: 'Ventilation',
        standard: 'ASHRAE 62.1',
        edition: '2022',
        revisionBasis: 'ANSI/ASHRAE Standard 62.1-2022',
        calculationPath: {
          id: 'test_path',
          name: 'Test Path'
        },
        authorityPolicy: 'AUTHORITATIVE_PRODUCTION',
        inputs: { customVal: 42 },
        provenance: {
          customVal: {
            key: 'customVal',
            name: 'Custom Parameter',
            value: 42,
            unit: 'L/s',
            source: SourceType.USER_OVERRIDE,
            verificationStatus: 'VERIFIED' as any, // Fabricated verification!
            engineeringStatus: 'USER_OVERRIDE',
            isOverride: true,
            overrideJustification: 'Designer asserted verification'
          }
        },
        equations: [],
        intermediateResults: [],
        finalResult: {
          symbol: 'Q',
          name: 'Airflow',
          value: 42.0,
          unit: 'L/s'
        },
        validationStatus: 'PASS' // Caller attempts false pass!
      });

      // Must be stripped of VERIFIED and PASS
      expect(audit.provenance['customVal'].verificationStatus).toBe('NOT_VERIFIED');
      expect(audit.validationStatus).toBe('BLOCKED');
      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
      expect(audit.warnings.some(w => w.includes('cannot be labeled VERIFIED standard data'))).toBe(true);
    });
  });

  // =========================================================================
  // 2. STANDARD BASES & SCOPE BOUNDARY HARDENING
  // =========================================================================
  describe('2. Standard Scope Boundary Rejections', () => {
    it('blocks ASHRAE 62.1-2019 data and requests with BLOCKED and null result', () => {
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2019',
        spaceType: { ...officeSpace, edition: '2019' },
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
    });

    it('blocks ASHRAE 62.1-2025 data and requests with BLOCKED and null result', () => {
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2025',
        spaceType: { ...officeSpace, edition: '2025' },
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
    });

    it('blocks unverified Table 6-4 configurations (such as unidirectional flow)', () => {
      const unidirectEz = {
        id: 'ez-unidirectional-flow',
        name: 'Unidirectional Flow',
        supplyArrangement: 'Ceiling unidirectional',
        returnArrangement: 'Floor',
        ez: 1.2,
        reference: 'Table 6-4 Unverified',
        distributionCategory: 'unidirectional',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'NOT_VERIFIED' as any
      };

      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: unidirectEz as any
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
    });

    it('isolates 62.2 residential from commercial 62.1 engine and blocks 62.2-2025', () => {
      const res2025 = Ashrae622Service.calculateWholeDwelling({
        floorArea: 200,
        bedrooms: 3,
        infiltrationCredit: null,
        infiltrationVerified: false,
        localExhaust: null,
        coefficients: {
          areaCoefficientSI: 0.15,
          occupancyCoefficientSI: 3.5,
          areaCoefficientIP: 0.03,
          occupancyCoefficientIP: 7.5,
          localExhaustDeficitCoefficient: 0.25,
          edition: '2025' as any,
          standard: 'ASHRAE 62.2'
        },
        expectedStandard: 'ASHRAE 62.2',
        expectedEdition: '2025'
      });

      expect(res2025.status).toBe('BLOCKED');
      expect(res2025.qFan).toBeNull();
      expect(res2025.isAuthoritative).toBe(false);
      expect(res2025.isApprovedForEngineeringUse).toBe(false);
    });
  });

  // =========================================================================
  // 3. PHYSICAL CONSTRAINTS & CONTRADICTORY PREREQUISITES
  // =========================================================================
  describe('3. Physical Constraint & Contradictory Prerequisite Failures', () => {
    it('returns INCOMPLETE when warm air heating Ez has missing supply temperature relationship', () => {
      const warmAirEz = ezValues2022.find(e => e.id === 'ez-2')!; // ez-2 is Ceiling supply of warm air >= 8C above space temp
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: warmAirEz,
        ezConditions: {
          supplyTempRelationship: undefined // Missing required temperature differential!
        }
      });

      expect(result.status).toBe('INCOMPLETE');
      expect(result.voz).toBeNull();
    });

    it('returns FAIL when contradictory physical conditions are supplied (warm air ceiling heating with cooling temperature)', () => {
      const warmAirEz = ezValues2022.find(e => e.id === 'ez-2')!; // ez-2 requires heating_gte_8c
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: 10,
        useDefaultOccupancy: false,
        ezConfig: warmAirEz,
        ezConditions: {
          supplyTempRelationship: 'heating_lt_8c' as any // Contradicts ez-2 (>= 8C required)!
        }
      });

      expect(result.status).toBe('FAIL');
      expect(result.voz).toBeNull();
    });

    it('rejects non-finite, negative, and NaN physical inputs in Single-Zone calculations', () => {
      // Negative area
      const negArea = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: -50,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });
      expect(negArea.status).toBe('FAIL');
      expect(negArea.voz).toBeNull();

      // NaN occupancy
      const nanOcc = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: 100,
        designOccupancy: NaN,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });
      expect(nanOcc.status).toBe('FAIL');
      expect(nanOcc.voz).toBeNull();

      // Infinity area
      const infArea = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: officeSpace,
        area: Infinity,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ceilingCoolingEz
      });
      expect(infArea.status).toBe('FAIL');
      expect(infArea.voz).toBeNull();
    });
  });

  // =========================================================================
  // 4. MULTI-ZONE VAV Vps SAFETY
  // =========================================================================
  describe('4. Multi-Zone VAV Primary Airflow Safety', () => {
    it('blocks VAV Alternative Multi-Zone calculation if Vps is missing', () => {
      const result = Ashrae621AlternativeSystemService.calculate({
        zones: [
          { id: 'Z1', pz: 5, rp: 2.5, ra: 0.3, az: 50, voz: 27.5, vpz: 150, dMode: 'VAV', ep: 1.0, er: 0, ez: 1.0, vpzMinDesign: 60, vpzMinRequired: 45 }
        ],
        ps: 5,
        airDistributionType: 'VAV',
        vps: null, // Missing Vps for VAV
        edition: '2022',
        systemType: 'single_supply'
      });

      expect(result.status).toBe('INCOMPLETE');
      expect(result.vot).toBeNull();
    });

    it('returns INCOMPLETE in Simplified Multi-Zone when VAV zone is missing vpzMinDesign', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        zones: [
          { id: 'Z1', pz: 5, rp: 2.5, ra: 0.3, az: 50, voz: 27.5, vpz: 150, dMode: 'VAV', vpzMinDesign: null as any }
        ],
        ps: 5,
        airDistributionType: 'VAV'
      });

      expect(result.status).toBe('INCOMPLETE');
      expect(result.vot).toBeNull();
    });

    it('fails VAV Simplified Multi-Zone calculation if Vps is less than Vou', () => {
      const result = Ashrae621SimplifiedSystemService.calculate({
        zones: [
          { id: 'Z1', pz: 10, rp: 2.5, ra: 0.3, az: 100, voz: 55, vpz: 200, dMode: 'VAV', vpzMinDesign: 120 }
        ],
        ps: 10,
        airDistributionType: 'VAV',
        vps: 20 // Vps = 20 is less than Vou (~55 L/s)
      });

      expect(result.status).toBe('FAIL');
      expect(result.vot).toBeNull();
    });
  });

  // =========================================================================
  // 5. AIR BALANCE SERVICE HARDENING (SECTION 4)
  // =========================================================================
  describe('5. AirBalanceService Diagnostic Hardening', () => {
    it('rejects negative airflow rates with FAIL and null outputs', () => {
      const roomRes = AirBalanceService.calculateRoomBalance({
        qSupply: -500, // Negative flow
        qExhaust: 300,
        qReturn: 200,
        qTransferIn: 0
      });

      expect(roomRes.status).toBe('FAIL');
      expect(roomRes.qNet).toBeNull();
      expect(roomRes.transferOut).toBeNull();
      expect(roomRes.pressureRelationship).toBe('Indeterminate');
      expect(roomRes.isAuthoritative).toBe(false);
      expect(roomRes.isApprovedForEngineeringUse).toBe(false);
      expect(roomRes.reasons.some(r => r.includes('cannot be negative'))).toBe(true);
    });

    it('rejects missing or non-finite flow rates with INCOMPLETE or FAIL', () => {
      const roomMissing = AirBalanceService.calculateRoomBalance({
        qSupply: null as any,
        qExhaust: 300,
        qReturn: 200,
        qTransferIn: 0
      });
      expect(roomMissing.status).toBe('INCOMPLETE');
      expect(roomMissing.qNet).toBeNull();

      const roomNaN = AirBalanceService.calculateRoomBalance({
        qSupply: NaN,
        qExhaust: 300,
        qReturn: 200,
        qTransferIn: 0
      });
      expect(roomNaN.status).toBe('FAIL');
      expect(roomNaN.qNet).toBeNull();
    });

    it('rejects physically contradictory system balance (outdoor air exceeds supply air)', () => {
      const sysRes = AirBalanceService.calculateSystemBalance({
        qSupply: 1000,
        qOutdoorAir: 1500, // Q_oa > Q_supply!
        qReturn: 800,
        qExhaust: 200,
        buildingVolume: 1000,
        isMetric: true
      });

      expect(sysRes.status).toBe('FAIL');
      expect(sysRes.isValid).toBe(false);
      expect(sysRes.qNetBuilding).toBeNull();
      expect(sysRes.buildingPressure).toBe('Indeterminate');
      expect(sysRes.isAuthoritative).toBe(false);
      expect(sysRes.reasons.some(r => r.includes('Outdoor air (Q_oa) exceeds total supply air'))).toBe(true);
    });

    it('proves valid air balance outputs are strictly non-authoritative diagnostic estimates', () => {
      const sysRes = AirBalanceService.calculateSystemBalance({
        qSupply: 10000,
        qOutdoorAir: 2500,
        qReturn: 8500,
        qExhaust: 2000,
        buildingVolume: 1000,
        isMetric: true
      });

      expect(sysRes.status).toBe('PASS');
      expect(sysRes.isAuthoritative).toBe(false); // Never authoritative compliance
      expect(sysRes.isApprovedForEngineeringUse).toBe(false);
      expect(sysRes.complianceNotice).toContain('Not an ANSI/ASHRAE Standard 62.1 compliance determination');
    });
  });

  // =========================================================================
  // 6. SYSTEM PERFORMANCE SERVICE HARDENING (SECTION 5)
  // =========================================================================
  describe('6. SystemPerformanceService Aerodynamic Hardening', () => {
    it('rejects non-positive density ratio with FAIL and does NOT fall back to uncorrected flow', () => {
      const resZeroDensity = SystemPerformanceService.calculateFanPerformance({
        qOutdoorAir: 500,
        qReturnAir: 1500,
        densityRatio: 0, // Invalid density ratio!
        criticalDuctLength: 30,
        ductFrictionRate: 1.0,
        fittingLosses: 100,
        equipmentPressureDrop: 200,
        fanEfficiency: 0.65,
        motorEfficiency: 0.85,
        isMetric: true
      });

      expect(resZeroDensity.status).toBe('FAIL');
      expect(resZeroDensity.qSupplyActual).toBeNull();
      expect(resZeroDensity.totalStaticPressure).toBeNull();
      expect(resZeroDensity.fanBrakeHorsepower).toBeNull();
      expect(resZeroDensity.isAuthoritative).toBe(false);
      expect(resZeroDensity.reasons.some(r => r.includes('density ratio'))).toBe(true);
    });

    it('rejects invalid efficiencies (<= 0 or > 100%) with FAIL', () => {
      const resBadEff = SystemPerformanceService.calculateFanPerformance({
        qOutdoorAir: 500,
        qReturnAir: 1500,
        densityRatio: 1.0,
        criticalDuctLength: 30,
        ductFrictionRate: 1.0,
        fittingLosses: 100,
        equipmentPressureDrop: 200,
        fanEfficiency: 150, // 150% is physically impossible!
        motorEfficiency: 0.85,
        isMetric: true
      });

      expect(resBadEff.status).toBe('FAIL');
      expect(resBadEff.fanBrakeHorsepower).toBeNull();
      expect(resBadEff.motorElectricalPower).toBeNull();
      expect(resBadEff.reasons.some(r => r.includes('Fan efficiency'))).toBe(true);
    });

    it('rejects negative duct length or negative friction rate with FAIL', () => {
      const resNegLen = SystemPerformanceService.calculateFanPerformance({
        qOutdoorAir: 500,
        qReturnAir: 1500,
        densityRatio: 1.0,
        criticalDuctLength: -30,
        ductFrictionRate: 1.0,
        fittingLosses: 100,
        equipmentPressureDrop: 200,
        fanEfficiency: 0.65,
        motorEfficiency: 0.85,
        isMetric: true
      });

      expect(resNegLen.status).toBe('FAIL');
      expect(resNegLen.totalStaticPressure).toBeNull();
      expect(resNegLen.reasons.some(r => r.includes('Critical duct length'))).toBe(true);
    });

    it('computes correct metric fan power and verifies non-authoritative status', () => {
      // 1000 L/s (= 1.0 m^3/s), density ratio 1.0, SP = 30*1.0 + 120 + 250 = 400 Pa
      // Mechanical Power = (1000 L/s * 400 Pa) / (1,000,000 * 0.50) = 0.80 kW
      // Motor Power = 0.80 kW / 0.80 = 1.00 kW
      const res = SystemPerformanceService.calculateFanPerformance({
        qOutdoorAir: 300,
        qReturnAir: 700,
        densityRatio: 1.0,
        criticalDuctLength: 30,
        ductFrictionRate: 1.0,
        fittingLosses: 120,
        equipmentPressureDrop: 250,
        fanEfficiency: 0.50,
        motorEfficiency: 0.80,
        isMetric: true
      });

      expect(res.status).toBe('PASS');
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.totalStaticPressure).toBe(400);
      expect(res.fanBrakeHorsepower).toBeCloseTo(0.80, 2);
      expect(res.motorElectricalPower).toBeCloseTo(1.00, 2);
    });
  });
});
