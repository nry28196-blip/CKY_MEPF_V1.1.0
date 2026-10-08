import { Ashrae621Ez, SourceType } from '../../data/ventilation/ashrae621/types';
import { ASHRAE_621_2022_EZ_VALUES } from '../../data/ventilation/ashrae621/2022/data';
import { ValidationStatus } from './VentilationValidationService';
import { EngineeringValidationLogger } from '../validation/EngineeringValidationLogger';

export interface PersonalizedVentilationPrerequisites {
  /** Personalized air distributed in the breathing zone */
  airDistributedInBreathingZone?: boolean | null;
  /** Velocity at occupant head/facial region (m/s). Must be <= 0.25 m/s */
  headRegionVelocityMs?: number | null;
  /** Or boolean indicating velocity <= 0.25 m/s */
  headRegionVelocityMet?: boolean | null;
  /** Return air openings/pathways height above floor (m). Must be > 2.8 m */
  returnOpeningHeightM?: number | null;
  /** Or boolean indicating return opening height > 2.8 m */
  returnOpeningHeightGt28m?: boolean | null;
}

export interface StratifiedSystemPrerequisites {
  /** Cool supply air at least 2°C below average room air temperature */
  tempDiffRoomSupplyC?: number | null;
  supplyTempBelowRoomGte2C?: boolean | null;
  /** Return air openings/pathways located > 2.8 m above floor */
  returnOpeningHeightM?: number | null;
  returnOpeningHeightGt28m?: boolean | null;
  /** No devices that mechanically mix the air */
  noMechanicalMixingDevices?: boolean | null;
  /** Protection from impinging airstreams from adjacent ventilation zones */
  protectedFromImpingingAirstreams?: boolean | null;
}

export type StratifiedVentilationPrerequisites = StratifiedSystemPrerequisites;

export interface EzSelectionCriteria {
  distributionCategory?: 'ceiling' | 'floor' | 'makeup' | 'personalized' | 'unidirectional' | 'override' | 'stratified';
  supplyLocation?: 'ceiling' | 'floor' | 'breathing_zone' | 'other';
  returnLocation?: 'ceiling' | 'floor' | 'other';
  supplyAirCondition?: 'cool' | 'warm' | 'isothermal' | 'any';
  spaceTempRelationship?: 'cooling' | 'heating_gte_8c' | 'heating_lt_8c' | 'none' | null;
  supplyTempRelationship?: 'cooling' | 'heating_gte_8c' | 'heating_lt_8c' | 'none' | null;
  supplyJetVelocityMet?: boolean | null; // true if supply jet velocity >= 0.8 m/s (150 fpm) within 1.4 m of floor
  verticalThrowMet?: boolean | null; // true if vertical throw of cool air >= 0.25 m/s (60 fpm) at 1.4 m
  returnHeightM?: number | null; // Exact return height (m). Boundary is > 5.5 m vs <= 5.5 m.
  returnHeightGt55m?: boolean | null; // true if return height > 5.5 m (18 ft); false if <= 5.5 m
  returnHeightGte55m?: boolean | null; // Backward compatibility alias for returnHeightGt55m
  isDirectMakeupExhaust?: boolean;
  makeupAirDistance?: 'greater_than_half_length' | 'less_than_half_length' | null; // relative to half space length
  isPersonalizedVentilation?: boolean;
  personalizedPrerequisites?: PersonalizedVentilationPrerequisites;
  personalizedPrerequisitesMet?: boolean | null; // Section 6.2.1.2.2 prerequisites verified
  personalizedSystemType?: 'ceiling_cool' | 'ceiling_warm' | 'stratified_nonaspirating' | 'stratified_aspirating' | null;
  stratifiedPrerequisites?: StratifiedSystemPrerequisites;
  stratifiedPrerequisitesMet?: boolean | null; // Section 6.2.1.2.1 prerequisites verified
  manualOverride?: {
    ezValue: number;
    basis: string;
  };
}

export interface EzValidationConditions {
  supplyLocation?: 'ceiling' | 'floor' | 'breathing_zone' | 'other' | null;
  returnLocation?: 'ceiling' | 'floor' | 'other' | null;
  supplyTempRelationship?: 'cooling' | 'heating_gte_8c' | 'heating_lt_8c' | 'none' | null;
  spaceTempRelationship?: 'cooling' | 'heating_gte_8c' | 'heating_lt_8c' | 'none' | null;
  supplyAirCondition?: 'cool' | 'warm' | 'isothermal' | 'any' | null;
  verticalThrowMet?: boolean | null;
  returnHeightM?: number | null;
  returnHeightGt55m?: boolean | null;
  returnHeightGte55m?: boolean | null;
  supplyJetVelocityMet?: boolean | null;
  makeupAirDistance?: 'greater_than_half_length' | 'less_than_half_length' | null;
  isDirectMakeupExhaust?: boolean;
  isPersonalizedVentilation?: boolean;
  personalizedPrerequisites?: PersonalizedVentilationPrerequisites;
  personalizedPrerequisitesMet?: boolean | null;
  personalizedSystemType?: 'ceiling_cool' | 'ceiling_warm' | 'stratified_nonaspirating' | 'stratified_aspirating' | null;
  stratifiedPrerequisites?: StratifiedSystemPrerequisites;
  stratifiedPrerequisitesMet?: boolean | null;
  distributionCategory?: 'ceiling' | 'floor' | 'makeup' | 'personalized' | 'unidirectional' | 'override' | 'stratified' | null;
}

export interface EzResolutionResult {
  ezConfig: Ashrae621Ez | null;
  selectedConfig?: Ashrae621Ez | null;
  ez?: number | null;
  status: ValidationStatus;
  reasons: string[];
}

export class EzSelectionService {
  /**
   * Retrieves all Table 6-4 records for the 2022 standard edition.
   * Note: Contains both verified records and non-production unverified records (e.g., ez-unidirectional-flow).
   */
  static getTable64Values(): Ashrae621Ez[] {
    return ASHRAE_621_2022_EZ_VALUES;
  }

  /**
   * Retrieves only production-verified Table 6-4 records for the 2022 standard edition.
   */
  static getVerifiedTable64Values(): Ashrae621Ez[] {
    return ASHRAE_621_2022_EZ_VALUES.filter(e => e.verificationStatus === 'VERIFIED' && e.id !== 'ez-unidirectional-flow');
  }

  /**
   * Creates a properly labeled Manual Engineering Override record.
   * This is never labeled "ASHRAE Table 6-4".
   */
  static createManualOverride(ezValue: number, basis: string, edition: string = '2022'): Ashrae621Ez {
    return {
      id: `manual-override-${Date.now()}`,
      name: 'Manual Engineering Override',
      standard: 'ASHRAE 62.1',
      edition,
      configuration: 'Manual Engineering Override',
      applicableCondition: basis || 'User specified override',
      supplyArrangement: 'Custom',
      returnArrangement: 'Custom',
      ez: ezValue,
      reference: 'Manual Engineering Override (Non-Table 6-4)',
      distributionCategory: 'override',
      isManualOverride: true,
      manualOverrideBasis: basis,
      sourceType: SourceType.USER_OVERRIDE,
      verificationStatus: 'NOT_VERIFIED',
      verificationDate: new Date().toISOString().split('T')[0],
      revisionState: {
        standard: 'ASHRAE 62.1',
        edition: '2022',
        baseEdition: '2022',
        publishedAddendaApplied: [],
        publishedErrataApplied: [],
        verificationDate: new Date().toISOString().split('T')[0],
        source: SourceType.USER_OVERRIDE
      }
    };
  }

  /**
   * Resolves a standard-derived Table 6-4 Ez record from physical system configuration inputs.
   */
  static resolveEzFromCriteria(criteria: EzSelectionCriteria): EzResolutionResult {
    // 1. Check for manual override
    if (criteria.manualOverride) {
      if (!criteria.manualOverride.basis || criteria.manualOverride.basis.trim() === '') {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'INCOMPLETE',
          reasons: ['Missing engineering justification for Ez manual override']
        };
      }
      const overrideConfig = this.createManualOverride(criteria.manualOverride.ezValue, criteria.manualOverride.basis);
      return {
        ezConfig: overrideConfig,
        selectedConfig: overrideConfig,
        ez: overrideConfig.ez,
        status: 'NOT_VERIFIED',
        reasons: ['Manual Engineering Override - Non-standard basis']
      };
    }

    // 2. Unidirectional flow protection: Non-production / UNIMPLEMENTED
    if (criteria.distributionCategory === 'unidirectional' ||
        (criteria.supplyLocation === 'ceiling' && criteria.returnLocation === 'floor' && criteria.supplyAirCondition === 'isothermal')) {
      const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-unidirectional-flow') || null;
      return {
        ezConfig: config,
        selectedConfig: config,
        ez: null,
        status: 'BLOCKED',
        reasons: ['Unidirectional downward flow through perforated ceiling is UNIMPLEMENTED / NOT_VERIFIED for production engineering calculations.']
      };
    }

    // 3. Contradiction Detection (Do not silently resolve contradictory criteria)
    if (criteria.supplyAirCondition === 'warm' && (criteria.spaceTempRelationship === 'cooling' || criteria.supplyTempRelationship === 'cooling')) {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: ['Contradictory supply air condition and temperature relationship: supplyAirCondition is warm but temperature relationship is cooling.']
      };
    }

    if (criteria.supplyAirCondition === 'cool' && (
      criteria.spaceTempRelationship === 'heating_gte_8c' || criteria.spaceTempRelationship === 'heating_lt_8c' ||
      criteria.supplyTempRelationship === 'heating_gte_8c' || criteria.supplyTempRelationship === 'heating_lt_8c'
    )) {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: ['Contradictory supply air condition and temperature relationship: supplyAirCondition is cool but temperature relationship is heating.']
      };
    }

    if (criteria.spaceTempRelationship && criteria.supplyTempRelationship && criteria.spaceTempRelationship !== criteria.supplyTempRelationship) {
      const isSpaceCool = criteria.spaceTempRelationship === 'cooling';
      const isSupplyCool = criteria.supplyTempRelationship === 'cooling';
      if (isSpaceCool !== isSupplyCool) {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'FAIL',
          reasons: ['Contradictory spaceTempRelationship and supplyTempRelationship specified.']
        };
      }
    }

    if (criteria.distributionCategory === 'ceiling' && criteria.supplyLocation && criteria.supplyLocation !== 'ceiling') {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory distribution category 'ceiling' with supply location '${criteria.supplyLocation}'.`]
      };
    }

    if (criteria.distributionCategory === 'floor' && criteria.supplyLocation && criteria.supplyLocation !== 'floor') {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory distribution category 'floor' with supply location '${criteria.supplyLocation}'.`]
      };
    }

    if (criteria.distributionCategory === 'stratified') {
      if (criteria.supplyLocation && criteria.supplyLocation !== 'floor') {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'FAIL',
          reasons: [`Contradictory distribution category 'stratified' with supply location '${criteria.supplyLocation}'.`]
        };
      }
      if (criteria.returnLocation && criteria.returnLocation !== 'ceiling') {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'FAIL',
          reasons: [`Contradictory distribution category 'stratified' with return location '${criteria.returnLocation}'.`]
        };
      }
      if (
        criteria.supplyAirCondition === 'warm' ||
        criteria.spaceTempRelationship === 'heating_gte_8c' ||
        criteria.spaceTempRelationship === 'heating_lt_8c' ||
        criteria.supplyTempRelationship === 'heating_gte_8c' ||
        criteria.supplyTempRelationship === 'heating_lt_8c'
      ) {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'FAIL',
          reasons: ['Contradictory stratified configuration: stratified distribution requires cooling supply air.']
        };
      }
    }

    // TASK 3 — Breathing-zone and personalized consistency checks
    if (
      criteria.isPersonalizedVentilation === false &&
      (criteria.personalizedSystemType ||
       criteria.distributionCategory === 'personalized' ||
       criteria.supplyLocation === 'breathing_zone' ||
       criteria.personalizedPrerequisites !== undefined ||
       criteria.personalizedPrerequisitesMet === true)
    ) {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: ['Contradictory personalized configuration: isPersonalizedVentilation is false but a personalized ventilation configuration was specified.']
      };
    }

    if (criteria.personalizedSystemType && criteria.supplyLocation && criteria.supplyLocation !== 'breathing_zone') {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory personalized configuration: personalized system type '${criteria.personalizedSystemType}' cannot have non-breathing-zone supply location '${criteria.supplyLocation}'.`]
      };
    }

    if (criteria.distributionCategory === 'personalized' && criteria.supplyLocation && criteria.supplyLocation !== 'breathing_zone') {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory configuration: personalized distribution category requires breathing zone supply location, received '${criteria.supplyLocation}'.`]
      };
    }

    if (criteria.distributionCategory && criteria.distributionCategory !== 'personalized' && (criteria.personalizedSystemType || criteria.isPersonalizedVentilation)) {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory configuration: distribution category '${criteria.distributionCategory}' is incompatible with personalized ventilation.`]
      };
    }

    if ((criteria.isPersonalizedVentilation || criteria.distributionCategory === 'personalized' || criteria.personalizedSystemType) && criteria.returnLocation && criteria.returnLocation !== 'ceiling') {
      return {
        ezConfig: null,
        selectedConfig: null,
        ez: null,
        status: 'FAIL',
        reasons: [`Contradictory configuration: personalized ventilation requires ceiling return, received '${criteria.returnLocation}'.`]
      };
    }

    // Determine supply air condition and temperature relationship
    let supplyAirCondition = criteria.supplyAirCondition;
    let spaceTempRelationship = criteria.spaceTempRelationship || criteria.supplyTempRelationship;
    if (!supplyAirCondition && spaceTempRelationship) {
      if (spaceTempRelationship === 'cooling') supplyAirCondition = 'cool';
      else if (spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') supplyAirCondition = 'warm';
    }

    // 4. Personalized ventilation (Table 6-4 & Section 6.2.1.2.2)
    const isPersonalized = Boolean(
      criteria.isPersonalizedVentilation ||
      criteria.distributionCategory === 'personalized' ||
      criteria.supplyLocation === 'breathing_zone' ||
      criteria.personalizedSystemType
    );

    if (isPersonalized) {
      const pType = criteria.personalizedSystemType;
      if (pType === 'ceiling_cool') {
        if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: ceiling_cool personalized ventilation cannot use warm supply air.']
          };
        }
      } else if (pType === 'ceiling_warm') {
        if (supplyAirCondition === 'cool' || spaceTempRelationship === 'cooling') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: ceiling_warm personalized ventilation cannot use cool supply air.']
          };
        }
      }

      // Must verify Section 6.2.1.2.2 prerequisites before returning standard Ez
      const pValidation = this.validatePersonalizedPrerequisites(criteria);
      if (!pValidation.valid) {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: pValidation.status,
          reasons: pValidation.reasons
        };
      }

      if (!pType) {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'INCOMPLETE',
          reasons: ['Missing Table 6-4 personalized ventilation system type (ceiling_cool, ceiling_warm, stratified_nonaspirating, or stratified_aspirating).']
        };
      }

      if (pType === 'ceiling_cool') {
        if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: ceiling_cool personalized ventilation cannot use warm supply air.']
          };
        }
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-personalized-ceiling-cool')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }
      if (pType === 'ceiling_warm') {
        if (supplyAirCondition === 'cool' || spaceTempRelationship === 'cooling') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: ceiling_warm personalized ventilation cannot use cool supply air.']
          };
        }
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-personalized-ceiling-warm')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }
      if (pType === 'stratified_nonaspirating') {
        if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: stratified_nonaspirating personalized ventilation requires cooling supply air.']
          };
        }
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-personalized-strat-nonaspirating')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }
      if (pType === 'stratified_aspirating') {
        if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'FAIL',
            reasons: ['Contradictory configuration: stratified_aspirating personalized ventilation requires cooling supply air.']
          };
        }
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-personalized-strat-aspirating')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }
    }

    // 5. Makeup supply air (Table 6-4)
    if (criteria.distributionCategory === 'makeup' || criteria.isDirectMakeupExhaust) {
      if (!criteria.makeupAirDistance) {
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'INCOMPLETE',
          reasons: ['Missing makeup supply outlet location relative to half the length of the space from exhaust/return.']
        };
      }

      if (criteria.makeupAirDistance === 'greater_than_half_length') {
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-makeup-more-half-length')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }

      if (criteria.makeupAirDistance === 'less_than_half_length') {
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-makeup-direct-exhaust')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }
    }

    // 6. Ceiling supply configurations
    if (criteria.supplyLocation === 'ceiling') {
      // 6a. Ceiling supply of cool air
      if (supplyAirCondition === 'cool' || spaceTempRelationship === 'cooling') {
        const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-1')!;
        return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
      }

      // 6b. Ceiling supply of warm air
      if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
        // Floor return
        if (criteria.returnLocation === 'floor') {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-ceil-warm-floor-ret')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }

        // Ceiling return requires space temperature relationship
        if (criteria.returnLocation === 'ceiling') {
          if (!spaceTempRelationship || spaceTempRelationship === 'none') {
            return {
              ezConfig: null,
              selectedConfig: null,
              ez: null,
              status: 'INCOMPLETE',
              reasons: ['Missing supply temperature relationship']
            };
          }

          if (spaceTempRelationship === 'heating_gte_8c') {
            const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-2')!;
            return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
          }

          if (spaceTempRelationship === 'heating_lt_8c') {
            if (criteria.supplyJetVelocityMet === null || criteria.supplyJetVelocityMet === undefined) {
              return {
                ezConfig: null,
                selectedConfig: null,
                ez: null,
                status: 'INCOMPLETE',
                reasons: ['Missing supply jet velocity condition']
              };
            }

            if (criteria.supplyJetVelocityMet) {
              const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-ceil-warm-lt8c-highvel')!;
              return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
            } else {
              const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-ceil-warm-lt8c-lowvel')!;
              return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
            }
          }
        }
      }
    }

    // 7. Floor supply configurations / Stratified cooling
    const isFloorSupply = criteria.supplyLocation === 'floor' || criteria.distributionCategory === 'stratified';
    if (isFloorSupply) {
      const returnLocation = criteria.returnLocation || (criteria.distributionCategory === 'stratified' ? 'ceiling' : undefined);
      // 7a. Floor supply of warm air
      if (supplyAirCondition === 'warm' || spaceTempRelationship === 'heating_gte_8c' || spaceTempRelationship === 'heating_lt_8c') {
        if (returnLocation === 'floor') {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-floor-warm-floor-ret')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }
        if (returnLocation === 'ceiling') {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-floor-warm-ceil-ret')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }
      }

      // 7b. Floor supply of cool air and ceiling return (Stratified cooling)
      const isCoolAir = supplyAirCondition === 'cool' || spaceTempRelationship === 'cooling' || (criteria.distributionCategory === 'stratified' && !supplyAirCondition && !spaceTempRelationship);
      if (isCoolAir && returnLocation === 'ceiling') {
        // Validate return height and detect contradictions between numeric and boolean representations FIRST
        if (criteria.returnHeightM !== undefined && criteria.returnHeightM !== null) {
          if (typeof criteria.returnHeightM !== 'number' || !Number.isFinite(criteria.returnHeightM)) {
            EngineeringValidationLogger.logNonFinite({
              system: 'EzSelectionService.resolveEzFromCriteria',
              field: 'returnHeightM',
              value: criteria.returnHeightM,
              expected: 'finite number (m)',
              message: 'Invalid return height: returnHeightM must be a finite number.'
            });
            return {
              ezConfig: null, selectedConfig: null, ez: null, status: 'FAIL',
              reasons: ['Invalid return height: returnHeightM must be a finite number.']
            };
          }
        }
        const hasNumericReturnHeight = typeof criteria.returnHeightM === 'number' && Number.isFinite(criteria.returnHeightM);
        const hasBoolGt55 = typeof criteria.returnHeightGt55m === 'boolean';
        const hasBoolGte55 = typeof criteria.returnHeightGte55m === 'boolean';

        // Check contradiction between boolean flags if both provided
        if (hasBoolGt55 && hasBoolGte55 && criteria.returnHeightGt55m !== criteria.returnHeightGte55m) {
          return {
            ezConfig: null, selectedConfig: null, ez: null, status: 'FAIL',
            reasons: ['Contradictory return height criteria: returnHeightGt55m does not match returnHeightGte55m.']
          };
        }

        const boolReturnGt55 = hasBoolGt55 ? criteria.returnHeightGt55m! : (hasBoolGte55 ? criteria.returnHeightGte55m! : null);

        let isReturnGt55m: boolean | null = null;
        if (hasNumericReturnHeight && boolReturnGt55 !== null) {
          const numericGt55 = (criteria.returnHeightM as number) > 5.5;
          if (numericGt55 !== boolReturnGt55) {
            return {
              ezConfig: null, selectedConfig: null, ez: null, status: 'FAIL',
              reasons: [`Contradictory return height criteria: returnHeightM (${criteria.returnHeightM} m) ${numericGt55 ? '> 5.5 m' : '<= 5.5 m'} contradicts boolean indicator (${boolReturnGt55}).`]
            };
          }
          isReturnGt55m = numericGt55;
        } else if (hasNumericReturnHeight) {
          isReturnGt55m = (criteria.returnHeightM as number) > 5.5;
        } else if (boolReturnGt55 !== null) {
          isReturnGt55m = boolReturnGt55;
        }

        // Validate Section 6.2.1.2.1 stratified system prerequisites
        const sValidation = this.validateStratifiedPrerequisites(criteria);
        if (!sValidation.valid) {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: sValidation.status,
            reasons: sValidation.reasons
          };
        }

        if (criteria.verticalThrowMet === null || criteria.verticalThrowMet === undefined) {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'INCOMPLETE',
            reasons: ['Missing vertical throw condition (requires throw velocity >= 0.25 m/s or < 0.25 m/s at 1.4 m)']
          };
        }

        if (isReturnGt55m === null) {
          return {
            ezConfig: null,
            selectedConfig: null,
            ez: null,
            status: 'INCOMPLETE',
            reasons: ['Missing return height condition (requires return height <= 5.5 m or > 5.5 m)']
          };
        }

        // Case 1: vertical throw >= 0.25 m/s (60 fpm) at 1.4 m and ceiling return <= 5.5 m (18 ft) -> Ez = 1.05
        if (criteria.verticalThrowMet && !isReturnGt55m) {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-floor-cool-strat-case1')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }

        // Case 2: vertical throw < 0.25 m/s (60 fpm) at 1.4 m and ceiling return <= 5.5 m (18 ft) -> Ez = 1.2
        if (!criteria.verticalThrowMet && !isReturnGt55m) {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-3')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }

        // Case 3: vertical throw < 0.25 m/s (60 fpm) at 1.4 m and ceiling return > 5.5 m (18 ft) -> Ez = 1.5
        if (!criteria.verticalThrowMet && isReturnGt55m) {
          const config = ASHRAE_621_2022_EZ_VALUES.find(e => e.id === 'ez-floor-cool-strat-h-gte55m')!;
          return { ezConfig: config, selectedConfig: config, ez: config.ez, status: 'PASS', reasons: [] };
        }

        // Vertical throw >= 0.25 m/s with return height > 5.5 m is not defined by Table 6-4
        return {
          ezConfig: null,
          selectedConfig: null,
          ez: null,
          status: 'INCOMPLETE',
          reasons: ['Table 6-4 does not specify an Ez value for vertical throw >= 0.25 m/s with return height > 5.5 m. Engineering analysis required.']
        };
      }
    }

    return {
      ezConfig: null,
      selectedConfig: null,
      ez: null,
      status: 'INCOMPLETE',
      reasons: ['Invalid supply configuration or unmatched Table 6-4 condition']
    };
  }

  /**
   * Validates Section 6.2.1.2.1 Stratified System Prerequisites.
   *
   * Tri-state Boolean qualification field rule:
   * 1. TRUE = asserted qualified, but TRUE alone is NOT evidence.
   * 2. FALSE = explicitly asserted NOT qualified (always FAIL).
   * 3. OMITTED / undefined / null = no assertion provided (evaluate structured evidence).
   */
  static validateStratifiedPrerequisites(conditions?: EzValidationConditions): { valid: boolean; status: ValidationStatus; reasons: string[] } {
    if (!conditions) {
      return {
        valid: false,
        status: 'INCOMPLETE',
        reasons: ['Stratified system prerequisites under ASHRAE 62.1-2022 Section 6.2.1.2.1 must be verified (supply temp at least 2°C below room, return height > 2.8 m, no mechanical mixing, protected from impinging airstreams).']
      };
    }

    // Explicit negative assertion (FALSE): always produces FAIL
    // - FALSE + missing structured evidence → FAIL
    // - FALSE + incomplete structured evidence → FAIL
    // - FALSE + complete valid structured evidence → FAIL
    // - FALSE + contradictory structured evidence → FAIL
    if (conditions.stratifiedPrerequisitesMet === false) {
      return {
        valid: false,
        status: 'FAIL',
        reasons: conditions.stratifiedPrerequisites
          ? ['Contradictory stratified prerequisites: structured prerequisites provided but stratifiedPrerequisitesMet is explicitly false.']
          : ['Stratified system prerequisites under Section 6.2.1.2.1 not satisfied: stratifiedPrerequisitesMet is explicitly false.']
      };
    }

    const sReq = conditions.stratifiedPrerequisites;
    if (sReq) {
      // Validate numeric finiteness for supply air temperature difference
      if (sReq.tempDiffRoomSupplyC !== undefined && sReq.tempDiffRoomSupplyC !== null) {
        if (typeof sReq.tempDiffRoomSupplyC !== 'number' || !Number.isFinite(sReq.tempDiffRoomSupplyC)) {
          EngineeringValidationLogger.logNonFinite({
            system: 'EzSelectionService.validateStratifiedPrerequisites',
            field: 'tempDiffRoomSupplyC',
            value: sReq.tempDiffRoomSupplyC,
            expected: 'finite number >= 2.0 °C',
            message: 'Invalid stratified prerequisite: supply air temperature difference must be a finite number.'
          });
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Invalid stratified prerequisite: supply air temperature difference must be a finite number.']
          };
        }
      }

      // Validate numeric finiteness for return opening height
      if (sReq.returnOpeningHeightM !== undefined && sReq.returnOpeningHeightM !== null) {
        if (typeof sReq.returnOpeningHeightM !== 'number' || !Number.isFinite(sReq.returnOpeningHeightM)) {
          EngineeringValidationLogger.logNonFinite({
            system: 'EzSelectionService.validateStratifiedPrerequisites',
            field: 'returnOpeningHeightM',
            value: sReq.returnOpeningHeightM,
            expected: 'finite number > 2.8 m',
            message: 'Invalid stratified prerequisite: return opening height must be a finite number.'
          });
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Invalid stratified prerequisite: return opening height must be a finite number.']
          };
        }
      }

      let supplyTempConditionMet: boolean | null = null;
      const hasNumericTemp = typeof sReq.tempDiffRoomSupplyC === 'number' && Number.isFinite(sReq.tempDiffRoomSupplyC);
      const hasBoolTemp = typeof sReq.supplyTempBelowRoomGte2C === 'boolean';

      if (hasNumericTemp && hasBoolTemp) {
        const numericMet = (sReq.tempDiffRoomSupplyC as number) >= 2.0;
        if (numericMet !== sReq.supplyTempBelowRoomGte2C) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Contradictory stratified prerequisites: supply temperature difference (${sReq.tempDiffRoomSupplyC}°C) contradicts supplyTempBelowRoomGte2C (${sReq.supplyTempBelowRoomGte2C}).`]
          };
        }
        if (!numericMet) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.1 violation: supply air temperature difference (${sReq.tempDiffRoomSupplyC}°C) is less than required 2°C below room temperature.`]
          };
        }
        supplyTempConditionMet = true;
      } else if (hasNumericTemp) {
        if ((sReq.tempDiffRoomSupplyC as number) < 2.0) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.1 violation: supply air temperature difference (${sReq.tempDiffRoomSupplyC}°C) is less than required 2°C below room temperature.`]
          };
        }
        supplyTempConditionMet = true;
      } else if (hasBoolTemp) {
        if (sReq.supplyTempBelowRoomGte2C === false) {
          return {
            valid: false, status: 'FAIL',
            reasons: ['Section 6.2.1.2.1 violation: supply air is not at least 2°C below room temperature.']
          };
        }
        supplyTempConditionMet = true;
      }

      let returnOpeningConditionMet: boolean | null = null;
      const hasNumericHeight = typeof sReq.returnOpeningHeightM === 'number' && Number.isFinite(sReq.returnOpeningHeightM);
      const hasBoolHeight = typeof sReq.returnOpeningHeightGt28m === 'boolean';

      if (hasNumericHeight && hasBoolHeight) {
        const numericMet = (sReq.returnOpeningHeightM as number) > 2.8;
        if (numericMet !== sReq.returnOpeningHeightGt28m) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Contradictory stratified prerequisites: return opening height (${sReq.returnOpeningHeightM} m) contradicts returnOpeningHeightGt28m (${sReq.returnOpeningHeightGt28m}).`]
          };
        }
        if (!numericMet) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.1 violation: return opening height (${sReq.returnOpeningHeightM} m) is not greater than 2.8 m above floor.`]
          };
        }
        returnOpeningConditionMet = true;
      } else if (hasNumericHeight) {
        if ((sReq.returnOpeningHeightM as number) <= 2.8) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.1 violation: return opening height (${sReq.returnOpeningHeightM} m) is not greater than 2.8 m above floor.`]
          };
        }
        returnOpeningConditionMet = true;
      } else if (hasBoolHeight) {
        if (sReq.returnOpeningHeightGt28m === false) {
          return {
            valid: false, status: 'FAIL',
            reasons: ['Section 6.2.1.2.1 violation: return opening height is not greater than 2.8 m above floor.']
          };
        }
        returnOpeningConditionMet = true;
      }

      if (sReq.noMechanicalMixingDevices === false) {
        return {
          valid: false, status: 'FAIL',
          reasons: ['Section 6.2.1.2.1 violation: mechanical mixing devices are present in the space.']
        };
      }

      if (sReq.protectedFromImpingingAirstreams === false) {
        return {
          valid: false, status: 'FAIL',
          reasons: ['Section 6.2.1.2.1 violation: stratified zone is not protected from impinging airstreams.']
        };
      }

      if (supplyTempConditionMet === null) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Stratified system prerequisite missing: supply air temperature difference must be verified (at least 2°C below room temperature).']
        };
      }

      if (returnOpeningConditionMet === null) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Stratified system prerequisite missing: return opening height must be verified (> 2.8 m above floor).']
        };
      }

      if (sReq.noMechanicalMixingDevices !== true) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Stratified system prerequisite missing: must verify no mechanical mixing devices are present.']
        };
      }

      if (sReq.protectedFromImpingingAirstreams !== true) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Stratified system prerequisite missing: must verify protection from impinging airstreams from adjacent zones.']
        };
      }

      return { valid: true, status: 'PASS', reasons: [] };
    }

    return {
      valid: false,
      status: 'INCOMPLETE',
      reasons: ['Stratified system prerequisites under ASHRAE 62.1-2022 Section 6.2.1.2.1 must be verified (supply temp at least 2°C below room, return height > 2.8 m, no mechanical mixing, protected from impinging airstreams).']
    };
  }

  /**
   * Validates Section 6.2.1.2.2 Personalized Ventilation Prerequisites.
   *
   * Tri-state Boolean qualification field rule:
   * 1. TRUE = asserted qualified, but TRUE alone is NOT evidence.
   * 2. FALSE = explicitly asserted NOT qualified (always FAIL).
   * 3. OMITTED / undefined / null = no assertion provided (evaluate structured evidence).
   */
  static validatePersonalizedPrerequisites(conditions?: EzValidationConditions): { valid: boolean; status: ValidationStatus; reasons: string[] } {
    if (!conditions) {
      return {
        valid: false,
        status: 'INCOMPLETE',
        reasons: ['Personalized ventilation prerequisites under ASHRAE 62.1-2022 Section 6.2.1.2.2 must be verified (personalized air in breathing zone, head region velocity <= 0.25 m/s, return opening height > 2.8 m).']
      };
    }

    if (conditions.isPersonalizedVentilation === false) {
      return {
        valid: false,
        status: 'FAIL',
        reasons: ['Contradictory personalized configuration: isPersonalizedVentilation is false but a personalized ventilation configuration was specified.']
      };
    }

    // Explicit negative assertion (FALSE): always produces FAIL
    // - FALSE + missing structured evidence → FAIL
    // - FALSE + incomplete structured evidence → FAIL
    // - FALSE + complete valid structured evidence → FAIL
    // - FALSE + contradictory structured evidence → FAIL
    if (conditions.personalizedPrerequisitesMet === false) {
      return {
        valid: false,
        status: 'FAIL',
        reasons: conditions.personalizedPrerequisites
          ? ['Contradictory personalized prerequisites: structured prerequisites provided but personalizedPrerequisitesMet is explicitly false.']
          : ['Personalized ventilation prerequisites under Section 6.2.1.2.2 not satisfied: personalizedPrerequisitesMet is explicitly false.']
      };
    }

    const pReq = conditions.personalizedPrerequisites;
    if (pReq) {
      if (pReq.airDistributedInBreathingZone === false) {
        return {
          valid: false, status: 'FAIL',
          reasons: ['Section 6.2.1.2.2 violation: personalized air is not distributed in the breathing zone.']
        };
      }

      // Validate numeric finiteness for head region velocity
      if (pReq.headRegionVelocityMs !== undefined && pReq.headRegionVelocityMs !== null) {
        if (typeof pReq.headRegionVelocityMs !== 'number' || !Number.isFinite(pReq.headRegionVelocityMs)) {
          EngineeringValidationLogger.logNonFinite({
            system: 'EzSelectionService.validatePersonalizedPrerequisites',
            field: 'headRegionVelocityMs',
            value: pReq.headRegionVelocityMs,
            expected: 'finite number <= 0.25 m/s',
            message: 'Invalid personalized prerequisite: occupant head region velocity must be a finite number.'
          });
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Invalid personalized prerequisite: occupant head region velocity must be a finite number.']
          };
        }
      }

      // Validate numeric finiteness for return opening height
      if (pReq.returnOpeningHeightM !== undefined && pReq.returnOpeningHeightM !== null) {
        if (typeof pReq.returnOpeningHeightM !== 'number' || !Number.isFinite(pReq.returnOpeningHeightM)) {
          EngineeringValidationLogger.logNonFinite({
            system: 'EzSelectionService.validatePersonalizedPrerequisites',
            field: 'returnOpeningHeightM',
            value: pReq.returnOpeningHeightM,
            expected: 'finite number > 2.8 m',
            message: 'Invalid personalized prerequisite: return opening height must be a finite number.'
          });
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Invalid personalized prerequisite: return opening height must be a finite number.']
          };
        }
      }

      let velocityConditionMet: boolean | null = null;
      const hasNumericVel = typeof pReq.headRegionVelocityMs === 'number' && Number.isFinite(pReq.headRegionVelocityMs);
      const hasBoolVel = typeof pReq.headRegionVelocityMet === 'boolean';

      if (hasNumericVel && hasBoolVel) {
        const numericMet = (pReq.headRegionVelocityMs as number) <= 0.25;
        if (numericMet !== pReq.headRegionVelocityMet) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Contradictory personalized prerequisites: occupant head region velocity (${pReq.headRegionVelocityMs} m/s) contradicts headRegionVelocityMet (${pReq.headRegionVelocityMet}).`]
          };
        }
        if (!numericMet) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.2 violation: velocity at occupant head region (${pReq.headRegionVelocityMs} m/s) exceeds 0.25 m/s limit.`]
          };
        }
        velocityConditionMet = true;
      } else if (hasNumericVel) {
        if ((pReq.headRegionVelocityMs as number) > 0.25) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.2 violation: velocity at occupant head region (${pReq.headRegionVelocityMs} m/s) exceeds 0.25 m/s limit.`]
          };
        }
        velocityConditionMet = true;
      } else if (hasBoolVel) {
        if (pReq.headRegionVelocityMet === false) {
          return {
            valid: false, status: 'FAIL',
            reasons: ['Section 6.2.1.2.2 violation: velocity at occupant head region exceeds 0.25 m/s limit.']
          };
        }
        velocityConditionMet = true;
      }

      let returnOpeningConditionMet: boolean | null = null;
      const hasNumericHeight = typeof pReq.returnOpeningHeightM === 'number' && Number.isFinite(pReq.returnOpeningHeightM);
      const hasBoolHeight = typeof pReq.returnOpeningHeightGt28m === 'boolean';

      if (hasNumericHeight && hasBoolHeight) {
        const numericMet = (pReq.returnOpeningHeightM as number) > 2.8;
        if (numericMet !== pReq.returnOpeningHeightGt28m) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Contradictory personalized prerequisites: return opening height (${pReq.returnOpeningHeightM} m) contradicts returnOpeningHeightGt28m (${pReq.returnOpeningHeightGt28m}).`]
          };
        }
        if (!numericMet) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.2 violation: return opening height (${pReq.returnOpeningHeightM} m) is not greater than 2.8 m above floor.`]
          };
        }
        returnOpeningConditionMet = true;
      } else if (hasNumericHeight) {
        if ((pReq.returnOpeningHeightM as number) <= 2.8) {
          return {
            valid: false, status: 'FAIL',
            reasons: [`Section 6.2.1.2.2 violation: return opening height (${pReq.returnOpeningHeightM} m) is not greater than 2.8 m above floor.`]
          };
        }
        returnOpeningConditionMet = true;
      } else if (hasBoolHeight) {
        if (pReq.returnOpeningHeightGt28m === false) {
          return {
            valid: false, status: 'FAIL',
            reasons: ['Section 6.2.1.2.2 violation: return opening height is not greater than 2.8 m above floor.']
          };
        }
        returnOpeningConditionMet = true;
      }

      if (pReq.airDistributedInBreathingZone !== true) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Personalized ventilation prerequisite missing: airDistributedInBreathingZone must be verified.']
        };
      }

      if (velocityConditionMet === null) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Personalized ventilation prerequisite missing: velocity at occupant head region must be verified (<= 0.25 m/s).']
        };
      }

      if (returnOpeningConditionMet === null) {
        return {
          valid: false, status: 'INCOMPLETE',
          reasons: ['Personalized ventilation prerequisite missing: return opening height must be verified (> 2.8 m above floor).']
        };
      }

      return { valid: true, status: 'PASS', reasons: [] };
    }

    return {
      valid: false,
      status: 'INCOMPLETE',
      reasons: ['Personalized ventilation prerequisites under ASHRAE 62.1-2022 Section 6.2.1.2.2 must be verified (personalized air in breathing zone, head region velocity <= 0.25 m/s, return opening height > 2.8 m).']
    };
  }

  /**
   * Resolves return opening height and checks for contradictions between numeric and boolean representations.
   */
  static resolveReturnHeight(conditions?: EzValidationConditions): { isReturnGt55m: boolean | null; status?: ValidationStatus; reason?: string } {
    if (!conditions) {
      return { isReturnGt55m: null };
    }

    if (conditions.returnHeightM !== undefined && conditions.returnHeightM !== null) {
      if (typeof conditions.returnHeightM !== 'number' || !Number.isFinite(conditions.returnHeightM)) {
        return {
          isReturnGt55m: null,
          status: 'FAIL',
          reason: 'Invalid return height: returnHeightM must be a finite number.'
        };
      }
    }

    const hasNumericReturnHeight = typeof conditions.returnHeightM === 'number' && Number.isFinite(conditions.returnHeightM);
    const hasBoolGt55 = typeof conditions.returnHeightGt55m === 'boolean';
    const hasBoolGte55 = typeof conditions.returnHeightGte55m === 'boolean';

    if (hasBoolGt55 && hasBoolGte55 && conditions.returnHeightGt55m !== conditions.returnHeightGte55m) {
      return {
        isReturnGt55m: null,
        status: 'FAIL',
        reason: 'Contradictory return height criteria: returnHeightGt55m does not match returnHeightGte55m.'
      };
    }

    const boolReturnGt55 = hasBoolGt55 ? conditions.returnHeightGt55m! : (hasBoolGte55 ? conditions.returnHeightGte55m! : null);

    if (hasNumericReturnHeight && boolReturnGt55 !== null) {
      const numericGt55 = (conditions.returnHeightM as number) > 5.5;
      if (numericGt55 !== boolReturnGt55) {
        return {
          isReturnGt55m: null,
          status: 'FAIL',
          reason: `Contradictory return height criteria: returnHeightM (${conditions.returnHeightM} m) ${numericGt55 ? '> 5.5 m' : '<= 5.5 m'} contradicts boolean indicator (${boolReturnGt55}).`
        };
      }
      return { isReturnGt55m: numericGt55 };
    } else if (hasNumericReturnHeight) {
      return { isReturnGt55m: (conditions.returnHeightM as number) > 5.5 };
    } else if (boolReturnGt55 !== null) {
      return { isReturnGt55m: boolReturnGt55 };
    }

    return { isReturnGt55m: null };
  }

  /**
   * Validates an existing Ez configuration and its associated operating conditions.
   * Inspects repository metadata to determine whether the configuration has qualifying conditions,
   * requiring explicit condition evidence and rejecting missing/contradictory/unverified configurations.
   */
  static validateEzConfiguration(ezConfig: Ashrae621Ez | null, conditions?: EzValidationConditions): { valid: boolean; status: ValidationStatus; reasons: string[] } {
    if (!ezConfig) {
      return { valid: false, status: 'INCOMPLETE', reasons: ['Missing Ez configuration'] };
    }

    if (ezConfig.verificationStatus === 'UNIMPLEMENTED') {
      return { valid: false, status: 'BLOCKED', reasons: ['Unimplemented Table 6-4 Configuration'] };
    }

    if (ezConfig.verificationStatus === 'NOT_VERIFIED' || ezConfig.id === 'ez-unidirectional-flow' || ezConfig.distributionCategory === 'unidirectional') {
      return { valid: false, status: 'BLOCKED', reasons: ['Unverified / non-production Table 6-4 Configuration (ez-unidirectional-flow is NOT_VERIFIED / UNIMPLEMENTED)'] };
    }

    if (ezConfig.verificationStatus === 'INVALID') {
      return { valid: false, status: 'FAIL', reasons: ['Invalid Ez configuration'] };
    }

    if (ezConfig.ez === null || isNaN(ezConfig.ez) || ezConfig.ez <= 0 || !isFinite(ezConfig.ez)) {
      return { valid: false, status: 'FAIL', reasons: ['Invalid Ez'] };
    }

    if (ezConfig.isManualOverride) {
      if (!ezConfig.manualOverrideBasis && !ezConfig.manualJustification) {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing engineering justification for Ez manual override'] };
      }
      return { valid: true, status: 'NOT_VERIFIED', reasons: ['Manual Engineering Override - Non-standard basis'] };
    }

    // 1. Personalized Ventilation Configuration (Table 6-4 & Section 6.2.1.2.2)
    if (ezConfig.isPersonalized || ezConfig.distributionCategory === 'personalized' || ezConfig.id.startsWith('ez-personalized-')) {
      // Check supply air temperature condition consistency FIRST (reject contradictory temperature as FAIL)
      if (ezConfig.supplyAirCondition === 'cool') {
        const isWarm = conditions?.supplyAirCondition === 'warm' ||
                       conditions?.supplyTempRelationship === 'heating_gte_8c' ||
                       conditions?.supplyTempRelationship === 'heating_lt_8c' ||
                       conditions?.spaceTempRelationship === 'heating_gte_8c' ||
                       conditions?.spaceTempRelationship === 'heating_lt_8c';
        if (isWarm) {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} personalized ventilation requires cooling supply air.`] };
        }
      } else if (ezConfig.supplyAirCondition === 'warm') {
        const isCool = conditions?.supplyAirCondition === 'cool' ||
                       conditions?.supplyTempRelationship === 'cooling' ||
                       conditions?.spaceTempRelationship === 'cooling';
        if (isCool) {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} personalized ventilation requires warm supply air.`] };
        }
      }

      const pValidation = this.validatePersonalizedPrerequisites(conditions);
      if (!pValidation.valid) {
        return pValidation;
      }

      if (conditions?.personalizedSystemType) {
        if (ezConfig.id === 'ez-personalized-ceiling-cool' && conditions.personalizedSystemType !== 'ceiling_cool') {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} requires ceiling_cool system type but ${conditions.personalizedSystemType} was provided.`] };
        }
        if (ezConfig.id === 'ez-personalized-ceiling-warm' && conditions.personalizedSystemType !== 'ceiling_warm') {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} requires ceiling_warm system type but ${conditions.personalizedSystemType} was provided.`] };
        }
        if (ezConfig.id === 'ez-personalized-strat-nonaspirating' && conditions.personalizedSystemType !== 'stratified_nonaspirating') {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} requires stratified_nonaspirating system type but ${conditions.personalizedSystemType} was provided.`] };
        }
        if (ezConfig.id === 'ez-personalized-strat-aspirating' && conditions.personalizedSystemType !== 'stratified_aspirating') {
          return { valid: false, status: 'FAIL', reasons: [`Contradictory configuration: ${ezConfig.id} requires stratified_aspirating system type but ${conditions.personalizedSystemType} was provided.`] };
        }
      }

      return { valid: true, status: 'PASS', reasons: [] };
    }

    // 2. Stratified Distribution Configuration (Table 6-4 & Section 6.2.1.2.1)
    if ((ezConfig.isStratified || (ezConfig.distributionCategory as string) === 'stratified') && !ezConfig.isPersonalized) {
      // Supply temp condition: stratified cooling requires cooling air (reject contradictory warm air as FAIL)
      const isWarm = conditions?.supplyAirCondition === 'warm' ||
                     conditions?.supplyTempRelationship === 'heating_gte_8c' ||
                     conditions?.supplyTempRelationship === 'heating_lt_8c' ||
                     conditions?.spaceTempRelationship === 'heating_gte_8c' ||
                     conditions?.spaceTempRelationship === 'heating_lt_8c';
      if (isWarm) {
        return {
          valid: false,
          status: 'FAIL',
          reasons: ['Contradictory stratified configuration: stratified distribution requires cooling supply air.']
        };
      }

      // Return air height contradiction between numeric and boolean (FAIL)
      const returnHeightRes = this.resolveReturnHeight(conditions);
      if (returnHeightRes.status === 'FAIL') {
        return { valid: false, status: 'FAIL', reasons: [returnHeightRes.reason!] };
      }

      // Vertical throw contradiction (FAIL)
      if (conditions?.verticalThrowMet !== undefined && conditions?.verticalThrowMet !== null) {
        if (ezConfig.verticalThrowCondition?.includes('>= 0.25') && conditions.verticalThrowMet !== true) {
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Configuration requires vertical throw >= 0.25 m/s (60 fpm) at 1.4 m above floor']
          };
        }
        if (ezConfig.verticalThrowCondition?.includes('< 0.25') && conditions.verticalThrowMet !== false) {
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Configuration requires vertical throw < 0.25 m/s (60 fpm) at 1.4 m above floor']
          };
        }
      }

      // Return height contradiction against configuration (FAIL)
      if (returnHeightRes.isReturnGt55m !== null) {
        if (ezConfig.returnAirHeightCondition?.includes('<= 5.5') && returnHeightRes.isReturnGt55m === true) {
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Configuration requires return height <= 5.5 m (18 ft)']
          };
        }
        if ((ezConfig.returnAirHeightCondition?.includes('> 5.5') || ezConfig.returnAirHeightCondition?.includes('> 18')) && returnHeightRes.isReturnGt55m === false) {
          return {
            valid: false,
            status: 'FAIL',
            reasons: ['Configuration requires return height > 5.5 m (18 ft)']
          };
        }
      }

      // Stratified prerequisites check
      const sValidation = this.validateStratifiedPrerequisites(conditions);
      if (!sValidation.valid) {
        return sValidation;
      }

      // Vertical throw condition presence check (INCOMPLETE if omitted)
      if (conditions?.verticalThrowMet === undefined || conditions?.verticalThrowMet === null) {
        return {
          valid: false,
          status: 'INCOMPLETE',
          reasons: ['Missing vertical throw condition (requires throw velocity >= 0.25 m/s or < 0.25 m/s at 1.4 m)']
        };
      }

      // Return air height condition presence check (INCOMPLETE if omitted)
      if (returnHeightRes.isReturnGt55m === null) {
        return {
          valid: false,
          status: 'INCOMPLETE',
          reasons: ['Missing return height condition (requires return height <= 5.5 m or > 5.5 m)']
        };
      }

      return { valid: true, status: 'PASS', reasons: [] };
    }

    // 3. Conditional Warm Air Configurations
    if (ezConfig.id === 'ez-2') {
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      if (!tempRel || tempRel === 'none') {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply temperature relationship'] };
      }
      if (tempRel !== 'heating_gte_8c') {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air >= 8°C above space temperature'] };
      }
      if (conditions?.supplyAirCondition === 'cool') {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-2 requires ceiling supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-2 requires ceiling return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    if (ezConfig.id === 'ez-ceil-warm-lt8c-highvel') {
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      if (!tempRel || tempRel === 'none') {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply temperature relationship'] };
      }
      if (tempRel !== 'heating_lt_8c') {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air < 8°C above space temperature'] };
      }
      if (conditions?.supplyJetVelocityMet === undefined || conditions?.supplyJetVelocityMet === null) {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply jet velocity condition'] };
      }
      if (conditions.supplyJetVelocityMet !== true) {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires supply jet velocity >= 0.8 m/s within 1.4 m of floor'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-ceil-warm-lt8c-highvel requires ceiling supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-ceil-warm-lt8c-highvel requires ceiling return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    if (ezConfig.id === 'ez-ceil-warm-lt8c-lowvel') {
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      if (!tempRel || tempRel === 'none') {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply temperature relationship'] };
      }
      if (tempRel !== 'heating_lt_8c') {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air < 8°C above space temperature'] };
      }
      if (conditions?.supplyJetVelocityMet === undefined || conditions?.supplyJetVelocityMet === null) {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply jet velocity condition'] };
      }
      if (conditions.supplyJetVelocityMet !== false) {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires supply jet velocity < 0.8 m/s within 1.4 m of floor'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-ceil-warm-lt8c-lowvel requires ceiling supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-ceil-warm-lt8c-lowvel requires ceiling return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    if (ezConfig.id === 'ez-ceil-warm-floor-ret') {
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      const isWarm = conditions?.supplyAirCondition === 'warm' || tempRel === 'heating_gte_8c' || tempRel === 'heating_lt_8c';
      if (!isWarm) {
        if (conditions?.supplyAirCondition === 'cool' || tempRel === 'cooling') {
          return { valid: false, status: 'FAIL', reasons: ['Contradictory supply condition: ez-ceil-warm-floor-ret requires heating / warm supply air but cooling was provided'] };
        }
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing qualifying heating / warm supply air condition for ceiling warm air supply with floor return'] };
      }
      if (conditions?.supplyAirCondition === 'cool' || tempRel === 'cooling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply condition: ez-ceil-warm-floor-ret requires heating / warm supply air'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-ceil-warm-floor-ret requires ceiling supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'floor') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-ceil-warm-floor-ret requires floor return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    if (ezConfig.id === 'ez-floor-warm-floor-ret') {
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      const isWarm = conditions?.supplyAirCondition === 'warm' || tempRel === 'heating_gte_8c' || tempRel === 'heating_lt_8c';
      if (!isWarm) {
        if (conditions?.supplyAirCondition === 'cool' || tempRel === 'cooling') {
          return { valid: false, status: 'FAIL', reasons: ['Contradictory supply condition: ez-floor-warm-floor-ret requires heating / warm supply air but cooling was provided'] };
        }
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing qualifying heating / warm supply air condition for floor warm air supply with floor return'] };
      }
      if (conditions?.supplyAirCondition === 'cool' || tempRel === 'cooling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply condition: ez-floor-warm-floor-ret requires heating / warm supply air'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'floor') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-floor-warm-floor-ret requires floor supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'floor') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-floor-warm-floor-ret requires floor return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    if (ezConfig.id === 'ez-floor-warm-ceil-ret') {
      if (conditions?.supplyJetVelocityMet === undefined || conditions?.supplyJetVelocityMet === null) {
        return { valid: false, status: 'INCOMPLETE', reasons: ['Missing supply jet velocity condition (150 fpm / 0.8 m/s supply jet reaches 1.4 m or higher above floor)'] };
      }
      if (conditions.supplyJetVelocityMet !== true) {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires 150 fpm (0.8 m/s) supply jet reaches 4.5 ft (1.4 m) or higher above floor'] };
      }
      const tempRel = conditions?.supplyTempRelationship || conditions?.spaceTempRelationship;
      if (tempRel === 'cooling' || conditions?.supplyAirCondition === 'cool') {
        return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air'] };
      }
      if (conditions?.supplyLocation && conditions.supplyLocation !== 'floor') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-floor-warm-ceil-ret requires floor supply'] };
      }
      if (conditions?.returnLocation && conditions.returnLocation !== 'ceiling') {
        return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-floor-warm-ceil-ret requires ceiling return'] };
      }
      return { valid: true, status: 'PASS', reasons: [] };
    }

    // 4. Makeup Air Configurations
    if (ezConfig.distributionCategory === 'makeup' || ezConfig.id === 'ez-makeup-more-half-length' || ezConfig.id === 'ez-makeup-direct-exhaust') {
      if (!conditions?.makeupAirDistance) {
        return {
          valid: false,
          status: 'INCOMPLETE',
          reasons: ['Missing makeup supply outlet location relative to half the length of the space from exhaust/return.']
        };
      }

      if (ezConfig.id === 'ez-makeup-more-half-length' && conditions.makeupAirDistance !== 'greater_than_half_length') {
        return {
          valid: false,
          status: 'FAIL',
          reasons: ['Contradictory makeup supply outlet location: configuration requires outlet located > 0.5 space length from exhaust/return.']
        };
      }

      if (ezConfig.id === 'ez-makeup-direct-exhaust' && conditions.makeupAirDistance !== 'less_than_half_length') {
        return {
          valid: false,
          status: 'FAIL',
          reasons: ['Contradictory makeup supply outlet location: configuration requires outlet located <= 0.5 space length from exhaust/return or drawn before mixing.']
        };
      }

      return { valid: true, status: 'PASS', reasons: [] };
    }

    // 5. General Temperature and Location Contradictions for other configurations (e.g., ez-1)
    if (conditions) {
      if (ezConfig.id === 'ez-1') {
        if (conditions.supplyLocation && conditions.supplyLocation !== 'ceiling') {
          return { valid: false, status: 'FAIL', reasons: ['Contradictory supply location: ez-1 requires ceiling supply'] };
        }
        if (conditions.returnLocation && conditions.returnLocation !== 'ceiling') {
          return { valid: false, status: 'FAIL', reasons: ['Contradictory return location: ez-1 requires ceiling return'] };
        }
      }
      if (ezConfig.supplyAirCondition === 'cool') {
        const isWarm = conditions.supplyAirCondition === 'warm' ||
                       conditions.supplyTempRelationship === 'heating_gte_8c' ||
                       conditions.supplyTempRelationship === 'heating_lt_8c' ||
                       conditions.spaceTempRelationship === 'heating_gte_8c' ||
                       conditions.spaceTempRelationship === 'heating_lt_8c';
        if (isWarm) {
          return { valid: false, status: 'FAIL', reasons: ['Configuration requires cooling supply air'] };
        }
      }
      if (ezConfig.supplyAirCondition === 'warm') {
        const isCool = conditions.supplyAirCondition === 'cool' ||
                       conditions.supplyTempRelationship === 'cooling' ||
                       conditions.spaceTempRelationship === 'cooling';
        if (isCool) {
          return { valid: false, status: 'FAIL', reasons: ['Configuration requires heating supply air'] };
        }
      }
    }

    // Safety Gate: No conditional Table 6-4 configuration may escape through the general fallback
    if (ezConfig.supplyAirCondition === 'warm' || 
        ezConfig.isStratified || 
        ezConfig.isPersonalized || 
        (ezConfig.distributionCategory as string) === 'makeup' || 
        Boolean(ezConfig.verticalThrowCondition) || 
        Boolean(ezConfig.supplyJetVelocityCondition) || 
        Boolean(ezConfig.returnAirHeightCondition) ||
        Boolean(ezConfig.additionalQualifyingConditions)) {
      return {
        valid: false,
        status: 'BLOCKED',
        reasons: [`Conditional Table 6-4 configuration '${ezConfig.id}' cannot pass without verified physical qualification evidence.`]
      };
    }

    return { valid: true, status: 'PASS', reasons: [] };
  }
}
