import { Ashrae621ZoneService, ZoneVentilationInput, ZoneVentilationResult, AuditTrailItem } from '../calculations/ventilation/Ashrae621ZoneService';
import { DensityCorrectionService, DensityInput, DensityResult } from './DensityCorrectionService';
import { ValidationStatus, VentilationValidationService } from '../calculations/ventilation/VentilationValidationService';
import { Ashrae621SimplifiedSystemService, SimplifiedSystemInput, SimplifiedSystemResult } from '../calculations/ventilation/Ashrae621SimplifiedSystemService';
import { Ashrae621AlternativeSystemService, AlternativeSystemInput, AlternativeSystemResult } from '../calculations/ventilation/Ashrae621AlternativeSystemService';
import { CalculationAuditRecord, EngineeringAuditService } from '../calculations/audit/EngineeringAuditContract';
import { EngineeringValidationLogger } from '../calculations/validation/EngineeringValidationLogger';

export interface SingleZoneInput {
  edition?: "2019" | "2022" | "2025";
  density: DensityInput;
  zone: ZoneVentilationInput;
}

export interface SingleZoneResult {
  zone: ZoneVentilationResult;
  density: DensityResult;
  voz: number | null; // L/s
  vot: number | null; // L/s (for single zone, Vot = Voz)
  finalDesignOutdoorAir: number | null; // The authoritative final value
  auditTrail: AuditTrailItem[];
  revisionState: string;
  status: ValidationStatus;
  auditRecord?: CalculationAuditRecord;
  isAuthoritative?: boolean;
  isApprovedForEngineeringUse?: boolean;
}

export interface MultiZoneInput {
  method: 'Simplified' | 'Alternative';
  edition?: "2019" | "2022" | "2025";
  systemType: 'single_supply' | 'secondary_recirculation';
  airDistributionType?: 'CV' | 'VAV';
  vps?: number | null; // System Primary Airflow at Analyzed Design Condition (explicit for VAV)
  vpsDesignBasis?: string;
  designCondition?: string;
  density: DensityInput;
  zones: ZoneVentilationInput[];
  systemPopulation: number | null;
}

export interface MultiZoneResult {
  zoneResults: ZoneVentilationResult[];
  density: DensityResult;
  simplifiedSystem: SimplifiedSystemResult | null;
  alternativeSystem: AlternativeSystemResult | null;
  vou: number | null; // Uncorrected outdoor air
  ev: number | null; // System ventilation efficiency
  vps: number | null;
  vpsDesignBasis?: string;
  designCondition?: string;
  airDistributionType?: 'CV' | 'VAV';
  xs: number | null;
  vot: number | null; // L/s
  finalDesignOutdoorAir: number | null;
  auditTrail: AuditTrailItem[];
  revisionState: string;
  status: ValidationStatus;
  auditRecord?: CalculationAuditRecord;
  isAuthoritative?: boolean;
  isApprovedForEngineeringUse?: boolean;
}

export class VentilationEngine {
  static runSingleZone(input: SingleZoneInput): SingleZoneResult {
    const auditTrail: AuditTrailItem[] = [];

    // Enforce active standard production boundary at VentilationEngine entry point
    const requestedStandard = (input as any).standard || input.zone?.expectedStandard;
    if (requestedStandard === '62.2' || requestedStandard === 'ASHRAE 62.2') {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zone: {
          id: input.zone?.spaceType?.id || 'zone-622',
          spaceTypeId: input.zone?.spaceType?.id,
          spaceTypeName: input.zone?.spaceType?.name,
          standard: 'ASHRAE 62.2',
          edition: '2022',
          revision: 'OUTSIDE_SCOPE',
          references: [],
          az: null, pz: null, rp: null, ra: null, vbp: null, vba: null, vbz: null, ez: null, epDensity: null, voz: null,
          occupancySource: null,
          occupancyDensityUsed: null,
          populationBeforeDisplayRounding: null,
          status: 'BLOCKED',
          reason: 'ASHRAE 62.2 is outside the scope of ASHRAE 62.1 commercial calculations.',
          auditTrail: []
        },
        density: densityResult,
        voz: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'OUTSIDE_SCOPE',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    const requestedEdition = input.edition || input.zone?.expectedEdition || input.zone?.spaceType?.edition;
    if (requestedEdition === '2025' || input.zone?.expectedEdition === '2025' || input.zone?.spaceType?.edition === '2025') {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zone: {
          id: input.zone?.spaceType?.id || 'zone-2025',
          spaceTypeId: input.zone?.spaceType?.id,
          spaceTypeName: input.zone?.spaceType?.name,
          standard: 'ASHRAE 62.1',
          edition: '2025',
          revision: 'DEFERRED_2025_NON_PRODUCTION',
          references: [],
          az: null, pz: null, rp: null, ra: null, vbp: null, vba: null, vbz: null, ez: null, epDensity: null, voz: null,
          occupancySource: null,
          occupancyDensityUsed: null,
          populationBeforeDisplayRounding: null,
          status: 'BLOCKED',
          reason: 'ASHRAE 62.1-2025 is deferred and not approved for production use. Calculations for this edition are BLOCKED.',
          auditTrail: []
        },
        density: densityResult,
        voz: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'DEFERRED_2025_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    if (requestedEdition === '2019' || input.zone?.expectedEdition === '2019' || input.zone?.spaceType?.edition === '2019') {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zone: {
          id: input.zone?.spaceType?.id || 'zone-2019',
          spaceTypeId: input.zone?.spaceType?.id,
          spaceTypeName: input.zone?.spaceType?.name,
          standard: 'ASHRAE 62.1',
          edition: '2019',
          revision: 'ARCHIVED_2019_NON_PRODUCTION',
          references: [],
          az: null, pz: null, rp: null, ra: null, vbp: null, vba: null, vbz: null, ez: null, epDensity: null, voz: null,
          occupancySource: null,
          occupancyDensityUsed: null,
          populationBeforeDisplayRounding: null,
          status: 'BLOCKED',
          reason: 'ASHRAE 62.1-2019 is archived and not active for production use. Calculations for this edition are BLOCKED.',
          auditTrail: []
        },
        density: densityResult,
        voz: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'ARCHIVED_2019_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    if (requestedEdition !== undefined && requestedEdition !== '2022') {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zone: {
          id: input.zone?.spaceType?.id || 'zone-invalid',
          spaceTypeId: input.zone?.spaceType?.id,
          spaceTypeName: input.zone?.spaceType?.name,
          standard: 'ASHRAE 62.1',
          edition: String(requestedEdition),
          revision: 'UNAPPROVED_EDITION_NON_PRODUCTION',
          references: [],
          az: null, pz: null, rp: null, ra: null, vbp: null, vba: null, vbz: null, ez: null, epDensity: null, voz: null,
          occupancySource: null,
          occupancyDensityUsed: null,
          populationBeforeDisplayRounding: null,
          status: 'BLOCKED',
          reason: `Unknown or unapproved standard edition '${requestedEdition}'. Calculations are restricted to ASHRAE 62.1-2022.`,
          auditTrail: []
        },
        density: densityResult,
        voz: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'UNAPPROVED_EDITION_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }
    
    // 1. Calculate Density
    const densityResult = DensityCorrectionService.calculate(input.density);
    
    // 2. Validate caller-supplied epDensity / eRho if provided
    const callerEp = input.zone?.epDensity;
    const callerERho = input.zone?.eRho;
    if (callerEp !== undefined && callerEp !== null) {
      if (typeof callerEp !== 'number' || !Number.isFinite(callerEp) || callerEp <= 0) {
        EngineeringValidationLogger.logSafetyFailure({
          system: 'VentilationEngine.runSingleZone',
          field: 'zone.epDensity',
          value: callerEp,
          failureType: (typeof callerEp === 'number' && !Number.isFinite(callerEp)) ? 'NON_FINITE_NUMERIC' : 'OUT_OF_BOUNDS',
          status: 'FAIL',
          expected: 'finite number > 0',
          message: 'Invalid caller-supplied air-density correction factor (epDensity): must be a finite number > 0'
        });
        return {
          zone: {
            ...Ashrae621ZoneService.calculateZone({ ...input.zone }),
            status: 'FAIL',
            reason: 'Invalid caller-supplied air-density correction factor (epDensity): must be a finite number > 0'
          },
          density: densityResult,
          voz: null,
          vot: null,
          finalDesignOutdoorAir: null,
          auditTrail: [],
          revisionState: input.zone?.spaceType?.revisionState?.source || 'Unknown',
          status: 'FAIL',
          isAuthoritative: false,
          isApprovedForEngineeringUse: false
        };
      }
    }
    if (callerERho !== undefined && callerERho !== null) {
      if (typeof callerERho !== 'number' || !Number.isFinite(callerERho) || callerERho <= 0) {
        EngineeringValidationLogger.logSafetyFailure({
          system: 'VentilationEngine.runSingleZone',
          field: 'zone.eRho',
          value: callerERho,
          failureType: (typeof callerERho === 'number' && !Number.isFinite(callerERho)) ? 'NON_FINITE_NUMERIC' : 'OUT_OF_BOUNDS',
          status: 'FAIL',
          expected: 'finite number > 0',
          message: 'Invalid caller-supplied air-density correction factor (eRho): must be a finite number > 0'
        });
        return {
          zone: {
            ...Ashrae621ZoneService.calculateZone({ ...input.zone }),
            status: 'FAIL',
            reason: 'Invalid caller-supplied air-density correction factor (eRho): must be a finite number > 0'
          },
          density: densityResult,
          voz: null,
          vot: null,
          finalDesignOutdoorAir: null,
          auditTrail: [],
          revisionState: input.zone?.spaceType?.revisionState?.source || 'Unknown',
          status: 'FAIL',
          isAuthoritative: false,
          isApprovedForEngineeringUse: false
        };
      }
    }

    // 3. Pass production-calculated Eρ to zone (sanitizing any caller-supplied Ep/eRho to prevent bypass)
    const { epDensity: _callerEp, eRho: _callerERho, ...cleanZone } = input.zone || {};
    const zoneInput: ZoneVentilationInput = { ...cleanZone, epDensity: densityResult.eRho, eRho: densityResult.eRho } as ZoneVentilationInput;
    const zoneResult = Ashrae621ZoneService.calculateZone(zoneInput);
    
    const statuses = [zoneResult.status, densityResult.status];
    const status = VentilationValidationService.aggregateStatus(statuses);
    
    let auditRecord: CalculationAuditRecord | undefined;
    try {
      auditRecord = EngineeringAuditService.fromZoneCalculation(zoneInput, zoneResult);
      if (!auditRecord || typeof auditRecord !== 'object') {
        throw new Error('Audit record creation returned invalid data');
      }
    } catch (auditError) {
      // FAIL-CLOSED: Authoritative production calculation CANNOT succeed if audit record creation fails.
      return {
        zone: {
          ...zoneResult,
          status: 'FAIL',
          reason: `Audit generation failed: ${auditError instanceof Error ? auditError.message : String(auditError)}`
        },
        density: densityResult,
        voz: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: input.zone?.spaceType?.revisionState?.source || 'Unknown',
        status: 'FAIL',
        auditRecord: undefined,
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    if (status === 'FAIL' || status === 'INCOMPLETE' || status === 'NOT_VERIFIED' || status === 'BLOCKED') {
        return {
          zone: zoneResult, density: densityResult, voz: null, vot: null, 
          finalDesignOutdoorAir: null, auditTrail: [], revisionState: input.zone?.spaceType?.revisionState?.source || 'Unknown', status,
          auditRecord,
          isAuthoritative: false,
          isApprovedForEngineeringUse: false
        };
    }
    
    const isAuth = status === 'PASS' && auditRecord.finalResult.isAuthoritative === true;
    const isApproved = status === 'PASS' && auditRecord.isApprovedForEngineeringUse === true;
    const voz = isAuth ? zoneResult.voz : null; 
    const vot = voz;
    
    return {
      zone: zoneResult,
      density: densityResult,
      voz,
      vot,
      finalDesignOutdoorAir: vot,
      auditTrail,
      revisionState: input.zone?.spaceType?.revisionState?.source || 'Unknown',
      status,
      auditRecord,
      isAuthoritative: isAuth,
      isApprovedForEngineeringUse: isApproved
    };
  }

  static runMultiZone(input: MultiZoneInput): MultiZoneResult {
    const auditTrail: AuditTrailItem[] = [];

    // Enforce active standard production boundary at VentilationEngine entry point
    const requestedStandard = (input as any).standard || (input.zones.length > 0 ? input.zones[0].expectedStandard : undefined);
    const has622 = requestedStandard === '62.2' || requestedStandard === 'ASHRAE 62.2' || input.zones.some(z => z.expectedStandard === '62.2' || z.expectedStandard === 'ASHRAE 62.2');
    if (has622) {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zoneResults: [],
        density: densityResult,
        simplifiedSystem: null,
        alternativeSystem: null,
        vou: null,
        ev: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType || 'CV',
        xs: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'OUTSIDE_SCOPE',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    const requestedEdition = input.edition || (input.zones.length > 0 ? (input.zones[0].expectedEdition || input.zones[0].spaceType?.edition) : undefined);
    if (requestedEdition === '2025' || input.zones.some(z => z.expectedEdition === '2025' || z.spaceType?.edition === '2025')) {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zoneResults: [],
        density: densityResult,
        simplifiedSystem: null,
        alternativeSystem: null,
        vou: null,
        ev: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType || 'CV',
        xs: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'DEFERRED_2025_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    if (requestedEdition === '2019' || input.zones.some(z => z.expectedEdition === '2019' || z.spaceType?.edition === '2019')) {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zoneResults: [],
        density: densityResult,
        simplifiedSystem: null,
        alternativeSystem: null,
        vou: null,
        ev: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType || 'CV',
        xs: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'ARCHIVED_2019_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    const hasInvalidZone = input.zones.some(z => {
      const ed = z.expectedEdition || z.spaceType?.edition;
      return ed !== undefined && ed !== '2022';
    });
    if ((requestedEdition !== undefined && requestedEdition !== '2022') || hasInvalidZone) {
      const densityResult = DensityCorrectionService.calculate(input.density);
      return {
        zoneResults: [],
        density: densityResult,
        simplifiedSystem: null,
        alternativeSystem: null,
        vou: null,
        ev: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType || 'CV',
        xs: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: 'UNAPPROVED_EDITION_NON_PRODUCTION',
        status: 'BLOCKED',
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }
    
    // 1. Calculate Density
    const densityResult = DensityCorrectionService.calculate(input.density);
    
    // 2. Zone Calculations (Pass Eρ for Voz calculation, validating and sanitizing caller-supplied Ep to prevent bypass)
    const zoneResults: ZoneVentilationResult[] = [];
    const statuses: ValidationStatus[] = [densityResult.status];
    
    for (const z of input.zones) {
      const callerEp = z.epDensity;
      const callerERho = z.eRho;
      let callerEpInvalid = false;
      if (callerEp !== undefined && callerEp !== null) {
        if (typeof callerEp !== 'number' || !Number.isFinite(callerEp) || callerEp <= 0) {
          callerEpInvalid = true;
        }
      }
      if (callerERho !== undefined && callerERho !== null) {
        if (typeof callerERho !== 'number' || !Number.isFinite(callerERho) || callerERho <= 0) {
          callerEpInvalid = true;
        }
      }

      const { epDensity: _zEp, eRho: _zERho, ...cleanZ } = z;
      if (callerEpInvalid) {
        EngineeringValidationLogger.logSafetyFailure({
          system: 'VentilationEngine.runMultiZone',
          field: 'zone.epDensity/eRho',
          value: callerEp ?? callerERho,
          failureType: 'NON_FINITE_NUMERIC',
          status: 'FAIL',
          expected: 'finite number > 0',
          message: `Invalid caller-supplied air-density correction factor for zone "${z.id || 'unknown'}": must be a finite number > 0`
        });
        const rawRes = Ashrae621ZoneService.calculateZone({ ...cleanZ, epDensity: densityResult.eRho, eRho: densityResult.eRho });
        const failedRes: ZoneVentilationResult = {
          ...rawRes,
          status: 'FAIL',
          voz: null,
          reason: 'Invalid caller-supplied air-density correction factor (epDensity/eRho): must be a finite number > 0'
        };
        zoneResults.push(failedRes);
        statuses.push('FAIL');
      } else {
        const zResult = Ashrae621ZoneService.calculateZone({ ...cleanZ, epDensity: densityResult.eRho, eRho: densityResult.eRho });
        zoneResults.push(zResult);
        statuses.push(zResult.status);
      }
    }
    
    const zoneAggrStatus = VentilationValidationService.aggregateStatus(statuses);
    
    let simplifiedSystem: SimplifiedSystemResult | null = null;
    let alternativeSystem: AlternativeSystemResult | null = null;
    let vou: number | null = null;
    let ev: number | null = null;
    let vps: number | null = null;
    let xs: number | null = null;
    
    if (zoneAggrStatus !== 'FAIL' && zoneAggrStatus !== 'INCOMPLETE' && zoneAggrStatus !== 'NOT_VERIFIED' && zoneAggrStatus !== 'NOT_EVALUATED') {
      if (input.method === 'Simplified') {
        const simpInput: SimplifiedSystemInput = {
          zones: zoneResults.map((z, i) => ({
            id: z.id || Math.random().toString(),
            name: input.zones[i].id || `Zone ${i + 1}`,
            pz: z.pz !== null ? z.pz : 0,
            rp: z.rp || 0,
            ra: z.ra || 0,
            az: z.az !== null ? z.az : 0,
            voz: z.voz || 0,
            vpz: input.zones[i].vpz || null,
            vpzMinDesign: input.zones[i].vpzMinDesign || null,
            dMode: input.zones[i].dMode || 'CV'
          })),
          ps: input.systemPopulation,
          airDistributionType: input.airDistributionType || (input.zones.some(z => z.dMode === 'VAV') ? 'VAV' : 'CV'),
          vps: input.vps ?? null,
          vpsDesignBasis: input.vpsDesignBasis,
          designCondition: input.designCondition
        };
        simplifiedSystem = Ashrae621SimplifiedSystemService.calculate(simpInput);
        statuses.push(simplifiedSystem.status);
        vou = simplifiedSystem.vou;
        ev = simplifiedSystem.ev;
        vps = simplifiedSystem.vps;
        xs = simplifiedSystem.xs;
      } else if (input.method === 'Alternative') {
        const altInput: AlternativeSystemInput = {
          edition: input.edition,
          systemType: input.systemType,
          airDistributionType: input.airDistributionType || (input.zones.some(z => z.dMode === 'VAV') ? 'VAV' : 'CV'),
          vps: input.vps ?? null,
          vpsDesignBasis: input.vpsDesignBasis,
          designCondition: input.designCondition,
          zones: zoneResults.map((z, i) => ({
            id: z.id || Math.random().toString(),
            name: input.zones[i].id || `Zone ${i + 1}`,
            pz: z.pz !== null ? z.pz : 0,
            rp: z.rp || 0,
            ra: z.ra || 0,
            az: z.az !== null ? z.az : 0,
            voz: z.voz || 0,
            vpz: input.zones[i].vpz || null,
            vpzMinDesign: input.zones[i].vpzMinDesign || null,
            vpzMinRequired: input.zones[i].vpzMinRequired || null,
            vdzMinDesign: input.zones[i].vdzMinDesign || null,
            dMode: input.zones[i].dMode || 'CV',
            ep: input.zones[i].ep || null,
            er: input.zones[i].er || null,
            ez: z.ez || 1.0
          })),
          ps: input.systemPopulation
        };
        alternativeSystem = Ashrae621AlternativeSystemService.calculate(altInput);
        statuses.push(alternativeSystem.status);
        vou = alternativeSystem.vou;
        ev = alternativeSystem.ev;
        vps = alternativeSystem.vps;
        xs = alternativeSystem.xs;
      }
    }
    
    statuses.push(densityResult.status);
    if (ev !== null && ev <= 0) statuses.push('FAIL');
    
    let finalStatus = VentilationValidationService.aggregateStatus(statuses);
    
    let vot: number | null = null;
    
    if (finalStatus !== 'FAIL' && finalStatus !== 'INCOMPLETE' && finalStatus !== 'NOT_VERIFIED' && finalStatus !== 'NOT_EVALUATED' && ev !== null && ev > 0 && vou !== null) {
      vot = vou / ev;
      
      auditTrail.push({
        symbol: 'Vot',
        name: 'Required System Outdoor Air',
        formula: 'Vou / Ev',
        inputs: { 'Vou': vou, 'Ev': ev },
        result: vot,
        unit: 'L/s',
        reference: 'ASHRAE 62.1 Equation 6-10'
      });
    } else {
        if(finalStatus === 'PASS') finalStatus = 'INCOMPLETE';
    }
    
    let auditRecord: CalculationAuditRecord | undefined;
    try {
      if (simplifiedSystem) {
        auditRecord = EngineeringAuditService.fromSimplifiedSystem({
          ps: input.systemPopulation,
          zones: input.zones
        }, simplifiedSystem);
      } else if (alternativeSystem) {
        auditRecord = EngineeringAuditService.fromAlternativeSystem({
          ps: input.systemPopulation,
          vps: input.vps ?? alternativeSystem.vps
        }, alternativeSystem);
      }
      if (finalStatus === 'PASS' && (!auditRecord || typeof auditRecord !== 'object')) {
        throw new Error('Audit record creation returned invalid data for multi-zone calculation');
      }
    } catch (auditError) {
      // FAIL-CLOSED: Authoritative multi-zone production calculation CANNOT succeed if audit record creation fails.
      return {
        zoneResults,
        density: densityResult,
        simplifiedSystem: null,
        alternativeSystem: null,
        vou: null,
        ev: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType || (input.zones.some(z => z.dMode === 'VAV') ? 'VAV' : 'CV'),
        xs: null,
        vot: null,
        finalDesignOutdoorAir: null,
        auditTrail: [],
        revisionState: input.zones.length > 0 ? (input.zones[0].spaceType?.revisionState?.source || 'Unknown') : 'Unknown',
        status: 'FAIL',
        auditRecord: undefined,
        isAuthoritative: false,
        isApprovedForEngineeringUse: false
      };
    }

    const isAuthoritative = finalStatus === 'PASS' && (auditRecord?.finalResult.isAuthoritative === true);
    const isApprovedForEngineeringUse = finalStatus === 'PASS' && (auditRecord?.isApprovedForEngineeringUse === true);

    return {
      zoneResults,
      density: densityResult,
      simplifiedSystem,
      alternativeSystem,
      vou: isAuthoritative ? vou : null,
      ev,
      vps,
      vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
      designCondition: input.designCondition || 'Cooling design',
      airDistributionType: input.airDistributionType || (input.zones.some(z => z.dMode === 'VAV') ? 'VAV' : 'CV'),
      xs,
      vot: isAuthoritative ? vot : null,
      finalDesignOutdoorAir: isAuthoritative ? vot : null,
      auditTrail,
      revisionState: input.zones.length > 0 ? (input.zones[0].spaceType?.revisionState?.source || 'Unknown') : 'Unknown',
      status: finalStatus,
      auditRecord,
      isAuthoritative,
      isApprovedForEngineeringUse
    };
  }
}

// Temporarily reconstructed to fix build
