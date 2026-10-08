import { Ashrae621SpaceType, Ashrae621Ez, Ashrae621ExhaustType, DataProvenance, SourceType, VerificationStatus, StandardRevision } from '../../data/ventilation/ashrae621/types';
import { ValidationStatus } from './VentilationValidationService';

export interface DataProvenanceValidationResult {
  valid: boolean;
  status: ValidationStatus;
  reasons: string[];
}

export interface ProvenanceParent {
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  standard: string;
  edition: string;
  revisionState?: StandardRevision;
  verificationDate?: string;
}
export class DataProvenanceValidationService {
  static validateExhaustData(
    exhaustType: any,
    expectedStandard: string,
    expectedEdition: string
  ): any {
    const reasons: string[] = [];
    
    // 6. VERIFY PARENT METADATA
    if (exhaustType.standard !== expectedStandard) reasons.push('Invalid Standard Configuration');
    if (exhaustType.edition !== expectedEdition) reasons.push('Edition Mismatch');
    
    if (exhaustType.revisionState?.standard !== expectedStandard || exhaustType.revisionState?.edition !== expectedEdition) {
      reasons.push('Revision Mismatch');
    }
    
    if (!exhaustType.reference) {
      reasons.push('Missing Reference');
    }

    if (exhaustType.provenance) {
      if (!this.validateProvenance(exhaustType.provenance.rate, expectedStandard, expectedEdition, exhaustType.rate)) reasons.push('Unverified Exhaust Rate');
      if (exhaustType.provenance.unitType && !this.validateProvenance(exhaustType.provenance.unitType, expectedStandard, expectedEdition, exhaustType.unitType)) reasons.push('Unverified Unit Type');
      if (exhaustType.provenance.exhaustClass && !this.validateProvenance(exhaustType.provenance.exhaustClass, expectedStandard, expectedEdition, exhaustType.exhaustClass)) reasons.push('Unverified Exhaust Class');
      if (exhaustType.provenance.operatingCondition && !this.validateProvenance(exhaustType.provenance.operatingCondition, expectedStandard, expectedEdition, exhaustType.operatingCondition)) reasons.push('Unverified Operating Condition');
      
      if (!this.checkParentConsistency(exhaustType, exhaustType.provenance.rate)) reasons.push('Contradictory Parent Provenance');
    } else {
      if (exhaustType.verificationStatus !== 'VERIFIED' || !this.isAshraeSourceTypeAcceptable(exhaustType.sourceType)) {
        reasons.push('Unverified Exhaust');
      }
    }
    
    if (exhaustType.verificationStatus === 'VERIFIED') {
      // 5. STRICT SOURCE CONSISTENCY
      if (!this.isAshraeSourceTypeAcceptable(exhaustType.sourceType)) reasons.push('Contradictory Source Type');
      if (!this.isAshraeSourceTypeAcceptable(exhaustType.revisionState?.source)) reasons.push('Contradictory Source Type');
      
      // 4. STRICT EXHAUST VERIFICATION DATE
      if (!this.isDateValid(exhaustType.verificationDate)) reasons.push('Invalid Verification Date');
      if (!this.isDateValid(exhaustType.revisionState?.verificationDate)) reasons.push('Invalid Revision Verification Date');
    } else {
      if (!exhaustType.provenance) reasons.push('Unverified Exhaust');
    }
    
    const valid = reasons.length === 0;
    let status = 'PASS';
    
    if (!valid) {
      status = 'BLOCKED';
    }
    return { valid, status, reasons };
  }

  static isAshraeSourceTypeAcceptable(sourceType: SourceType | undefined): boolean {
    return sourceType === SourceType.ASHRAE_PUBLISHED ||
           sourceType === SourceType.ASHRAE_PUBLISHED_ADDENDUM ||
           sourceType === SourceType.ASHRAE_PUBLISHED_ERRATA;
  }

  static validateProvenance(
    provenance: DataProvenance | undefined,
    expectedStandard: string,
    expectedEdition: string,
    expectedValue?: number | string | boolean
  ): boolean {
    if (!provenance) return false;
    
    // 10. REFERENCE VALIDATION
    if (!provenance.reference) return false;
    
    if (provenance.standard !== expectedStandard) return false;
    if (provenance.edition !== expectedEdition) return false;
    
    // 4. REVISION MUST MATCH THE SELECTED EDITION
    if (provenance.revision !== expectedEdition) return false;
    
    if (provenance.verificationStatus !== 'VERIFIED') return false;
    
    // 5. SOURCE TYPE MUST MATCH THE STANDARD
    if (!this.isAshraeSourceTypeAcceptable(provenance.sourceType)) return false;

    // 8. verificationDate exists and is a valid date
    if (!this.isDateValid(provenance.verificationDate)) return false;
    
    // 2. ACTUAL VALUE-TO-PROVENANCE VALIDATION
    if (expectedValue !== undefined) {
      if (provenance.value !== expectedValue) return false;
    }
    
    return true;
  }
  
    
  static isDateValid(dateString: unknown): boolean {
    if (typeof dateString !== "string" || !dateString) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    // ensure no impossible dates like 2025-99-99 by checking if ISO string matches original (or parsing doesn't shift it)
    const [y, m, dNum] = dateString.split('-');
    if (d.getUTCFullYear() !== parseInt(y) || (d.getUTCMonth() + 1) !== parseInt(m) || d.getUTCDate() !== parseInt(dNum)) return false;
    return true;
  }

  static isValidSourceType(source: unknown): source is SourceType {
    if (typeof source !== 'string') return false;
    const validSourceTypes: SourceType[] = [
      SourceType.ASHRAE_PUBLISHED, SourceType.ASHRAE_PUBLISHED_ADDENDUM, SourceType.ASHRAE_PUBLISHED_ERRATA,
      SourceType.PROJECT_SPECIFICATION, SourceType.ADOPTED_CODE, SourceType.PUBLIC_REVIEW_DRAFT, SourceType.UNKNOWN
    ];
    return validSourceTypes.includes(source as SourceType);
  }

  static checkParentConsistency(parent: ProvenanceParent, prov: DataProvenance | undefined): boolean {
      if (!prov) return true;
      
      const source = parent.revisionState?.source;
      if (!this.isValidSourceType(source)) {
        return false;
      }
      if (!this.isValidSourceType(parent.sourceType)) {
        return false;
      }

      if (parent.verificationStatus === 'VERIFIED') {
          if (!this.isAshraeSourceTypeAcceptable(parent.sourceType)) return false;
          if (!this.isAshraeSourceTypeAcceptable(source)) return false;
      }

      if (prov.verificationStatus === 'VERIFIED' && parent.verificationStatus !== 'VERIFIED') return false;
      
      if (parent.standard !== prov.standard) return false;
      if (parent.edition !== prov.edition) return false;
      if (parent.revisionState?.standard !== prov.standard) return false;
      if (parent.revisionState?.edition !== prov.edition) return false;
      
      return true;
  }

  static validateSpaceTypeData(
    spaceType: Ashrae621SpaceType,
    expectedStandard: string,
    expectedEdition: string,
    expectedReferenceBasis?: string
  ): DataProvenanceValidationResult {
    const reasons: string[] = [];
    
    if (expectedReferenceBasis && spaceType.referenceBasis && spaceType.referenceBasis !== expectedReferenceBasis) {
      reasons.push('Reference Basis Mismatch');
    }
    
        if (spaceType.verificationStatus === 'VERIFIED') {
      if (!this.isAshraeSourceTypeAcceptable(spaceType.sourceType) || !this.isAshraeSourceTypeAcceptable(spaceType.revisionState?.source)) {
        reasons.push('Invalid Source Type for VERIFIED data');
      }
      if (!this.isDateValid(spaceType.verificationDate)) {
        reasons.push('Invalid Verification Date');
      }
      if (!this.isDateValid(spaceType.revisionState?.verificationDate)) {
        reasons.push('Invalid Revision Verification Date');
      }
    }
    if (spaceType.standard !== expectedStandard) reasons.push('Invalid Standard Configuration');
    if (spaceType.edition !== expectedEdition) reasons.push('Edition Mismatch');
    
    if (spaceType.revisionState?.standard !== expectedStandard || spaceType.revisionState?.edition !== expectedEdition) {
      reasons.push('Revision Mismatch');
    }
    
    if (!spaceType.reference) {
      reasons.push('Missing Reference');
    }

    if (spaceType.provenance) {
      if (!this.validateProvenance(spaceType.provenance.rp, expectedStandard, expectedEdition, spaceType.rpMetric)) reasons.push('Unverified Rp');
      if (!this.validateProvenance(spaceType.provenance.ra, expectedStandard, expectedEdition, spaceType.raMetric)) reasons.push('Unverified Ra');
      // 3. DEFAULT OCCUPANCY MUST BE VALIDATED WHEN PRESENT
      const shouldValidateOccupancy = spaceType.defaultOccupancyMetric !== undefined && spaceType.defaultOccupancyMetric !== null;
      if (shouldValidateOccupancy && !this.validateProvenance(spaceType.provenance.defaultOccupancy, expectedStandard, expectedEdition, spaceType.defaultOccupancyMetric)) {
        reasons.push('Unverified Occupancy Density');
      }
      if (spaceType.provenance.reference && !this.validateProvenance(spaceType.provenance.reference, expectedStandard, expectedEdition, spaceType.reference)) {
        reasons.push('Missing Reference');
      }
      const shouldValidateAirClass = spaceType.airClass !== undefined && spaceType.airClass !== null && spaceType.provenance.airClass !== undefined;
      if (shouldValidateAirClass && !this.validateProvenance(spaceType.provenance.airClass, expectedStandard, expectedEdition, spaceType.airClass)) {
        reasons.push('Unverified Air Class');
      }
      
      if (!this.checkParentConsistency(spaceType, spaceType.provenance.rp) ||
          !this.checkParentConsistency(spaceType, spaceType.provenance.ra) ||
          (shouldValidateOccupancy && !this.checkParentConsistency(spaceType, spaceType.provenance.defaultOccupancy)) ||
          (shouldValidateAirClass && !this.checkParentConsistency(spaceType, spaceType.provenance.airClass)) ||
          !this.checkParentConsistency(spaceType, spaceType.provenance.reference)) {
          reasons.push('Contradictory Parent Provenance');
      }
    } else {
      if (spaceType.verificationStatus !== 'VERIFIED' || !this.isAshraeSourceTypeAcceptable(spaceType.sourceType)) {
        reasons.push('Unverified Space Type');
      }
    }
    
    
    
    const valid = reasons.length === 0;
    let status: ValidationStatus = 'PASS';
    
    if (!valid) {
      status = 'BLOCKED';
    }

    return { valid, status, reasons };
  }

  static validateEzData(
    ezConfig: Ashrae621Ez,
    expectedStandard: string,
    expectedEdition: string
  ): DataProvenanceValidationResult {
    const reasons: string[] = [];
    
        if (ezConfig.verificationStatus === 'VERIFIED') {
      if (!this.isAshraeSourceTypeAcceptable(ezConfig.sourceType) || !this.isAshraeSourceTypeAcceptable(ezConfig.revisionState?.source)) {
        reasons.push('Invalid Source Type for VERIFIED data');
      }
      if (!this.isDateValid(ezConfig.verificationDate)) {
        reasons.push('Invalid Verification Date');
      }
      if (!this.isDateValid(ezConfig.revisionState?.verificationDate)) {
        reasons.push('Invalid Revision Verification Date');
      }
    }
    if (ezConfig.standard !== expectedStandard) reasons.push('Invalid Standard Configuration');
    if (ezConfig.edition !== expectedEdition) reasons.push('Edition Mismatch');
    
    if (!ezConfig.reference) {
      reasons.push('Missing Ez Reference');
    }

    if (ezConfig.provenance) {
      if (!this.validateProvenance(ezConfig.provenance.ez, expectedStandard, expectedEdition, ezConfig.ez)) reasons.push('Unverified Ez');
      if (!this.validateProvenance(ezConfig.provenance.applicability, expectedStandard, expectedEdition, ezConfig.applicableCondition)) reasons.push('Unverified Ez Applicability');
      if (ezConfig.provenance.reference && !this.validateProvenance(ezConfig.provenance.reference, expectedStandard, expectedEdition, ezConfig.reference)) {
        reasons.push('Missing Ez Reference');
      }
      
      if (!this.checkParentConsistency(ezConfig, ezConfig.provenance.ez) ||
          !this.checkParentConsistency(ezConfig, ezConfig.provenance.applicability) ||
          !this.checkParentConsistency(ezConfig, ezConfig.provenance.reference)) {
          reasons.push('Contradictory Parent Provenance');
      }
    } else {
      if (ezConfig.verificationStatus !== 'VERIFIED' || !this.isAshraeSourceTypeAcceptable(ezConfig.sourceType)) {
        reasons.push('Unverified Ez');
      }
    }
    
    const valid = reasons.length === 0;
    let status: ValidationStatus = 'PASS';
    
    if (!valid) {
      status = 'BLOCKED';
    }

    return { valid, status, reasons };
  }
}
