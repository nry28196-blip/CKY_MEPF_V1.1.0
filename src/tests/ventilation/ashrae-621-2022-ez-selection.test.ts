import { describe, it, expect } from 'vitest';
import {
  EzSelectionService,
  StratifiedVentilationPrerequisites,
  PersonalizedVentilationPrerequisites
} from '../../calculations/ventilation/EzSelectionService';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('ASHRAE 62.1-2022 Table 6-4 Ez Selection & Physical Conditions', () => {
  const get2022Ez = (id: string) => {
    const ez = StandardDataProvider.get621EzValues('2022').find(e => e.id === id);
    if (!ez) throw new Error(`Ez config ${id} not found`);
    return ez;
  };

  const office = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;

  it('resolves ceiling cooling to Ez = 1.0 (ez-1)', () => {
    const result = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'ceiling',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'cooling'
    });
    expect(result.status).toBe('PASS');
    expect(result.ez).toBe(1.0);
    expect(result.selectedConfig?.id).toBe('ez-1');
  });

  it('resolves ceiling warm air with ceiling return when DT >= 8C to Ez = 0.8 (ez-2)', () => {
    const result = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'ceiling',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'heating_gte_8c'
    });
    expect(result.status).toBe('PASS');
    expect(result.ez).toBe(0.8);
    expect(result.selectedConfig?.id).toBe('ez-2');
  });

  it('requires supplyJetVelocityMet when heating DT < 8C with ceiling return', () => {
    // Missing jet velocity
    const incomplete = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'ceiling',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'heating_lt_8c'
    });
    expect(incomplete.status).toBe('INCOMPLETE');

    // High velocity: jet reaches floor at >= 150 fpm (0.8 m/s) -> Ez = 1.0
    const highVel = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'ceiling',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'heating_lt_8c',
      supplyJetVelocityMet: true
    });
    expect(highVel.status).toBe('PASS');
    expect(highVel.ez).toBe(1.0);

    // Low velocity: jet does not reach floor at >= 150 fpm -> Ez = 0.8
    const lowVel = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'ceiling',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'heating_lt_8c',
      supplyJetVelocityMet: false
    });
    expect(lowVel.status).toBe('PASS');
    expect(lowVel.ez).toBe(0.8);
  });

  it('resolves floor supply displacement ventilation with return height dependency', () => {
    const validStrat: StratifiedVentilationPrerequisites = {
      tempDiffRoomSupplyC: 3.0,
      returnOpeningHeightM: 3.0,
      noMechanicalMixingDevices: true,
      protectedFromImpingingAirstreams: true
    };

    // Return height < 5.5 m -> Ez = 1.2 (Stratified Case 2)
    const resLow = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'floor',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'cooling',
      verticalThrowMet: false, // low velocity displacement
      returnHeightGte55m: false,
      stratifiedPrerequisites: validStrat,
      stratifiedPrerequisitesMet: true
    });
    expect(resLow.status).toBe('PASS');
    expect(resLow.ez).toBe(1.2);
    expect(resLow.selectedConfig?.id).toBe('ez-3');

    // Return height >= 5.5 m -> Ez = 1.5 (Stratified Case 3)
    const resHigh = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'floor',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'cooling',
      verticalThrowMet: false, // low velocity displacement
      returnHeightGte55m: true,
      stratifiedPrerequisites: validStrat,
      stratifiedPrerequisitesMet: true
    });
    expect(resHigh.status).toBe('PASS');
    expect(resHigh.ez).toBe(1.5);
    expect(resHigh.selectedConfig?.id).toBe('ez-floor-cool-strat-h-gte55m');

    // Case 1: vertical throw >= 0.25 m/s (60 fpm) at 1.4 m and ceiling return <= 5.5 m -> Ez = 1.05
    const resCase1 = EzSelectionService.resolveEzFromCriteria({
      supplyLocation: 'floor',
      returnLocation: 'ceiling',
      supplyTempRelationship: 'cooling',
      verticalThrowMet: true,
      returnHeightGte55m: false,
      stratifiedPrerequisites: validStrat,
      stratifiedPrerequisitesMet: true
    });
    expect(resCase1.status).toBe('PASS');
    expect(resCase1.ez).toBe(1.05);
    expect(resCase1.selectedConfig?.id).toBe('ez-floor-cool-strat-case1');
  });

  describe('ASHRAE 62.1-2022 Table 6-4 Stratified Selection Hardening', () => {
    // 1. Missing stratified prerequisites -> INCOMPLETE
    it('returns INCOMPLETE when stratified prerequisites are omitted', () => {
      const result = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0
      });
      expect(result.status).toBe('INCOMPLETE');
      expect(result.ez).toBeNull();
      expect(result.reasons[0]).toContain('Stratified');
    });

    // 2. stratifiedPrerequisitesMet=false -> FAIL
    it('returns FAIL when compact stratifiedPrerequisitesMet is false', () => {
      const result = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisitesMet: false
      });
      expect(result.status).toBe('FAIL');
      expect(result.ez).toBeNull();
      expect(result.reasons[0]).toContain('not satisfied');
    });

    // 3. stratifiedPrerequisitesMet=true without structured evidence -> INCOMPLETE
    it('returns INCOMPLETE when compact stratifiedPrerequisitesMet is true without structured evidence', () => {
      const result = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisitesMet: true
      });
      expect(result.status).toBe('INCOMPLETE');
      expect(result.ez).toBeNull();
    });

    // 4. Complete structured prerequisites -> allowed
    it('allows resolution when all structured prerequisites are satisfied', () => {
      const result = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(result.status).toBe('PASS');
      expect(result.ez).toBe(1.2);
    });

    // 5. Missing one structured prerequisite -> INCOMPLETE
    it('returns INCOMPLETE when any structured prerequisite is missing', () => {
      // Missing protectedFromImpingingAirstreams
      const missingProtection = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true
        }
      });
      expect(missingProtection.status).toBe('INCOMPLETE');
      expect(missingProtection.ez).toBeNull();

      // Missing noMechanicalMixingDevices
      const missingMixing = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(missingMixing.status).toBe('INCOMPLETE');
      expect(missingMixing.ez).toBeNull();

      // Missing return opening height
      const missingReturnOpening = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(missingReturnOpening.status).toBe('INCOMPLETE');
      expect(missingReturnOpening.ez).toBeNull();

      // Missing supply temperature difference
      const missingTemp = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(missingTemp.status).toBe('INCOMPLETE');
      expect(missingTemp.ez).toBeNull();
    });

    // 6. One failed structured prerequisite -> FAIL
    it('returns FAIL when any structured prerequisite is not satisfied', () => {
      // Supply temp difference < 2.0 C
      const lowTempDiff = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 1.5,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(lowTempDiff.status).toBe('FAIL');
      expect(lowTempDiff.ez).toBeNull();

      // Return opening height <= 2.8 m (exact 2.8 m fails: standard requires > 2.8 m)
      const exact28m = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 2.8,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(exact28m.status).toBe('FAIL');
      expect(exact28m.ez).toBeNull();

      // Return opening height 2.7 m fails
      const lowReturnOpening = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 2.7,
          returnOpeningHeightGt28m: false,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(lowReturnOpening.status).toBe('FAIL');
      expect(lowReturnOpening.ez).toBeNull();

      // Mechanical mixing devices present
      const mixingDevices = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: false,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(mixingDevices.status).toBe('FAIL');
      expect(mixingDevices.ez).toBeNull();

      // Impinging airstreams not protected
      const impingingAirstreams = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: false
        }
      });
      expect(impingingAirstreams.status).toBe('FAIL');
      expect(impingingAirstreams.ez).toBeNull();
    });

    // 7. Numeric/boolean contradiction -> FAIL
    it('returns FAIL on numeric and boolean contradictions in prerequisites or return height', () => {
      // Temp diff: 3.0 C + false -> FAIL
      const tempContradiction1 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 3.0,
          supplyTempBelowRoomGte2C: false,
          returnOpeningHeightM: 3.0,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(tempContradiction1.status).toBe('FAIL');
      expect(tempContradiction1.ez).toBeNull();

      // Temp diff: 2.0 C + false -> FAIL
      const tempContradiction2 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.0,
          supplyTempBelowRoomGte2C: false,
          returnOpeningHeightM: 3.0,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(tempContradiction2.status).toBe('FAIL');
      expect(tempContradiction2.ez).toBeNull();

      // Temp diff: 1.9 C + true -> FAIL
      const tempContradiction3 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 1.9,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(tempContradiction3.status).toBe('FAIL');
      expect(tempContradiction3.ez).toBeNull();

      // Return opening height: 3.0 m + false -> FAIL
      const heightContradiction1 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: false,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(heightContradiction1.status).toBe('FAIL');
      expect(heightContradiction1.ez).toBeNull();

      // Return opening height: 2.8 m + true -> FAIL (2.8 is not > 2.8)
      const heightContradiction2 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          returnOpeningHeightM: 2.8,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(heightContradiction2.status).toBe('FAIL');
      expect(heightContradiction2.ez).toBeNull();

      // Return opening height: 2.8 m + false -> FAIL (not > 2.8 m)
      const heightContradiction3 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          returnOpeningHeightM: 2.8,
          returnOpeningHeightGt28m: false,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(heightContradiction3.status).toBe('FAIL');
      expect(heightContradiction3.ez).toBeNull();

      // Return height (5.5m boundary): 5.500 m + returnHeightGt55m: true -> FAIL
      const boundaryContradiction1 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 5.500,
        returnHeightGt55m: true,
        stratifiedPrerequisitesMet: true
      });
      expect(boundaryContradiction1.status).toBe('FAIL');
      expect(boundaryContradiction1.ez).toBeNull();

      // Return height (5.5m boundary): 5.501 m + returnHeightGt55m: false -> FAIL
      const boundaryContradiction2 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 5.501,
        returnHeightGt55m: false,
        stratifiedPrerequisitesMet: true
      });
      expect(boundaryContradiction2.status).toBe('FAIL');
      expect(boundaryContradiction2.ez).toBeNull();

      // Contradictory boolean flags: returnHeightGt55m true vs returnHeightGte55m false
      const flagContradiction = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightGt55m: true,
        returnHeightGte55m: false,
        stratifiedPrerequisitesMet: true
      });
      expect(flagContradiction.status).toBe('FAIL');
      expect(flagContradiction.ez).toBeNull();

      // Structured prerequisites met but compact stratifiedPrerequisitesMet = false -> FAIL
      const structCompactContradiction = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 4.0,
        stratifiedPrerequisitesMet: false,
        stratifiedPrerequisites: {
          tempDiffRoomSupplyC: 2.5,
          supplyTempBelowRoomGte2C: true,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: true,
          noMechanicalMixingDevices: true,
          protectedFromImpingingAirstreams: true
        }
      });
      expect(structCompactContradiction.status).toBe('FAIL');
      expect(structCompactContradiction.ez).toBeNull();
    });

    // 8. 5.499 m -> low-height case (<= 5.5 m)
    it('treats 5.499 m as low-return-height (<= 5.5 m)', () => {
      const validStrat: StratifiedVentilationPrerequisites = {
        tempDiffRoomSupplyC: 3.0,
        returnOpeningHeightM: 3.0,
        noMechanicalMixingDevices: true,
        protectedFromImpingingAirstreams: true
      };

      // Case 2: low throw + <= 5.5 m -> Ez = 1.20
      const resCase2 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 5.499,
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true
      });
      expect(resCase2.status).toBe('PASS');
      expect(resCase2.ez).toBe(1.20);
      expect(resCase2.selectedConfig?.id).toBe('ez-3');

      // Case 1: high throw + <= 5.5 m -> Ez = 1.05
      const resCase1 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: true,
        returnHeightM: 5.499,
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true
      });
      expect(resCase1.status).toBe('PASS');
      expect(resCase1.ez).toBe(1.05);
      expect(resCase1.selectedConfig?.id).toBe('ez-floor-cool-strat-case1');
    });

    // 9. 5.500 m -> low-height case (<= 5.5 m)
    it('treats exactly 5.500 m as low-return-height (<= 5.5 m boundary belongs to <= 5.5 m case)', () => {
      const validStrat: StratifiedVentilationPrerequisites = {
        tempDiffRoomSupplyC: 3.0,
        returnOpeningHeightM: 3.0,
        noMechanicalMixingDevices: true,
        protectedFromImpingingAirstreams: true
      };

      // Case 2: low throw + <= 5.5 m -> Ez = 1.20
      const resCase2 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 5.500,
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true
      });
      expect(resCase2.status).toBe('PASS');
      expect(resCase2.ez).toBe(1.20);
      expect(resCase2.selectedConfig?.id).toBe('ez-3');

      // Case 1: high throw + <= 5.5 m -> Ez = 1.05
      const resCase1 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: true,
        returnHeightM: 5.500,
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true
      });
      expect(resCase1.status).toBe('PASS');
      expect(resCase1.ez).toBe(1.05);
      expect(resCase1.selectedConfig?.id).toBe('ez-floor-cool-strat-case1');
    });

    // 10. 5.501 m -> high-height case (> 5.5 m)
    it('treats 5.501 m as high-return-height (> 5.5 m)', () => {
      const validStrat: StratifiedVentilationPrerequisites = {
        tempDiffRoomSupplyC: 3.0,
        returnOpeningHeightM: 3.0,
        noMechanicalMixingDevices: true,
        protectedFromImpingingAirstreams: true
      };

      // Case 3: low throw + > 5.5 m -> Ez = 1.50
      const resCase3 = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'floor',
        returnLocation: 'ceiling',
        supplyTempRelationship: 'cooling',
        verticalThrowMet: false,
        returnHeightM: 5.501,
        stratifiedPrerequisites: validStrat,
        stratifiedPrerequisitesMet: true
      });
      expect(resCase3.status).toBe('PASS');
      expect(resCase3.ez).toBe(1.50);
      expect(resCase3.selectedConfig?.id).toBe('ez-floor-cool-strat-h-gte55m');
    });

    // 11. Preserved Ez values: 1.05 / 1.20 / 1.50
    it('preserves exact Table 6-4 Ez values: Case 1 = 1.05, Case 2 = 1.20, Case 3 = 1.50', () => {
      const case1 = get2022Ez('ez-floor-cool-strat-case1');
      expect(case1.ez).toBe(1.05);

      const case2 = get2022Ez('ez-3');
      expect(case2.ez).toBe(1.20);

      const case3 = get2022Ez('ez-floor-cool-strat-h-gte55m');
      expect(case3.ez).toBe(1.50);
    });
  });

  it('resolves personalized ventilation configurations and enforces prerequisites', () => {
    const validPersonal: PersonalizedVentilationPrerequisites = {
      airDistributedInBreathingZone: true,
      headRegionVelocityMs: 0.20,
      returnOpeningHeightM: 3.0
    };

    // Missing Section 6.2.1.2.2 prerequisites -> INCOMPLETE
    const noPrereq = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedSystemType: 'ceiling_cool'
    });
    expect(noPrereq.status).toBe('INCOMPLETE');
    expect(noPrereq.ez).toBeNull();

    // Explicitly failed Section 6.2.1.2.2 prerequisites -> FAIL
    const failedPrereq = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedPrerequisitesMet: false,
      personalizedSystemType: 'ceiling_cool'
    });
    expect(failedPrereq.status).toBe('FAIL');
    expect(failedPrereq.ez).toBeNull();

    // 1. Personalized air + ceiling supply cool air + ceiling return -> Ez = 1.40
    const p1 = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedPrerequisites: validPersonal,
      personalizedPrerequisitesMet: true,
      personalizedSystemType: 'ceiling_cool'
    });
    expect(p1.status).toBe('PASS');
    expect(p1.ez).toBe(1.40);
    expect(p1.selectedConfig?.id).toBe('ez-personalized-ceiling-cool');

    // 2. Personalized air + ceiling supply warm air + ceiling return -> Ez = 1.40
    const p2 = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedPrerequisites: validPersonal,
      personalizedPrerequisitesMet: true,
      personalizedSystemType: 'ceiling_warm'
    });
    expect(p2.status).toBe('PASS');
    expect(p2.ez).toBe(1.40);
    expect(p2.selectedConfig?.id).toBe('ez-personalized-ceiling-warm');

    // 3. Personalized air + stratified distribution + nonaspirating floor supply devices + ceiling return -> Ez = 1.20
    const p3 = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedPrerequisites: validPersonal,
      personalizedPrerequisitesMet: true,
      personalizedSystemType: 'stratified_nonaspirating'
    });
    expect(p3.status).toBe('PASS');
    expect(p3.ez).toBe(1.20);
    expect(p3.selectedConfig?.id).toBe('ez-personalized-strat-nonaspirating');

    // 4. Personalized air + stratified distribution + aspirating floor supply devices + ceiling return -> Ez = 1.50
    const p4 = EzSelectionService.resolveEzFromCriteria({
      isPersonalizedVentilation: true,
      personalizedPrerequisites: validPersonal,
      personalizedPrerequisitesMet: true,
      personalizedSystemType: 'stratified_aspirating'
    });
    expect(p4.status).toBe('PASS');
    expect(p4.ez).toBe(1.50);
    expect(p4.selectedConfig?.id).toBe('ez-personalized-strat-aspirating');
  });

  describe('ASHRAE 62.1-2022 Section 6.2.1.2.2 Personalized Ventilation Hardening', () => {
    // 1. Missing breathing-zone prerequisite -> INCOMPLETE
    it('returns INCOMPLETE when breathing-zone prerequisite is missing', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.ez).toBeNull();
      expect(res.reasons[0]).toContain('airDistributedInBreathingZone');
    });

    // 2. Breathing-zone prerequisite false -> FAIL
    it('returns FAIL when breathing-zone prerequisite is false', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: false,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.status).toBe('FAIL');
      expect(res.ez).toBeNull();
      expect(res.reasons[0]).toContain('breathing zone');
    });

    // 3. Head velocity missing -> INCOMPLETE
    it('returns INCOMPLETE when occupant head/facial-region velocity is missing', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.ez).toBeNull();
      expect(res.reasons[0]).toContain('velocity at occupant head region');
    });

    // 4. Head velocity = 0.25 m/s -> valid
    it('allows resolution when head velocity is exactly 0.25 m/s (boundary condition)', () => {
      const resNumeric = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.25,
          returnOpeningHeightM: 3.0
        }
      });
      expect(resNumeric.status).toBe('PASS');
      expect(resNumeric.ez).toBe(1.40);
      expect(resNumeric.selectedConfig?.id).toBe('ez-personalized-ceiling-cool');

      // Head velocity <= 0.25 m/s with boolean flag
      const resBool = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMet: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(resBool.status).toBe('PASS');
      expect(resBool.ez).toBe(1.40);
    });

    // 5. Head velocity > 0.25 m/s -> FAIL
    it('returns FAIL when head velocity exceeds 0.25 m/s', () => {
      // 0.26 m/s
      const res26 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.26,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res26.status).toBe('FAIL');
      expect(res26.ez).toBeNull();

      // 0.30 m/s
      const res30 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.30,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res30.status).toBe('FAIL');
      expect(res30.ez).toBeNull();

      // headRegionVelocityMet = false
      const resBoolFalse = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMet: false,
          returnOpeningHeightM: 3.0
        }
      });
      expect(resBoolFalse.status).toBe('FAIL');
      expect(resBoolFalse.ez).toBeNull();
    });

    // 6. Return height missing -> INCOMPLETE
    it('returns INCOMPLETE when return opening height is missing', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20
        }
      });
      expect(res.status).toBe('INCOMPLETE');
      expect(res.ez).toBeNull();
      expect(res.reasons[0]).toContain('return opening height');
    });

    // 7. Return height = 2.8 m -> FAIL (must be > 2.8 m)
    it('returns FAIL when return opening height is <= 2.8 m (exact 2.8 m must fail)', () => {
      // Exact 2.8 m fails
      const res28 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 2.8
        }
      });
      expect(res28.status).toBe('FAIL');
      expect(res28.ez).toBeNull();

      // 2.5 m fails
      const res25 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 2.5
        }
      });
      expect(res25.status).toBe('FAIL');
      expect(res25.ez).toBeNull();

      // Boolean returnOpeningHeightGt28m = false fails
      const resBoolFalse = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightGt28m: false
        }
      });
      expect(resBoolFalse.status).toBe('FAIL');
      expect(resBoolFalse.ez).toBeNull();
    });

    // 8. Return height > 2.8 m -> valid
    it('allows resolution when return opening height is > 2.8 m', () => {
      // 2.81 m > 2.8 m
      const res281 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 2.81
        }
      });
      expect(res281.status).toBe('PASS');
      expect(res281.ez).toBe(1.40);

      // 3.0 m > 2.8 m
      const res30 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0
        }
      });
      expect(res30.status).toBe('PASS');
      expect(res30.ez).toBe(1.40);

      // Boolean returnOpeningHeightGt28m = true
      const resBool = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightGt28m: true
        }
      });
      expect(resBool.status).toBe('PASS');
      expect(resBool.ez).toBe(1.40);
    });

    // 9. Numeric/boolean contradiction -> FAIL
    it('returns FAIL on numeric/boolean contradictions and inconsistent breathing-zone configurations', () => {
      // Head velocity: 0.20 m/s + false -> FAIL
      const velContra1 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          headRegionVelocityMet: false,
          returnOpeningHeightM: 3.0
        }
      });
      expect(velContra1.status).toBe('FAIL');
      expect(velContra1.ez).toBeNull();

      // Head velocity: 0.30 m/s + true -> FAIL
      const velContra2 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.30,
          headRegionVelocityMet: true,
          returnOpeningHeightM: 3.0
        }
      });
      expect(velContra2.status).toBe('FAIL');
      expect(velContra2.ez).toBeNull();

      // Return opening height: 3.0 m + false -> FAIL
      const heightContra1 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0,
          returnOpeningHeightGt28m: false
        }
      });
      expect(heightContra1.status).toBe('FAIL');
      expect(heightContra1.ez).toBeNull();

      // Return opening height: 2.8 m + true -> FAIL (2.8 is not > 2.8)
      const heightContra2 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 2.8,
          returnOpeningHeightGt28m: true
        }
      });
      expect(heightContra2.status).toBe('FAIL');
      expect(heightContra2.ez).toBeNull();

      // Return opening height: 2.8 m + false -> FAIL (not > 2.8 m)
      const heightContra3 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 2.8,
          returnOpeningHeightGt28m: false
        }
      });
      expect(heightContra3.status).toBe('FAIL');
      expect(heightContra3.ez).toBeNull();

      // Structured prerequisites met but compact personalizedPrerequisitesMet = false -> FAIL
      const structCompactContra = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: false,
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0
        }
      });
      expect(structCompactContra.status).toBe('FAIL');
      expect(structCompactContra.ez).toBeNull();

      // isPersonalizedVentilation = false with personalized configuration -> FAIL
      const isPersonalizedFalseContra = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: false,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: true
      });
      expect(isPersonalizedFalseContra.status).toBe('FAIL');
      expect(isPersonalizedFalseContra.ez).toBeNull();

      // personalizedSystemType + contradictory non-breathing-zone supply location -> FAIL
      const nonBzoneSupplyContra1 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        supplyLocation: 'ceiling',
        personalizedPrerequisitesMet: true
      });
      expect(nonBzoneSupplyContra1.status).toBe('FAIL');
      expect(nonBzoneSupplyContra1.ez).toBeNull();

      const nonBzoneSupplyContra2 = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'stratified_nonaspirating',
        supplyLocation: 'floor',
        personalizedPrerequisitesMet: true
      });
      expect(nonBzoneSupplyContra2.status).toBe('FAIL');
      expect(nonBzoneSupplyContra2.ez).toBeNull();

      // personalized category with incompatible supply location -> FAIL
      const catContra = EzSelectionService.resolveEzFromCriteria({
        distributionCategory: 'personalized',
        supplyLocation: 'floor',
        personalizedSystemType: 'stratified_nonaspirating',
        personalizedPrerequisitesMet: true
      });
      expect(catContra.status).toBe('FAIL');
      expect(catContra.ez).toBeNull();

      // incompatible category ceiling with isPersonalizedVentilation: true -> FAIL
      const catContra2 = EzSelectionService.resolveEzFromCriteria({
        distributionCategory: 'ceiling',
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        personalizedPrerequisitesMet: true
      });
      expect(catContra2.status).toBe('FAIL');
      expect(catContra2.ez).toBeNull();

      // return location floor with personalized configuration -> FAIL
      const returnLocationContra = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        returnLocation: 'floor',
        personalizedPrerequisitesMet: true
      });
      expect(returnLocationContra.status).toBe('FAIL');
      expect(returnLocationContra.ez).toBeNull();

      // ceiling_cool with warm supply air -> FAIL
      const tempContra = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        supplyAirCondition: 'warm',
        personalizedPrerequisitesMet: true
      });
      expect(tempContra.status).toBe('FAIL');
      expect(tempContra.ez).toBeNull();
    });

    // 10. Prerequisites validation: structured passes, compact boolean alone is INCOMPLETE
    it('resolves successfully with structured prerequisites and rejects compact boolean alone as INCOMPLETE', () => {
      // Structured
      const structuredRes = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'ceiling_cool',
        supplyLocation: 'breathing_zone',
        returnLocation: 'ceiling',
        personalizedPrerequisites: {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          headRegionVelocityMet: true,
          returnOpeningHeightM: 3.2,
          returnOpeningHeightGt28m: true
        }
      });
      expect(structuredRes.status).toBe('PASS');
      expect(structuredRes.ez).toBe(1.40);
      expect(structuredRes.selectedConfig?.id).toBe('ez-personalized-ceiling-cool');

      // Compact alone without structured evidence -> INCOMPLETE
      const compactRes = EzSelectionService.resolveEzFromCriteria({
        isPersonalizedVentilation: true,
        personalizedSystemType: 'stratified_aspirating',
        personalizedPrerequisitesMet: true
      });
      expect(compactRes.status).toBe('INCOMPLETE');
      expect(compactRes.ez).toBeNull();
    });

    // 11. All four personalized Table 6-4 values remain unchanged
    it('preserves exact Table 6-4 Ez values for all 4 personalized configurations: 1.40, 1.40, 1.20, 1.50', () => {
      const ceilCool = get2022Ez('ez-personalized-ceiling-cool');
      expect(ceilCool.ez).toBe(1.40);

      const ceilWarm = get2022Ez('ez-personalized-ceiling-warm');
      expect(ceilWarm.ez).toBe(1.40);

      const stratNonAsp = get2022Ez('ez-personalized-strat-nonaspirating');
      expect(stratNonAsp.ez).toBe(1.20);

      const stratAsp = get2022Ez('ez-personalized-strat-aspirating');
      expect(stratAsp.ez).toBe(1.50);
    });
  });

  it('resolves makeup air configurations based on explicit distance condition', () => {
    // Missing distance condition -> INCOMPLETE
    const missingDist = EzSelectionService.resolveEzFromCriteria({
      distributionCategory: 'makeup'
    });
    expect(missingDist.status).toBe('INCOMPLETE');
    expect(missingDist.ez).toBeNull();

    // Outlet located more than half the length of the space from exhaust/return -> Ez = 0.8
    const far = EzSelectionService.resolveEzFromCriteria({
      distributionCategory: 'makeup',
      makeupAirDistance: 'greater_than_half_length'
    });
    expect(far.status).toBe('PASS');
    expect(far.ez).toBe(0.8);
    expect(far.selectedConfig?.id).toBe('ez-makeup-more-half-length');

    // Outlet located less than half the length of the space from exhaust/return -> Ez = 0.5
    const near = EzSelectionService.resolveEzFromCriteria({
      distributionCategory: 'makeup',
      makeupAirDistance: 'less_than_half_length'
    });
    expect(near.status).toBe('PASS');
    expect(near.ez).toBe(0.5);
    expect(near.selectedConfig?.id).toBe('ez-makeup-direct-exhaust');
  });

  it('validates physical conditions in Ashrae621ZoneService', () => {
    // When engineer specifies ez-3 (displacement Ez = 1.2), but supplies warm air instead of cool
    const invalidTemp = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: get2022Ez('ez-3'),
      supplyTempRelationship: 'heating_gte_8c'
    });
    expect(invalidTemp.status).toBe('FAIL');
    expect(invalidTemp.reason).toContain('cooling');

    // When conditions are compliant, passes
    const validStrat: StratifiedVentilationPrerequisites = {
      tempDiffRoomSupplyC: 3.0,
      returnOpeningHeightM: 3.0,
      noMechanicalMixingDevices: true,
      protectedFromImpingingAirstreams: true
    };

    const validCool = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: get2022Ez('ez-3'),
      supplyTempRelationship: 'cooling',
      verticalThrowMet: false,
      returnHeightGte55m: false,
      stratifiedPrerequisites: validStrat,
      stratifiedPrerequisitesMet: true
    });
    expect(validCool.status).toBe('PASS');
    expect(validCool.ez).toBe(1.2);
  });

  describe('REGRESSION: Mandatory Physical Qualification Enforcement (No Direct Ez Injection Bypass)', () => {
    // 1. Stratified Distribution Safety Gate (Table 6-4 & Section 6.2.1.2.1)
    describe('Stratified Distribution Safety Gate', () => {
      const validStrat: StratifiedVentilationPrerequisites = {
        tempDiffRoomSupplyC: 3.0,
        returnOpeningHeightM: 3.0,
        noMechanicalMixingDevices: true,
        protectedFromImpingingAirstreams: true
      };

      it('rejects directly injected verified ez-3 with missing prerequisite evidence as INCOMPLETE in calculateZone', () => {
        // Direct injection of verified Table 6-4 ez-3 with no conditions
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3')
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.voz).toBeNull();
      });

      it('rejects directly injected ez-3 when stratified prerequisites are omitted in calculateZone', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false
          // stratifiedPrerequisitesMet omitted
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.reason).toContain('Stratified system prerequisites');
        expect(result.voz).toBeNull();
      });

      it('rejects directly injected ez-3 when vertical throw is omitted in calculateZone', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          returnHeightGte55m: false,
          stratifiedPrerequisites: validStrat,
          stratifiedPrerequisitesMet: true
          // verticalThrowMet omitted
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.reason).toContain('vertical throw');
        expect(result.voz).toBeNull();
      });

      it('rejects directly injected ez-3 when return height is omitted in calculateZone', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          stratifiedPrerequisites: validStrat,
          stratifiedPrerequisitesMet: true
          // returnHeight omitted
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.reason).toContain('return height');
        expect(result.voz).toBeNull();
      });

      it('rejects directly injected ez-3 when prerequisites FAIL (compact or structured) in calculateZone', () => {
        // Compact failed
        const compactFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisitesMet: false
        });
        expect(compactFail.status).toBe('FAIL');

        // Structured failed (temperature difference < 2C)
        const structTempFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisites: {
            tempDiffRoomSupplyC: 1.5,
            returnOpeningHeightM: 3.0,
            noMechanicalMixingDevices: true,
            protectedFromImpingingAirstreams: true
          }
        });
        expect(structTempFail.status).toBe('FAIL');

        // Structured failed (return opening <= 2.8m)
        const structHeightFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisites: {
            tempDiffRoomSupplyC: 3.0,
            returnOpeningHeightM: 2.7,
            noMechanicalMixingDevices: true,
            protectedFromImpingingAirstreams: true
          }
        });
        expect(structHeightFail.status).toBe('FAIL');
      });

      it('rejects directly injected ez-3 on CONTRADICTORY prerequisites in calculateZone', () => {
        // Contradictory temperature (warm air for stratified cooling)
        const warmFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'heating_gte_8c',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisitesMet: true
        });
        expect(warmFail.status).toBe('FAIL');

        // Contradictory vertical throw for ez-3 (requires vertical throw < 0.25 m/s, so verticalThrowMet must be false)
        const throwFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: true,
          returnHeightGte55m: false,
          stratifiedPrerequisitesMet: true
        });
        expect(throwFail.status).toBe('FAIL');

        // Contradictory return height for ez-3 (requires return height <= 5.5 m, so returnHeightGte55m must be false)
        const heightFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: true,
          stratifiedPrerequisitesMet: true
        });
        expect(heightFail.status).toBe('FAIL');

        // Contradictory numeric and boolean return height
        const numBoolContradiction = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightM: 6.0,
          returnHeightGt55m: false,
          stratifiedPrerequisitesMet: true
        });
        expect(numBoolContradiction.status).toBe('FAIL');
      });

      it('allows directly injected ez-3 when VALID prerequisite evidence is provided in calculateZone', () => {
        const allowed = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3'),
          supplyTempRelationship: 'cooling',
          verticalThrowMet: false,
          returnHeightGte55m: false,
          stratifiedPrerequisites: {
            tempDiffRoomSupplyC: 3.0,
            returnOpeningHeightM: 3.0,
            noMechanicalMixingDevices: true,
            protectedFromImpingingAirstreams: true
          },
          stratifiedPrerequisitesMet: true
        });
        expect(allowed.status).toBe('PASS');
        expect(allowed.ez).toBe(1.2);
        expect(allowed.voz).toBeGreaterThan(0);
      });
    });

    // 2. Personalized Ventilation Safety Gate (Table 6-4 & Section 6.2.1.2.2)
    describe('Personalized Ventilation Safety Gate', () => {
      it('rejects directly injected verified personalized config with missing prerequisite evidence as INCOMPLETE in calculateZone', () => {
        // ez-personalized-ceiling-cool with no condition inputs
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool')
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.voz).toBeNull();
      });

      it('rejects directly injected personalized config when prerequisites FAIL in calculateZone', () => {
        // Compact failed
        const compactFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisitesMet: false
        });
        expect(compactFail.status).toBe('FAIL');

        // Structured failed (breathing zone distribution false)
        const structBzFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisites: {
            airDistributedInBreathingZone: false,
            headRegionVelocityMs: 0.20,
            returnOpeningHeightM: 3.0
          }
        });
        expect(structBzFail.status).toBe('FAIL');

        // Structured failed (velocity > 0.25 m/s)
        const structVelFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisites: {
            airDistributedInBreathingZone: true,
            headRegionVelocityMs: 0.35,
            returnOpeningHeightM: 3.0
          }
        });
        expect(structVelFail.status).toBe('FAIL');
      });

      it('rejects directly injected personalized config on CONTRADICTORY prerequisites in calculateZone', () => {
        // Warm supply air to ceiling-cool personalized
        const warmFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'heating_gte_8c',
          personalizedPrerequisitesMet: true
        });
        expect(warmFail.status).toBe('FAIL');

        // Cool supply air to ceiling-warm personalized
        const coolFail = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-warm'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisitesMet: true
        });
        expect(coolFail.status).toBe('FAIL');

        // Numeric velocity contradicts boolean indicator
        const velContradiction = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisites: {
            airDistributedInBreathingZone: true,
            headRegionVelocityMs: 0.30,
            headRegionVelocityMet: true,
            returnOpeningHeightM: 3.0
          }
        });
        expect(velContradiction.status).toBe('FAIL');
      });

      it('allows directly injected personalized config when VALID prerequisite evidence is provided in calculateZone', () => {
        const validPersonal: PersonalizedVentilationPrerequisites = {
          airDistributedInBreathingZone: true,
          headRegionVelocityMs: 0.20,
          returnOpeningHeightM: 3.0
        };

        const allowedCool = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool'),
          supplyTempRelationship: 'cooling',
          personalizedPrerequisites: validPersonal,
          personalizedPrerequisitesMet: true
        });
        expect(allowedCool.status).toBe('PASS');
        expect(allowedCool.ez).toBe(1.40);
        expect(allowedCool.voz).toBeGreaterThan(0);

        const allowedWarm = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-warm'),
          supplyTempRelationship: 'heating_gte_8c',
          personalizedPrerequisites: validPersonal,
          personalizedPrerequisitesMet: true
        });
        expect(allowedWarm.status).toBe('PASS');
        expect(allowedWarm.ez).toBe(1.40);
      });
    });

    // 3. Conditional Warm-Air Configurations Safety Gate
    describe('Conditional Warm-Air Configurations Safety Gate', () => {
      it('rejects directly injected ez-2 (>= 8C diff) when condition is missing as INCOMPLETE in calculateZone', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-2')
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.reason).toContain('supply temperature relationship');
      });

      it('rejects directly injected ez-2 on WRONG condition as FAIL in calculateZone', () => {
        // Wrong condition: heating_lt_8c
        const lt8c = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-2'),
          supplyTempRelationship: 'heating_lt_8c'
        });
        expect(lt8c.status).toBe('FAIL');

        // Wrong condition: cooling
        const cooling = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-2'),
          supplyTempRelationship: 'cooling'
        });
        expect(cooling.status).toBe('FAIL');
      });

      it('allows directly injected ez-2 when correct condition heating_gte_8c is provided', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-2'),
          supplyTempRelationship: 'heating_gte_8c'
        });
        expect(result.status).toBe('PASS');
        expect(result.ez).toBe(0.8);
      });

      it('enforces velocity condition on ez-ceil-warm-lt8c-highvel (missing -> INCOMPLETE, wrong -> FAIL, valid -> PASS)', () => {
        // Missing velocity
        const missing = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-ceil-warm-lt8c-highvel'),
          supplyTempRelationship: 'heating_lt_8c'
        });
        expect(missing.status).toBe('INCOMPLETE');

        // Wrong velocity
        const wrong = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-ceil-warm-lt8c-highvel'),
          supplyTempRelationship: 'heating_lt_8c',
          supplyJetVelocityMet: false
        });
        expect(wrong.status).toBe('FAIL');

        // Valid
        const valid = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-ceil-warm-lt8c-highvel'),
          supplyTempRelationship: 'heating_lt_8c',
          supplyJetVelocityMet: true
        });
        expect(valid.status).toBe('PASS');
        expect(valid.ez).toBe(1.0);
      });

      it('enforces velocity condition on ez-floor-warm-ceil-ret (missing -> INCOMPLETE, wrong -> FAIL, valid -> PASS)', () => {
        // Missing velocity
        const missing = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-floor-warm-ceil-ret'),
          supplyTempRelationship: 'heating_gte_8c'
        });
        expect(missing.status).toBe('INCOMPLETE');

        // Wrong velocity
        const wrong = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-floor-warm-ceil-ret'),
          supplyTempRelationship: 'heating_gte_8c',
          supplyJetVelocityMet: false
        });
        expect(wrong.status).toBe('FAIL');

        // Valid
        const valid = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-floor-warm-ceil-ret'),
          supplyTempRelationship: 'heating_gte_8c',
          supplyJetVelocityMet: true
        });
        expect(valid.status).toBe('PASS');
        expect(valid.ez).toBe(0.7);
      });
    });

    // 4. Makeup Configurations Safety Gate
    describe('Makeup Configurations Safety Gate', () => {
      it('rejects directly injected makeup config when distance condition is missing as INCOMPLETE in calculateZone', () => {
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-makeup-more-half-length')
        });
        expect(result.status).toBe('INCOMPLETE');
        expect(result.reason).toContain('Missing makeup supply outlet location');
      });

      it('rejects directly injected makeup config on CONTRADICTORY distance condition as FAIL in calculateZone', () => {
        // ez-makeup-more-half-length with less_than_half_length
        const contraFar = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-makeup-more-half-length'),
          makeupAirDistance: 'less_than_half_length'
        });
        expect(contraFar.status).toBe('FAIL');

        // ez-makeup-direct-exhaust with greater_than_half_length
        const contraNear = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-makeup-direct-exhaust'),
          makeupAirDistance: 'greater_than_half_length'
        });
        expect(contraNear.status).toBe('FAIL');
      });

      it('allows directly injected makeup config when qualifying distance condition matches', () => {
        const allowedFar = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-makeup-more-half-length'),
          makeupAirDistance: 'greater_than_half_length'
        });
        expect(allowedFar.status).toBe('PASS');
        expect(allowedFar.ez).toBe(0.8);

        const allowedNear = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-makeup-direct-exhaust'),
          makeupAirDistance: 'less_than_half_length'
        });
        expect(allowedNear.status).toBe('PASS');
        expect(allowedNear.ez).toBe(0.5);
      });
    });

    // 5. Unidirectional Configuration Safety Gate
    describe('Unidirectional Configuration Safety Gate', () => {
      it('always blocks ez-unidirectional-flow in both EzSelectionService and calculateZone', () => {
        // Direct EzSelectionService resolution
        const resolution = EzSelectionService.resolveEzFromCriteria({
          distributionCategory: 'unidirectional'
        });
        expect(resolution.status).toBe('BLOCKED');

        // Direct validateEzConfiguration
        const validation = EzSelectionService.validateEzConfiguration(get2022Ez('ez-unidirectional-flow'));
        expect(validation.valid).toBe(false);
        expect(validation.status).toBe('BLOCKED');

        // Direct calculateZone injection
        const result = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-unidirectional-flow')
        });
        expect(result.status).toBe('BLOCKED');
        expect(result.voz).toBeNull();
      });
    });

    // 6. Ez Numeric Value Inference Prevention
    describe('Numeric Ez Value Inference Prevention', () => {
      it('never silently infers qualifying physical conditions from the numeric Ez value itself', () => {
        // Caller injects ez-3 with numeric Ez=1.20, but no conditions
        const resStrat = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-3')
        });
        // Must NOT infer verticalThrowMet=false or returnHeight<=5.5 or stratifiedPrerequisitesMet=true
        expect(resStrat.status).toBe('INCOMPLETE');
        expect(resStrat.voz).toBeNull();

        // Caller injects ez-personalized-ceiling-cool with numeric Ez=1.40, but no conditions
        const resPersonal = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-personalized-ceiling-cool')
        });
        // Must NOT infer personalizedPrerequisitesMet=true
        expect(resPersonal.status).toBe('INCOMPLETE');
        expect(resPersonal.voz).toBeNull();

        // Caller injects ez-2 with numeric Ez=0.80, but no conditions
        const resWarm = Ashrae621ZoneService.calculateZone({
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: get2022Ez('ez-2')
        });
        // Must NOT infer heating_gte_8c
        expect(resWarm.status).toBe('INCOMPLETE');
        expect(resWarm.voz).toBeNull();
      });
    });
  });

  it('marks manual override with NOT_VERIFIED status in resolution and BLOCKED in safety gate', () => {
    const overrideResolution = EzSelectionService.resolveEzFromCriteria({
      manualOverride: {
        ezValue: 1.1,
        basis: 'CFD simulation report #104'
      }
    });
    expect(overrideResolution.status).toBe('NOT_VERIFIED');
    expect(overrideResolution.ez).toBe(1.1);

    const result = Ashrae621ZoneService.calculateZone({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      spaceType: office,
      area: 100,
      designOccupancy: 5,
      useDefaultOccupancy: false,
      ezConfig: overrideResolution.ezConfig!
    });

    // In production safety gate, unverified data is blocked from uncertified calculation
    expect(result.status).toBe('BLOCKED');
  });

  describe('Final Release Verification — Verified Issues 1 and 2 (Ez Qualification & Manual Override)', () => {
    const ezCeilWarmFloorRet = get2022Ez('ez-ceil-warm-floor-ret');
    const ezFloorWarmFloorRet = get2022Ez('ez-floor-warm-floor-ret');
    const ezCooling1 = get2022Ez('ez-1');

    // Test A: Select ez-ceil-warm-floor-ret with no qualifying conditions
    it('Test A: Select ez-ceil-warm-floor-ret with no qualifying conditions -> INCOMPLETE / non-authoritative', () => {
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCeilWarmFloorRet
      });
      expect(zoneRes.status).toBe('INCOMPLETE');
      expect(zoneRes.voz).toBeNull();

      const prodRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCeilWarmFloorRet
        }
      });
      expect(prodRes.status).toBe('INCOMPLETE');
      expect(prodRes.isAuthoritative).toBe(false);
      expect(prodRes.isApprovedForEngineeringUse).toBe(false);
      expect(prodRes.finalDesignOutdoorAir).toBeNull();
    });

    // Test B: Select ez-floor-warm-floor-ret with no qualifying conditions
    it('Test B: Select ez-floor-warm-floor-ret with no qualifying conditions -> INCOMPLETE / non-authoritative', () => {
      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezFloorWarmFloorRet
      });
      expect(zoneRes.status).toBe('INCOMPLETE');
      expect(zoneRes.voz).toBeNull();

      const prodRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezFloorWarmFloorRet
        }
      });
      expect(prodRes.status).toBe('INCOMPLETE');
      expect(prodRes.isAuthoritative).toBe(false);
      expect(prodRes.isApprovedForEngineeringUse).toBe(false);
      expect(prodRes.finalDesignOutdoorAir).toBeNull();
    });

    // Test C: Provide contradictory conditions
    it('Test C: Provide contradictory conditions -> FAIL or BLOCKED', () => {
      // Contradictory cooling on ceiling warm air supply
      const contraTemp1 = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCeilWarmFloorRet,
        supplyAirCondition: 'cool',
        supplyTempRelationship: 'cooling'
      });
      expect(contraTemp1.status).toBe('FAIL');
      expect(contraTemp1.voz).toBeNull();

      // Contradictory cooling on floor warm air supply
      const contraTemp2 = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezFloorWarmFloorRet,
        supplyAirCondition: 'cool',
        supplyTempRelationship: 'cooling'
      });
      expect(contraTemp2.status).toBe('FAIL');
      expect(contraTemp2.voz).toBeNull();

      // Contradictory return location (ceiling return on floor return config)
      const contraLoc = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCeilWarmFloorRet,
        supplyAirCondition: 'warm',
        supplyTempRelationship: 'heating_gte_8c',
        returnLocation: 'ceiling' // Contradicts floor return!
      });
      expect(contraLoc.status).toBe('FAIL');
      expect(contraLoc.voz).toBeNull();
    });

    // Test D: Provide valid matching conditions
    it('Test D: Provide valid matching conditions -> PASS and authoritative', () => {
      const prodRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCeilWarmFloorRet,
          supplyAirCondition: 'warm',
          supplyTempRelationship: 'heating_gte_8c',
          supplyLocation: 'ceiling',
          returnLocation: 'floor'
        }
      });
      expect(prodRes.status).toBe('PASS');
      expect(prodRes.isAuthoritative).toBe(true);
      expect(prodRes.isApprovedForEngineeringUse).toBe(true);
      expect(prodRes.finalDesignOutdoorAir).toBeGreaterThan(0);
      expect(prodRes.voz).toBeGreaterThan(0);

      const prodResFloor = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezFloorWarmFloorRet,
          supplyAirCondition: 'warm',
          supplyTempRelationship: 'heating_gte_8c',
          supplyLocation: 'floor',
          returnLocation: 'floor'
        }
      });
      expect(prodResFloor.status).toBe('PASS');
      expect(prodResFloor.isAuthoritative).toBe(true);
      expect(prodResFloor.isApprovedForEngineeringUse).toBe(true);
      expect(prodResFloor.finalDesignOutdoorAir).toBeGreaterThan(0);
    });

    // Test E: Provide conditions belonging to a different Ez configuration
    it('Test E: Provide conditions belonging to a different Ez configuration -> FAIL or BLOCKED', () => {
      // Conditions for ez-2 (ceiling supply + ceiling return) passed into ez-ceil-warm-floor-ret
      const diffConfig1 = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezCeilWarmFloorRet,
        supplyAirCondition: 'warm',
        supplyTempRelationship: 'heating_gte_8c',
        supplyLocation: 'ceiling',
        returnLocation: 'ceiling' // ez-2 return location, NOT floor
      });
      expect(diffConfig1.status).toBe('FAIL');
      expect(diffConfig1.voz).toBeNull();

      // Conditions for ez-1 (cooling ceiling/ceiling) passed into ez-floor-warm-floor-ret
      const diffConfig2 = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezFloorWarmFloorRet,
        supplyAirCondition: 'cool',
        supplyTempRelationship: 'cooling',
        supplyLocation: 'ceiling',
        returnLocation: 'ceiling'
      });
      expect(diffConfig2.status).toBe('FAIL');
      expect(diffConfig2.voz).toBeNull();
    });

    // Test F: Manual Ez override WITH justification
    it('Test F: Manual Ez override WITH justification -> NOT_VERIFIED or BLOCKED at production boundary, non-authoritative, null output', () => {
      const manualEz = EzSelectionService.createManualOverride(1.15, 'On-site tracer gas decay test measured Ez = 1.15 per ASTM E741');
      expect(manualEz.isManualOverride).toBe(true);
      expect(manualEz.manualOverrideBasis).toBeTruthy();

      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: manualEz
      });
      expect(['NOT_VERIFIED', 'BLOCKED']).toContain(zoneRes.status);
      expect(zoneRes.voz).toBeNull();

      const prodRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: manualEz
        }
      });
      expect(['NOT_VERIFIED', 'BLOCKED']).toContain(prodRes.status);
      expect(prodRes.isAuthoritative).toBe(false);
      expect(prodRes.isApprovedForEngineeringUse).toBe(false);
      expect(prodRes.voz).toBeNull();
      expect(prodRes.vot).toBeNull();
      expect(prodRes.finalDesignOutdoorAir).toBeNull();
    });

    // Test G: Manual Ez override WITHOUT justification
    it('Test G: Manual Ez override WITHOUT justification -> INCOMPLETE', () => {
      const unjustifiedOverride = {
        ...EzSelectionService.createManualOverride(1.15, ''),
        manualOverrideBasis: '',
        manualJustification: ''
      };

      const zoneRes = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: unjustifiedOverride
      });
      expect(zoneRes.status).toBe('INCOMPLETE');
      expect(zoneRes.voz).toBeNull();
    });

    // Test H: Normal verified Table 6-4 Ez remains unchanged and produces normal PASS behavior
    it('Test H: Normal verified Table 6-4 Ez remains unchanged and produces normal PASS behavior', () => {
      const prodRes = VentilationEngine.runSingleZone({
        edition: '2022',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: office,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: ezCooling1
        }
      });
      expect(prodRes.status).toBe('PASS');
      expect(prodRes.isAuthoritative).toBe(true);
      expect(prodRes.isApprovedForEngineeringUse).toBe(true);
      expect(prodRes.finalDesignOutdoorAir).toBeGreaterThan(0);
      expect(prodRes.voz).toBeGreaterThan(0);
      expect(prodRes.auditRecord).toBeDefined();
      expect(prodRes.auditRecord?.finalResult.isAuthoritative).toBe(true);
      expect(prodRes.auditRecord?.isApprovedForEngineeringUse).toBe(true);
    });

    // Test I: Fallback prevents any conditional Table 6-4 configuration from escaping without physical qualification
    it('Test I: Fallback safety gate BLOCKS any conditional configuration attempting to escape without proof', () => {
      const syntheticConditionalEz = {
        ...ezCooling1,
        id: 'ez-synthetic-conditional',
        supplyAirCondition: 'warm' as const,
        verticalThrowCondition: 'Vertical throw >= 0.25 m/s'
      };
      const validation = EzSelectionService.validateEzConfiguration(syntheticConditionalEz);
      expect(validation.valid).toBe(false);
      expect(validation.status).toBe('BLOCKED');
      expect(validation.reasons[0]).toContain('cannot pass without verified physical qualification evidence');
    });
  });
});
