import { Ashrae622Coefficients } from "../types";

/**
 * [FUTURE / DISABLED / NOT ACTIVE]
 * ASHRAE 62.2-2025 is deferred until after the 2022 baseline has been fully validated.
 * This dataset MUST NOT be used in active production calculation paths.
 */
export const IS_622_2025_PRODUCTION_ACTIVE = false;

export const ASHRAE_622_2025_COEFFICIENTS: Ashrae622Coefficients = {
  standard: 'ASHRAE 62.2',
  edition: '2025',
  areaCoefficientSI: 0.15,
  occupancyCoefficientSI: 3.5,
  areaCoefficientIP: 0.03,
  occupancyCoefficientIP: 7.5,
  localExhaustDeficitCoefficient: 0.25
};
