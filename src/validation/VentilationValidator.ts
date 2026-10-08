/**
 * @deprecated QUARANTINED LEGACY THERMAL LOAD INPUT VALIDATOR
 * 
 * DO NOT USE FOR AUTHORITATIVE ASHRAE 62.1 COMPLIANCE.
 * 
 * This validator only performs preliminary input sanity checks for general thermal
 * cooling load estimation (in MechanicalCalc). It must NEVER be used to certify
 * or validate ASHRAE 62.1 ventilation compliance.
 * 
 * For authoritative ventilation compliance:
 * - Use `VentilationValidationService`
 * - Use `DataProvenanceValidationService`
 * - Use `Ashrae621ZoneService`
 */

export type ComplianceStatus = 'PASS' | 'FAIL' | 'INCOMPLETE';

export interface ValidationResult {
  status: ComplianceStatus;
  messages: string[];
  readonly isAuthoritative: false;
}

export interface VentilationValidationParams {
  area: number | '';
  volume: number | '';
  occupants: number | '';
  ventilationLps: number | '';
  outdoorTemp: number | '';
  indoorTemp: number | '';
}

export class VentilationValidator {
  /**
   * Preliminary sanity checks for thermal cooling load inputs.
   * Not an authoritative ASHRAE 62.1 determination.
   */
  static validate(params: VentilationValidationParams): ValidationResult {
    const messages: string[] = [];
    let status: ComplianceStatus = 'PASS';

    // Check incomplete
    if (
      params.area === '' || 
      params.volume === '' || 
      params.occupants === '' || 
      params.ventilationLps === '' ||
      params.outdoorTemp === '' ||
      params.indoorTemp === ''
    ) {
      return { 
        status: 'INCOMPLETE', 
        messages: ['Missing required inputs for calculation.'],
        isAuthoritative: false 
      };
    }

    const area = Number(params.area);
    const volume = Number(params.volume);
    const occupants = Number(params.occupants);
    const vent = Number(params.ventilationLps);
    const outTemp = Number(params.outdoorTemp);
    const inTemp = Number(params.indoorTemp);

    if (area <= 0) messages.push('Area must be greater than 0.');
    if (volume <= 0) messages.push('Volume must be greater than 0.');
    if (occupants < 0) messages.push('Occupants cannot be negative.');
    if (vent < 0) messages.push('Ventilation flow rate cannot be negative.');
    if (inTemp < 10 || inTemp > 35) messages.push('Indoor design temperature is outside standard comfort range (10-35°C).');
    if (outTemp < -60 || outTemp > 60) messages.push('Outdoor design temperature is outside standard ambient bounds.');
    
    // Thermal cooling input rule-of-thumb advisory (not an authoritative ASHRAE 62.1 compliance check)
    if (occupants > 0 && vent < (occupants * 2.5)) {
      messages.push('Thermal sizing advisory: Flow is below 2.5 L/s per occupant guideline for typical spaces. Not an authoritative ASHRAE 62.1 compliance determination.');
    }

    if (messages.length > 0) {
      status = 'FAIL';
    }

    return { status, messages, isAuthoritative: false };
  }
}
