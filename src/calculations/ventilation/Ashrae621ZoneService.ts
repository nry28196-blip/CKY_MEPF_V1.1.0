import { AuditStatus } from '../../types';
import { ValidationStatus, VentilationValidationService } from './VentilationValidationService';
import { Ashrae621SpaceType, Ashrae621Ez, SourceType } from '../../data/ventilation/ashrae621/types';
import { DataProvenanceValidationService } from './DataProvenanceValidationService';
import { EzSelectionService, EzValidationConditions, PersonalizedVentilationPrerequisites, StratifiedSystemPrerequisites } from './EzSelectionService';
import { normalizeAddendumIdentifier } from '../scope/ProductionCalculationScope';
import { EngineeringValidationLogger } from '../validation/EngineeringValidationLogger';

export interface AuditTrailItem {
  symbol: string;
  name: string;
  formula: string;
  inputs: Record<string, number | string>;
  result: number | string | null;
  unit: string;
  reference: string;
  revision?: string;
  status?: AuditStatus;
}

export interface ZoneVentilationInput {
  dMode?: "CV" | "VAV";
  vpz?: number | null;
  vpzMinDesign?: number | null;
  vpzMinRequired?: number | null;
  vdzMinDesign?: number | null;
  ep?: number | null;
  er?: number | null;
  id?: string;
  expectedStandard: string;
  expectedEdition: string;
  expectedAddenda?: string[];
  addenda?: string[];
  spaceType: Ashrae621SpaceType | null;
  area: number; // m2
  designOccupancy: number | null;
  useDefaultOccupancy: boolean;
  ezConfig: Ashrae621Ez | null;
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
  ezConditions?: EzValidationConditions;
  eRho?: number;
  epDensity?: number;
}

export interface ZoneVentilationResult {
  id?: string;
  reason?: string;
  spaceTypeId?: string;
  spaceTypeName?: string;
  airClass?: number;
  standard: string;
  edition: string;
  revision: string;
  references: string[];
  az: number | null; // m2
  pz: number | null; // people
  rp: number | null; // L/s-person
  ra: number | null; // L/s-m2
  vbp: number | null; // L/s
  vba: number | null; // L/s
  vbz: number | null; // L/s
  ez: number | null;
  epDensity?: number | null;
  voz: number | null; // L/s
  occupancySource: 'design' | 'default' | null;
  occupancyDensityUsed: number | null;
  populationBeforeDisplayRounding: number | null;
  status: ValidationStatus;
  auditTrail: AuditTrailItem[];
}

export class Ashrae621ZoneService {
  static calculateZone(input: ZoneVentilationInput): ZoneVentilationResult {
    const auditTrail: AuditTrailItem[] = [];
    const statuses: ValidationStatus[] = [];

    if (!input.spaceType) {
      return this.emptyResult('INCOMPLETE', 'Missing Space Type');
    }
    if (!input.ezConfig) {
      return this.emptyResult('INCOMPLETE', 'Missing Ez configuration');
    }

    // Check for unapproved addenda
    const requestedAddenda = input.expectedAddenda || input.addenda;
    if (requestedAddenda && requestedAddenda.length > 0) {
      const unapproved = requestedAddenda.filter(a => normalizeAddendumIdentifier(a) !== 'j');
      if (unapproved.length > 0) {
        return this.emptyResult('BLOCKED', `Unapproved addenda requested: [${unapproved.join(', ')}]. Controlled commercial basis is restricted to ANSI/ASHRAE Standard 62.1-2022 + Addendum j.`);
      }
    }

    if (input.area === null || isNaN(input.area) || input.area <= 0 || !isFinite(input.area)) {
      return this.emptyResult('FAIL', 'Invalid Area');
    }
    if (input.ezConfig.ez === null || isNaN(input.ezConfig.ez) || input.ezConfig.ez <= 0 || !isFinite(input.ezConfig.ez)) {
      return this.emptyResult('FAIL', 'Invalid Ez');
    }

    const spaceTypeValidation = DataProvenanceValidationService.validateSpaceTypeData(
      input.spaceType, input.expectedStandard, input.expectedEdition
    );
    if (!spaceTypeValidation.valid) {
      let reason = spaceTypeValidation.reasons[0];
      if (spaceTypeValidation.status === 'BLOCKED') {
        reason = `Calculation blocked: ${input.expectedStandard}-${input.expectedEdition} ${reason}`;
      }
      return this.emptyResult(spaceTypeValidation.status, reason);
    }

    const isOverride = Boolean(
      input.ezConfig.isManualOverride ||
      input.ezConfig.sourceType === SourceType.USER_OVERRIDE ||
      input.ezConfig.distributionCategory === 'override' ||
      input.ezConfig.id.startsWith('manual-override')
    );

    if (isOverride) {
      if (!input.ezConfig.manualOverrideBasis && !input.ezConfig.manualJustification) {
        return this.emptyResult('INCOMPLETE', 'Missing engineering justification for Ez manual override');
      }
    } else {
      const ezValidation = DataProvenanceValidationService.validateEzData(
        input.ezConfig, input.expectedStandard, input.expectedEdition
      );
      if (!ezValidation.valid) {
        let reason = ezValidation.reasons[0];
        if (ezValidation.status === 'BLOCKED') {
          reason = `Calculation blocked: ${input.expectedStandard}-${input.expectedEdition} ${reason}`;
        }
        return this.emptyResult(ezValidation.status, reason);
      }
    }

    // Establish that the selected Table 6-4 Ez (or manual override) is valid for the physical configuration
    const conditions: EzValidationConditions = {
      supplyLocation: input.supplyLocation ?? input.ezConditions?.supplyLocation,
      returnLocation: input.returnLocation ?? input.ezConditions?.returnLocation,
      supplyTempRelationship: input.supplyTempRelationship ?? input.ezConditions?.supplyTempRelationship,
      spaceTempRelationship: input.spaceTempRelationship ?? input.ezConditions?.spaceTempRelationship,
      supplyAirCondition: input.supplyAirCondition ?? input.ezConditions?.supplyAirCondition,
      verticalThrowMet: input.verticalThrowMet ?? input.ezConditions?.verticalThrowMet,
      returnHeightM: input.returnHeightM ?? input.ezConditions?.returnHeightM,
      returnHeightGt55m: input.returnHeightGt55m ?? input.ezConditions?.returnHeightGt55m,
      returnHeightGte55m: input.returnHeightGte55m ?? input.ezConditions?.returnHeightGte55m,
      supplyJetVelocityMet: input.supplyJetVelocityMet ?? input.ezConditions?.supplyJetVelocityMet,
      makeupAirDistance: input.makeupAirDistance ?? input.ezConditions?.makeupAirDistance,
      isDirectMakeupExhaust: input.isDirectMakeupExhaust ?? input.ezConditions?.isDirectMakeupExhaust,
      isPersonalizedVentilation: input.isPersonalizedVentilation ?? input.ezConditions?.isPersonalizedVentilation,
      personalizedPrerequisites: input.personalizedPrerequisites ?? input.ezConditions?.personalizedPrerequisites,
      personalizedPrerequisitesMet: input.personalizedPrerequisitesMet ?? input.ezConditions?.personalizedPrerequisitesMet,
      personalizedSystemType: input.personalizedSystemType ?? input.ezConditions?.personalizedSystemType,
      stratifiedPrerequisites: input.stratifiedPrerequisites ?? input.ezConditions?.stratifiedPrerequisites,
      stratifiedPrerequisitesMet: input.stratifiedPrerequisitesMet ?? input.ezConditions?.stratifiedPrerequisitesMet,
    };

    const ezConfigValidation = EzSelectionService.validateEzConfiguration(input.ezConfig, conditions);
    if (!ezConfigValidation.valid) {
      return this.emptyResult(ezConfigValidation.status, ezConfigValidation.reasons[0]);
    }
    if (ezConfigValidation.status !== 'PASS') {
      statuses.push(ezConfigValidation.status);
    }

    const az = input.area;
    const ez = input.ezConfig.ez;
    const rp = input.spaceType.rpMetric;
    const ra = input.spaceType.raMetric;

    if (rp === null || isNaN(rp) || !isFinite(rp)) return this.emptyResult('INCOMPLETE', 'Invalid Rp');
    if (ra === null || isNaN(ra) || !isFinite(ra)) return this.emptyResult('INCOMPLETE', 'Invalid Ra');

    let pz: number | null = null;
    let occupancySource: 'design' | 'default' = 'design';
    let occupancyDensityUsed: number | null = null;
    let populationBeforeDisplayRounding: number | null = null;

    if (input.useDefaultOccupancy) {
      occupancyDensityUsed = input.spaceType.defaultOccupancyMetric;
      pz = (az / 100) * occupancyDensityUsed;
      occupancySource = 'default';
      populationBeforeDisplayRounding = pz;
    } else {
      if (input.designOccupancy === null || isNaN(input.designOccupancy) || input.designOccupancy < 0 || !isFinite(input.designOccupancy)) {
        return input.designOccupancy === null ? this.emptyResult('INCOMPLETE', 'Missing Occupancy') : this.emptyResult('FAIL', 'Invalid Occupancy');
      }
      pz = input.designOccupancy;
      occupancySource = 'design';
      populationBeforeDisplayRounding = pz;
    }

    const vbp = rp * pz;
    const vba = ra * az;
    const vbz = vbp + vba;
    
    // Addendum j air-density correction: Voz = (Vbz / Ez) * Ep
    // Ep is the local air-density correction factor (historically also tracked as eRho in this codebase)
    if (input.epDensity !== undefined && input.epDensity !== null) {
      if (typeof input.epDensity !== 'number' || !Number.isFinite(input.epDensity) || input.epDensity <= 0) {
        EngineeringValidationLogger.logSafetyFailure({
          system: 'Ashrae621ZoneService.calculateZone',
          field: 'epDensity',
          value: input.epDensity,
          failureType: (typeof input.epDensity === 'number' && !Number.isFinite(input.epDensity)) ? 'NON_FINITE_NUMERIC' : 'OUT_OF_BOUNDS',
          status: 'FAIL',
          expected: 'finite number > 0',
          message: 'Invalid air-density correction factor (epDensity): must be a finite number > 0'
        });
        return this.emptyResult('FAIL', 'Invalid air-density correction factor (epDensity): must be a finite number > 0');
      }
    }
    if (input.eRho !== undefined && input.eRho !== null) {
      if (typeof input.eRho !== 'number' || !Number.isFinite(input.eRho) || input.eRho <= 0) {
        EngineeringValidationLogger.logSafetyFailure({
          system: 'Ashrae621ZoneService.calculateZone',
          field: 'eRho',
          value: input.eRho,
          failureType: (typeof input.eRho === 'number' && !Number.isFinite(input.eRho)) ? 'NON_FINITE_NUMERIC' : 'OUT_OF_BOUNDS',
          status: 'FAIL',
          expected: 'finite number > 0',
          message: 'Invalid air-density correction factor (eRho): must be a finite number > 0'
        });
        return this.emptyResult('FAIL', 'Invalid air-density correction factor (eRho): must be a finite number > 0');
      }
    }

    let epDensity = 1.0;
    let isDensitySpecified = false;

    if (input.epDensity !== undefined && input.epDensity !== null) {
      epDensity = input.epDensity;
      isDensitySpecified = true;
    } else if (input.eRho !== undefined && input.eRho !== null) {
      epDensity = input.eRho;
      isDensitySpecified = true;
    }

    const voz = (vbz / ez) * epDensity;

    auditTrail.push({
      symbol: 'Vbz',
      name: 'Breathing Zone Outdoor Airflow',
      formula: 'Rp × Pz + Ra × Az',
      inputs: { 'Rp': rp, 'Pz': pz, 'Ra': ra, 'Az': az },
      result: vbz,
      unit: 'L/s',
      reference: input.spaceType.reference,
      revision: input.spaceType.revisionState?.source || '',
      status: AuditStatus.DERIVED
    });

    auditTrail.push({
      symbol: 'Voz',
      name: 'Zone Outdoor Airflow',
      formula: isDensitySpecified ? '(Vbz / Ez) × Ep (Eρ)' : 'Vbz / Ez',
      inputs: isDensitySpecified ? { 'Vbz': vbz, 'Ez': ez, 'Ep (Eρ)': epDensity } : { 'Vbz': vbz, 'Ez': ez },
      result: voz,
      unit: 'L/s',
      reference: isDensitySpecified ? 'ASHRAE 62.1-2022 Addendum j (Eq 6-2)' : input.ezConfig.reference,
      revision: isDensitySpecified ? 'Addendum j' : (input.ezConfig.revisionState?.source || ''),
      status: AuditStatus.DERIVED
    });

    if (isOverride || ezConfigValidation.status === 'NOT_VERIFIED' || input.ezConfig.verificationStatus === 'NOT_VERIFIED') {
      statuses.push('NOT_VERIFIED');
    } else if (ezConfigValidation.status === 'BLOCKED' || (input.ezConfig.verificationStatus as string) === 'BLOCKED') {
      statuses.push('BLOCKED');
    } else {
      statuses.push('PASS');
    }
    const finalStatus = VentilationValidationService.aggregateStatus(statuses);
    const authoritativeVoz = finalStatus === 'PASS' ? voz : null;

    return {
      spaceTypeId: input.spaceType.id,
      spaceTypeName: input.spaceType.name,
      airClass: input.spaceType.airClass,
      az, pz, rp, ra, vbp, vba, vbz, ez, epDensity, 
      voz: authoritativeVoz,
      occupancySource,
      occupancyDensityUsed,
      populationBeforeDisplayRounding,
      status: finalStatus,
      auditTrail,
      standard: input.spaceType.standard,
      edition: input.spaceType.edition,
      revision: input.spaceType.revisionState?.source || '',
      references: [input.spaceType.reference, input.ezConfig.reference]
    };
  }

  private static emptyResult(status: ValidationStatus, reason: string): ZoneVentilationResult {
    return {
      reason,
      spaceTypeId: undefined,
      spaceTypeName: undefined,
      airClass: undefined,
      az: null, pz: null, rp: null, ra: null, vbp: null, vba: null, vbz: null, ez: null, epDensity: null, voz: null,
      occupancySource: null,
      occupancyDensityUsed: null,
      populationBeforeDisplayRounding: null,
      status,
      auditTrail: [],
      standard: '',
      edition: '',
      revision: '',
      references: []
    };
  }
}
