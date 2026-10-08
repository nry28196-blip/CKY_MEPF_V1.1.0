import { describe, it, expect } from 'vitest';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ZoneService } from '../../calculations/ventilation/Ashrae621ZoneService';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { EzSelectionService } from '../../calculations/ventilation/EzSelectionService';
import { SourceType, AshraeEdition } from '../../data/ventilation/ashrae621/types';
import { createSyntheticVerifiedSpaceType, createSyntheticVerifiedEz, createSyntheticVerifiedExhaust, withMalformedSpaceType, withMalformedExhaust } from './test-fixtures';

const editions: AshraeEdition[] = ['2019', '2022', '2025'];

describe('ASHRAE 62.1 PRODUCTION SAFETY AUTOMATED TESTS', () => {
  describe('8. EXPLICIT "NO UNVERIFIED DATA CAN PASS" REGRESSION TEST', () => {
    editions.forEach(edition => {
      it(`blocks all unverified production SpaceType records in ${edition}`, () => {
        const spaces = StandardDataProvider.get621SpaceTypes(edition);
        const syntheticEz = createSyntheticVerifiedEz(edition);
        let checkedCount = 0;
        for (const space of spaces) {
          if (space.verificationStatus !== 'VERIFIED') {
            checkedCount++;
            expect(space.verificationStatus).toBe('NOT_VERIFIED');
            const result = Ashrae621ZoneService.calculateZone({
              expectedStandard: 'ASHRAE 62.1', expectedEdition: edition, spaceType: space,
              area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: syntheticEz
            });
            expect(result.status).toBe('BLOCKED');
            expect(result.vbz).toBeNull();
            expect(result.voz).toBeNull();
          }
        }
        if (edition !== '2022') expect(checkedCount).toBeGreaterThan(0);
      });

      it(`blocks all unverified production Ez records in ${edition}`, () => {
        const ezs = StandardDataProvider.get621EzValues(edition);
        const syntheticSpace = createSyntheticVerifiedSpaceType(edition);
        let checkedCount = 0;
        for (const ez of ezs) {
          if (ez.verificationStatus !== 'VERIFIED') {
            checkedCount++;
            expect(ez.verificationStatus).toBe('NOT_VERIFIED');
            const result = Ashrae621ZoneService.calculateZone({
              expectedStandard: 'ASHRAE 62.1', expectedEdition: edition, spaceType: syntheticSpace,
              area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
            });
            expect(result.status).toBe('BLOCKED');
            expect(result.vbz).toBeNull();
          }
        }
        if (edition !== '2022') expect(checkedCount).toBeGreaterThan(0);
      });

      it(`blocks all unverified production Exhaust records in ${edition} even with large design exhausts`, () => {
        const exhausts = StandardDataProvider.get621ExhaustRates(edition);
        let checkedCount = 0;
        for (const ex of exhausts) {
          if (ex.verificationStatus !== 'VERIFIED') {
            checkedCount++;
            expect(ex.verificationStatus).toBe('NOT_VERIFIED');
            const result = Ashrae621ExhaustService.calculate({
              expectedStandard: 'ASHRAE 62.1', expectedEdition: edition, exhaustType: ex,
              qty: 10, designExhaust: 9999
            });
            expect(result.status).toBe('BLOCKED');
            expect(result.requiredExhaust).toBeNull();
          }
        }
        if (edition !== '2022') expect(checkedCount).toBeGreaterThan(0);
      });
    });
  });

  describe('9. STANDARD / EDITION / REVISION MISMATCH TESTS', () => {
    it('blocks standard mismatch', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.standard = 'WRONG STANDARD';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks edition mismatch', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.edition = '2022';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks revision mismatch', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.revisionState.edition = '2019';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('10. VERIFICATION-DATE TESTS', () => {
    it('blocks missing verificationDate', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.verificationDate = undefined;
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks invalid format', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.verificationDate = 12345;
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks invalid calendar date', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.verificationDate = '2025-99-99';
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes valid date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.verificationDate = '2025-01-01';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });
  });

  describe('11. CONTRADICTORY VERIFICATION TESTS', () => {
    it('blocks parent NOT_VERIFIED + child VERIFIED', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.verificationStatus = 'NOT_VERIFIED';
      // child is VERIFIED from fixture
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks parent VERIFIED + child NOT_VERIFIED', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.rp).toBeDefined();
      space.provenance!.rp!.verificationStatus = 'NOT_VERIFIED';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks VERIFIED record with PUBLIC_REVIEW_DRAFT source', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.PUBLIC_REVIEW_DRAFT;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks VERIFIED record with UNKNOWN source', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.UNKNOWN;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks VERIFIED record with non-ASHRAE source', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.PROJECT_SPECIFICATION;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes fully valid VERIFIED record with accepted ASHRAE published source', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.ASHRAE_PUBLISHED_ADDENDUM;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });
  });


  describe('11B. EXPLICIT REGRESSION TESTS FOR REVISION SOURCE', () => {
    // SpaceType tests
    it('blocks SpaceType with parent ASHRAE_PUBLISHED but revision PUBLIC_REVIEW_DRAFT', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.ASHRAE_PUBLISHED;
      space.revisionState.source = SourceType.PUBLIC_REVIEW_DRAFT;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks SpaceType with parent ASHRAE_PUBLISHED but revision UNKNOWN', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.ASHRAE_PUBLISHED;
      space.revisionState.source = SourceType.UNKNOWN;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes SpaceType with parent ASHRAE_PUBLISHED and revision ASHRAE_PUBLISHED_ADDENDUM', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.sourceType = SourceType.ASHRAE_PUBLISHED;
      space.revisionState.source = SourceType.ASHRAE_PUBLISHED_ADDENDUM;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    // Ez tests
    it('blocks Ez with parent ASHRAE_PUBLISHED but revision PUBLIC_REVIEW_DRAFT', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.sourceType = SourceType.ASHRAE_PUBLISHED;
      ez.revisionState.source = SourceType.PUBLIC_REVIEW_DRAFT;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez with parent ASHRAE_PUBLISHED but revision UNKNOWN', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.sourceType = SourceType.ASHRAE_PUBLISHED;
      ez.revisionState.source = SourceType.UNKNOWN;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes Ez with parent ASHRAE_PUBLISHED and revision ASHRAE_PUBLISHED_ADDENDUM', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.sourceType = SourceType.ASHRAE_PUBLISHED;
      ez.revisionState.source = SourceType.ASHRAE_PUBLISHED_ADDENDUM;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('PASS');
    });
    
    // Exhaust tests
    it('blocks Exhaust with parent ASHRAE_PUBLISHED but revision PUBLIC_REVIEW_DRAFT', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.sourceType = SourceType.ASHRAE_PUBLISHED;
      ex.revisionState.source = SourceType.PUBLIC_REVIEW_DRAFT;
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('11C. REVISION-DATE REGRESSION TESTS', () => {
    // SpaceType tests
    it('blocks SpaceType with missing revisionState.verificationDate', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.revisionState.verificationDate = undefined;
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks SpaceType with invalid revisionState.verificationDate format', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.revisionState.verificationDate = 12345;
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks SpaceType with invalid revisionState.verificationDate calendar date', () => {
      const space = withMalformedSpaceType(createSyntheticVerifiedSpaceType('2025'), (s) => {
        s.revisionState.verificationDate = '2025-99-99';
      });
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes SpaceType with valid revisionState.verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.revisionState.verificationDate = '2025-01-01';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    // Ez tests
    it('passes Ez with valid leap-year verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ez with invalid non-leap-year verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez with impossible calendar verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes Ez with valid leap-year revisionState.verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.revisionState.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ez with invalid non-leap-year revisionState.verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.revisionState.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez with impossible calendar revisionState.verificationDate', () => {
      const ez = createSyntheticVerifiedEz('2025');
      ez.revisionState.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: createSyntheticVerifiedSpaceType('2025'),
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('BLOCKED');
    });
    
    // Exhaust tests
    it('blocks Exhaust with missing revisionState.verificationDate', () => {
      const ex = withMalformedExhaust(createSyntheticVerifiedExhaust('2025'), (e) => {
        e.revisionState.verificationDate = undefined;
      });
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes ExhaustType with valid leap-year verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.verificationDate = '2024-02-29';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks ExhaustType with invalid non-leap-year verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.verificationDate = '2025-02-29';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks ExhaustType with impossible calendar verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.verificationDate = '2024-02-30';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes ExhaustType with valid leap-year revisionState.verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.revisionState.verificationDate = '2024-02-29';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks ExhaustType with invalid non-leap-year revisionState.verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.revisionState.verificationDate = '2025-02-29';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks ExhaustType with impossible calendar revisionState.verificationDate', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      ex.revisionState.verificationDate = '2024-02-30';
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 10, designExhaust: 9999
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes SpaceType with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks SpaceType with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks SpaceType with impossible calendar verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes SpaceType with valid leap-year revisionState.verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.revisionState.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks SpaceType with invalid non-leap-year revisionState.verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.revisionState.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks SpaceType with impossible calendar revisionState.verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      space.revisionState.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('11D. CHILD PROVENANCE DATE REGRESSION TESTS', () => {
    it('passes Rp provenance with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.rp).toBeDefined();
      expect(space.provenance?.rp?.verificationStatus).toBe('VERIFIED');
      space.provenance!.rp!.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Rp provenance with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.rp).toBeDefined();
      expect(space.provenance?.rp?.verificationStatus).toBe('VERIFIED');
      space.provenance!.rp!.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Rp provenance with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.rp).toBeDefined();
      expect(space.provenance?.rp?.verificationStatus).toBe('VERIFIED');
      space.provenance!.rp!.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes Ra provenance with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.ra).toBeDefined();
      expect(space.provenance?.ra?.verificationStatus).toBe('VERIFIED');
      space.provenance!.ra!.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ra provenance with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.ra).toBeDefined();
      expect(space.provenance?.ra?.verificationStatus).toBe('VERIFIED');
      space.provenance!.ra!.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ra provenance with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.ra).toBeDefined();
      expect(space.provenance?.ra?.verificationStatus).toBe('VERIFIED');
      space.provenance!.ra!.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes defaultOccupancy provenance with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.defaultOccupancy).toBeDefined();
      expect(space.provenance?.defaultOccupancy?.verificationStatus).toBe('VERIFIED');
      space.provenance!.defaultOccupancy!.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: null, useDefaultOccupancy: true, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks defaultOccupancy provenance with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.defaultOccupancy).toBeDefined();
      expect(space.provenance?.defaultOccupancy?.verificationStatus).toBe('VERIFIED');
      space.provenance!.defaultOccupancy!.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: null, useDefaultOccupancy: true, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks defaultOccupancy provenance with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.defaultOccupancy).toBeDefined();
      expect(space.provenance?.defaultOccupancy?.verificationStatus).toBe('VERIFIED');
      space.provenance!.defaultOccupancy!.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: null, useDefaultOccupancy: true, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes reference provenance with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.reference).toBeDefined();
      expect(space.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      space.provenance!.reference!.verificationDate = '2024-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks reference provenance with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.reference).toBeDefined();
      expect(space.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      space.provenance!.reference!.verificationDate = '2025-02-29';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });
    it('blocks reference provenance with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      expect(space.provenance?.reference).toBeDefined();
      expect(space.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      space.provenance!.reference!.verificationDate = '2024-02-30';
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: createSyntheticVerifiedEz('2025')
      });
      expect(result.status).toBe('BLOCKED');
    });

    // EZ Child Provenance
    it('passes Ez provenance.ez with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.ez).toBeDefined();
      expect(ezConfig.provenance?.ez?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.ez!.verificationDate = '2024-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ez provenance.ez with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.ez).toBeDefined();
      expect(ezConfig.provenance?.ez?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.ez!.verificationDate = '2025-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez provenance.ez with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.ez).toBeDefined();
      expect(ezConfig.provenance?.ez?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.ez!.verificationDate = '2024-02-30';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes Ez provenance.applicability with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.applicability).toBeDefined();
      expect(ezConfig.provenance?.applicability?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.applicability!.verificationDate = '2024-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ez provenance.applicability with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.applicability).toBeDefined();
      expect(ezConfig.provenance?.applicability?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.applicability!.verificationDate = '2025-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez provenance.applicability with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.applicability).toBeDefined();
      expect(ezConfig.provenance?.applicability?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.applicability!.verificationDate = '2024-02-30';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('passes Ez provenance.reference with valid leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.reference).toBeDefined();
      expect(ezConfig.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.reference!.verificationDate = '2024-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('PASS');
    });

    it('blocks Ez provenance.reference with invalid non-leap-year verificationDate', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.reference).toBeDefined();
      expect(ezConfig.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.reference!.verificationDate = '2025-02-29';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks Ez provenance.reference with impossible calendar date', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ezConfig = createSyntheticVerifiedEz('2025');
      expect(ezConfig.provenance?.reference).toBeDefined();
      expect(ezConfig.provenance?.reference?.verificationStatus).toBe('VERIFIED');
      ezConfig.provenance!.reference!.verificationDate = '2024-02-30';
      
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig
      });
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('12. MATHEMATICAL SYNTHETIC TESTS (VERIFIED FIXTURES ONLY)', () => {
    it('calculates zone successfully with mathematical golden test (design occupancy)', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ez = createSyntheticVerifiedEz('2025');
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ez
      });
      expect(result.status).toBe('PASS');
      expect(result.vbp).toBeCloseTo(12.5, 4);
      expect(result.vba).toBeCloseTo(30.0, 4);
      expect(result.vbz).toBeCloseTo(42.5, 4);
      expect(result.voz).toBeCloseTo(42.5, 4);
    });

    it('calculates zone successfully with synthetic default-occupancy test', () => {
      const space = createSyntheticVerifiedSpaceType('2025');
      const ez = createSyntheticVerifiedEz('2025');
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', spaceType: space,
        area: 100, designOccupancy: null, useDefaultOccupancy: true, ezConfig: ez
      });
      expect(result.status).toBe('PASS');
    });

    it('calculates exhaust arithmetic successfully using synthetic verified exhaust test', () => {
      const ex = createSyntheticVerifiedExhaust('2025');
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1', expectedEdition: '2025', exhaustType: ex,
        qty: 2, designExhaust: 60
      });
      expect(result.status).toBe('PASS');
      expect(result.requiredExhaust).toBe(50);
      expect(result.designExhaust).toBe(60);
    });
  });

  describe('13. REGRESSION: ez-unidirectional-flow IS UNVERIFIED AND STRICTLY BLOCKED', () => {
    it('A. ez-unidirectional-flow is NOT_VERIFIED in Table 6-4 production dataset', () => {
      const allTable64 = EzSelectionService.getTable64Values();
      const unidirectional = allTable64.find(e => e.id === 'ez-unidirectional-flow');
      expect(unidirectional).toBeDefined();
      expect(unidirectional!.verificationStatus).toBe('NOT_VERIFIED');
      expect(unidirectional!.ez).toBe(0.5);
    });

    it('B. ez-unidirectional-flow is excluded from getVerifiedTable64Values()', () => {
      const verified = EzSelectionService.getVerifiedTable64Values();
      const unidirectional = verified.find(e => e.id === 'ez-unidirectional-flow');
      expect(unidirectional).toBeUndefined();
      expect(verified.every(e => e.verificationStatus === 'VERIFIED')).toBe(true);
      expect(verified.every(e => e.id !== 'ez-unidirectional-flow')).toBe(true);
    });

    it('C. Selection by distributionCategory=unidirectional returns status BLOCKED and ez=null', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        distributionCategory: 'unidirectional'
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.ez).toBeNull();
      expect(res.reasons[0]).toContain('UNIMPLEMENTED / NOT_VERIFIED');
    });

    it('D. Selection by ceiling supply + floor return + isothermal air returns status BLOCKED and ez=null', () => {
      const res = EzSelectionService.resolveEzFromCriteria({
        supplyLocation: 'ceiling',
        returnLocation: 'floor',
        supplyAirCondition: 'isothermal'
      });
      expect(res.status).toBe('BLOCKED');
      expect(res.ez).toBeNull();
    });

    it('E. validateEzConfiguration BLOCKS ez-unidirectional-flow even though numeric Ez (0.5) exists', () => {
      const allTable64 = EzSelectionService.getTable64Values();
      const unidirectional = allTable64.find(e => e.id === 'ez-unidirectional-flow')!;
      const validation = EzSelectionService.validateEzConfiguration(unidirectional);
      expect(validation.valid).toBe(false);
      expect(validation.status).toBe('BLOCKED');
      expect(validation.reasons[0]).toContain('ez-unidirectional-flow is NOT_VERIFIED');
    });

    it('F. Tampered ez-unidirectional-flow with fabricated VERIFIED status is STILL BLOCKED', () => {
      const allTable64 = EzSelectionService.getTable64Values();
      const unidirectional = allTable64.find(e => e.id === 'ez-unidirectional-flow')!;
      const tampered = {
        ...unidirectional,
        verificationStatus: 'VERIFIED' as const
      };
      const validation = EzSelectionService.validateEzConfiguration(tampered);
      expect(validation.valid).toBe(false);
      expect(validation.status).toBe('BLOCKED');
    });

    it('G. Ashrae621ZoneService.calculateZone with ez-unidirectional-flow is BLOCKED, never PASS', () => {
      const allTable64 = EzSelectionService.getTable64Values();
      const unidirectional = allTable64.find(e => e.id === 'ez-unidirectional-flow')!;
      const space2022 = StandardDataProvider.getProduction621SpaceTypes().find(s => s.id === 'office')!;
      const result = Ashrae621ZoneService.calculateZone({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: space2022,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: unidirectional
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.voz).toBeNull();
      expect(result.status).not.toBe('PASS');
    });
  });
});
