import { describe, it, expect } from 'vitest';
import {
  AUTHORITATIVE_EXHAUST_TABLE_6_2,
  AUTHORITATIVE_EXHAUST_COUNT,
  AUTHORITATIVE_EXHAUST_REFERENCE_BASIS
} from '../../data/ventilation/ashrae621/2022/authoritativeExhaust';
import { ASHRAE_621_2022_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2022/data';
import { ASHRAE_621_2025_EXHAUST_RATES } from '../../data/ventilation/ashrae621/2025/data';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ExhaustCrossCheckService } from '../../calculations/ventilation/Ashrae621ExhaustCrossCheckService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { IS_LEGACY_DATASET } from '../../calculations/data/ashrae621/ExhaustData';
import { Ashrae621ExhaustType } from '../../data/ventilation/ashrae621/types';

describe('ASHRAE 62.1-2022 Table 6-2 Independent Exhaust Audit & Validation', () => {

  describe('1. Full Independent Cross-Check Against Authoritative Fixture', () => {
    const report = Ashrae621ExhaustCrossCheckService.auditDataset(ASHRAE_621_2022_EXHAUST_RATES);

    it('A. Record counts match authoritative fixture exactly', () => {
      expect(report.totalExpectedRecords).toBe(AUTHORITATIVE_EXHAUST_COUNT);
      expect(report.totalActualRecords).toBe(AUTHORITATIVE_EXHAUST_COUNT);
      expect(report.totalActualRecords).toBe(25);
    });

    it('B. Zero missing categories', () => {
      expect(report.missingCategories).toHaveLength(0);
    });

    it('C. Zero extra non-standard categories', () => {
      expect(report.extraCategories).toHaveLength(0);
    });

    it('D. Zero duplicate category IDs', () => {
      expect(report.duplicateCategories).toHaveLength(0);
    });

    it('E. Zero discrepancies across all fields', () => {
      expect(report.discrepanciesCount).toBe(0);
      expect(report.discrepancies).toHaveLength(0);
    });

    it('F. Dataset completeness status is strictly COMPLETE', () => {
      expect(report.completenessStatus).toBe('COMPLETE');
      expect(report.isCompliant).toBe(true);
    });

    it('G. Reference basis is strictly ASHRAE 62.1-2022 + Addendum x', () => {
      expect(report.referenceBasis).toBe(AUTHORITATIVE_EXHAUST_REFERENCE_BASIS);
      expect(report.standard).toBe('ASHRAE 62.1');
      expect(report.edition).toBe('2022');
    });
  });

  describe('2. Negative Data-Validation Tests (Detecting Corrupted/Tampered Datasets)', () => {
    const cloneProduction = (): Ashrae621ExhaustType[] => JSON.parse(JSON.stringify(ASHRAE_621_2022_EXHAUST_RATES));

    it('TEST A: Corrupt Commercial Kitchen rate (3.5 -> 5.0 L/s·m²) => AUDIT FAIL', () => {
      const data = cloneProduction();
      const kitchen = data.find(d => d.id === 'kitchen_commercial')!;
      kitchen.rate = 5.0;

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'kitchen_commercial' && d.field === 'rate')).toBe(true);
    });

    it('TEST B: Corrupt Commercial Kitchen Air Class (2 -> 3) => AUDIT FAIL', () => {
      const data = cloneProduction();
      const kitchen = data.find(d => d.id === 'kitchen_commercial')!;
      kitchen.airClass = 3;
      kitchen.exhaustClass = 3;

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'kitchen_commercial' && d.field === 'airClass')).toBe(true);
    });

    it('TEST C: Remove Parking Garage => MISSING CATEGORY detected', () => {
      const data = cloneProduction().filter(d => d.id !== 'parking_garage');

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.missingCategories).toContain('parking_garage');
      expect(report.completenessStatus).toBe('SUBSET');
    });

    it('TEST D: Add fake exhaust category => EXTRA CATEGORY detected', () => {
      const data = cloneProduction();
      data.push({
        ...data[0],
        id: 'fake_space_type',
        name: 'Fabricated Space'
      });

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.extraCategories).toContain('fake_space_type');
      expect(report.completenessStatus).toBe('INCOMPLETE');
    });

    it('TEST E: Duplicate one exhaust category => DUPLICATE detected', () => {
      const data = cloneProduction();
      data.push({ ...data[0] });

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.duplicateCategories).toContain(data[0].id);
      expect(report.completenessStatus).toBe('INCOMPLETE');
    });

    it('TEST F: Change continuous rate => AUDIT FAIL', () => {
      const data = cloneProduction();
      const arena = data.find(d => d.id === 'arenas')!;
      arena.continuousRate = 4.0;

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'arenas' && d.field === 'continuousRate')).toBe(true);
    });

    it('TEST G: Change intermittent rate => AUDIT FAIL', () => {
      const data = cloneProduction();
      const publicToilet = data.find(d => d.id === 'toilet_public')!;
      publicToilet.intermittentRate = 50; // Expected: 35

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'toilet_public' && d.field === 'intermittentRate')).toBe(true);
    });

    it('TEST H: Change unitType (m2 -> fixture) => AUDIT FAIL', () => {
      const data = cloneProduction();
      const art = data.find(d => d.id === 'art_classroom')!;
      art.unitType = 'fixture';

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'art_classroom' && d.field === 'unitType')).toBe(true);
    });

    it('TEST I: Change reference (Table 6-2 -> Table 6.5.1) => AUDIT FAIL', () => {
      const data = cloneProduction();
      const cell = data.find(d => d.id === 'cells_with_toilet')!;
      cell.reference = 'Section 6.5.1, Table 6.5.1';

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'cells_with_toilet' && d.field === 'reference')).toBe(true);
    });

    it('TEST J: Change reference basis (ASHRAE 62.1-2022 + Addendum x -> ASHRAE 62.1-2025) => AUDIT FAIL', () => {
      const data = cloneProduction();
      const darkroom = data.find(d => d.id === 'darkrooms')!;
      darkroom.referenceBasis = 'ASHRAE 62.1-2025 Unverified Draft';

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.id === 'darkrooms' && d.field === 'referenceBasis')).toBe(true);
    });
  });

  describe('3. Production Source Identity and Isolation', () => {
    it('StandardDataProvider.getProduction621ExhaustRates() returns ASHRAE_621_2022_EXHAUST_RATES', () => {
      const prodRates = StandardDataProvider.getProduction621ExhaustRates();
      expect(prodRates).toBe(ASHRAE_621_2022_EXHAUST_RATES);
      expect(prodRates).not.toBe(ASHRAE_621_2025_EXHAUST_RATES);
    });

    it('Legacy ExhaustData.ts is marked IS_LEGACY_DATASET = true and not used by production calculator', () => {
      expect(IS_LEGACY_DATASET).toBe(true);
    });
  });

  describe('4. Air Class vs exhaustClass Consistency Audit', () => {
    it('Every production exhaust record has airClass === exhaustClass', () => {
      ASHRAE_621_2022_EXHAUST_RATES.forEach(record => {
        expect(record.airClass).toBeDefined();
        expect(record.exhaustClass).toBeDefined();
        expect(record.airClass).toBe(record.exhaustClass);
      });
    });

    it('Internal divergence between airClass and exhaustClass triggers an audit discrepancy', () => {
      const data = JSON.parse(JSON.stringify(ASHRAE_621_2022_EXHAUST_RATES));
      data[0].airClass = 1;
      data[0].exhaustClass = 2;

      const report = Ashrae621ExhaustCrossCheckService.auditDataset(data);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepancies.some(d => d.field.includes('divergence'))).toBe(true);
    });
  });

  describe('5. Verified Nominal 2022 Rates and Air Classes', () => {
    const map = new Map(ASHRAE_621_2022_EXHAUST_RATES.map(r => [r.id, r]));

    it('Arenas: 2.5 L/s·m², Air Class 1', () => {
      const rec = map.get('arenas')!;
      expect(rec.rate).toBe(2.5);
      expect(rec.airClass).toBe(1);
    });

    it('Art classrooms: 3.5 L/s·m², Air Class 2', () => {
      const rec = map.get('art_classroom')!;
      expect(rec.rate).toBe(3.5);
      expect(rec.airClass).toBe(2);
    });

    it('Auto repair rooms: 7.5 L/s·m², Air Class 2', () => {
      const rec = map.get('auto_repair')!;
      expect(rec.rate).toBe(7.5);
      expect(rec.airClass).toBe(2);
    });

    it('Barber shops: 2.5 L/s·m², Air Class 2', () => {
      const rec = map.get('barber_shop')!;
      expect(rec.rate).toBe(2.5);
      expect(rec.airClass).toBe(2);
    });

    it('Beauty and nail salons: 3.0 L/s·m², Air Class 2', () => {
      const rec = map.get('beauty_nail_salon')!;
      expect(rec.rate).toBe(3.0);
      expect(rec.airClass).toBe(2);
    });

    it('Cells with toilet: 5.0 L/s·m², Air Class 2', () => {
      const rec = map.get('cells_with_toilet')!;
      expect(rec.rate).toBe(5.0);
      expect(rec.airClass).toBe(2);
    });

    it('Copy/printing rooms: 2.5 L/s·m², Air Class 2', () => {
      const rec = map.get('copy_room')!;
      expect(rec.rate).toBe(2.5);
      expect(rec.airClass).toBe(2);
    });

    it('Darkrooms: 5.0 L/s·m², Air Class 2', () => {
      const rec = map.get('darkrooms')!;
      expect(rec.rate).toBe(5.0);
      expect(rec.airClass).toBe(2);
    });

    it('Educational science laboratories: 5.0 L/s·m², Air Class 2', () => {
      const rec = map.get('educational_science_labs')!;
      expect(rec.rate).toBe(5.0);
      expect(rec.airClass).toBe(2);
    });

    it('Janitor closets/trash/recycling: 5.0 L/s·m², Air Class 3', () => {
      const rec = map.get('janitor_closet')!;
      expect(rec.rate).toBe(5.0);
      expect(rec.airClass).toBe(3);
    });

    it('Kitchenettes: 1.5 L/s·m², Air Class 2', () => {
      const rec = map.get('kitchenettes')!;
      expect(rec.rate).toBe(1.5);
      expect(rec.airClass).toBe(2);
    });

    it('Kitchens—commercial: 3.5 L/s·m², Air Class 2 (Regression: NOT Class 3)', () => {
      const rec = map.get('kitchen_commercial')!;
      expect(rec.rate).toBe(3.5);
      expect(rec.rateIp).toBe(0.70);
      expect(rec.airClass).toBe(2);
      expect(rec.exhaustClass).toBe(2);
      expect(rec.airClass).not.toBe(3);
    });

    it('Locker rooms—athletic/industrial/health care: 2.5 L/s·m², Air Class 2', () => {
      const rec = map.get('locker_athletic')!;
      expect(rec.rate).toBe(2.5);
      expect(rec.airClass).toBe(2);
    });

    it('Other locker rooms: 1.25 L/s·m², Air Class 2', () => {
      const rec = map.get('locker_other')!;
      expect(rec.rate).toBe(1.25);
      expect(rec.airClass).toBe(2);
    });

    it('Parking garages: 3.7 L/s·m², Air Class 2', () => {
      const rec = map.get('parking_garage')!;
      expect(rec.rate).toBe(3.7);
      expect(rec.rateIp).toBe(0.75);
      expect(rec.airClass).toBe(2);
    });

    it('Pet shops—animal areas: 4.5 L/s·m², Air Class 2', () => {
      const rec = map.get('pet_shops')!;
      expect(rec.rate).toBe(4.5);
      expect(rec.airClass).toBe(2);
    });

    it('Soiled laundry storage rooms: 5.0 L/s·m², Air Class 3', () => {
      const rec = map.get('soiled_laundry')!;
      expect(rec.rate).toBe(5.0);
      expect(rec.airClass).toBe(3);
    });

    it('Chemical storage: 7.5 L/s·m², Air Class 4', () => {
      const rec = map.get('chemical_storage')!;
      expect(rec.rate).toBe(7.5);
      expect(rec.airClass).toBe(4);
    });

    it('Woodwork shops/classrooms: 2.5 L/s·m², Air Class 2', () => {
      const rec = map.get('woodwork_shops')!;
      expect(rec.rate).toBe(2.5);
      expect(rec.airClass).toBe(2);
    });
  });

  describe('6. Verified Intermittent Rates and Mode Enforcement', () => {
    const map = new Map(ASHRAE_621_2022_EXHAUST_RATES.map(r => [r.id, r]));

    it('Shower rooms: Continuous 10 L/s (20 cfm), Intermittent 25 L/s (50 cfm) per showerhead', () => {
      const rec = map.get('shower_rooms')!;
      expect(rec.continuousRate).toBe(10);
      expect(rec.continuousRateIp).toBe(20);
      expect(rec.intermittentRate).toBe(25);
      expect(rec.intermittentRateIp).toBe(50);
      expect(rec.unitType).toBe('showerhead');
    });

    it('Residential dwelling-unit kitchens: Continuous 25 L/s (50 cfm), Intermittent 50 L/s (100 cfm) per room', () => {
      const rec = map.get('residential_kitchens')!;
      expect(rec.continuousRate).toBe(25);
      expect(rec.continuousRateIp).toBe(50);
      expect(rec.intermittentRate).toBe(50);
      expect(rec.intermittentRateIp).toBe(100);
      expect(rec.unitType).toBe('room');
    });

    it('Private toilets: Continuous 12.5 L/s (25 cfm), Intermittent 25 L/s (50 cfm) per room/fixture', () => {
      const rec = map.get('toilet_private')!;
      expect(rec.continuousRate).toBe(12.5);
      expect(rec.continuousRateIp).toBe(25);
      expect(rec.intermittentRate).toBe(25);
      expect(rec.intermittentRateIp).toBe(50);
    });

    it('Public toilets: Continuous 25 L/s (50 cfm), Intermittent 35 L/s (70 cfm) per fixture', () => {
      const rec = map.get('toilet_public')!;
      expect(rec.continuousRate).toBe(25);
      expect(rec.continuousRateIp).toBe(50);
      expect(rec.intermittentRate).toBe(35);
      expect(rec.intermittentRateIp).toBe(70);
      expect(rec.unitType).toBe('fixture');
    });

    it('Selecting intermittent operation on space without intermittent rate FAILS calculation', () => {
      const art = map.get('art_classroom')!;
      expect(art.intermittentRate).toBeNull();

      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 100,
        designExhaust: 500,
        operationMode: 'intermittent'
      });
      expect(res.status).toBe('FAIL');
      expect(res.complianceNotes.some(n => n.includes('Intermittent exhaust is not permitted'))).toBe(true);
    });
  });

  describe('7. Special Standard Spaces Result Safety', () => {
    const map = new Map(ASHRAE_621_2022_EXHAUST_RATES.map(r => [r.id, r]));

    it('Paint spray booths (OSHA 1910.107 / NFPA 33) returns BLOCKED for design exhaust > 0', () => {
      const paint = map.get('paint_spray_booths')!;
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: paint,
        qty: 1,
        designExhaust: 1500
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
      expect(res.isSpecialStandard).toBe(true);
      expect(res.specialStandardReference).toBe('OSHA 1910.107 / NFPA 33');
    });

    it('Refrigerating machinery rooms (ANSI/ASHRAE Standard 15) returns BLOCKED for design exhaust > 0', () => {
      const refMach = map.get('refrigerating_machinery')!;
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: refMach,
        qty: 1,
        designExhaust: 1000
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.status).not.toBe('PASS');
      expect(res.isSpecialStandard).toBe(true);
      expect(res.specialStandardReference).toBe('ANSI/ASHRAE Standard 15');
    });
  });
});
