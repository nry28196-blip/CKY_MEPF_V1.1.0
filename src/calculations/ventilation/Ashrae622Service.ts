import { ValidationStatus, VentilationValidationService } from './VentilationValidationService';
import { Ashrae622Coefficients } from '../../data/ventilation/ashrae622/types';

export interface LocalExhaustInput {
  kitchenRequired: number | null; // L/s
  kitchenInstalled: number | null; // L/s
  bathRequired: number | null; // L/s
  bathInstalled: number | null; // L/s
}

export interface Ashrae622WholeDwellingInput {
  floorArea: number; // m2
  bedrooms: number;
  infiltrationCredit: number | null; // L/s
  infiltrationVerified: boolean;
  localExhaust: LocalExhaustInput | null;
  coefficients: Ashrae622Coefficients;
  expectedStandard?: string;
  expectedEdition?: string;
}

export interface Ashrae622WholeDwellingResult {
  qTot: number | null; // L/s
  qInf: number | null; // L/s
  qDeficit: number | null; // L/s
  qFan: number | null; // L/s
  status: ValidationStatus;
  isAuthoritative: boolean;
  isApprovedForEngineeringUse: boolean;
  message?: string;
}

export class Ashrae622Service {
  static calculateWholeDwelling(input: Ashrae622WholeDwellingInput): Ashrae622WholeDwellingResult {
    // Standard Basis Isolation Check (Requirement 5)
    if (input.expectedEdition && input.expectedEdition !== '2022') {
      return {
        qTot: null,
        qInf: null,
        qDeficit: null,
        qFan: null,
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        message: `Calculation blocked: ASHRAE 62.2-${input.expectedEdition} is deferred. Active production standard is ASHRAE 62.2-2022.`
      };
    }
    if (input.expectedStandard && input.expectedStandard !== 'ASHRAE 62.2') {
      return {
        qTot: null,
        qInf: null,
        qDeficit: null,
        qFan: null,
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        message: `Calculation blocked: Invalid standard ${input.expectedStandard}. Expected ASHRAE 62.2.`
      };
    }
    if (input.coefficients?.edition && input.coefficients.edition !== '2022') {
      return {
        qTot: null,
        qInf: null,
        qDeficit: null,
        qFan: null,
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false,
        message: `Calculation blocked: ASHRAE 62.2-${input.coefficients.edition} coefficients are deferred. Active production standard is ASHRAE 62.2-2022.`
      };
    }

    if (input.floorArea < 0 || isNaN(input.floorArea) || input.bedrooms < 0 || isNaN(input.bedrooms)) {
      return {
        qTot: null,
        qInf: null,
        qDeficit: null,
        qFan: null,
        status: 'FAIL',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    // SI units formula using provided coefficients
    const qTot = input.coefficients.areaCoefficientSI * input.floorArea + input.coefficients.occupancyCoefficientSI * (input.bedrooms + 1);
    
    let qInf = 0;
    let status: ValidationStatus = 'PASS';

    if (input.infiltrationCredit !== null && !isNaN(input.infiltrationCredit)) {
      if (!input.infiltrationVerified && input.infiltrationCredit > 0) {
        status = 'WARNING';
        qInf = 0; // Credit cannot be applied if unverified
      } else {
        qInf = input.infiltrationCredit;
      }
    } else {
        // Assume zero if credit isn't provided, but it's optional so PASS
        qInf = 0; 
    }
    
    let qDeficit = 0;
    if (input.localExhaust) {
        if (input.localExhaust.kitchenRequired === null || input.localExhaust.kitchenInstalled === null || 
            input.localExhaust.bathRequired === null || input.localExhaust.bathInstalled === null ||
            isNaN(input.localExhaust.kitchenRequired) || isNaN(input.localExhaust.kitchenInstalled) ||
            isNaN(input.localExhaust.bathRequired) || isNaN(input.localExhaust.bathInstalled)) {
            return {
              qTot: null,
              qInf: null,
              qDeficit: null,
              qFan: null,
              status: 'INCOMPLETE',
              isAuthoritative: false,
              isApprovedForEngineeringUse: false
            };
        }
        
      const kitchenDeficit = (input.localExhaust.kitchenRequired - input.localExhaust.kitchenInstalled) > 0 ? (input.localExhaust.kitchenRequired - input.localExhaust.kitchenInstalled) : 0;
      const bathDeficit = (input.localExhaust.bathRequired - input.localExhaust.bathInstalled) > 0 ? (input.localExhaust.bathRequired - input.localExhaust.bathInstalled) : 0;
      qDeficit = input.coefficients.localExhaustDeficitCoefficient * (kitchenDeficit + bathDeficit);
    }

    // Qfan = Qtot - Qinf + Qdeficit (must be >= 0)
    let qFan = qTot - qInf + qDeficit;
    if (qFan < 0) qFan = 0;

    const isAuthoritative = status === 'PASS';
    const isApprovedForEngineeringUse = isAuthoritative;

    return {
      qTot,
      qInf,
      qDeficit,
      qFan: (status === 'PASS' || status === 'WARNING') ? qFan : null,
      status,
      isAuthoritative,
      isApprovedForEngineeringUse
    };
  }
}
