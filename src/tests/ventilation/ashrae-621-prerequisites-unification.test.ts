import { describe, it, expect } from 'vitest';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { ASHRAE_621_2022_EZ_VALUES } from '../../data/ventilation/ashrae621/2022/data';
import {
  StratifiedVentilationPrerequisites,
  PersonalizedVentilationPrerequisites,
  Ashrae621Ez
} from '../../data/ventilation/ashrae621/types';

function getEz(id: string): Ashrae621Ez {
  const found = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === id);
  if (!found) throw new Error(`Missing Ez id: ${id}`);
  return found;
}

const office = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;

describe('FINAL EZ SAFETY FIX: Unify Missing / Undefined Stratified and Personalized Qualification Inputs', () => {
  const completeValidStratPrereqs: StratifiedVentilationPrerequisites = {
    tempDiffRoomSupplyC: 3.0,
    supplyTempBelowRoomGte2C: true,
    returnOpeningHeightM: 3.2,
    returnOpeningHeightGt28m: true,
    noMechanicalMixingDevices: true,
    protectedFromImpingingAirstreams: true
  };

  const completeValidPersonalPrereqs: PersonalizedVentilationPrerequisites = {
    airDistributedInBreathingZone: true,
    headRegionVelocityMs: 0.20,
    headRegionVelocityMet: true,
    returnOpeningHeightM: 3.2,
    returnOpeningHeightGt28m: true
  };

  const ez3 = getEz('ez-3');
  const ezPersonalCool = getEz('ez-personalized-ceiling-cool');

  // =========================================================================
  // Section 7 Matrix: Stratified Tests (S1 - S10)
  // =========================================================================
  describe('Stratified Regression Matrix (S1 - S10)', () => {
    it('Test S1: No stratifiedPrerequisites and no Boolean field -> INCOMPLETE', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({});
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S2: stratifiedPrerequisitesMet: undefined -> INCOMPLETE', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: undefined
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S3: stratifiedPrerequisitesMet: null -> INCOMPLETE', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: null
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S4: stratifiedPrerequisitesMet: true with no structured evidence -> INCOMPLETE', () => {
      const res1 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: true
      });
      expect(res1.status).toBe('INCOMPLETE');
      expect(res1.valid).toBe(false);

      const res2 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: true,
        stratifiedPrerequisites: undefined
      });
      expect(res2.status).toBe('INCOMPLETE');
      expect(res2.valid).toBe(false);

      const res3 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: true,
        stratifiedPrerequisites: null as any
      });
      expect(res3.status).toBe('INCOMPLETE');
      expect(res3.valid).toBe(false);
    });

    it('Test S5: stratifiedPrerequisitesMet: false with no structured evidence -> FAIL', () => {
      const res1 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: false
      });
      expect(res1.status).toBe('FAIL');
      expect(res1.valid).toBe(false);

      const res2 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: false,
        stratifiedPrerequisites: undefined
      });
      expect(res2.status).toBe('FAIL');
      expect(res2.valid).toBe(false);

      const res3 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisitesMet: false,
        stratifiedPrerequisites: null as any
      });
      expect(res3.status).toBe('FAIL');
      expect(res3.valid).toBe(false);
    });

    it('Test S6: Structured evidence present but one required field omitted -> INCOMPLETE', () => {
      const { noMechanicalMixingDevices, ...omittedField } = completeValidStratPrereqs;
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: omittedField
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S7: Structured evidence present with required field = undefined -> INCOMPLETE', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: {
          ...completeValidStratPrereqs,
          noMechanicalMixingDevices: undefined
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S8: Structured evidence present with required field = null -> INCOMPLETE', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: {
          ...completeValidStratPrereqs,
          noMechanicalMixingDevices: null as any
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test S9: Complete structured evidence + Boolean true -> PASS', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: completeValidStratPrereqs,
        stratifiedPrerequisitesMet: true
      });
      expect(res.status).toBe('PASS');
      expect(res.valid).toBe(true);

      // Also verify complete structured evidence without boolean is PASS
      const resNoBool = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: completeValidStratPrereqs
      });
      expect(resNoBool.status).toBe('PASS');
      expect(resNoBool.valid).toBe(true);
    });

    it('Test S10: Complete structured evidence + Boolean false -> FAIL', () => {
      const res = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: completeValidStratPrereqs,
        stratifiedPrerequisitesMet: false
      });
      expect(res.status).toBe('FAIL');
      expect(res.valid).toBe(false);
    });
  });

  // =========================================================================
  // Section 7 Matrix: Personalized Tests (P1 - P10)
  // =========================================================================
  describe('Personalized Regression Matrix (P1 - P10)', () => {
    it('Test P1: No personalizedPrerequisites and no Boolean field -> INCOMPLETE', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({});
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P2: personalizedPrerequisitesMet: undefined -> INCOMPLETE', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: undefined
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P3: personalizedPrerequisitesMet: null -> INCOMPLETE', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: null
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P4: personalizedPrerequisitesMet: true with no structured evidence -> INCOMPLETE', () => {
      const res1 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: true
      });
      expect(res1.status).toBe('INCOMPLETE');
      expect(res1.valid).toBe(false);

      const res2 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: true,
        personalizedPrerequisites: undefined
      });
      expect(res2.status).toBe('INCOMPLETE');
      expect(res2.valid).toBe(false);

      const res3 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: true,
        personalizedPrerequisites: null as any
      });
      expect(res3.status).toBe('INCOMPLETE');
      expect(res3.valid).toBe(false);
    });

    it('Test P5: personalizedPrerequisitesMet: false with no structured evidence -> FAIL', () => {
      const res1 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: false
      });
      expect(res1.status).toBe('FAIL');
      expect(res1.valid).toBe(false);

      const res2 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: false,
        personalizedPrerequisites: undefined
      });
      expect(res2.status).toBe('FAIL');
      expect(res2.valid).toBe(false);

      const res3 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisitesMet: false,
        personalizedPrerequisites: null as any
      });
      expect(res3.status).toBe('FAIL');
      expect(res3.valid).toBe(false);
    });

    it('Test P6: Structured evidence present but one required field omitted -> INCOMPLETE', () => {
      const { airDistributedInBreathingZone, ...omittedField } = completeValidPersonalPrereqs;
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: omittedField
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P7: Structured evidence present with required field = undefined -> INCOMPLETE', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: {
          ...completeValidPersonalPrereqs,
          airDistributedInBreathingZone: undefined
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P8: Structured evidence present with required field = null -> INCOMPLETE', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: {
          ...completeValidPersonalPrereqs,
          airDistributedInBreathingZone: null as any
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.valid).toBe(false);
    });

    it('Test P9: Complete structured evidence + Boolean true -> PASS', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: completeValidPersonalPrereqs,
        personalizedPrerequisitesMet: true
      });
      expect(res.status).toBe('PASS');
      expect(res.valid).toBe(true);

      // Also verify complete structured evidence without boolean is PASS
      const resNoBool = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: completeValidPersonalPrereqs
      });
      expect(resNoBool.status).toBe('PASS');
      expect(resNoBool.valid).toBe(true);
    });

    it('Test P10: Complete structured evidence + Boolean false -> FAIL', () => {
      const res = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: completeValidPersonalPrereqs,
        personalizedPrerequisitesMet: false
      });
      expect(res.status).toBe('FAIL');
      expect(res.valid).toBe(false);
    });
  });

  // =========================================================================
  // Section 8: Explicit Equivalence Tests: omitted === undefined === null
  // =========================================================================
  describe('Section 8: Explicit Equivalence (omitted === undefined === null)', () => {
    it('verifies stratified qualification inputs: omitted === undefined === null produce identical status', () => {
      // 1. Root level boolean summary field
      const statusOmitted = EzSelectionService.validateStratifiedPrerequisites({}).status;
      const statusUndefined = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: undefined }).status;
      const statusNull = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: null }).status;

      expect(statusOmitted).toBe('INCOMPLETE');
      expect(statusUndefined).toBe('INCOMPLETE');
      expect(statusNull).toBe('INCOMPLETE');
      expect(statusOmitted).toBe(statusUndefined);
      expect(statusUndefined).toBe(statusNull);

      // 2. Structured evidence field missing: noMechanicalMixingDevices
      const { noMechanicalMixingDevices: _omit1, ...prereqOmitted1 } = completeValidStratPrereqs;
      const statusFieldOmitted1 = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: prereqOmitted1 }).status;
      const statusFieldUndefined1 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...completeValidStratPrereqs, noMechanicalMixingDevices: undefined }
      }).status;
      const statusFieldNull1 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...completeValidStratPrereqs, noMechanicalMixingDevices: null as any }
      }).status;

      expect(statusFieldOmitted1).toBe('INCOMPLETE');
      expect(statusFieldUndefined1).toBe('INCOMPLETE');
      expect(statusFieldNull1).toBe('INCOMPLETE');
      expect(statusFieldOmitted1).toBe(statusFieldUndefined1);
      expect(statusFieldUndefined1).toBe(statusFieldNull1);

      // 3. Structured evidence field missing: protectedFromImpingingAirstreams
      const { protectedFromImpingingAirstreams: _omit2, ...prereqOmitted2 } = completeValidStratPrereqs;
      const statusFieldOmitted2 = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: prereqOmitted2 }).status;
      const statusFieldUndefined2 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...completeValidStratPrereqs, protectedFromImpingingAirstreams: undefined }
      }).status;
      const statusFieldNull2 = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...completeValidStratPrereqs, protectedFromImpingingAirstreams: null as any }
      }).status;

      expect(statusFieldOmitted2).toBe('INCOMPLETE');
      expect(statusFieldUndefined2).toBe('INCOMPLETE');
      expect(statusFieldNull2).toBe('INCOMPLETE');
      expect(statusFieldOmitted2).toBe(statusFieldUndefined2);
      expect(statusFieldUndefined2).toBe(statusFieldNull2);

      // 4. Structured evidence field missing: supplyTemp
      const { tempDiffRoomSupplyC: _t1, supplyTempBelowRoomGte2C: _t2, ...prereqOmittedTemp } = completeValidStratPrereqs;
      const statusTempOmitted = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: prereqOmittedTemp }).status;
      const statusTempUndefined = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...prereqOmittedTemp, tempDiffRoomSupplyC: undefined, supplyTempBelowRoomGte2C: undefined }
      }).status;
      const statusTempNull = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...prereqOmittedTemp, tempDiffRoomSupplyC: null as any, supplyTempBelowRoomGte2C: null as any }
      }).status;

      expect(statusTempOmitted).toBe('INCOMPLETE');
      expect(statusTempUndefined).toBe('INCOMPLETE');
      expect(statusTempNull).toBe('INCOMPLETE');
      expect(statusTempOmitted).toBe(statusTempUndefined);
      expect(statusTempUndefined).toBe(statusTempNull);

      // 5. Structured evidence field missing: returnOpeningHeight
      const { returnOpeningHeightM: _h1, returnOpeningHeightGt28m: _h2, ...prereqOmittedHeight } = completeValidStratPrereqs;
      const statusHeightOmitted = EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: prereqOmittedHeight }).status;
      const statusHeightUndefined = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...prereqOmittedHeight, returnOpeningHeightM: undefined, returnOpeningHeightGt28m: undefined }
      }).status;
      const statusHeightNull = EzSelectionService.validateStratifiedPrerequisites({
        stratifiedPrerequisites: { ...prereqOmittedHeight, returnOpeningHeightM: null as any, returnOpeningHeightGt28m: null as any }
      }).status;

      expect(statusHeightOmitted).toBe('INCOMPLETE');
      expect(statusHeightUndefined).toBe('INCOMPLETE');
      expect(statusHeightNull).toBe('INCOMPLETE');
      expect(statusHeightOmitted).toBe(statusHeightUndefined);
      expect(statusHeightUndefined).toBe(statusHeightNull);
    });

    it('verifies personalized qualification inputs: omitted === undefined === null produce identical status', () => {
      // 1. Root level boolean summary field
      const statusOmitted = EzSelectionService.validatePersonalizedPrerequisites({}).status;
      const statusUndefined = EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: undefined }).status;
      const statusNull = EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: null }).status;

      expect(statusOmitted).toBe('INCOMPLETE');
      expect(statusUndefined).toBe('INCOMPLETE');
      expect(statusNull).toBe('INCOMPLETE');
      expect(statusOmitted).toBe(statusUndefined);
      expect(statusUndefined).toBe(statusNull);

      // 2. Structured field missing: airDistributedInBreathingZone
      const { airDistributedInBreathingZone: _omit1, ...prereqOmitted1 } = completeValidPersonalPrereqs;
      const statusFieldOmitted1 = EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: prereqOmitted1 }).status;
      const statusFieldUndefined1 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...completeValidPersonalPrereqs, airDistributedInBreathingZone: undefined }
      }).status;
      const statusFieldNull1 = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...completeValidPersonalPrereqs, airDistributedInBreathingZone: null as any }
      }).status;

      expect(statusFieldOmitted1).toBe('INCOMPLETE');
      expect(statusFieldUndefined1).toBe('INCOMPLETE');
      expect(statusFieldNull1).toBe('INCOMPLETE');
      expect(statusFieldOmitted1).toBe(statusFieldUndefined1);
      expect(statusFieldUndefined1).toBe(statusFieldNull1);

      // 3. Structured field missing: headRegionVelocity
      const { headRegionVelocityMs: _v1, headRegionVelocityMet: _v2, ...prereqOmittedVel } = completeValidPersonalPrereqs;
      const statusVelOmitted = EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: prereqOmittedVel }).status;
      const statusVelUndefined = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...prereqOmittedVel, headRegionVelocityMs: undefined, headRegionVelocityMet: undefined }
      }).status;
      const statusVelNull = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...prereqOmittedVel, headRegionVelocityMs: null as any, headRegionVelocityMet: null as any }
      }).status;

      expect(statusVelOmitted).toBe('INCOMPLETE');
      expect(statusVelUndefined).toBe('INCOMPLETE');
      expect(statusVelNull).toBe('INCOMPLETE');
      expect(statusVelOmitted).toBe(statusVelUndefined);
      expect(statusVelUndefined).toBe(statusVelNull);

      // 4. Structured field missing: returnOpeningHeight
      const { returnOpeningHeightM: _p1, returnOpeningHeightGt28m: _p2, ...prereqOmittedPHeight } = completeValidPersonalPrereqs;
      const statusPHeightOmitted = EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: prereqOmittedPHeight }).status;
      const statusPHeightUndefined = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...prereqOmittedPHeight, returnOpeningHeightM: undefined, returnOpeningHeightGt28m: undefined }
      }).status;
      const statusPHeightNull = EzSelectionService.validatePersonalizedPrerequisites({
        personalizedPrerequisites: { ...prereqOmittedPHeight, returnOpeningHeightM: null as any, returnOpeningHeightGt28m: null as any }
      }).status;

      expect(statusPHeightOmitted).toBe('INCOMPLETE');
      expect(statusPHeightUndefined).toBe('INCOMPLETE');
      expect(statusPHeightNull).toBe('INCOMPLETE');
      expect(statusPHeightOmitted).toBe(statusPHeightUndefined);
      expect(statusPHeightUndefined).toBe(statusPHeightNull);
    });
  });

  // =========================================================================
  // Section 6: Production Path Matching (Direct Validation, ZoneService, Engine)
  // =========================================================================
  describe('Section 6: Production Path Consistency (Direct, ZoneService, VentilationEngine)', () => {
    it('enforces non-authoritative INCOMPLETE across all three layers for Boolean-only stratified inputs', () => {
      // 1. Direct validation via EzSelectionService
      const direct = EzSelectionService.validateEzConfiguration(ez3, {
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGte55m: false,
        stratifiedPrerequisitesMet: true
      });
      expect(direct.valid).toBe(false);
      expect(direct.status).toBe('INCOMPLETE');

      // 2. Zone service calculation via Ashrae621ZoneService
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez3,
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGte55m: false,
        stratifiedPrerequisitesMet: true
      });
      expect(zoneRes.status).toBe('INCOMPLETE');
      expect(zoneRes.status).not.toBe('PASS');
      expect(zoneRes.voz).toBeNull();

      // 3. Complete production engine run via VentilationEngine.runSingleZone
      const engineRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ez3,
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisitesMet: true
        }
      });
      expect(engineRes.status).toBe('INCOMPLETE');
      expect(engineRes.status).not.toBe('PASS');
      expect(engineRes.isAuthoritative).toBe(false);
      expect(engineRes.isApprovedForEngineeringUse).toBe(false);
      expect(engineRes.voz).toBeNull();
      expect(engineRes.vot).toBeNull();
      expect(engineRes.finalDesignOutdoorAir).toBeNull();
    });

    it('enforces non-authoritative INCOMPLETE across all three layers for Boolean-only personalized inputs', () => {
      // 1. Direct validation via EzSelectionService
      const direct = EzSelectionService.validateEzConfiguration(ezPersonalCool, {
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: true
      });
      expect(direct.valid).toBe(false);
      expect(direct.status).toBe('INCOMPLETE');

      // 2. Zone service calculation via Ashrae621ZoneService
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezPersonalCool,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: true
      });
      expect(zoneRes.status).toBe('INCOMPLETE');
      expect(zoneRes.status).not.toBe('PASS');
      expect(zoneRes.voz).toBeNull();

      // 3. Complete production engine run via VentilationEngine.runSingleZone
      const engineRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezPersonalCool,
          supplyTempRelationship: 'cooling',
          personalizedSystemType: 'ceiling_cool',
          personalizedPrerequisitesMet: true
        }
      });
      expect(engineRes.status).toBe('INCOMPLETE');
      expect(engineRes.status).not.toBe('PASS');
      expect(engineRes.isAuthoritative).toBe(false);
      expect(engineRes.isApprovedForEngineeringUse).toBe(false);
      expect(engineRes.voz).toBeNull();
      expect(engineRes.vot).toBeNull();
      expect(engineRes.finalDesignOutdoorAir).toBeNull();
    });

    it('produces authoritative PASS across all three layers when valid structured evidence is provided', () => {
      // Stratified with valid structured evidence
      const zoneStrat = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez3,
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGte55m: false,
        stratifiedPrerequisites: completeValidStratPrereqs,
        stratifiedPrerequisitesMet: true
      });
      expect(zoneStrat.status).toBe('PASS');
      expect(zoneStrat.ez).toBe(1.2);
      expect(zoneStrat.voz).toBeGreaterThan(0);

      const engineStrat = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ez3,
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisites: completeValidStratPrereqs,
          stratifiedPrerequisitesMet: true
        }
      });
      expect(engineStrat.status).toBe('PASS');
      expect(engineStrat.isAuthoritative).toBe(true);
      expect(engineStrat.isApprovedForEngineeringUse).toBe(true);
      expect(engineStrat.voz).toBe(zoneStrat.voz);

      // Personalized with valid structured evidence
      const zonePersonal = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezPersonalCool,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: completeValidPersonalPrereqs,
        personalizedPrerequisitesMet: true
      });
      expect(zonePersonal.status).toBe('PASS');
      expect(zonePersonal.ez).toBe(1.40);
      expect(zonePersonal.voz).toBeGreaterThan(0);

      const enginePersonal = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezPersonalCool,
          supplyTempRelationship: 'cooling',
          personalizedSystemType: 'ceiling_cool',
          personalizedPrerequisites: completeValidPersonalPrereqs,
          personalizedPrerequisitesMet: true
        }
      });
      expect(enginePersonal.status).toBe('PASS');
      expect(enginePersonal.isAuthoritative).toBe(true);
      expect(enginePersonal.isApprovedForEngineeringUse).toBe(true);
      expect(enginePersonal.voz).toBe(zonePersonal.voz);
    });

    it('enforces authoritative FAIL across all three layers for explicit negative Boolean ({ stratifiedPrerequisitesMet: false })', () => {
      // Direct
      const direct = EzSelectionService.validateEzConfiguration(ez3, {
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGte55m: false,
        stratifiedPrerequisitesMet: false
      });
      expect(direct.valid).toBe(false);
      expect(direct.status).toBe('FAIL');

      // Zone Service
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez3,
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGte55m: false,
        stratifiedPrerequisitesMet: false
      });
      expect(zoneRes.status).toBe('FAIL');
      expect(zoneRes.voz).toBeNull();

      // VentilationEngine
      const engineRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ez3,
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisitesMet: false
        }
      });
      expect(engineRes.status).toBe('FAIL');
      expect(engineRes.isAuthoritative).toBe(false);
      expect(engineRes.isApprovedForEngineeringUse).toBe(false);
      expect(engineRes.voz).toBeNull();
      expect(engineRes.vot).toBeNull();
    });

    it('enforces authoritative FAIL across all three layers for explicit negative Boolean ({ personalizedPrerequisitesMet: false })', () => {
      // Direct
      const direct = EzSelectionService.validateEzConfiguration(ezPersonalCool, {
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: false
      });
      expect(direct.valid).toBe(false);
      expect(direct.status).toBe('FAIL');

      // Zone Service
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezPersonalCool,
        supplyTempRelationship: 'cooling',
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: false
      });
      expect(zoneRes.status).toBe('FAIL');
      expect(zoneRes.voz).toBeNull();

      // VentilationEngine
      const engineRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20, relativeHumidity: 0 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezPersonalCool,
          supplyTempRelationship: 'cooling',
          personalizedSystemType: 'ceiling_cool',
          personalizedPrerequisitesMet: false
        }
      });
      expect(engineRes.status).toBe('FAIL');
      expect(engineRes.isAuthoritative).toBe(false);
      expect(engineRes.isApprovedForEngineeringUse).toBe(false);
      expect(engineRes.voz).toBeNull();
      expect(engineRes.vot).toBeNull();
    });
  });

  // =========================================================================
  // Section: Explicit Tri-State Boolean Qualification Matrix
  // =========================================================================
  describe('Explicit Tri-State Boolean Qualification Matrix', () => {
    const contradictoryStratPrereqs: StratifiedVentilationPrerequisites = {
      ...completeValidStratPrereqs,
      tempDiffRoomSupplyC: 1.0, // violation: < 2°C
      supplyTempBelowRoomGte2C: false
    };

    const incompleteStratPrereqs = {
      tempDiffRoomSupplyC: 3.0,
      supplyTempBelowRoomGte2C: true
      // missing returnOpeningHeightM, noMechanicalMixingDevices, protectedFromImpingingAirstreams
    };

    const contradictoryPersonalPrereqs: PersonalizedVentilationPrerequisites = {
      ...completeValidPersonalPrereqs,
      headRegionVelocityMs: 0.35, // violation: > 0.25 m/s
      headRegionVelocityMet: false
    };

    const incompletePersonalPrereqs = {
      airDistributedInBreathingZone: true
      // missing velocity, return height
    };

    // --- Stratified Tri-State Matrix ---
    describe('Stratified Tri-State Matrix', () => {
      it('Boolean omitted / undefined / null: Missing Boolean + missing structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({}).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: undefined }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: null }).status).toBe('INCOMPLETE');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + incomplete structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: incompleteStratPrereqs }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: incompleteStratPrereqs, stratifiedPrerequisitesMet: undefined }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: incompleteStratPrereqs, stratifiedPrerequisitesMet: null }).status).toBe('INCOMPLETE');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + complete valid structured evidence → allow PASS', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: completeValidStratPrereqs }).status).toBe('PASS');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: completeValidStratPrereqs, stratifiedPrerequisitesMet: undefined }).status).toBe('PASS');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: completeValidStratPrereqs, stratifiedPrerequisitesMet: null }).status).toBe('PASS');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + contradictory/invalid structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: contradictoryStratPrereqs }).status).toBe('FAIL');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: contradictoryStratPrereqs, stratifiedPrerequisitesMet: undefined }).status).toBe('FAIL');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisites: contradictoryStratPrereqs, stratifiedPrerequisitesMet: null }).status).toBe('FAIL');
      });

      it('Boolean TRUE: TRUE + missing structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: true }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: true, stratifiedPrerequisites: undefined }).status).toBe('INCOMPLETE');
      });

      it('Boolean TRUE: TRUE + incomplete structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: true, stratifiedPrerequisites: incompleteStratPrereqs }).status).toBe('INCOMPLETE');
      });

      it('Boolean TRUE: TRUE + complete valid structured evidence → PASS', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: true, stratifiedPrerequisites: completeValidStratPrereqs }).status).toBe('PASS');
      });

      it('Boolean TRUE: TRUE + contradictory/invalid structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: true, stratifiedPrerequisites: contradictoryStratPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + missing structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: false }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + incomplete structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: false, stratifiedPrerequisites: incompleteStratPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + complete valid structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: false, stratifiedPrerequisites: completeValidStratPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + contradictory structured evidence → FAIL', () => {
        expect(EzSelectionService.validateStratifiedPrerequisites({ stratifiedPrerequisitesMet: false, stratifiedPrerequisites: contradictoryStratPrereqs }).status).toBe('FAIL');
      });
    });

    // --- Personalized Tri-State Matrix ---
    describe('Personalized Tri-State Matrix', () => {
      it('Boolean omitted / undefined / null: Missing Boolean + missing structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({}).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: undefined }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: null }).status).toBe('INCOMPLETE');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + incomplete structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: incompletePersonalPrereqs }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: incompletePersonalPrereqs, personalizedPrerequisitesMet: undefined }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: incompletePersonalPrereqs, personalizedPrerequisitesMet: null }).status).toBe('INCOMPLETE');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + complete valid structured evidence → allow PASS', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: completeValidPersonalPrereqs }).status).toBe('PASS');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: completeValidPersonalPrereqs, personalizedPrerequisitesMet: undefined }).status).toBe('PASS');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: completeValidPersonalPrereqs, personalizedPrerequisitesMet: null }).status).toBe('PASS');
      });

      it('Boolean omitted / undefined / null: Missing Boolean + contradictory/invalid structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: contradictoryPersonalPrereqs }).status).toBe('FAIL');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: contradictoryPersonalPrereqs, personalizedPrerequisitesMet: undefined }).status).toBe('FAIL');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisites: contradictoryPersonalPrereqs, personalizedPrerequisitesMet: null }).status).toBe('FAIL');
      });

      it('Boolean TRUE: TRUE + missing structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: true }).status).toBe('INCOMPLETE');
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: true, personalizedPrerequisites: undefined }).status).toBe('INCOMPLETE');
      });

      it('Boolean TRUE: TRUE + incomplete structured evidence → INCOMPLETE', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: true, personalizedPrerequisites: incompletePersonalPrereqs }).status).toBe('INCOMPLETE');
      });

      it('Boolean TRUE: TRUE + complete valid structured evidence → PASS', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: true, personalizedPrerequisites: completeValidPersonalPrereqs }).status).toBe('PASS');
      });

      it('Boolean TRUE: TRUE + contradictory/invalid structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: true, personalizedPrerequisites: contradictoryPersonalPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + missing structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: false }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + incomplete structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: false, personalizedPrerequisites: incompletePersonalPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + complete valid structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: false, personalizedPrerequisites: completeValidPersonalPrereqs }).status).toBe('FAIL');
      });

      it('Boolean FALSE: FALSE + contradictory structured evidence → FAIL', () => {
        expect(EzSelectionService.validatePersonalizedPrerequisites({ personalizedPrerequisitesMet: false, personalizedPrerequisites: contradictoryPersonalPrereqs }).status).toBe('FAIL');
      });
    });
  });
});
