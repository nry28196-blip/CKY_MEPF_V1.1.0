import { describe, it, expect } from 'vitest';
import {
  SUBORDINATE_LABELS,
  DEFAULT_MECHANICAL_MODULES,
  MECHANICAL_MODULE_METADATA,
  SUB_SYSTEM_MODULES,
  resolveActiveMechanicalModule,
  getMechanicalBreadcrumbs,
  getMechanicalPageTitle
} from '../../lib/navigationUtils';

describe('Mechanical / HVAC Navigation Sync Suite', () => {
  const subordinates = [
    'cooling',
    'ventilation',
    'psychrometrics',
    'ductSizing',
    'fanDuty',
    'kitchenHood',
    'heatRecovery'
  ] as const;

  it('contains authoritative labels and defaults for all 7 subordinate systems', () => {
    subordinates.forEach(sub => {
      expect(SUBORDINATE_LABELS[sub]).toBeDefined();
      expect(DEFAULT_MECHANICAL_MODULES[sub]).toBeDefined();
      expect(MECHANICAL_MODULE_METADATA[sub]).toBeDefined();
      expect(SUB_SYSTEM_MODULES[sub]).toBeDefined();
    });
  });

  it('strictly synchronizes labels between MECHANICAL_MODULE_METADATA and SUB_SYSTEM_MODULES', () => {
    subordinates.forEach(sub => {
      const moduleList = SUB_SYSTEM_MODULES[sub];
      const metadata = MECHANICAL_MODULE_METADATA[sub];
      
      expect(moduleList).toBeDefined();
      expect(metadata).toBeDefined();

      moduleList.forEach(modItem => {
        const metaItem = metadata[modItem.id];
        expect(metaItem).toBeDefined();
        // Labels must strictly match
        expect(metaItem.label).toBe(modItem.label);
      });
    });
  });

  it('dynamically reflects subordinate and module switches in breadcrumbs and titles', () => {
    subordinates.forEach(sub => {
      const moduleList = SUB_SYSTEM_MODULES[sub];
      moduleList.forEach(modItem => {
        const breadcrumbs = getMechanicalBreadcrumbs(sub, modItem.id);
        const title = getMechanicalPageTitle(sub, modItem.id);

        expect(breadcrumbs).toContain('Mechanical / HVAC');
        expect(breadcrumbs).toContain(SUBORDINATE_LABELS[sub]);
        expect(breadcrumbs).toContain(modItem.label);
        expect(title).toBe(MECHANICAL_MODULE_METADATA[sub][modItem.id].pageTitle);
      });
    });
  });

  describe('resolveActiveMechanicalModule', () => {
    it('resolves ventilation sub-mode correctly', () => {
      expect(resolveActiveMechanicalModule('ventilation', {}, 'exhaust')).toBe('exhaust');
      expect(resolveActiveMechanicalModule('ventilation', {}, 'balance')).toBe('balance');
      expect(resolveActiveMechanicalModule('ventilation', {}, 'reports')).toBe('reports');
      expect(resolveActiveMechanicalModule('ventilation', { ventilation: 'calculation' })).toBe('calculation');
    });

    it('resolves cooling modules accurately', () => {
      expect(resolveActiveMechanicalModule('cooling', { cooling: 'vrf' })).toBe('vrf');
      expect(resolveActiveMechanicalModule('cooling', { cooling: 'schedules' })).toBe('schedules');
      expect(resolveActiveMechanicalModule('cooling', { cooling: 'reports' })).toBe('reports');
      expect(resolveActiveMechanicalModule('cooling', {})).toBe('estimate');
    });

    it('resolves duct design modules accurately', () => {
      expect(resolveActiveMechanicalModule('ductSizing', { ductSizing: 'fittings' })).toBe('fittings');
      expect(resolveActiveMechanicalModule('ductSizing', { ductSizing: 'critical_path' })).toBe('critical_path');
      expect(resolveActiveMechanicalModule('ductSizing', { ductSizing: 'static_regain' })).toBe('static_regain');
      expect(resolveActiveMechanicalModule('ductSizing', {})).toBe('equal_friction');
    });
  });

  describe('getMechanicalBreadcrumbs & getMechanicalPageTitle sync', () => {
    it('produces synchronized breadcrumbs and titles for Cooling Load modules', () => {
      expect(getMechanicalBreadcrumbs('cooling', 'estimate')).toBe(
        'Mechanical / HVAC / Cooling Load / Load Estimate'
      );
      expect(getMechanicalPageTitle('cooling', 'estimate')).toBe('Cooling Load Estimate');

      expect(getMechanicalBreadcrumbs('cooling', 'vrf')).toBe(
        'Mechanical / HVAC / Cooling Load / VRF Analysis'
      );
      expect(getMechanicalPageTitle('cooling', 'vrf')).toBe('Multi-Space VRF System Analysis');

      expect(getMechanicalBreadcrumbs('cooling', 'schedules')).toBe(
        'Mechanical / HVAC / Cooling Load / Equipment Schedules'
      );
      expect(getMechanicalPageTitle('cooling', 'schedules')).toBe('Cooling & VRF Equipment Schedules');

      expect(getMechanicalBreadcrumbs('cooling', 'reports')).toBe(
        'Mechanical / HVAC / Cooling Load / Reports'
      );
      expect(getMechanicalPageTitle('cooling', 'reports')).toBe('Cooling Compliance & Audit Report');
    });

    it('produces synchronized breadcrumbs and titles for Ventilation modules', () => {
      expect(getMechanicalBreadcrumbs('ventilation', 'calculation')).toBe(
        'Mechanical / HVAC / Ventilation / Calculation'
      );
      expect(getMechanicalPageTitle('ventilation', 'calculation')).toBe('Ventilation Calculator');

      expect(getMechanicalBreadcrumbs('ventilation', 'exhaust')).toBe(
        'Mechanical / HVAC / Ventilation / Exhaust'
      );
      expect(getMechanicalPageTitle('ventilation', 'exhaust')).toBe('Commercial Exhaust Calculator');

      expect(getMechanicalBreadcrumbs('ventilation', 'balance')).toBe(
        'Mechanical / HVAC / Ventilation / Air Balance'
      );
      expect(getMechanicalPageTitle('ventilation', 'balance')).toBe('Air Balance & Pressurization');

      expect(getMechanicalBreadcrumbs('ventilation', 'reports')).toBe(
        'Mechanical / HVAC / Ventilation / Reports'
      );
      expect(getMechanicalPageTitle('ventilation', 'reports')).toBe('Ventilation Compliance Report & Audit');
    });

    it('produces synchronized breadcrumbs and titles for Duct Design modules', () => {
      expect(getMechanicalBreadcrumbs('ductSizing', 'equal_friction')).toBe(
        'Mechanical / HVAC / Duct Design / Equal Friction'
      );
      expect(getMechanicalPageTitle('ductSizing', 'equal_friction')).toBe('Duct Sizing (Equal Friction Method)');

      expect(getMechanicalBreadcrumbs('ductSizing', 'static_regain')).toBe(
        'Mechanical / HVAC / Duct Design / Static Regain'
      );
      expect(getMechanicalPageTitle('ductSizing', 'static_regain')).toBe('Static Regain Duct Sizing');

      expect(getMechanicalBreadcrumbs('ductSizing', 'fittings')).toBe(
        'Mechanical / HVAC / Duct Design / Fittings Loss'
      );
      expect(getMechanicalPageTitle('ductSizing', 'fittings')).toBe('Duct Fittings & Dynamic Loss Coefficients');

      expect(getMechanicalBreadcrumbs('ductSizing', 'critical_path')).toBe(
        'Mechanical / HVAC / Duct Design / Critical Path'
      );
      expect(getMechanicalPageTitle('ductSizing', 'critical_path')).toBe('Critical Path & Index Run Static Pressure');
    });

    it('produces synchronized breadcrumbs and titles for Fan Selection modules', () => {
      expect(getMechanicalBreadcrumbs('fanDuty', 'pressure')).toBe(
        'Mechanical / HVAC / Fan Selection / Static Pressure'
      );
      expect(getMechanicalPageTitle('fanDuty', 'pressure')).toBe('Total External Static Pressure (TSP)');

      expect(getMechanicalBreadcrumbs('fanDuty', 'fan_curve')).toBe(
        'Mechanical / HVAC / Fan Selection / Fan Curve'
      );
      expect(getMechanicalPageTitle('fanDuty', 'fan_curve')).toBe('Fan Performance Curve & Operating Point');

      expect(getMechanicalBreadcrumbs('fanDuty', 'selection')).toBe(
        'Mechanical / HVAC / Fan Selection / Motor Selection'
      );
      expect(getMechanicalPageTitle('fanDuty', 'selection')).toBe('Fan Motor Selection & Electrical BHP');

      expect(getMechanicalBreadcrumbs('fanDuty', 'reports')).toBe(
        'Mechanical / HVAC / Fan Selection / Reports'
      );
      expect(getMechanicalPageTitle('fanDuty', 'reports')).toBe('Fan Duty Submittal & Schedule Report');
    });

    it('produces synchronized breadcrumbs and titles for Kitchen Hood modules', () => {
      expect(getMechanicalBreadcrumbs('kitchenHood', 'capture')).toBe(
        'Mechanical / HVAC / Kitchen Hood / Capture & Containment'
      );
      expect(getMechanicalPageTitle('kitchenHood', 'capture')).toBe('Kitchen Hood Capture & Containment');

      expect(getMechanicalBreadcrumbs('kitchenHood', 'grease')).toBe(
        'Mechanical / HVAC / Kitchen Hood / Grease Filters'
      );
      expect(getMechanicalPageTitle('kitchenHood', 'grease')).toBe('Grease Extraction & Filter Guidelines');

      expect(getMechanicalBreadcrumbs('kitchenHood', 'mua')).toBe(
        'Mechanical / HVAC / Kitchen Hood / Make-Up Air'
      );
      expect(getMechanicalPageTitle('kitchenHood', 'mua')).toBe('Kitchen Make-Up Air (MUA) Balance');
    });

    it('produces synchronized breadcrumbs and titles for Heat Recovery modules', () => {
      expect(getMechanicalBreadcrumbs('heatRecovery', 'hrv_sizing')).toBe(
        'Mechanical / HVAC / Heat Recovery / HRV / ERV Sizing'
      );
      expect(getMechanicalPageTitle('heatRecovery', 'hrv_sizing')).toBe('HRV / ERV Heat Recovery Sizing');

      expect(getMechanicalBreadcrumbs('heatRecovery', 'aerodynamics')).toBe(
        'Mechanical / HVAC / Heat Recovery / Aerodynamic Performance'
      );
      expect(getMechanicalPageTitle('heatRecovery', 'aerodynamics')).toBe('Heat Recovery Aerodynamic Performance');

      expect(getMechanicalBreadcrumbs('heatRecovery', 'efficiency')).toBe(
        'Mechanical / HVAC / Heat Recovery / Energy Effectiveness'
      );
      expect(getMechanicalPageTitle('heatRecovery', 'efficiency')).toBe('Thermal & Latent Energy Effectiveness');

      expect(getMechanicalBreadcrumbs('heatRecovery', 'reports')).toBe(
        'Mechanical / HVAC / Heat Recovery / Reports'
      );
      expect(getMechanicalPageTitle('heatRecovery', 'reports')).toBe('Heat Recovery Energy Audit Report');
    });

    it('produces synchronized breadcrumbs and titles for Psychrometrics modules', () => {
      expect(getMechanicalBreadcrumbs('psychrometrics', 'properties')).toBe(
        'Mechanical / HVAC / Psychrometrics / Psychrometric State'
      );
      expect(getMechanicalPageTitle('psychrometrics', 'properties')).toBe('Psychrometric State Analysis');

      expect(getMechanicalBreadcrumbs('psychrometrics', 'comfort')).toBe(
        'Mechanical / HVAC / Psychrometrics / Thermodynamics & Enthalpy'
      );
      expect(getMechanicalPageTitle('psychrometrics', 'comfort')).toBe('Thermodynamics & Moist Air Enthalpy');

      expect(getMechanicalBreadcrumbs('psychrometrics', 'references')).toBe(
        'Mechanical / HVAC / Psychrometrics / Formulas & References'
      );
      expect(getMechanicalPageTitle('psychrometrics', 'references')).toBe('Psychrometric Formulas & Reference Library');
    });
  });
});
