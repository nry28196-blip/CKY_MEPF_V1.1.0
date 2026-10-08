import { describe, it, expect } from 'vitest';
import { AirBalanceService, AirBalanceInput, SystemBalanceInput } from '../../calculations/ventilation/AirBalanceService';
import { SystemPerformanceService, SystemPerformanceInput } from '../../calculations/ventilation/SystemPerformanceService';
import { KitchenVentilationService } from '../../calculations/ventilation/KitchenVentilationService';
import { VentilationValidator as ThermalSanityValidator } from '../../validation/VentilationValidator';
import { VentilationValidator as DiagnosticAdvisoryValidator } from '../../calculations/validation/VentilationValidator';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { EngineeringAuditService } from '../../calculations/audit/EngineeringAuditContract';
import { SourceType } from '../../data/ventilation/ashrae621/types';

describe('VENTILATION ENGINEERING DIAGNOSTIC & UTILITY SAFETY GATES', () => {
  describe('AirBalanceService Safety & Constraint Lifecycle', () => {
    it('returns INCOMPLETE with null numeric outputs when required room inputs are missing', () => {
      const input: AirBalanceInput = {
        qSupply: null,
        qExhaust: 100,
        qReturn: 50,
        qTransferIn: 0
      };
      const result = AirBalanceService.calculateRoomBalance(input);
      expect(result.status).toBe('INCOMPLETE');
      expect(result.qNet).toBeNull();
      expect(result.transferOut).toBeNull();
      expect(result.pressureRelationship).toBe('Indeterminate');
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.complianceNotice).toContain('Diagnostic');
    });

    it('returns FAIL with null numeric outputs for non-finite room inputs', () => {
      const input: AirBalanceInput = {
        qSupply: NaN,
        qExhaust: 100,
        qReturn: 50,
        qTransferIn: 0
      };
      const result = AirBalanceService.calculateRoomBalance(input);
      expect(result.status).toBe('FAIL');
      expect(result.qNet).toBeNull();
      expect(result.transferOut).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.reasons.some(r => r.includes('finite'))).toBe(true);
    });

    it('returns FAIL with null numeric outputs when any room flow is negative', () => {
      const input: AirBalanceInput = {
        qSupply: 500,
        qExhaust: -100,
        qReturn: 400,
        qTransferIn: 0
      };
      const result = AirBalanceService.calculateRoomBalance(input);
      expect(result.status).toBe('FAIL');
      expect(result.qNet).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.reasons.some(r => r.includes('negative'))).toBe(true);
    });

    it('returns PASS for valid room balance, but explicitly preserves non-authoritative status', () => {
      const input: AirBalanceInput = {
        qSupply: 500,
        qExhaust: 200,
        qReturn: 250,
        qTransferIn: 50
      };
      const result = AirBalanceService.calculateRoomBalance(input);
      expect(result.status).toBe('PASS');
      expect(result.qNet).toBe(100);
      expect(result.pressureRelationship).toBe('Positive');
      expect(result.transferOut).toBe(100);
      // Critical production rule: Non-authoritative diagnostic
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.complianceNotice).toContain('Not an ANSI/ASHRAE Standard 62.1 compliance determination');
      expect(result.auditRecord).toBeDefined();
      expect(result.auditRecord?.system).toBe('Ventilation');
      // Critical check for Section 1: Nested audit record must NEVER be authoritative for diagnostic utilities!
      expect(result.auditRecord?.isApprovedForEngineeringUse).toBe(false);
      expect(result.auditRecord?.finalResult.isAuthoritative).toBe(false);
    });

    it('rejects system air balance with INCOMPLETE when inputs are missing', () => {
      const input: SystemBalanceInput = {
        qSupply: 5000,
        qOutdoorAir: null,
        qReturn: 4000,
        qExhaust: 800,
        buildingVolume: 1000,
        isMetric: true
      };
      const result = AirBalanceService.calculateSystemBalance(input);
      expect(result.status).toBe('INCOMPLETE');
      expect(result.qNetBuilding).toBeNull();
      expect(result.qRecirculated).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });

    it('rejects physically contradictory system balance where outdoor air exceeds supply air', () => {
      const input: SystemBalanceInput = {
        qSupply: 1000,
        qOutdoorAir: 1500, // Contradiction: OA > Supply
        qReturn: 500,
        qExhaust: 200,
        buildingVolume: 1000,
        isMetric: true
      };
      const result = AirBalanceService.calculateSystemBalance(input);
      expect(result.status).toBe('FAIL');
      expect(result.qNetBuilding).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.reasons.some(r => r.includes('Physical contradiction'))).toBe(true);
    });

    it('rejects physically contradictory system balance where recirculated air exceeds return air', () => {
      const input: SystemBalanceInput = {
        qSupply: 5000,
        qOutdoorAir: 1000, // Recirculated required = 4000
        qReturn: 3000,     // Only 3000 available return -> Contradiction!
        qExhaust: 500,
        buildingVolume: 1000,
        isMetric: true
      };
      const result = AirBalanceService.calculateSystemBalance(input);
      expect(result.status).toBe('FAIL');
      expect(result.qNetBuilding).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.reasons.some(r => r.includes('Required recirculated air exceeds available return air'))).toBe(true);
    });

    it('rejects zero or negative building volume with FAIL', () => {
      const input: SystemBalanceInput = {
        qSupply: 5000,
        qOutdoorAir: 1000,
        qReturn: 4500,
        qExhaust: 500,
        buildingVolume: 0,
        isMetric: true
      };
      const result = AirBalanceService.calculateSystemBalance(input);
      expect(result.status).toBe('FAIL');
      expect(result.qNetBuilding).toBeNull();
      expect(result.reasons.some(r => r.includes('Building volume must be strictly greater than zero'))).toBe(true);
    });

    it('computes valid system balance with PASS and audit provenance, retaining non-authoritative flag', () => {
      const input: SystemBalanceInput = {
        qSupply: 5000,
        qOutdoorAir: 1500,
        qReturn: 4000,
        qExhaust: 1000,
        buildingVolume: 1500,
        isMetric: true
      };
      const result = AirBalanceService.calculateSystemBalance(input);
      expect(result.status).toBe('PASS');
      expect(result.qRecirculated).toBe(3500); // 5000 - 1500
      expect(result.qRelief).toBe(500);        // 4000 - 3500
      expect(result.totalExhaustAndRelief).toBe(1500); // 1000 + 500
      expect(result.qNetBuilding).toBe(0);      // 1500 - 1500
      expect(result.buildingPressure).toBe('Neutral');
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.auditRecord).toBeDefined();
      expect(result.auditRecord?.isApprovedForEngineeringUse).toBe(false);
      expect(result.auditRecord?.finalResult.isAuthoritative).toBe(false);
    });
  });

  describe('SystemPerformanceService Safety & Aerodynamic Rigor', () => {
    const validMetricInput: SystemPerformanceInput = {
      qOutdoorAir: 500,
      qReturnAir: 1500,
      densityRatio: 1.0,
      criticalDuctLength: 40,
      ductFrictionRate: 1.2,
      fittingLosses: 100,
      equipmentPressureDrop: 250,
      fanEfficiency: 0.65,
      motorEfficiency: 0.85,
      isMetric: true
    };

    it('rejects missing inputs with INCOMPLETE and null outputs', () => {
      const result = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        qReturnAir: null
      });
      expect(result.status).toBe('INCOMPLETE');
      expect(result.qSupplyStandard).toBeNull();
      expect(result.qSupplyActual).toBeNull();
      expect(result.totalStaticPressure).toBeNull();
      expect(result.fanBrakeHorsepower).toBeNull();
      expect(result.motorElectricalPower).toBeNull();
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });

    it('NEVER silently substitutes density ratio <= 0, failing explicitly', () => {
      const resultZero = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        densityRatio: 0
      });
      expect(resultZero.status).toBe('FAIL');
      expect(resultZero.qSupplyActual).toBeNull();
      expect(resultZero.reasons.some(r => r.includes('density ratio') || r.includes('Air density ratio'))).toBe(true);

      const resultNegative = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        densityRatio: -0.5
      });
      expect(resultNegative.status).toBe('FAIL');
      expect(resultNegative.qSupplyActual).toBeNull();
    });

    it('rejects zero or negative fan/motor efficiency with FAIL', () => {
      const resultZeroEff = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        fanEfficiency: 0
      });
      expect(resultZeroEff.status).toBe('FAIL');
      expect(resultZeroEff.fanBrakeHorsepower).toBeNull();

      const resultOverEff = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        motorEfficiency: 1.5 // > 1.0 and < 5% -> rejected
      });
      expect(resultOverEff.status).toBe('FAIL');
      expect(resultOverEff.motorElectricalPower).toBeNull();

      const resultOver100Pct = SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        motorEfficiency: 105 // > 100% -> rejected
      });
      expect(resultOver100Pct.status).toBe('FAIL');
      expect(resultOver100Pct.motorElectricalPower).toBeNull();
    });

    it('rejects negative duct lengths, friction, fitting losses, or equipment drops', () => {
      expect(SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        criticalDuctLength: -10
      }).status).toBe('FAIL');

      expect(SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        ductFrictionRate: -0.5
      }).status).toBe('FAIL');

      expect(SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        fittingLosses: -20
      }).status).toBe('FAIL');

      expect(SystemPerformanceService.calculateFanPerformance({
        ...validMetricInput,
        equipmentPressureDrop: -50
      }).status).toBe('FAIL');
    });

    it('calculates valid metric fan and aerodynamic duty point with PASS, preserving non-authoritative flag', () => {
      const result = SystemPerformanceService.calculateFanPerformance(validMetricInput);
      expect(result.status).toBe('PASS');
      expect(result.qSupplyStandard).toBe(2000);
      expect(result.qSupplyActual).toBe(2000); // 2000 / 1.0
      // Friction = 40 m * 1.2 Pa/m = 48 Pa. Total = 48 + 100 + 250 = 398 Pa.
      expect(result.totalStaticPressure).toBeCloseTo(398, 1);
      // Fan kW = (2000 * 398) / (1_000_000 * 0.65) = 1.2246 kW
      expect(result.fanBrakeHorsepower).toBeCloseTo(1.2246, 2);
      // Motor kW = 1.2246 / 0.85 = 1.4407 kW
      expect(result.motorElectricalPower).toBeCloseTo(1.4407, 2);
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
      expect(result.auditRecord).toBeDefined();
      expect(result.auditRecord?.isApprovedForEngineeringUse).toBe(false);
      expect(result.auditRecord?.finalResult.isAuthoritative).toBe(false);
    });

    it('calculates valid Imperial fan duty point with correct BHP and motor kW', () => {
      const imperialInput: SystemPerformanceInput = {
        qOutdoorAir: 1000,
        qReturnAir: 3000,
        densityRatio: 0.95,
        criticalDuctLength: 150,
        ductFrictionRate: 0.1, // 0.1 in.wg/100ft -> 0.15 in.wg
        fittingLosses: 0.5,
        equipmentPressureDrop: 1.0,
        fanEfficiency: 70, // 70%
        motorEfficiency: 90, // 90%
        isMetric: false
      };
      const result = SystemPerformanceService.calculateFanPerformance(imperialInput);
      expect(result.status).toBe('PASS');
      expect(result.qSupplyStandard).toBe(4000);
      expect(result.qSupplyActual).toBeCloseTo(4000 / 0.95, 1);
      // Static pressure = (150/100)*0.1 + 0.5 + 1.0 = 1.65 in.wg
      expect(result.totalStaticPressure).toBeCloseTo(1.65, 2);
      expect(result.fanBrakeHorsepower).toBeGreaterThan(0);
      expect(result.motorElectricalPower).toBeGreaterThan(0);
      expect(result.isAuthoritative).toBe(false);
      expect(result.isApprovedForEngineeringUse).toBe(false);
    });
  });

  describe('Harmonized Validators Architecture & Non-Authority Protection', () => {
    it('proves ThermalSanityValidator (src/validation) is quarantined and non-authoritative', () => {
      const validParams = {
        area: 100,
        volume: 300,
        occupants: 10,
        ventilationLps: 50,
        outdoorTemp: 32,
        indoorTemp: 22
      };
      const res = ThermalSanityValidator.validate(validParams);
      expect(res.status).toBe('PASS');
      // Crucial: Must NEVER claim authoritative status
      expect(res.isAuthoritative).toBe(false);
    });

    it('proves ThermalSanityValidator returns INCOMPLETE or FAIL on invalid inputs and remains non-authoritative', () => {
      const incomplete = ThermalSanityValidator.validate({
        area: '',
        volume: 300,
        occupants: 10,
        ventilationLps: 50,
        outdoorTemp: 32,
        indoorTemp: 22
      });
      expect(incomplete.status).toBe('INCOMPLETE');
      expect(incomplete.isAuthoritative).toBe(false);

      const fail = ThermalSanityValidator.validate({
        area: -10,
        volume: 300,
        occupants: 10,
        ventilationLps: 50,
        outdoorTemp: 32,
        indoorTemp: 22
      });
      expect(fail.status).toBe('FAIL');
      expect(fail.isAuthoritative).toBe(false);
    });

    it('proves DiagnosticAdvisoryValidator (src/calculations/validation) flags physical violations and low Ev', () => {
      const zoneMessages = DiagnosticAdvisoryValidator.validateZone({
        spaceType: 'Office',
        area: 0, // Area <= 0 -> Z-01
        occupants: 5,
        voz: 500,
        vpz: 200, // Voz > Vpz -> Z-02
        zp: 0.8
      } as any);

      expect(zoneMessages.some(m => m.code === 'Z-01' && m.severity === 'error')).toBe(true);
      expect(zoneMessages.some(m => m.code === 'Z-02' && m.severity === 'error')).toBe(true);

      const sysMessages = DiagnosticAdvisoryValidator.validateSystem({
        airDistributionType: 'VAV',
        vps: 0,
        vou: 500,
        ev: 0.3
      } as any);

      expect(sysMessages.some(m => m.code === 'S-00' && m.severity === 'error')).toBe(true);
      expect(sysMessages.some(m => m.code === 'S-02' && m.severity === 'warning')).toBe(true);
    });
  });

  describe('KitchenVentilationService Diagnostic Safety & Constraints', () => {
    it('returns INCOMPLETE with null outputs when required parameters are missing', () => {
      const res = KitchenVentilationService.calculate({
        hoodStandard: 'unlisted',
        hoodType: 'wall',
        duty: 'medium',
        equipmentLength: null,
        overhang: 0.3,
        hoodDepth: 1.2,
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.exhaustAirflow).toBeNull();
      expect(res.ductArea).toBeNull();
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.complianceNotice).toContain('Diagnostic');
    });

    it('returns FAIL with null outputs for negative equipment length or non-finite inputs', () => {
      const resNeg = KitchenVentilationService.calculate({
        hoodStandard: 'unlisted',
        hoodType: 'wall',
        duty: 'medium',
        equipmentLength: -3,
        overhang: 0.3,
        hoodDepth: 1.2,
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(resNeg.status).toBe('FAIL');
      expect(resNeg.exhaustAirflow).toBeNull();
      expect(resNeg.isAuthoritative).toBe(false);

      const resNaN = KitchenVentilationService.calculate({
        hoodStandard: 'unlisted',
        hoodType: 'wall',
        duty: 'medium',
        equipmentLength: NaN,
        overhang: 0.3,
        hoodDepth: 1.2,
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(resNaN.status).toBe('FAIL');
      expect(resNaN.exhaustAirflow).toBeNull();
    });

    it('rejects disallowed unlisted hood combinations per IMC 507 with FAIL', () => {
      // Extra heavy duty on backshelf or eyebrow is rate 0 (not permitted)
      const resDisallowed = KitchenVentilationService.calculate({
        hoodStandard: 'unlisted',
        hoodType: 'backshelf',
        duty: 'extra',
        equipmentLength: 3,
        overhang: 0.3,
        hoodDepth: 1.2,
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(resDisallowed.status).toBe('FAIL');
      expect(resDisallowed.exhaustAirflow).toBeNull();
      expect(resDisallowed.reasons.some(r => r.includes('not permitted'))).toBe(true);
    });

    it('calculates valid unlisted kitchen exhaust with PASS, non-authoritative flags, and diagnostic audit record', () => {
      const res = KitchenVentilationService.calculate({
        hoodStandard: 'unlisted',
        hoodType: 'wall',
        duty: 'medium',
        equipmentLength: 3,
        overhang: 0.3,
        hoodDepth: 1.2,
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(res.status).toBe('PASS');
      expect(res.exhaustAirflow).toBeGreaterThan(0);
      expect(res.ductArea).toBeGreaterThan(0);
      // Critical Section 1 & 4 checks
      expect(res.isAuthoritative).toBe(false);
      expect(res.isApprovedForEngineeringUse).toBe(false);
      expect(res.complianceNotice).toContain('Diagnostic');
      expect(res.auditRecord).toBeDefined();
      expect(res.auditRecord?.isApprovedForEngineeringUse).toBe(false);
      expect(res.auditRecord?.finalResult.isAuthoritative).toBe(false);
    });

    it('calculates listed hood with PASS and identifies manufacturer data in audit', () => {
      const res = KitchenVentilationService.calculate({
        hoodStandard: 'listed',
        hoodType: 'wall',
        duty: 'heavy',
        equipmentLength: 3,
        overhang: 0.3,
        hoodDepth: 1.2,
        listedFlowPerLength: 300, // L/s-m
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(res.status).toBe('PASS');
      expect(res.isAuthoritative).toBe(false);
      expect(res.auditRecord?.provenance['listedRate'].source).toBe(SourceType.PROJECT_SPECIFICATION);
    });

    it('calculates performance hood with PASS and identifies capture velocity diagnostic estimate', () => {
      const res = KitchenVentilationService.calculate({
        hoodStandard: 'performance',
        hoodType: 'wall',
        duty: 'heavy',
        equipmentLength: 3,
        overhang: 0.3,
        hoodDepth: 1.2,
        captureVelocity: 0.4, // m/s
        ductVelocity: 7.6,
        isMetric: true
      });
      expect(res.status).toBe('PASS');
      expect(res.isAuthoritative).toBe(false);
      expect(res.warnings.some(w => w.includes('Diagnostic estimate'))).toBe(true);
    });
  });

  describe('Authoritative Calculations Audit Authority Preservation (Section 1)', () => {
    it('preserves authoritative status for verified ASHRAE 62.1 single-zone PASS calculations', () => {
      const ezCooling = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;
      const spaceOffice = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
      
      const singleZoneResult = VentilationEngine.runSingleZone({
        edition: '2022',
        density: {
          elevation: 0,
          temperature: 20,
          humidityRatio: 0.01
        },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: spaceOffice,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: true,
          ezConfig: ezCooling
        }
      });

      expect(singleZoneResult.status).toBe('PASS');
      expect(singleZoneResult.finalDesignOutdoorAir).toBeGreaterThan(0);
      expect(singleZoneResult.auditRecord).toBeDefined();
      // Must be authoritative for genuine ASHRAE 62.1 production path!
      expect(singleZoneResult.auditRecord?.isApprovedForEngineeringUse).toBe(true);
      expect(singleZoneResult.auditRecord?.finalResult.isAuthoritative).toBe(true);
      expect(singleZoneResult.auditRecord?.finalResult.value).toBe(singleZoneResult.finalDesignOutdoorAir);
    });

    it('preserves authoritative status for verified ASHRAE 62.1 prescriptive exhaust PASS calculations', () => {
      const publicToilet = StandardDataProvider.get621ExhaustRates('2022').find(e => e.id === 'toilet_public')!;
      const exhaustResult = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: publicToilet,
        qty: 2,
        designExhaust: 50,
        operationMode: 'continuous',
        unitSystem: 'metric'
      });

      expect(exhaustResult.status).toBe('PASS');
      const audit = EngineeringAuditService.fromExhaustCalculation({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: publicToilet,
        qty: 2,
        designExhaust: 50
      }, exhaustResult);

      expect(audit.validationStatus).toBe('PASS');
      expect(audit.isApprovedForEngineeringUse).toBe(true);
      expect(audit.finalResult.isAuthoritative).toBe(true);
      expect(audit.finalResult.value).toBe(exhaustResult.requiredExhaust);
    });

    it('prevents manual Ez override from becoming authoritative', () => {
      const manualEz = EzSelectionService.createManualOverride(1.15, 'CFD Project Report #1234');
      const spaceOffice = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;

      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: spaceOffice,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: true,
        ezConfig: manualEz
      });

      // Manual override produces BLOCKED
      expect(zoneRes.status).toBe('BLOCKED');
      const audit = EngineeringAuditService.fromZoneCalculation({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: spaceOffice,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: true,
        ezConfig: manualEz
      }, zoneRes);

      expect(audit.isApprovedForEngineeringUse).toBe(false);
      expect(audit.finalResult.isAuthoritative).toBe(false);
      expect(audit.finalResult.value).toBeNull();
    });
  });

  describe('Controlled Revision / Addenda Basis (Section 7)', () => {
    it('rejects unapproved addendum in Ashrae621ZoneService with BLOCKED', () => {
      const ezCooling = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;
      const spaceOffice = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['k'], // Unapproved addendum!
        spaceType: spaceOffice,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: true,
        ezConfig: ezCooling
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.reason).toContain('Unapproved addenda');
      expect(res.voz).toBeNull();
    });

    it('rejects unapproved addendum in Ashrae621ExhaustService with BLOCKED', () => {
      const publicToilet = StandardDataProvider.get621ExhaustRates('2022').find(e => e.id === 'toilet_public')!;

      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        expectedAddenda: ['y'], // Unapproved exhaust addendum!
        exhaustType: publicToilet,
        qty: 2,
        designExhaust: 50
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.instructionalMessage).toContain('Unapproved exhaust addenda');
      expect(res.requiredExhaust).toBeNull();
    });
  });

  describe('Default Ez ID & Multi-Zone UI Runtime Smoke Tests (Sections 2 & 3)', () => {
    it('verifies default Ez resolves to verified ez-1 Table 6-4 ceiling cool air record', () => {
      const ezValues = StandardDataProvider.get621EzValues('2022');
      const defaultEz = ezValues.find(e => e.id === 'ez-1');

      expect(defaultEz).toBeDefined();
      expect(defaultEz?.ez).toBe(1.0);
      expect(defaultEz?.verificationStatus).toBe('VERIFIED');
      expect(defaultEz?.reference).toBe('Table 6-4');
      expect(defaultEz?.name.toLowerCase()).toContain('ceiling supply of cool air');
    });

    it('proves multi-zone engine result exposes zoneResults and audit-trail extraction does not throw', () => {
      const ezCooling = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;
      const spaceOffice = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;

      const mzResult = VentilationEngine.runMultiZone({
        method: 'Simplified',
        edition: '2022',
        systemType: 'single_supply',
        airDistributionType: 'CV',
        systemPopulation: 10,
        density: { elevation: 0, temperature: 20 },
        zones: [
          {
            expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2022',
            spaceType: spaceOffice,
            area: 100,
            designOccupancy: 5,
            useDefaultOccupancy: true,
            ezConfig: ezCooling,
            dMode: 'CV'
          },
          {
            expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2022',
            spaceType: spaceOffice,
            area: 100,
            designOccupancy: 5,
            useDefaultOccupancy: true,
            ezConfig: ezCooling,
            dMode: 'CV'
          }
        ]
      });

      expect(mzResult.status).toBe('PASS');
      // Crucial Section 3 check: Property must be zoneResults, not zones
      expect(mzResult.zoneResults).toBeDefined();
      expect(Array.isArray(mzResult.zoneResults)).toBe(true);
      expect(mzResult.zoneResults.length).toBe(2);

      // Verify the UI audit-trail extraction logic does NOT throw:
      const allAuditTrails: any[] = [];
      expect(() => {
        if (mzResult.zoneResults) {
          mzResult.zoneResults.forEach(z => {
            if (z?.auditTrail) allAuditTrails.push(...z.auditTrail);
          });
        }
        if (mzResult.simplifiedSystem?.auditTrail) allAuditTrails.push(...mzResult.simplifiedSystem.auditTrail);
        if (mzResult.alternativeSystem?.auditTrail) allAuditTrails.push(...mzResult.alternativeSystem.auditTrail);
        if (mzResult.density?.auditTrail) allAuditTrails.push(...mzResult.density.auditTrail);
        if (mzResult.auditTrail) allAuditTrails.push(...mzResult.auditTrail);
      }).not.toThrow();

      expect(allAuditTrails.length).toBeGreaterThan(0);
    });
  });
});
