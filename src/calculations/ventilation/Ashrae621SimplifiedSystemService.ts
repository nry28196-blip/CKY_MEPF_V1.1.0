import { ValidationStatus, VentilationValidationService } from './VentilationValidationService';
import { AuditTrailItem } from './Ashrae621ZoneService';
import { AuditStatus } from '../../types';

export interface SimplifiedSystemZoneInput {
  id: string;
  name?: string;
  pz: number;
  rp: number;
  ra: number;
  az: number;
  voz: number;
  vpz: number | null; // Zone primary airflow at analyzed design condition
  vpzMinDesign: number | null; // Designed minimum primary airflow for VAV
  dMode: 'VAV' | 'CV';
}

export interface SimplifiedSystemInput {
  zones: SimplifiedSystemZoneInput[];
  ps: number | null; // System population
  airDistributionType?: 'CV' | 'VAV';
  vps?: number | null; // System Primary Airflow at Analyzed Design Condition (explicit for VAV)
  vpsDesignBasis?: string; // Design basis description
  designCondition?: string; // Documented design condition (e.g. 'Cooling design')
}

export interface SimplifiedZoneResult {
  id: string;
  name?: string;
  dMode: 'VAV' | 'CV';
  voz: number;
  vpz: number | null;
  vpzMinDesign: number | null;
  vpzMinRequired: number | null; // 1.5 * voz for VAV, null for CV
  compliance: ValidationStatus;
  status: ValidationStatus;
  message?: string;
  auditTrail: AuditTrailItem[];
}

export interface SimplifiedSystemResult {
  sumPz: number;
  ps: number;
  d: number;
  ev: number;
  vou: number;
  vot: number | null; // Outdoor Air Intake Flow Vot = Vou / Ev
  vps: number | null;
  vpsDesignBasis?: string;
  designCondition?: string;
  airDistributionType: 'CV' | 'VAV';
  xs: number | null;
  zoneResults: SimplifiedZoneResult[];
  status: ValidationStatus;
  message?: string;
  auditTrail: AuditTrailItem[];
}

export class Ashrae621SimplifiedSystemService {
  static calculate(input: SimplifiedSystemInput): SimplifiedSystemResult {
    const auditTrail: AuditTrailItem[] = [];
    const statuses: ValidationStatus[] = [];

    const isVAV = input.airDistributionType === 'VAV' || input.zones.some(z => z.dMode === 'VAV');
    const airDistributionType: 'CV' | 'VAV' = isVAV ? 'VAV' : 'CV';
    const vpsDesignBasis = input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition';
    const designCondition = input.designCondition || 'Cooling design';

    const sumPz = input.zones.reduce((sum, z) => sum + z.pz, 0);
    const sumRaAz = input.zones.reduce((sum, z) => sum + (z.ra * z.az), 0);
    const sumRpPz = input.zones.reduce((sum, z) => sum + (z.rp * z.pz), 0);

    if (input.ps === null || isNaN(input.ps)) {
      statuses.push('INCOMPLETE');
    } else if (input.ps < 0) {
      statuses.push('FAIL');
    }
    if (sumPz < 0) {
      statuses.push('FAIL');
    }
    if (sumPz === 0) {
      statuses.push('INCOMPLETE');
    }

    const ps = (input.ps !== null && !isNaN(input.ps)) ? input.ps : 0;
    
    if (sumPz > 0 && ps > sumPz) {
      statuses.push('FAIL');
      auditTrail.push({
        symbol: 'Invalid Ps',
        name: 'System Population Validation',
        formula: 'Ps <= ΣPz',
        inputs: { 'Ps': ps, 'ΣPz': sumPz },
        result: 'FAIL',
        unit: '',
        reference: 'ASHRAE 62.1 Section 6.2.5.3',
        status: AuditStatus.FAIL
      });
      const finalStatus = VentilationValidationService.aggregateStatus(statuses);
      return {
        sumPz, ps, d: 0, ev: 0, vou: 0, vot: null,
        vps: input.vps ?? null,
        vpsDesignBasis,
        designCondition,
        airDistributionType,
        xs: null,
        zoneResults: [],
        status: finalStatus,
        message: 'System population Ps exceeds total zone population ΣPz',
        auditTrail
      };
    }

    const d = sumPz > 0 ? ps / sumPz : 1.0;
    
    let ev = 0;
    if (d < 0.60) {
      ev = 0.88 * d + 0.22;
    } else {
      ev = 0.75;
    }
    
    const vou = d * sumRpPz + sumRaAz;

    auditTrail.push({
      symbol: 'D',
      name: 'Occupant Diversity',
      formula: 'Ps / ΣPz',
      inputs: { 'Ps': ps, 'ΣPz': sumPz },
      result: d,
      unit: '',
      reference: 'ASHRAE 62.1 Section 6.2.5.3',
      status: AuditStatus.DERIVED
    });
    
    auditTrail.push({
      symbol: 'Vou',
      name: 'Uncorrected Outdoor Air Intake',
      formula: 'D × Σ(Rp×Pz) + Σ(Ra×Az)',
      inputs: { 'D': d, 'Σ(Rp×Pz)': sumRpPz, 'Σ(Ra×Az)': sumRaAz },
      result: vou,
      unit: 'L/s',
      reference: 'ASHRAE 62.1 Section 6.2.5.3',
      status: AuditStatus.DERIVED
    });

    auditTrail.push({
      symbol: 'Ev',
      name: 'System Ventilation Efficiency (Simplified)',
      formula: 'D < 0.60 ? 0.88×D + 0.22 : 0.75',
      inputs: { 'D': d },
      result: ev,
      unit: '',
      reference: 'ASHRAE 62.1 Section 6.2.5.3',
      status: AuditStatus.DERIVED
    });

    // Zone Minimum Airflow Validation
    const zoneResults: SimplifiedZoneResult[] = input.zones.map(z => {
      const zoneAuditTrail: AuditTrailItem[] = [];
      let vpzMinRequired: number | null = null;
      let compliance: ValidationStatus = 'PASS';
      let message: string | undefined;

      if (z.dMode === 'VAV') {
        // ASHRAE 62.1-2022 Section 6.2.5.3: Vpz-min-required = 1.5 * Voz
        vpzMinRequired = 1.5 * z.voz;

        zoneAuditTrail.push({
          symbol: `Vpz-min-required (${z.id})`,
          name: 'Required Minimum Primary Airflow',
          formula: '1.5 × Voz',
          inputs: { 'Voz': z.voz },
          result: vpzMinRequired,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.3.1',
          status: AuditStatus.DERIVED
        });

        if (z.vpzMinDesign === null || z.vpzMinDesign === undefined || isNaN(z.vpzMinDesign)) {
          compliance = 'INCOMPLETE';
          message = `Zone ${z.id}: Vpz-min design is missing. Required: ${vpzMinRequired.toFixed(1)} L/s.`;
          zoneAuditTrail.push({
            symbol: `Vpz-min compliance (${z.id})`,
            name: 'Minimum Primary Airflow Compliance',
            formula: 'Vpz-min-design >= Vpz-min-required',
            inputs: { 'Vpz-min-design': 'missing', 'Vpz-min-required': vpzMinRequired },
            result: 'INCOMPLETE',
            unit: '',
            reference: 'ASHRAE 62.1-2022 Section 6.2.5.3.1',
            status: AuditStatus.BLOCKED
          });
        } else if (z.vpzMinDesign < vpzMinRequired - 1e-4) {
          compliance = 'FAIL';
          message = `Zone ${z.id}: Designed minimum primary airflow (${z.vpzMinDesign.toFixed(1)} L/s) is less than required minimum (1.5 × Voz = ${vpzMinRequired.toFixed(1)} L/s).`;
          zoneAuditTrail.push({
            symbol: `Vpz-min compliance (${z.id})`,
            name: 'Minimum Primary Airflow Compliance',
            formula: 'Vpz-min-design >= Vpz-min-required',
            inputs: { 'Vpz-min-design': z.vpzMinDesign, 'Vpz-min-required': vpzMinRequired },
            result: 'FAIL',
            unit: '',
            reference: 'ASHRAE 62.1-2022 Section 6.2.5.3.1',
            status: AuditStatus.FAIL
          });
        } else {
          compliance = 'PASS';
          message = `Zone ${z.id}: Designed minimum primary airflow satisfies requirement (${z.vpzMinDesign.toFixed(1)} >= ${vpzMinRequired.toFixed(1)} L/s).`;
          zoneAuditTrail.push({
            symbol: `Vpz-min compliance (${z.id})`,
            name: 'Minimum Primary Airflow Compliance',
            formula: 'Vpz-min-design >= Vpz-min-required',
            inputs: { 'Vpz-min-design': z.vpzMinDesign, 'Vpz-min-required': vpzMinRequired },
            result: 'PASS',
            unit: '',
            reference: 'ASHRAE 62.1-2022 Section 6.2.5.3.1',
            status: AuditStatus.PASS
          });
        }
      } else {
        // CV mode
        compliance = 'PASS';
      }

      statuses.push(compliance);
      auditTrail.push(...zoneAuditTrail);

      return {
        id: z.id,
        name: z.name,
        dMode: z.dMode,
        voz: z.voz,
        vpz: z.vpz,
        vpzMinDesign: z.vpzMinDesign,
        vpzMinRequired,
        compliance,
        status: compliance,
        message,
        auditTrail: zoneAuditTrail
      };
    });

    // System Primary Airflow (Vps) Validation
    let vps: number | null = null;
    let xs: number | null = null;
    let vpsMessage: string | undefined;

    if (input.vps !== null && input.vps !== undefined && !isNaN(input.vps)) {
      if (input.vps <= 0) {
        statuses.push('INCOMPLETE');
        vpsMessage = 'System primary airflow Vps must be greater than zero.';
      } else if (input.vps < vou - 1e-4) {
        vps = input.vps;
        statuses.push('FAIL');
        vpsMessage = 'System primary airflow Vps is less than uncorrected outdoor-air intake Vou. Verify the VAV system design airflow.';
        auditTrail.push({
          symbol: 'Vps >= Vou',
          name: 'System Primary Airflow Validation',
          formula: 'Vps >= Vou',
          inputs: { 'Vps': vps, 'Vou': vou },
          result: 'FAIL',
          unit: '',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.FAIL
        });
      } else {
        vps = input.vps;
        xs = vou / vps;
        statuses.push('PASS');
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow',
          formula: 'Highest expected system primary airflow at analyzed design condition',
          inputs: { 'Design Condition': designCondition, 'Vps': vps },
          result: vps,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.PASS
        });
        auditTrail.push({
          symbol: 'Xs',
          name: 'Uncorrected System Outdoor Air Fraction',
          formula: 'Vou / Vps',
          inputs: { 'Vou': vou, 'Vps': vps },
          result: xs,
          unit: '',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.DERIVED
        });
      }
    } else if (!isVAV) {
      // Constant Volume (CV): Acceptable to derive from Σ Vpz
      const sumVpz = input.zones.reduce((sum, z) => sum + (z.vpz || 0), 0);
      if (sumVpz > 0) {
        vps = sumVpz;
        xs = vou / vps;
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow (Constant Volume)',
          formula: 'Σ Vpz',
          inputs: { 'Σ Vpz': vps },
          result: vps,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.PASS
        });
      }
    }

    const finalStatus = VentilationValidationService.aggregateStatus(statuses);
    const finalVot = finalStatus === 'PASS' && ev > 0 ? vou / ev : null;

    return {
      sumPz,
      ps,
      d,
      ev,
      vou,
      vot: finalVot,
      vps,
      vpsDesignBasis,
      designCondition,
      airDistributionType,
      xs,
      zoneResults,
      status: finalStatus,
      message: vpsMessage || (finalStatus === 'FAIL' ? 'One or more zones failed compliance.' : undefined),
      auditTrail
    };
  }
}
