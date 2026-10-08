/**
 * ASHRAE 62.1-2025 support is intentionally deferred.
 * The active production ventilation baseline is ASHRAE 62.1-2022.
 * 2025 data and calculations are not approved for production use.
 * Future 2025 activation requires a controlled verification of the published standard, applicable addenda/errata, formulas, and data tables.
 */
import { Ashrae621SpaceType, Ashrae621Ez, Ashrae621ExhaustType, Ashrae621Table63Source, Ashrae621AirQualityStandards, DatasetCompletenessStatus, ASHRAE_62_1_PRODUCTION_BASIS, ProductionStandardBasis } from './ashrae621/types';
import { ASHRAE_621_2019_SPACE_TYPES, ASHRAE_621_2019_EZ_VALUES, ASHRAE_621_2019_EXHAUST_RATES, ASHRAE_621_2019_AIR_QUALITY_STANDARDS } from './ashrae621/2019/data';
import { ASHRAE_621_2022_SPACE_TYPES, ASHRAE_621_2022_EZ_VALUES, ASHRAE_621_2022_EXHAUST_RATES, ASHRAE_621_2022_AIR_QUALITY_STANDARDS, ASHRAE_621_2022_DATASET_STATUS } from './ashrae621/2022/data';
import { ASHRAE_621_2022_TABLE_6_3_SOURCES } from './ashrae621/2022/table63Data';
import { ASHRAE_621_2025_SPACE_TYPES, ASHRAE_621_2025_EZ_VALUES, ASHRAE_621_2025_EXHAUST_RATES, ASHRAE_621_2025_AIR_QUALITY_STANDARDS } from './ashrae621/2025/data';
import { Ashrae622Coefficients } from './ashrae622/types'; 
import { ASHRAE_622_2019_COEFFICIENTS } from './ashrae622/2019/data';
import { ASHRAE_622_2022_COEFFICIENTS } from './ashrae622/2022/data';
import { ASHRAE_622_2025_COEFFICIENTS } from './ashrae622/2025/data';

export type AshraeEdition = '2019' | '2022' | '2025';

export const ACTIVE_PRODUCTION_EDITION: AshraeEdition = '2022';
export const DEFERRED_FUTURE_EDITION: AshraeEdition = '2025';

export class StandardDataProvider {
  static getProductionBasis(): ProductionStandardBasis {
    return ASHRAE_62_1_PRODUCTION_BASIS;
  }

  static getProductionScope(): ProductionStandardBasis {
    return ASHRAE_62_1_PRODUCTION_BASIS;
  }

  // Production methods guaranteed to return 2022 baseline data:
  static getProduction621SpaceTypes(): Ashrae621SpaceType[] {
    return ASHRAE_621_2022_SPACE_TYPES;
  }
  static getProduction621EzValues(): Ashrae621Ez[] {
    return ASHRAE_621_2022_EZ_VALUES;
  }
  static getProduction621ExhaustRates(): Ashrae621ExhaustType[] {
    return ASHRAE_621_2022_EXHAUST_RATES;
  }
  static getProduction621Table63Sources(): Ashrae621Table63Source[] {
    return ASHRAE_621_2022_TABLE_6_3_SOURCES;
  }
  static getProduction622Coefficients(): Ashrae622Coefficients {
    return ASHRAE_622_2022_COEFFICIENTS;
  }
  static getProduction621AirQualityStandards(): Ashrae621AirQualityStandards {
    return ASHRAE_621_2022_AIR_QUALITY_STANDARDS as Ashrae621AirQualityStandards;
  }

  static get621SpaceTypes(edition: AshraeEdition | string = '2022'): Ashrae621SpaceType[] {
    switch (edition) {
      case '2019': return ASHRAE_621_2019_SPACE_TYPES;
      case '2022': return ASHRAE_621_2022_SPACE_TYPES;
      case '2025': return ASHRAE_621_2025_SPACE_TYPES;
      default: throw new Error('INVALID_STANDARD_EDITION');
    }
  }
  static get621EzValues(edition: AshraeEdition | string = '2022'): Ashrae621Ez[] {
    switch (edition) {
      case '2019': return ASHRAE_621_2019_EZ_VALUES;
      case '2022': return ASHRAE_621_2022_EZ_VALUES;
      case '2025': return ASHRAE_621_2025_EZ_VALUES;
      default: throw new Error('INVALID_STANDARD_EDITION');
    }
  }
  static get621ExhaustRates(edition: AshraeEdition | string = '2022'): Ashrae621ExhaustType[] {
    switch (edition) {
      case '2019': return ASHRAE_621_2019_EXHAUST_RATES;
      case '2022': return ASHRAE_621_2022_EXHAUST_RATES;
      case '2025': return ASHRAE_621_2025_EXHAUST_RATES;
      default: throw new Error('INVALID_STANDARD_EDITION');
    }
  }
  static get621Table63Sources(edition: AshraeEdition | string = '2022'): Ashrae621Table63Source[] {
    switch (edition) {
      case '2022': return ASHRAE_621_2022_TABLE_6_3_SOURCES;
      case '2019':
      case '2025':
      default:
        throw new Error('INVALID_STANDARD_EDITION');
    }
  }
  static get622Coefficients(edition: AshraeEdition | string = '2022'): Ashrae622Coefficients {
    switch (edition) {
      case '2019': return ASHRAE_622_2019_COEFFICIENTS;
      case '2022': return ASHRAE_622_2022_COEFFICIENTS;
      case '2025': return ASHRAE_622_2025_COEFFICIENTS;
      default: throw new Error('INVALID_STANDARD_EDITION');
    }
  }

  static get621AirQualityStandards(edition: AshraeEdition | string = '2022'): Ashrae621AirQualityStandards {
    switch (edition) {
      case '2019': return ASHRAE_621_2019_AIR_QUALITY_STANDARDS as Ashrae621AirQualityStandards;
      case '2022': return ASHRAE_621_2022_AIR_QUALITY_STANDARDS as Ashrae621AirQualityStandards;
      case '2025': return ASHRAE_621_2025_AIR_QUALITY_STANDARDS as Ashrae621AirQualityStandards;
      default: throw new Error('INVALID_STANDARD_EDITION');
    }
  }

  static get621DatasetStatus(edition: AshraeEdition | string = '2022'): DatasetCompletenessStatus {
    if (edition === '2022') return ASHRAE_621_2022_DATASET_STATUS;
    if (edition === '2019') return 'SUBSET';
    if (edition === '2025') return 'NOT_VERIFIED';
    return 'SUBSET';
  }

  static validateSpaceTypeCompleteness(spaceTypeId: string, edition: AshraeEdition | string = '2022'): {
    valid: boolean;
    status: DatasetCompletenessStatus;
    reason?: string;
  } {
    const spaces = this.get621SpaceTypes(edition);
    const space = spaces.find(s => s.id === spaceTypeId);
    if (!space) {
      return {
        valid: false,
        status: 'INCOMPLETE',
        reason: `Space type ${spaceTypeId} not found in ${edition} dataset`
      };
    }
    if (space.verificationStatus !== 'VERIFIED') {
      return {
        valid: false,
        status: 'NOT_VERIFIED',
        reason: `Space type ${spaceTypeId} is not verified against published standard`
      };
    }
    return {
      valid: true,
      status: this.get621DatasetStatus(edition)
    };
  }
}