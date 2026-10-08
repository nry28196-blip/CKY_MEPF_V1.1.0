/**
 * @deprecated LEGACY DIAGNOSTIC ADVISORY VALIDATOR
 * 
 * DO NOT USE FOR AUTHORITATIVE ASHRAE 62.1 VENTILATION COMPLIANCE.
 * 
 * This legacy validator provides secondary advisory checks and UI warning messages.
 * Authoritative compliance must always be evaluated using:
 * - `VentilationValidationService`
 * - `DataProvenanceValidationService`
 * - `EzSelectionService`
 * - `Ashrae621ZoneService`
 */

import { ZoneVentilationData, SystemOutdoorAirRequirements } from '../../models/VentilationModels';
import { AirBalanceResult } from '../ventilation/AirBalanceService';

export type ValidationSeverity = 'info' | 'warning' | 'error';

export interface ValidationMessage {
  severity: ValidationSeverity;
  message: string;
  code: string;
}

export class VentilationValidator {
  /**
   * Validates individual zone ventilation parameters.
   */
  static validateZone(zone: ZoneVentilationData): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (zone.area <= 0) {
      messages.push({ 
        severity: 'error', 
        code: 'Z-01', 
        message: 'Zone area must be greater than zero.' 
      });
    }

    if (zone.vpz !== undefined && zone.vpz > 0) {
      // Vpz must be >= Voz. If not, the zone requires more outdoor air than its total supply.
      if (zone.voz > zone.vpz) {
        messages.push({ 
          severity: 'error', 
          code: 'Z-02', 
          message: `Zone outdoor air (Voz = ${Math.round(zone.voz)}) exceeds total primary air (Vpz = ${Math.round(zone.vpz)}). This requires more than 100% outdoor air, which is physically impossible. Increase Vpz.` 
        });
      } else if (zone.zp && zone.zp > 0.6) {
        // High Zp generally indicates poor efficiency
        messages.push({ 
          severity: 'warning', 
          code: 'Z-03', 
          message: `High outdoor air fraction (Zp = ${(zone.zp || 0).toFixed(2)}). This may result in low system ventilation efficiency (Ev) and high energy penalties. Consider increasing primary airflow (Vpz) to this zone.` 
        });
      }
    }

    if (zone.dMode === 'VAV') {
      if (zone.vpzMinDesign === undefined || zone.vpzMinDesign === null || isNaN(zone.vpzMinDesign)) {
        messages.push({
          severity: 'error',
          code: 'Z-04',
          message: 'VAV minimum primary airflow (Vpz-min-design) is required.'
        });
      } else if (zone.vpzMinRequired && zone.vpzMinDesign < zone.vpzMinRequired - 1e-4) {
        messages.push({
          severity: 'error',
          code: 'Z-05',
          message: `Zone minimum primary airflow (${Math.round(zone.vpzMinDesign)}) is below required minimum (${Math.round(zone.vpzMinRequired)}).`
        });
      }
    }

    return messages;
  }

  /**
   * Validates aggregate system ventilation parameters.
   */
  static validateSystem(system: SystemOutdoorAirRequirements): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (system.airDistributionType === 'VAV') {
      if (system.vps === undefined || system.vps === null || isNaN(system.vps) || system.vps <= 0) {
        messages.push({
          severity: 'error',
          code: 'S-00',
          message: 'System primary airflow (Vps) is required for VAV systems.'
        });
      }
    }

    if (system.vps !== undefined && system.vps > 0 && system.vps < system.vou) {
       messages.push({ 
         severity: 'error', 
         code: 'S-01', 
         message: 'System primary airflow Vps is less than uncorrected outdoor-air intake Vou. Verify the VAV system design airflow.' 
       });
    }

    // System ventilation efficiency (Ev) warning for very low efficiency
    if (system.ev < 0.4) {
       messages.push({ 
         severity: 'warning', 
         code: 'S-02', 
         message: `Very low system ventilation efficiency (Ev = ${(system.ev || 0).toFixed(2)}). Consider rebalancing zone airflows, increasing minimum primary airflow to critical zones, or using a Dedicated Outdoor Air System (DOAS).` 
       });
    }

    return messages;
  }

  /**
   * Validates room air balance and net pressure differentials.
   */
  static validateAirBalance(balance: AirBalanceResult, isMetric: boolean): ValidationMessage[] {
    const messages: ValidationMessage[] = [];
    
    // Roughly 500 CFM or 250 L/s threshold for door opening difficulties
    const highPressureThreshold = isMetric ? 250 : 500; 
    
    if (balance.qNet !== null && Math.abs(balance.qNet) > highPressureThreshold) {
       messages.push({ 
         severity: 'warning', 
         code: 'B-01', 
         message: `Excessive net airflow differential (${Math.round(balance.qNet)} ${isMetric ? 'L/s' : 'CFM'}). Differentials this high may cause acoustic whistling, draft issues, or prevent interior doors from operating properly (exceeding ADA 5 lbf pull force).` 
       });
    }
    
    return messages;
  }
}
