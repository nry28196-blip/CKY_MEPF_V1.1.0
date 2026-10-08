/**
 * @deprecated - LEGACY COMPATIBILITY ADAPTER ONLY
 * 
 * CRITICAL SAFETY NOTICE:
 * This file is NOT the active production source for ASHRAE 62.1 exhaust rates.
 * The authoritative active production dataset is ASHRAE_621_2022_EXHAUST_RATES
 * in src/data/ventilation/ashrae621/2022/data.ts.
 * 
 * This legacy file must NEVER be imported by production calculation engines or UI.
 * It is maintained strictly as a read-only compatibility adapter for legacy consumers,
 * adapting from the single authoritative production dataset.
 */
import { ASHRAE_621_2022_EXHAUST_RATES } from '../../../data/ventilation/ashrae621/2022/data';

export type AshraeEdition = '2019' | '2022' | '2025';

export interface ExhaustSpaceType {
  id: string;
  name: string;
  ashraeCategory: string; // From Table 6-2
  ashraeRateImp: number; // cfm/ft2 or cfm/unit
  ashraeRateMet: number; // L/s-m2 or L/s-unit
  ashraeUnit: 'area' | 'fixture' | 'equipment' | 'room' | 'custom';
  ashraeClass: 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4';
  imcRateImp: number; // cfm/ft2 or cfm/unit
  imcRateMet: number; // L/s-m2 or L/s-unit
  notes?: string;
  isLegacy?: boolean;
}

export const IS_LEGACY_DATASET = true;

/**
 * Adapter mapping 2022 production exhaust rates into legacy ExhaustSpaceType shape.
 */
function adaptProductionRate(prod: typeof ASHRAE_621_2022_EXHAUST_RATES[number]): ExhaustSpaceType {
  const classMap: Record<number, 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4'> = {
    1: 'Class 1',
    2: 'Class 2',
    3: 'Class 3',
    4: 'Class 4'
  };
  const unitMap: Record<string, 'area' | 'fixture' | 'equipment' | 'room' | 'custom'> = {
    m2: 'area',
    fixture: 'fixture',
    room: 'room',
    equipment: 'equipment',
    showerhead: 'fixture',
    special: 'custom'
  };

  const metRate = prod.rate ?? 0;
  const impRate = prod.rateIp ?? (metRate * 0.2);

  return {
    id: prod.id,
    name: prod.name,
    ashraeCategory: prod.category,
    ashraeRateImp: impRate,
    ashraeRateMet: metRate,
    ashraeUnit: unitMap[prod.unitType] || 'custom',
    ashraeClass: classMap[prod.airClass ?? prod.exhaustClass] || 'Class 2',
    imcRateImp: impRate,
    imcRateMet: metRate,
    notes: prod.notes,
    isLegacy: true
  };
}

// Derived from active production dataset - no independent duplicate hard-coded tables!
export const EXHAUST_2022: ExhaustSpaceType[] = ASHRAE_621_2022_EXHAUST_RATES.map(adaptProductionRate);

// Deprecated legacy stubs
export const EXHAUST_2019: ExhaustSpaceType[] = EXHAUST_2022;
export const EXHAUST_2025: ExhaustSpaceType[] = EXHAUST_2022;
