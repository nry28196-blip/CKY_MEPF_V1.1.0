import { describe, it, expect } from 'vitest';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { DataProvenanceValidationService } from '../../calculations/ventilation/DataProvenanceValidationService';
import { Table61CrossCheckService } from '../../calculations/ventilation/Table61CrossCheckService';
import {
  AUTHORITATIVE_TABLE_6_1,
  AUTHORITATIVE_GROUPS,
  AUTHORITATIVE_COUNT
} from '../../data/ventilation/ashrae621/2022/authoritativeTable61';
import {
  STANDARD_BASELINE,
  APPLICABLE_ADDENDA,
  ACTIVE_REFERENCE_BASIS,
  SourceType
} from '../../data/ventilation/ashrae621/types';

describe('ASHRAE 62.1-2022 Table 6-1 Comprehensive Audit & Regression Suite', () => {
  const spaceTypes2022 = StandardDataProvider.get621SpaceTypes('2022');
  const ez2022Default = StandardDataProvider.getProduction621EzValues().find(e => e.id === 'ez-1')!;

  describe('1. Reference Basis Lock', () => {
    it('locks standard baseline to ASHRAE 62.1-2022', () => {
      expect(STANDARD_BASELINE).toBe('ASHRAE 62.1-2022');
    });

    it('identifies Addendum j as active addenda', () => {
      expect(APPLICABLE_ADDENDA).toEqual(['j']);
    });

    it('locks active reference basis string', () => {
      expect(ACTIVE_REFERENCE_BASIS).toBe('ASHRAE 62.1-2022 + Addendum j');
    });

    it('verifies dataset completeness status is COMPLETE for 2022', () => {
      expect(StandardDataProvider.get621DatasetStatus('2022')).toBe('COMPLETE');
    });
  });

  describe('2. Occupancy Categories and Groups Completeness', () => {
    it('contains exactly 81 distinct Table 6-1 occupancy categories matching authoritative count', () => {
      expect(spaceTypes2022.length).toBe(AUTHORITATIVE_COUNT); // 81
      expect(spaceTypes2022.length).toBe(81);
      const uniqueIds = new Set(spaceTypes2022.map(s => s.id));
      expect(uniqueIds.size).toBe(81);
    });

    it('contains all 13 standard occupancy groups with exact counts', () => {
      const countsByGroup: Record<string, number> = {};
      spaceTypes2022.forEach(s => {
        const group = s.occupancyGroup || s.category;
        countsByGroup[group] = (countsByGroup[group] || 0) + 1;
      });

      expect(countsByGroup['Animal Facilities']).toBe(2);
      expect(countsByGroup['Correctional Facilities']).toBe(4);
      expect(countsByGroup['Dry Cleaning and Laundry']).toBe(5);
      expect(countsByGroup['Educational Facilities']).toBe(12);
      expect(countsByGroup['Food and Beverage Service']).toBe(4);
      expect(countsByGroup['General']).toBe(2);
      expect(countsByGroup['Hotels, Motels, Resorts, and Dormitories']).toBe(6);
      expect(countsByGroup['Miscellaneous Spaces']).toBe(13);
      expect(countsByGroup['Office Buildings']).toBe(9);
      expect(countsByGroup['Public Assembly Spaces']).toBe(8);
      expect(countsByGroup['Residential']).toBe(1);
      expect(countsByGroup['Retail']).toBe(6);
      expect(countsByGroup['Sports and Entertainment']).toBe(9);

      const totalGroupSum = Object.values(countsByGroup).reduce((a, b) => a + b, 0);
      expect(totalGroupSum).toBe(81);
      expect(Object.keys(countsByGroup).sort()).toEqual([...AUTHORITATIVE_GROUPS]);
    });
  });

  describe('3. Space Type Field Integrity', () => {
    it('ensures every record satisfies Table 6-1 numerical and classification constraints', () => {
      spaceTypes2022.forEach(space => {
        // ID & Names
        expect(space.id).toBeTruthy();
        expect(space.name).toBeTruthy();
        expect(space.standard).toBe('ASHRAE 62.1');
        expect(space.edition).toBe('2022');

        // Rp constraint: > 0 or explicitly NOT_APPLICABLE
        if (space.isRpNotApplicable) {
          expect(space.rpMetric).toBe(0);
          expect(space.rpStatus).toBe('NOT_APPLICABLE');
        } else {
          expect(space.rpMetric).toBeGreaterThan(0);
          expect(space.rpStatus).toBe('APPLICABLE');
        }

        // Ra constraint: > 0 or explicitly NOT_APPLICABLE
        if (space.isRaNotApplicable) {
          expect(space.raMetric).toBe(0);
          expect(space.raStatus).toBe('NOT_APPLICABLE');
        } else {
          expect(space.raMetric).toBeGreaterThan(0);
          expect(space.raStatus).toBe('APPLICABLE');
        }

        // Default density constraint: >= 0
        if (space.isDensityNotApplicable) {
          expect(space.defaultOccupancyMetric).toBe(0);
          expect(space.densityStatus).toBe('NOT_APPLICABLE');
        } else {
          expect(space.defaultOccupancyMetric).toBeGreaterThan(0);
          expect(space.densityStatus).toBe('APPLICABLE');
        }

        // Air Class constraint: strictly 1, 2, 3, or 4
        expect([1, 2, 3, 4]).toContain(space.airClass);

        // Occupant Sensitivity (OS) flag must be boolean
        expect(typeof space.osPermitted).toBe('boolean');

        // Verification and SourceType
        expect(space.verificationStatus).toBe('VERIFIED');
        expect(space.sourceType).toBe(SourceType.ASHRAE_PUBLISHED);
        expect(space.revisionState.source).toBe(SourceType.ASHRAE_PUBLISHED);
        expect(space.verificationDate).toBe('2026-09-22');
      });
    });

    it('ensures all 81 records pass DataProvenanceValidationService', () => {
      spaceTypes2022.forEach(space => {
        const val = DataProvenanceValidationService.validateSpaceTypeData(
          space,
          'ASHRAE 62.1',
          '2022',
          'ASHRAE 62.1-2022 + Addendum j'
        );
        expect(val.valid).toBe(true);
        expect(val.status).toBe('PASS');
        expect(val.reasons).toEqual([]);
      });
    });
  });

  describe('4. Kitchen (cooking) Specific Rate Defect Fix Verification', () => {
    const kitchen = spaceTypes2022.find(s => s.id === 'food_kitchen_cooking')!;

    it('verifies kitchen (cooking) Rp is corrected to 3.8 L/s·person (7.5 cfm/person)', () => {
      expect(kitchen).toBeDefined();
      expect(kitchen.rpMetric).toBe(3.8);
      expect(kitchen.rpIp).toBe(7.5);
    });

    it('negative test: kitchen (cooking) Rp must NOT be flawed 5.0 L/s·person or 10 cfm/person', () => {
      expect(kitchen.rpMetric).not.toBe(5.0);
      expect(kitchen.rpIp).not.toBe(10);
    });

    it('verifies kitchen (cooking) other parameters conform to Table 6-1', () => {
      expect(kitchen.raMetric).toBe(0.6);
      expect(kitchen.raIp).toBe(0.12);
      expect(kitchen.defaultOccupancyMetric).toBe(20);
      expect(kitchen.defaultOccupancyIp).toBe(20);
      expect(kitchen.airClass).toBe(2);
      expect(kitchen.osPermitted).toBe(false);
    });

    it('produces correct breathing zone ventilation Voz = 136.0 L/s for 100 m2 and 20 persons', () => {
      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: kitchen,
        area: 100,
        designOccupancy: 20,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      // Voz = (20 * 3.8) + (100 * 0.6) = 76 + 60 = 136 L/s
      expect(res.voz).toBe(136.0);
    });
  });

  describe('5. Occupant Sensitivity (OS) Column Verification', () => {
    it('identifies exactly 14 space types with OS permitted per Section 6.2.6.1.4', () => {
      const osPermittedSpaces = spaceTypes2022.filter(s => s.osPermitted);
      expect(osPermittedSpaces.length).toBe(14);

      const expectedOsIds = [
        'education_classroom_ages_5_8',
        'classroom',
        'education_lecture_classroom',
        'education_lecture_hall_fixed_seats',
        'education_multiuse_assembly',
        'office',
        'conference',
        'office_reception_areas',
        'office_telephone_data_entry',
        'public_auditoriums',
        'public_courtrooms',
        'public_legislative_chambers',
        'public_places_of_religious_worship',
        'sports_spectator_areas'
      ];

      const actualOsIds = osPermittedSpaces.map(s => s.id).sort();
      expect(actualOsIds).toEqual(expectedOsIds.sort());
    });

    it('verifies non-OS spaces have osPermitted = false', () => {
      const nonOsSpaces = spaceTypes2022.filter(s => !s.osPermitted);
      expect(nonOsSpaces.length).toBe(81 - 14); // 67
    });
  });

  describe('6. Golden Regression of the 5 Original Records', () => {
    it('office: produces identical ventilation calculation (Voz = 42.5 L/s for 100m2, 5 occ)', () => {
      const office = spaceTypes2022.find(s => s.id === 'office')!;
      expect(office).toBeDefined();
      expect(office.rpMetric).toBe(2.5);
      expect(office.raMetric).toBe(0.3);
      expect(office.defaultOccupancyMetric).toBe(5);
      expect(office.airClass).toBe(1);
      expect(office.osPermitted).toBe(true);

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: office,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      expect(res.voz).toBe(42.5);
    });

    it('conference: produces identical ventilation calculation (Voz = 155.0 L/s for 100m2, 50 occ)', () => {
      const conf = spaceTypes2022.find(s => s.id === 'conference')!;
      expect(conf).toBeDefined();
      expect(conf.rpMetric).toBe(2.5);
      expect(conf.raMetric).toBe(0.3);
      expect(conf.defaultOccupancyMetric).toBe(50);
      expect(conf.airClass).toBe(1);
      expect(conf.osPermitted).toBe(true);

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: conf,
        area: 100,
        designOccupancy: 50,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      expect(res.voz).toBe(155.0);
    });

    it('retail: produces identical ventilation calculation (Voz = 117.0 L/s for 100m2, 15 occ)', () => {
      const retail = spaceTypes2022.find(s => s.id === 'retail')!;
      expect(retail).toBeDefined();
      expect(retail.rpMetric).toBe(3.8);
      expect(retail.raMetric).toBe(0.6);
      expect(retail.defaultOccupancyMetric).toBe(15);
      expect(retail.airClass).toBe(2);
      expect(retail.osPermitted).toBe(false);

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: retail,
        area: 100,
        designOccupancy: 15,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      expect(res.voz).toBe(117.0);
    });

    it('classroom: produces identical ventilation calculation (Voz = 235.0 L/s for 100m2, 35 occ)', () => {
      const classroom = spaceTypes2022.find(s => s.id === 'classroom')!;
      expect(classroom).toBeDefined();
      expect(classroom.rpMetric).toBe(5.0);
      expect(classroom.raMetric).toBe(0.6);
      expect(classroom.defaultOccupancyMetric).toBe(35);
      expect(classroom.airClass).toBe(1);
      expect(classroom.osPermitted).toBe(true);

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: classroom,
        area: 100,
        designOccupancy: 35,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      expect(res.voz).toBe(235.0);
    });

    it('corridor: produces identical ventilation calculation (Voz = 30.0 L/s for 100m2, 0 occ)', () => {
      const corridor = spaceTypes2022.find(s => s.id === 'corridor')!;
      expect(corridor).toBeDefined();
      expect(corridor.rpMetric).toBe(0);
      expect(corridor.isRpNotApplicable).toBe(true);
      expect(corridor.raMetric).toBe(0.3);
      expect(corridor.defaultOccupancyMetric).toBe(0);
      expect(corridor.isDensityNotApplicable).toBe(true);
      expect(corridor.airClass).toBe(1);
      expect(corridor.osPermitted).toBe(false);

      const res = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: corridor,
        area: 100,
        designOccupancy: 0,
        useDefaultOccupancy: false,
        ezConfig: ez2022Default
      });
      expect(res.status).toBe('PASS');
      expect(res.voz).toBe(30.0);
    });
  });

  describe('7. Authoritative Fixture Independent Validation & Negative Testing', () => {
    it('passes full independent audit against AUTHORITATIVE_TABLE_6_1 with 0 discrepancies', () => {
      const report = Table61CrossCheckService.auditAgainstAuthoritative(spaceTypes2022, AUTHORITATIVE_TABLE_6_1);

      expect(report.totalExpectedCategories).toBe(81);
      expect(report.totalActualCategories).toBe(81);
      expect(report.missingCategories).toEqual([]);
      expect(report.extraCategories).toEqual([]);
      expect(report.duplicateCategories).toEqual([]);
      expect(report.valueDiscrepancies.filter(d => d.severity === 'ERROR')).toEqual([]);
      expect(report.isCompliant).toBe(true);
      expect(report.completenessStatus).toBe('COMPLETE');
      expect(report.occupancyGroupsCount).toBe(13);
    });

    it('detects missing categories when records are removed (negative test)', () => {
      // Remove animal facilities
      const subset = spaceTypes2022.filter(s => !s.id.startsWith('animal_'));
      const report = Table61CrossCheckService.auditAgainstAuthoritative(subset, AUTHORITATIVE_TABLE_6_1);

      expect(report.isCompliant).toBe(false);
      expect(report.missingCategories.length).toBe(2);
      expect(report.missingCategories.some(c => c.includes('animal_kennel'))).toBe(true);
      expect(report.missingCategories.some(c => c.includes('animal_pet_shop'))).toBe(true);
    });

    it('detects extra / non-standard categories injected into dataset (negative test)', () => {
      const rogueCategory = {
        ...spaceTypes2022[0],
        id: 'fake_space_type',
        name: 'Imaginary Hologram Room'
      };
      const augmented = [...spaceTypes2022, rogueCategory];
      const report = Table61CrossCheckService.auditAgainstAuthoritative(augmented, AUTHORITATIVE_TABLE_6_1);

      expect(report.isCompliant).toBe(false);
      expect(report.extraCategories.length).toBe(1);
      expect(report.extraCategories[0]).toContain('fake_space_type');
    });

    it('detects duplicate categories (negative test)', () => {
      const duplicateRecord = { ...spaceTypes2022[0] };
      const duplicated = [...spaceTypes2022, duplicateRecord];
      const report = Table61CrossCheckService.auditAgainstAuthoritative(duplicated, AUTHORITATIVE_TABLE_6_1);

      expect(report.isCompliant).toBe(false);
      expect(report.duplicateCategories).toContain(duplicateRecord.id);
    });

    it('detects Rp value discrepancies (negative test)', () => {
      const corrupted = spaceTypes2022.map(s => {
        if (s.id === 'office') {
          return { ...s, rpMetric: 99.9 };
        }
        return s;
      });

      const report = Table61CrossCheckService.auditAgainstAuthoritative(corrupted, AUTHORITATIVE_TABLE_6_1);
      expect(report.isCompliant).toBe(false);
      const rpDisc = report.valueDiscrepancies.find(d => d.spaceId === 'office' && d.field === 'rpMetric');
      expect(rpDisc).toBeDefined();
      expect(rpDisc?.expectedValue).toBe(2.5);
      expect(rpDisc?.actualValue).toBe(99.9);
      expect(rpDisc?.severity).toBe('ERROR');
    });

    it('detects Ra value discrepancies (negative test)', () => {
      const corrupted = spaceTypes2022.map(s => {
        if (s.id === 'office') {
          return { ...s, raMetric: 5.5 };
        }
        return s;
      });

      const report = Table61CrossCheckService.auditAgainstAuthoritative(corrupted, AUTHORITATIVE_TABLE_6_1);
      expect(report.isCompliant).toBe(false);
      const raDisc = report.valueDiscrepancies.find(d => d.spaceId === 'office' && d.field === 'raMetric');
      expect(raDisc).toBeDefined();
      expect(raDisc?.expectedValue).toBe(0.3);
      expect(raDisc?.actualValue).toBe(5.5);
    });

    it('detects Air Class discrepancies (negative test)', () => {
      const corrupted = spaceTypes2022.map(s => {
        if (s.id === 'office') {
          return { ...s, airClass: 4 };
        }
        return s;
      });

      const report = Table61CrossCheckService.auditAgainstAuthoritative(corrupted, AUTHORITATIVE_TABLE_6_1);
      expect(report.isCompliant).toBe(false);
      const airClassDisc = report.valueDiscrepancies.find(d => d.spaceId === 'office' && d.field === 'airClass');
      expect(airClassDisc).toBeDefined();
      expect(airClassDisc?.expectedValue).toBe(1);
      expect(airClassDisc?.actualValue).toBe(4);
    });

    it('detects Occupant Sensitivity (OS) discrepancies (negative test)', () => {
      const corrupted = spaceTypes2022.map(s => {
        if (s.id === 'office') {
          return { ...s, osPermitted: false };
        }
        return s;
      });

      const report = Table61CrossCheckService.auditAgainstAuthoritative(corrupted, AUTHORITATIVE_TABLE_6_1);
      expect(report.isCompliant).toBe(false);
      const osDisc = report.valueDiscrepancies.find(d => d.spaceId === 'office' && d.field === 'osPermitted');
      expect(osDisc).toBeDefined();
      expect(osDisc?.expectedValue).toBe(true);
      expect(osDisc?.actualValue).toBe(false);
    });
  });

  describe('8. ashraeTable61.ts Interface and Functionality', () => {
    it('provides TABLE_6_1_RECORDS with full 81 records and Table61Record interface', async () => {
      const {
        TABLE_6_1_RECORDS,
        TABLE_6_1_BY_ID,
        getTable61RecordById,
        getTable61RecordsByGroup,
        getAllTable61Groups,
        TABLE_6_1_METADATA
      } = await import('../../data/ashraeTable61');

      expect(TABLE_6_1_RECORDS.length).toBe(81);
      expect(Object.keys(TABLE_6_1_BY_ID).length).toBe(81);
      expect(TABLE_6_1_METADATA.completenessStatus).toBe('COMPLETE');
      expect(TABLE_6_1_METADATA.totalRecords).toBe(81);
      expect(TABLE_6_1_METADATA.totalGroups).toBe(13);

      const officeRec = getTable61RecordById('office');
      expect(officeRec).toBeDefined();
      expect(officeRec?.occupancyCategory).toBe('Office space');
      expect(officeRec?.occupancyGroup).toBe('Office Buildings');
      expect(officeRec?.rpMetric).toBe(2.5);
      expect(officeRec?.rpIp).toBe(5);
      expect(officeRec?.raMetric).toBe(0.3);
      expect(officeRec?.raIp).toBe(0.06);
      expect(officeRec?.defaultOccupancyMetric).toBe(5);
      expect(officeRec?.defaultOccupancyIp).toBe(5);
      expect(officeRec?.airClass).toBe(1);
      expect(officeRec?.osPermitted).toBe(true);
      expect(officeRec?.osStatus).toBe('PERMITTED');
      expect(officeRec?.versionMetadata.referenceBasis).toBe('ASHRAE 62.1-2022 + Addendum j');
      expect(officeRec?.versionMetadata.verificationStatus).toBe('VERIFIED');
      expect(officeRec?.provenance).toBeDefined();

      const animalGroup = getTable61RecordsByGroup('Animal Facilities');
      expect(animalGroup.length).toBe(2);

      const resGroup = getTable61RecordsByGroup('Residential');
      expect(resGroup.length).toBe(1);

      const officeGroupRecords = getTable61RecordsByGroup('Office Buildings');
      expect(officeGroupRecords.length).toBe(9);

      const allGroups = getAllTable61Groups();
      expect(allGroups.length).toBe(13);
    });
  });
});
