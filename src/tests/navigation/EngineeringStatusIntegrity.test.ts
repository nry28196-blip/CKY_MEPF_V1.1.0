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

describe('Step 4A — MVAC Engineering Status & Claim Integrity Suite', () => {
  it('correctly maps all 7 mechanical subordinates without missing definitions', () => {
    const requiredSubs = [
      'cooling',
      'ventilation',
      'psychrometrics',
      'ductSizing',
      'fanDuty',
      'kitchenHood',
      'heatRecovery'
    ];

    requiredSubs.forEach(sub => {
      expect(SUBORDINATE_LABELS[sub]).toBeDefined();
      expect(DEFAULT_MECHANICAL_MODULES[sub]).toBeDefined();
      expect(MECHANICAL_MODULE_METADATA[sub]).toBeDefined();
      expect(SUB_SYSTEM_MODULES[sub]).toBeDefined();
    });
  });

  it('verifies psychrometrics unimplemented modules are separated from reference library', () => {
    const psychroMods = SUB_SYSTEM_MODULES.psychrometrics.map(m => m.id);
    expect(psychroMods).toContain('properties');
    expect(psychroMods).toContain('comfort');
    expect(psychroMods).toContain('references');

    expect(MECHANICAL_MODULE_METADATA.psychrometrics.references.label).toBe('Formulas & References');
  });

  it('verifies duct design module classifications', () => {
    const ductMods = SUB_SYSTEM_MODULES.ductSizing.map(m => m.id);
    expect(ductMods).toContain('equal_friction');
    expect(ductMods).toContain('static_regain');
    expect(ductMods).toContain('fittings');
    expect(ductMods).toContain('critical_path');

    expect(MECHANICAL_MODULE_METADATA.ductSizing.fittings.label).toBe('Fittings Loss');
    expect(MECHANICAL_MODULE_METADATA.ductSizing.critical_path.label).toBe('Critical Path');
  });

  it('verifies fan selection module mapping', () => {
    const fanMods = SUB_SYSTEM_MODULES.fanDuty.map(m => m.id);
    expect(fanMods).toContain('pressure');
    expect(fanMods).toContain('fan_curve');
    expect(fanMods).toContain('selection');
    expect(fanMods).toContain('reports');
  });

  it('verifies kitchen hood modules are defined', () => {
    const kitchenMods = SUB_SYSTEM_MODULES.kitchenHood.map(m => m.id);
    expect(kitchenMods).toContain('capture');
    expect(kitchenMods).toContain('grease');
    expect(kitchenMods).toContain('mua');
  });

  it('verifies heat recovery modules are defined', () => {
    const hrMods = SUB_SYSTEM_MODULES.heatRecovery.map(m => m.id);
    expect(hrMods).toContain('hrv_sizing');
    expect(hrMods).toContain('aerodynamics');
    expect(hrMods).toContain('efficiency');
    expect(hrMods).toContain('reports');
  });

  it('resolves active modules accurately with fallbacks', () => {
    expect(resolveActiveMechanicalModule('ventilation', {}, 'calculation')).toBe('calculation');
    expect(resolveActiveMechanicalModule('ventilation', {}, 'exhaust')).toBe('exhaust');
    expect(resolveActiveMechanicalModule('cooling', {})).toBe('estimate');
    expect(resolveActiveMechanicalModule('ductSizing', { ductSizing: 'critical_path' })).toBe('critical_path');
  });

  it('generates consistent breadcrumbs and page titles', () => {
    const bc = getMechanicalBreadcrumbs('ventilation', 'exhaust');
    expect(bc).toBe('Mechanical / HVAC / Ventilation / Exhaust');

    const title = getMechanicalPageTitle('ventilation', 'exhaust');
    expect(title).toBe('Commercial Exhaust Calculator');
  });
});
