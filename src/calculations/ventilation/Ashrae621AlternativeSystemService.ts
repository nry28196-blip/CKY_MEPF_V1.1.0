import { ValidationStatus, VentilationValidationService } from './VentilationValidationService';
import { AuditTrailItem } from './Ashrae621ZoneService';
import { AuditStatus } from '../../types';

export interface AlternativeZoneInput {
  id: string;
  name?: string;
  pz: number;
  rp: number;
  ra: number;
  az: number;
  voz: number;
  vpz: number | null; // Zone primary airflow at analyzed design condition
  vpzMinDesign: number | null; // Designed minimum primary airflow for VAV
  vpzMinRequired?: number | null; // Calculated by service
  vdzMinDesign?: number | null; // Designed minimum discharge airflow for secondary recirculation
  dMode: 'VAV' | 'CV';
  ep?: number | null;
  er: number | null;
  ez: number;
}

export interface AlternativeSystemInput {
  edition?: '2019' | '2022' | '2025';
  zones: AlternativeZoneInput[];
  ps: number | null;
  systemType: 'single_supply' | 'secondary_recirculation';
  airDistributionType?: 'CV' | 'VAV';
  vps?: number | null; // System Primary Airflow at Analyzed Design Condition (explicit for VAV)
  vpsDesignBasis?: string; // e.g. "Highest expected system primary airflow at analyzed design condition"
  designCondition?: string; // e.g. "Cooling design", "Heating design", "Occupancy design", "Other"
}

export interface AlternativeZoneResult {
  id: string;
  name?: string;
  dMode: 'VAV' | 'CV';
  voz: number;
  vpz: number;
  vpzMin: number;
  vpzMinDesign: number | null;
  vpzMinRequired: number | null;
  vdzMin: number;
  zd: number;
  ep: number;
  er: number;
  fa: number;
  fb: number;
  fc: number;
  evz: number;
  isCritical: boolean;
  compliance: ValidationStatus;
  status: ValidationStatus;
  message?: string;
  auditTrail: AuditTrailItem[];
}

export interface AlternativeSystemResult {
  zoneResults: AlternativeZoneResult[];
  ev: number | null;
  vou: number | null;
  vot?: number | null; // Final Vot = Vou / Ev (Appendix A Equation A-5)
  vps: number | null;
  vpsDesignBasis: string;
  designCondition?: string;
  airDistributionType: 'CV' | 'VAV';
  xs: number | null; // Vou / Vps (Appendix A Equation A-1)
  xsSupply?: number | null; // Informational: Vot / Vps = (Vou / Ev) / Vps (NOT used in Evz calculation)
  criticalZoneId: string | null;
  status: ValidationStatus;
  message?: string;
  auditTrail: AuditTrailItem[];
}

export class Ashrae621AlternativeSystemService {
  static calculate(input: AlternativeSystemInput): AlternativeSystemResult {
    // Defense-in-depth: Fabricated VERIFIED metadata must never bypass standard/edition isolation.
    // 1. Standard Scope Check: ASHRAE 62.2 is outside this calculation scope
    const requestedStandard = (input as any).standard || (input as any).expectedStandard;
    const has622Zone = (input.zones || []).some(z => {
      const std = (z as any).standard || (z as any).expectedStandard;
      return std === '62.2' || std === 'ASHRAE 62.2';
    });
    if (requestedStandard === '62.2' || requestedStandard === 'ASHRAE 62.2' || has622Zone) {
      return {
        zoneResults: [],
        ev: null,
        vou: null,
        vot: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType === 'VAV' ? 'VAV' : 'CV',
        xs: null,
        criticalZoneId: null,
        status: 'BLOCKED',
        message: 'ASHRAE 62.2 is outside the scope of ASHRAE 62.1 Alternative Procedure calculations.',
        auditTrail: [{
          symbol: 'Standard Scope Check',
          name: 'Standard Scope Validation',
          formula: 'Standard must be ASHRAE 62.1',
          inputs: { 'Requested Standard': String(requestedStandard || 'ASHRAE 62.2') },
          result: 'BLOCKED',
          unit: '',
          reference: 'ASHRAE 62.1 Production Baseline Policy'
        }]
      };
    }

    // 2. Production Edition Isolation:
    // 2022 = active production (allowed)
    // 2019 = archived / BLOCKED
    // 2025 = deferred / BLOCKED
    // invalid edition = BLOCKED
    // omitted edition = controlled production baseline (2022) only
    const requestedEdition = input.edition || '2022';

    const has2025Zone = (input.zones || []).some(z => 
      (z as any).expectedEdition === '2025' || (z as any).edition === '2025' || (z as any).standardEdition === '2025'
    );
    if (requestedEdition === '2025' || has2025Zone) {
      return {
        zoneResults: [],
        ev: null,
        vou: null,
        vot: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType === 'VAV' ? 'VAV' : 'CV',
        xs: null,
        criticalZoneId: null,
        status: 'BLOCKED',
        message: 'ASHRAE 62.1-2025 is deferred and not approved for production use. Direct Alternative Procedure calculations for 2025 are BLOCKED.',
        auditTrail: [{
          symbol: 'Edition Check',
          name: 'Production Scope Validation',
          formula: 'Edition must be 2022',
          inputs: { 'Requested Edition': '2025' },
          result: 'BLOCKED',
          unit: '',
          reference: 'ASHRAE 62.1 Production Baseline Policy'
        }]
      };
    }

    const has2019Zone = (input.zones || []).some(z => 
      (z as any).expectedEdition === '2019' || (z as any).edition === '2019' || (z as any).standardEdition === '2019'
    );
    if (requestedEdition === '2019' || has2019Zone) {
      return {
        zoneResults: [],
        ev: null,
        vou: null,
        vot: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType === 'VAV' ? 'VAV' : 'CV',
        xs: null,
        criticalZoneId: null,
        status: 'BLOCKED',
        message: 'ASHRAE 62.1-2019 is archived and not approved for active production calculations. Direct Alternative Procedure calculations for 2019 are BLOCKED.',
        auditTrail: [{
          symbol: 'Edition Check',
          name: 'Production Scope Validation',
          formula: 'Edition must be 2022',
          inputs: { 'Requested Edition': '2019' },
          result: 'BLOCKED',
          unit: '',
          reference: 'ASHRAE 62.1 Production Baseline Policy'
        }]
      };
    }

    const hasInvalidZone = (input.zones || []).some(z => {
      const ed = (z as any).expectedEdition || (z as any).edition || (z as any).standardEdition;
      return ed !== undefined && ed !== '2022';
    });
    if (requestedEdition !== '2022' || hasInvalidZone) {
      return {
        zoneResults: [],
        ev: null,
        vou: null,
        vot: null,
        vps: input.vps ?? null,
        vpsDesignBasis: input.vpsDesignBasis || 'Highest expected system primary airflow at analyzed design condition',
        designCondition: input.designCondition || 'Cooling design',
        airDistributionType: input.airDistributionType === 'VAV' ? 'VAV' : 'CV',
        xs: null,
        criticalZoneId: null,
        status: 'BLOCKED',
        message: `Unknown or unapproved standard edition '${requestedEdition}'. Direct Alternative Procedure calculations are restricted to ASHRAE 62.1-2022.`,
        auditTrail: [{
          symbol: 'Edition Check',
          name: 'Production Scope Validation',
          formula: 'Edition must be 2022',
          inputs: { 'Requested Edition': String(requestedEdition) },
          result: 'BLOCKED',
          unit: '',
          reference: 'ASHRAE 62.1 Production Baseline Policy'
        }]
      };
    }

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
        reference: 'ASHRAE 62.1 Section 6.2.5.2',
        status: AuditStatus.FAIL
      });
      const finalStatus = VentilationValidationService.aggregateStatus(statuses);
      return {
        zoneResults: [],
        ev: null,
        vou: null,
        vot: null,
        vps: null,
        vpsDesignBasis,
        designCondition,
        airDistributionType,
        xs: null,
        criticalZoneId: null,
        status: finalStatus,
        message: 'System population Ps exceeds total zone population ΣPz',
        auditTrail
      };
    }

    const d = sumPz > 0 ? ps / sumPz : 1.0;
    const vou = d * sumRpPz + sumRaAz;

    auditTrail.push({
      symbol: 'Vou',
      name: 'Uncorrected Outdoor Air Intake',
      formula: 'D × Σ(Rp×Pz) + Σ(Ra×Az)',
      inputs: { 'D': d, 'Σ(Rp×Pz)': sumRpPz, 'Σ(Ra×Az)': sumRaAz },
      result: vou,
      unit: 'L/s',
      reference: 'ASHRAE 62.1-2022 Appendix A',
      status: AuditStatus.DERIVED
    });

    // Determine and Validate System Primary Airflow (Vps)
    let vps: number | null = null;
    let vpsErrorStatus: ValidationStatus | null = null;
    let vpsMessage: string | undefined;

    if (isVAV) {
      // For VAV systems, Vps MUST NOT be automatically calculated as Σ Vpz.
      // An explicit engineering input is required.
      if (input.vps === null || input.vps === undefined || isNaN(input.vps) || input.vps <= 0) {
        vpsErrorStatus = 'INCOMPLETE';
        statuses.push('INCOMPLETE');
        vpsMessage = 'System primary airflow Vps is required for VAV systems. Please provide the highest expected system primary airflow at the analyzed design condition.';
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow (VAV)',
          formula: 'Highest expected system primary airflow at analyzed design condition',
          inputs: { 'Design Condition': designCondition, 'Vps': input.vps ?? 'missing' },
          result: 'INCOMPLETE',
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2 & Appendix A',
          status: AuditStatus.FAIL
        });
      } else if (input.vps < vou - 1e-4) {
        vps = input.vps;
        vpsErrorStatus = 'FAIL';
        statuses.push('FAIL');
        vpsMessage = 'System primary airflow Vps is less than uncorrected outdoor-air intake Vou. Verify the VAV system design airflow.';
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow (VAV)',
          formula: 'Highest expected system primary airflow at analyzed design condition',
          inputs: { 'Design Condition': designCondition, 'Vps': vps },
          result: vps,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2 & Appendix A',
          status: AuditStatus.FAIL
        });
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
        statuses.push('PASS');
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow (VAV)',
          formula: 'Highest expected system primary airflow at analyzed design condition',
          inputs: { 'Design Condition': designCondition, 'Vps': vps },
          result: vps,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2 & Appendix A',
          status: AuditStatus.PASS
        });
        auditTrail.push({
          symbol: 'Vps >= Vou',
          name: 'System Primary Airflow Validation',
          formula: 'Vps >= Vou',
          inputs: { 'Vps': vps, 'Vou': vou },
          result: 'PASS',
          unit: '',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.PASS
        });
      }
    } else {
      // Constant Volume (CV): Acceptable to derive from explicit input or sum of zone primary airflows
      if (input.vps !== null && input.vps !== undefined && !isNaN(input.vps) && input.vps > 0) {
        vps = input.vps;
        auditTrail.push({
          symbol: 'Vps',
          name: 'System Primary Airflow (Constant Volume)',
          formula: 'Explicit Design Airflow',
          inputs: { 'Vps': vps },
          result: vps,
          unit: 'L/s',
          reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
          status: AuditStatus.PASS
        });
        statuses.push('PASS');
      } else {
        let sumVpz = 0;
        let missingVpz = false;
        for (const z of input.zones) {
          if (z.vpz === null || isNaN(z.vpz) || z.vpz <= 0) {
            missingVpz = true;
          } else {
            sumVpz += z.vpz;
          }
        }
        if (missingVpz) {
          statuses.push('INCOMPLETE');
          vpsErrorStatus = 'INCOMPLETE';
          vpsMessage = 'One or more CV zones missing primary airflow Vpz.';
        } else {
          vps = sumVpz;
          statuses.push('PASS');
          auditTrail.push({
            symbol: 'Vps',
            name: 'System Primary Airflow (Constant Volume)',
            formula: 'Σ Vpz',
            inputs: { 'Σ Vpz': vps },
            result: vps,
            unit: 'L/s',
            reference: 'ASHRAE 62.1-2022 Section 6.2.5.2',
            status: AuditStatus.DERIVED
          });
        }
      }
    }

    // Zone Minimum Airflow & Alternative Procedure Calculations
    let hasZoneIncomplete = false;
    let hasZoneFail = false;

    const zoneCalcs = input.zones.map(z => {
      const zoneAuditTrail: AuditTrailItem[] = [];
      let zoneStatus: ValidationStatus = 'PASS';
      let zoneMessage: string | undefined;

      // Validate zone design primary airflow (Vpz)
      if (z.vpz === null || z.vpz === undefined || isNaN(z.vpz) || z.vpz <= 0) {
        zoneStatus = 'INCOMPLETE';
        hasZoneIncomplete = true;
        zoneMessage = `Zone ${z.id}: Zone primary airflow (Vpz) is required and must be > 0.`;
      }

      let vpzMin = 0;
      let vpzMinRequired: number | null = null;
      let vdzMin = 0;
      let zd = 1.0;
      let ep = 1.0;
      let er = 0.0;

      if (input.systemType === 'single_supply') {
        ep = 1.0;
        er = 0.0;

        if (z.dMode === 'VAV') {
          // In ASHRAE 62.1 Appendix A for single supply:
          // Zd = Voz / Vdz-min <= 1.0. Because Vdz-min = Vpz-min, Vpz-min-required = Voz.
          vpzMinRequired = z.voz;

          zoneAuditTrail.push({
            symbol: `Vpz-min-required (${z.id})`,
            name: 'Required Minimum Primary Airflow',
            formula: 'Voz (Appendix A: Zd <= 1.0)',
            inputs: { 'Voz': z.voz },
            result: vpzMinRequired,
            unit: 'L/s',
            reference: 'ASHRAE 62.1-2022 Appendix A Section A1.1',
            status: AuditStatus.DERIVED
          });

          if (z.vpzMinDesign === null || z.vpzMinDesign === undefined || isNaN(z.vpzMinDesign)) {
            zoneStatus = 'INCOMPLETE';
            hasZoneIncomplete = true;
            zoneMessage = `Zone ${z.id}: Vpz-min design is missing. Required: ${vpzMinRequired.toFixed(1)} L/s.`;
            zoneAuditTrail.push({
              symbol: `Vpz-min compliance (${z.id})`,
              name: 'Minimum Primary Airflow Compliance',
              formula: 'Vpz-min-design >= Vpz-min-required',
              inputs: { 'Vpz-min-design': 'missing', 'Vpz-min-required': vpzMinRequired },
              result: 'INCOMPLETE',
              unit: '',
              reference: 'ASHRAE 62.1-2022 Appendix A',
              status: AuditStatus.BLOCKED
            });
          } else if (z.vpzMinDesign <= 0) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
            zoneMessage = `Zone ${z.id}: Vpz-min design must be greater than zero.`;
            zoneAuditTrail.push({
              symbol: `Vpz-min compliance (${z.id})`,
              name: 'Minimum Primary Airflow Compliance',
              formula: 'Vpz-min-design >= Vpz-min-required',
              inputs: { 'Vpz-min-design': z.vpzMinDesign, 'Vpz-min-required': vpzMinRequired },
              result: 'FAIL',
              unit: '',
              reference: 'ASHRAE 62.1-2022 Appendix A',
              status: AuditStatus.FAIL
            });
            vpzMin = z.vpzMinDesign;
            vdzMin = vpzMin;
          } else if (z.vpzMinDesign < z.voz - 1e-4) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
            zoneMessage = `Zone ${z.id}: Designed minimum primary airflow (${z.vpzMinDesign.toFixed(1)} L/s) is less than required minimum (Voz = ${z.voz.toFixed(1)} L/s, Zd > 1.0).`;
            zoneAuditTrail.push({
              symbol: `Vpz-min compliance (${z.id})`,
              name: 'Minimum Primary Airflow Compliance',
              formula: 'Vpz-min-design >= Vpz-min-required',
              inputs: { 'Vpz-min-design': z.vpzMinDesign, 'Vpz-min-required': vpzMinRequired },
              result: 'FAIL',
              unit: '',
              reference: 'ASHRAE 62.1-2022 Appendix A',
              status: AuditStatus.FAIL
            });
            vpzMin = z.vpzMinDesign;
            vdzMin = vpzMin;
          } else {
            vpzMin = z.vpzMinDesign;
            vdzMin = vpzMin;
            zoneAuditTrail.push({
              symbol: `Vpz-min compliance (${z.id})`,
              name: 'Minimum Primary Airflow Compliance',
              formula: 'Vpz-min-design >= Vpz-min-required',
              inputs: { 'Vpz-min-design': z.vpzMinDesign, 'Vpz-min-required': vpzMinRequired },
              result: 'PASS',
              unit: '',
              reference: 'ASHRAE 62.1-2022 Appendix A',
              status: AuditStatus.PASS
            });
          }
        } else {
          // CV mode: vpz is supply airflow
          vpzMin = z.vpz || 0;
          vdzMin = vpzMin;
        }

        zd = vdzMin > 0 ? z.voz / vdzMin : 1.0;
        if (zd > 1.0 + 1e-4) {
          zoneStatus = 'FAIL';
          hasZoneFail = true;
        }
        if (vdzMin <= 0 && zoneStatus !== 'INCOMPLETE') {
          zoneStatus = 'FAIL';
          hasZoneFail = true;
        }
      } else {
        // Secondary Recirculation
        if (z.er === null || z.er === undefined || isNaN(z.er)) {
          zoneStatus = 'INCOMPLETE';
          hasZoneIncomplete = true;
        } else {
          er = z.er;
        }

        const vdzMinRequired = z.voz; // Zd <= 1.0 requires Vdz-min >= Voz

        if (z.dMode === 'VAV') {
          if (z.vdzMinDesign === null || z.vdzMinDesign === undefined || isNaN(z.vdzMinDesign)) {
            zoneStatus = 'INCOMPLETE';
            hasZoneIncomplete = true;
            zoneMessage = `Zone ${z.id}: Vdz-min design is missing.`;
          } else if (z.vdzMinDesign <= 0) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
            vdzMin = 0;
          } else if (z.vdzMinDesign < vdzMinRequired - 1e-4) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
            vdzMin = z.vdzMinDesign;
            zoneMessage = `Zone ${z.id}: Vdz-min design (${z.vdzMinDesign.toFixed(1)} L/s) is less than required minimum (Voz = ${z.voz.toFixed(1)} L/s).`;
          } else {
            vdzMin = z.vdzMinDesign;
          }

          if (z.vpzMinDesign === null || z.vpzMinDesign === undefined || isNaN(z.vpzMinDesign)) {
            zoneStatus = 'INCOMPLETE';
            hasZoneIncomplete = true;
            zoneMessage = (zoneMessage ? zoneMessage + ' ' : '') + `Zone ${z.id}: Vpz-min design is missing.`;
          } else if (z.vpzMinDesign <= 0) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
            vpzMin = z.vpzMinDesign;
          } else {
            vpzMin = z.vpzMinDesign;
          }

          if (vdzMin > 0 && vpzMin > 0) {
            ep = vpzMin / vdzMin;
            vpzMinRequired = ep * z.voz;
            if (isNaN(ep) || !isFinite(ep) || ep <= 0 || ep > 1.0) {
              zoneStatus = 'FAIL';
              hasZoneFail = true;
              zoneMessage = `Zone ${z.id}: Invalid primary air fraction Ep = ${(ep || 0).toFixed(2)} (must be > 0 and <= 1.0).`;
            }
          }

          zd = vdzMin > 0 ? z.voz / vdzMin : 1.0;
          if (zd > 1.0 + 1e-4) {
            zoneStatus = 'FAIL';
            hasZoneFail = true;
          }
        } else {
          // CV mode for secondary recirculation
          vpzMin = z.vpz || 0;
          vdzMin = (typeof z.vdzMinDesign === 'number' && z.vdzMinDesign > 0) ? z.vdzMinDesign : vpzMin;
          if (z.ep === null || z.ep === undefined || isNaN(z.ep)) {
            zoneStatus = 'INCOMPLETE';
            hasZoneIncomplete = true;
            zoneMessage = `Zone ${z.id}: Ep is required for secondary recirculation.`;
          } else {
            ep = z.ep;
            if (ep <= 0 || ep > 1.0) {
              zoneStatus = 'FAIL';
              hasZoneFail = true;
            }
          }
          zd = vdzMin > 0 ? z.voz / vdzMin : 1.0;
        }
      }

      statuses.push(zoneStatus);
      auditTrail.push(...zoneAuditTrail);

      const fa = ep + (1 - ep) * er;
      const fb = ep;
      const fc = 1 - (1 - z.ez) * (1 - er) * (1 - ep);

      return {
        id: z.id,
        name: z.name,
        dMode: z.dMode,
        voz: z.voz,
        vpz: z.vpz || 0,
        vpzMin,
        vpzMinDesign: z.vpzMinDesign,
        vpzMinRequired,
        vdzMin,
        zd,
        ep,
        er,
        fa,
        fb,
        fc,
        evz: 1.0,
        compliance: zoneStatus,
        status: zoneStatus,
        message: zoneMessage,
        auditTrail: zoneAuditTrail
      };
    });

    // Check if we can run the iterative solver
    const canSolve = !vpsErrorStatus && !hasZoneIncomplete && !hasZoneFail && vps !== null && vps > 0;

    if (!canSolve) {
      const aggregateStatus = VentilationValidationService.aggregateStatus(statuses);
      const zoneResults: AlternativeZoneResult[] = zoneCalcs.map(zc => ({
        id: zc.id,
        name: zc.name,
        dMode: zc.dMode,
        voz: zc.voz,
        vpz: zc.vpz,
        vpzMin: zc.vpzMin,
        vpzMinDesign: zc.vpzMinDesign,
        vpzMinRequired: zc.vpzMinRequired,
        vdzMin: zc.vdzMin,
        zd: zc.zd,
        ep: zc.ep,
        er: zc.er,
        fa: zc.fa,
        fb: zc.fb,
        fc: zc.fc,
        evz: zc.evz,
        isCritical: false,
        compliance: zc.compliance,
        status: zc.status,
        message: zc.message,
        auditTrail: zc.auditTrail
      }));

      return {
        zoneResults,
        ev: null,
        vou,
        vot: null,
        vps,
        vpsDesignBasis,
        designCondition,
        airDistributionType,
        xs: null,
        criticalZoneId: null,
        status: aggregateStatus,
        message: vpsMessage || (hasZoneFail ? 'One or more zones failed compliance.' : 'Inputs incomplete.'),
        auditTrail
      };
    }

    // System average outdoor air fraction per ASHRAE 62.1-2022 Appendix A Equation A-1:
    // Xs = Vou / Vps
    const xs = vou / vps!;
    auditTrail.push({
      symbol: 'Xs',
      name: 'System Average Outdoor Air Fraction (Eq A-1)',
      formula: 'Vou / Vps',
      inputs: { 'Vou': vou, 'Vps': vps! },
      result: xs,
      unit: '',
      reference: 'ASHRAE 62.1-2022 Appendix A Equation A-1',
      status: AuditStatus.DERIVED
    });

    // Zone ventilation efficiency (Evz) calculated using authoritative Xs = Vou / Vps:
    // For single supply: Evz = 1 + Xs - Zd (or (Fa + Xs*Fb - Zd*Fc)/Fa with Fa=1, Fb=1, Fc=Ez)
    // For secondary recirculation: Evz = (Fa + Xs * Fb - Zd * Fc) / Fa (Appendix A Equation A-3)
    let minEvz = 1.0;
    for (const zc of zoneCalcs) {
      zc.evz = zc.fa > 0 ? (zc.fa + xs * zc.fb - zc.zd * zc.fc) / zc.fa : 1.0;
      if (zc.evz < minEvz) {
        minEvz = zc.evz;
      }
    }

    let ev: number | null = minEvz;
    let isEvValid = true;
    if (ev <= 0 || isNaN(ev) || !isFinite(ev)) {
      statuses.push('FAIL');
      isEvValid = false;
      ev = null;
      auditTrail.push({
        symbol: 'Ev',
        name: 'System Ventilation Efficiency (Eq A-4)',
        formula: 'min(Evz)',
        inputs: { 'Xs': xs },
        result: 'FAIL',
        unit: '',
        reference: 'ASHRAE 62.1-2022 Appendix A Equation A-4',
        status: AuditStatus.FAIL
      });
    } else {
      statuses.push('PASS');
      auditTrail.push({
        symbol: 'Ev',
        name: 'System Ventilation Efficiency (Eq A-4)',
        formula: 'min(Evz)',
        inputs: { 'Xs': xs, 'min(Evz)': ev },
        result: ev,
        unit: '',
        reference: 'ASHRAE 62.1-2022 Appendix A Equation A-4',
        status: AuditStatus.DERIVED
      });
    }

    // Final required outdoor air intake Vot = Vou / Ev (Appendix A Equation A-5 / Section 6.2.5.4)
    const vot: number | null = (isEvValid && ev !== null && ev > 0) ? vou / ev : null;
    if (vot !== null) {
      auditTrail.push({
        symbol: 'Vot',
        name: 'Outdoor Air Intake Flow',
        formula: 'Vou / Ev',
        inputs: { 'Vou': vou, 'Ev': ev },
        result: vot,
        unit: 'L/s',
        reference: 'ASHRAE 62.1-2022 Appendix A Equation A-5',
        status: AuditStatus.DERIVED
      });
    }

    // Informational xsSupply: Vot / Vps = (Vou / Ev) / Vps (NOT substituted into Evz)
    const xsSupply = (vot !== null && vps! > 0) ? vot / vps! : null;

    const finalStatus = VentilationValidationService.aggregateStatus(statuses);

    const zoneResults: AlternativeZoneResult[] = zoneCalcs.map(zc => ({
      id: zc.id,
      name: zc.name,
      dMode: zc.dMode,
      voz: zc.voz,
      vpz: zc.vpz,
      vpzMin: zc.vpzMin,
      vpzMinDesign: zc.vpzMinDesign,
      vpzMinRequired: zc.vpzMinRequired,
      vdzMin: zc.vdzMin,
      zd: zc.zd,
      ep: zc.ep,
      er: zc.er,
      fa: zc.fa,
      fb: zc.fb,
      fc: zc.fc,
      evz: zc.evz,
      isCritical: isEvValid && ev !== null && Math.abs(zc.evz - ev) < 0.001,
      compliance: zc.compliance,
      status: zc.status,
      message: zc.message,
      auditTrail: zc.auditTrail
    }));

    const criticalZone = zoneResults.find(zr => zr.isCritical);

    return {
      zoneResults,
      ev: isEvValid ? ev : null,
      vou,
      vot,
      vps,
      vpsDesignBasis,
      designCondition,
      airDistributionType,
      xs,
      xsSupply: isEvValid ? xsSupply : null,
      criticalZoneId: criticalZone ? criticalZone.id : null,
      status: finalStatus,
      message: finalStatus === 'FAIL' ? (vpsMessage || 'System efficiency calculation failed or zone compliance failed.') : undefined,
      auditTrail
    };
  }
}
