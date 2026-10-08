import { describe, it, expect } from 'vitest';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('StandardDataProvider', () => {
  it('should return correct edition data for valid editions', () => {
    const data2019 = StandardDataProvider.get621SpaceTypes('2019');
    expect(data2019.length).toBeGreaterThan(0);
    expect(data2019[0].edition).toBe('2019');

    const data2022 = StandardDataProvider.get621SpaceTypes('2022');
    expect(data2022.length).toBeGreaterThan(0);
    expect(data2022[0].edition).toBe('2022');

    const data2025 = StandardDataProvider.get621SpaceTypes('2025');
    expect(data2025.length).toBeGreaterThan(0);
    expect(data2025[0].edition).toBe('2025');
  });

  it('should throw INVALID_STANDARD_EDITION for unknown editions', () => {
    expect(() => StandardDataProvider.get621SpaceTypes('2030')).toThrowError('INVALID_STANDARD_EDITION');
    expect(() => StandardDataProvider.get621EzValues('2030')).toThrowError('INVALID_STANDARD_EDITION');
    expect(() => StandardDataProvider.get621ExhaustRates('2030')).toThrowError('INVALID_STANDARD_EDITION');
  });

  describe('TASK 1 & 2 — Production Basis and Scope Verification', () => {
    it('getProductionBasis() returns ANSI/ASHRAE Standard 62.1-2022 + Addendum j (exhaust: Addendum x)', () => {
      const basis = StandardDataProvider.getProductionBasis();
      expect(basis.standard).toBe('ASHRAE 62.1');
      expect(basis.edition).toBe('2022');
      expect(basis.mainBasis).toBe('ANSI/ASHRAE Standard 62.1-2022 + Addendum j');
      expect(basis.exhaustBasis).toBe('ANSI/ASHRAE Standard 62.1-2022 + Addendum x');
      expect(basis.publishedAddendaApplied).toEqual(['Addendum j', 'Addendum x']);
      expect(basis.notes).toContain('No other 2022 addenda or 2025 provisions are activated');
    });

    it('Production datasets are strictly 2022 data', () => {
      const spaces = StandardDataProvider.getProduction621SpaceTypes();
      expect(spaces.every(s => s.edition === '2022')).toBe(true);

      const ez = StandardDataProvider.getProduction621EzValues();
      expect(ez.every(e => e.edition === '2022')).toBe(true);

      const exhaust = StandardDataProvider.getProduction621ExhaustRates();
      expect(exhaust.every(e => e.edition === '2022')).toBe(true);

      const table63 = StandardDataProvider.getProduction621Table63Sources();
      expect(table63.every(t => t.edition === '2022')).toBe(true);
    });

    it('2019 and 2025 datasets are distinct from active production', () => {
      expect(StandardDataProvider.get621DatasetStatus('2022')).toBe('COMPLETE');
      expect(StandardDataProvider.get621DatasetStatus('2019')).toBe('SUBSET');
      expect(StandardDataProvider.get621DatasetStatus('2025')).toBe('NOT_VERIFIED');
    });
  });
});
