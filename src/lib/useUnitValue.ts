
import { useUnit } from './UnitContext';
import { CONVERSIONS, convertValue, deltaCelsiusToFahrenheit, deltaFahrenheitToCelsius } from './unitConverter';

export function useUnitValue(internalImperialValue: number, conversionType: 'flow_air' | 'flow_water' | 'friction' | 'length' | 'velocity_air' | 'velocity_water' | 'temp_diff' | 'power' | 'none') {
  const { unitSystem } = useUnit();
  
  const getDisplayValue = (val: number) => {
    if (unitSystem === 'imperial' || conversionType === 'none') return val;
    switch(conversionType) {
      case 'flow_air': return convertValue(val, CONVERSIONS.CFM_TO_LPS);
      case 'flow_water': return convertValue(val, CONVERSIONS.GPM_TO_LPS);
      case 'friction': return convertValue(val, CONVERSIONS.IN100FT_TO_PAM);
      case 'length': return convertValue(val, CONVERSIONS.IN_TO_MM);
      case 'velocity_air': return convertValue(val, CONVERSIONS.FPM_TO_MS);
      case 'velocity_water': return convertValue(val, CONVERSIONS.FT_TO_M); // wait, GPM and pipe vel uses ft/s? actually pipe vel is usually m/s vs ft/s
      case 'temp_diff': return deltaFahrenheitToCelsius(val);
      case 'power': return convertValue(val, CONVERSIONS.BTUH_TO_KW);
      default: return val;
    }
  };

  const getInternalValue = (displayVal: number) => {
    if (unitSystem === 'imperial' || conversionType === 'none') return displayVal;
    switch(conversionType) {
      case 'flow_air': return convertValue(displayVal, CONVERSIONS.LPS_TO_CFM);
      case 'flow_water': return convertValue(displayVal, CONVERSIONS.LPS_TO_GPM);
      case 'friction': return convertValue(displayVal, CONVERSIONS.PAM_TO_IN100FT);
      case 'length': return convertValue(displayVal, CONVERSIONS.MM_TO_IN);
      case 'velocity_air': return convertValue(displayVal, CONVERSIONS.MS_TO_FPM);
      case 'velocity_water': return convertValue(displayVal, CONVERSIONS.M_TO_FT);
      case 'temp_diff': return deltaCelsiusToFahrenheit(displayVal);
      case 'power': return convertValue(displayVal, CONVERSIONS.KW_TO_BTUH);
      default: return displayVal;
    }
  };

  return { getDisplayValue, getInternalValue, isMetric: unitSystem === 'metric' };
}
