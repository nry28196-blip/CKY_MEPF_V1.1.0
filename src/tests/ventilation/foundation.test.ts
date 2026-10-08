import { describe, it, expect } from 'vitest';
import { UnitConversionService } from '../../lib/UnitConversionService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('Ventilation Foundation - Unit Conversion', () => {
  it('should accurately convert Area (m2 <-> ft2)', () => {
    const m2 = 100;
    const ft2 = UnitConversionService.m2ToFt2(m2);
    expect(ft2).toBeCloseTo(1076.391, 3);
    const backToM2 = UnitConversionService.ft2ToM2(ft2);
    expect(backToM2).toBeCloseTo(m2, 5);
  });

  it('should accurately convert Airflow (L/s <-> cfm)', () => {
    const ls = 42.5;
    const cfm = UnitConversionService.lsToCfm(ls);
    expect(cfm).toBeCloseTo(90.052, 2);
    const backToLs = UnitConversionService.cfmToLs(cfm);
    expect(backToLs).toBeCloseTo(ls, 5);
  });
});

describe('Ventilation Foundation - Standard Edition Selection', () => {
  it('should select correct space types based on edition', () => {
    const spaces2019 = StandardDataProvider.get621SpaceTypes('2019');
    expect(spaces2019[0].edition).toBe('2019');

    const spaces2022 = StandardDataProvider.get621SpaceTypes('2022');
    expect(spaces2022[0].edition).toBe('2022');

    const spaces2025 = StandardDataProvider.get621SpaceTypes('2025');
    expect(spaces2025[0].edition).toBe('2025');
  });

  it('should throw an error for invalid edition', () => {
    expect(() => StandardDataProvider.get621SpaceTypes('2030')).toThrowError('INVALID_STANDARD_EDITION');
  });
});

describe('Ventilation Foundation - Office Data Structure', () => {
  it('should have correct provenance structure for Office space in 2025', () => {
    const spaces = StandardDataProvider.get621SpaceTypes('2025');
    const office = spaces.find(s => s.id === 'office' && s.category === 'Office');
    
    expect(office).toBeDefined();
    if (office) {
      expect(office.rpMetric).toBeDefined();
      expect(office.raMetric).toBeDefined();
      expect(office.defaultOccupancyMetric).toBeDefined();
      expect(office.edition).toBe('2025');
      expect(office.reference).toBeDefined();
      
      expect(office.revisionState).toBeDefined();
      expect(office.revisionState.standard).toBe('ASHRAE 62.1');
      expect(office.revisionState.edition).toBe('2025');
      expect(office.revisionState.publishedAddendaApplied).toBeDefined();
      expect(office.revisionState.publishedErrataApplied).toBeDefined();
      
      expect(office.sourceType).toBeDefined();
      expect(office.verificationDate).toBeDefined();
    }
  });
});
