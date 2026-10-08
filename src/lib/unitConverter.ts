// Metric to Imperial multipliers
export const CONVERSIONS = {
  // Length
  MM_TO_IN: 0.0393701,
  IN_TO_MM: 25.4,
  M_TO_FT: 3.28084,
  FT_TO_M: 0.3048,

  // Volume
  L_TO_GAL: 0.264172,
  GAL_TO_L: 3.78541,

  // Flow
  LPS_TO_CFM: 2.11888,
  CFM_TO_LPS: 0.471947,
  LPS_TO_GPM: 15.8503,
  GPM_TO_LPS: 0.06309,
  LPM_TO_GPM: 0.264172,
  GPM_TO_LPM: 3.78541,

  // Velocity
  MS_TO_FPM: 196.85,
  FPM_TO_MS: 0.00508,

  // Pressure/Friction
  PAM_TO_IN100FT: 0.1224, // 1 in.wg/100ft = 8.169 Pa/m approx, so 1 Pa/m = 0.1224 in/100ft
  IN100FT_TO_PAM: 8.169,

  // Power
  KW_TO_BTUH: 3412.14,
  BTUH_TO_KW: 0.000293071,
  KW_TO_HP: 1.34102,
  HP_TO_KW: 0.7457,
};

export const convertValue = (val: number, multiplier: number) => {
  return Number(((val * multiplier) || 0).toFixed(4));
};

export const celsiusToFahrenheit = (c: number) => (c * 9/5) + 32;
export const fahrenheitToCelsius = (f: number) => (f - 32) * 5/9;
export const deltaCelsiusToFahrenheit = (c: number) => c * 9/5;
export const deltaFahrenheitToCelsius = (f: number) => f * 5/9;
