/**
 * ASHRAE 62.1-2022 TABLE 6-3 AIRSTREAMS OR SOURCES INDEPENDENT AUDIT SUITE
 * Standard: ANSI/ASHRAE Standard 62.1-2022 Section 6.5.1 and Table 6-3
 * Reference Basis: ANSI/ASHRAE Standard 62.1-2022 + Addendum x
 * 
 * Tests independent verification, exhaustive field corruption detection,
 * standard validation, Air Class input validation, downgrade prevention,
 * override documentation integrity, Table 6-2 / Table 6-3 overlap, and 2025 isolation.
 */

import { describe, it, expect } from 'vitest';
import {
  AUTHORITATIVE_TABLE_6_3,
  AUTHORITATIVE_TABLE_6_3_COUNT,
  AUTHORITATIVE_TABLE_6_3_REFERENCE_BASIS
} from '../../data/ventilation/ashrae621/2022/authoritativeTable63';
import { ASHRAE_621_2022_TABLE_6_3_SOURCES } from '../../data/ventilation/ashrae621/2022/table63Data';
import { Ashrae621Table63CrossCheckService } from '../../calculations/ventilation/Ashrae621Table63CrossCheckService';
import { Ashrae621Table63Service } from '../../calculations/ventilation/Ashrae621Table63Service';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621Table63Source, SourceType } from '../../data/ventilation/ashrae621/types';

describe('ASHRAE 62.1-2022 Table 6-3 Independent Audit Suite', () => {

  // Helper to deep-clone production data for negative corruption tests
  const cloneProduction = (): Ashrae621Table63Source[] => {
    return JSON.parse(JSON.stringify(ASHRAE_621_2022_TABLE_6_3_SOURCES));
  };

  // =========================================================================
  // 1. BASELINE AUDIT AND PRODUCTION / AUTHORITATIVE CROSS-CHECK
  // =========================================================================
  describe('1. Production vs Authoritative Fixture Audit', () => {
    it('A. Authoritative count derives from fixture length', () => {
      expect(AUTHORITATIVE_TABLE_6_3_COUNT).toBe(AUTHORITATIVE_TABLE_6_3.length);
      expect(Ashrae621Table63CrossCheckService.EXPECTED_TOTAL_RECORDS).toBe(AUTHORITATIVE_TABLE_6_3.length);
      expect(AUTHORITATIVE_TABLE_6_3.length).toBe(7);
    });

    it('B. Production dataset contains exactly 7 records matching fixture count', () => {
      const prod = StandardDataProvider.getProduction621Table63Sources();
      expect(prod.length).toBe(AUTHORITATIVE_TABLE_6_3.length);
      expect(prod.length).toBe(7);
    });

    it('C. Independent audit reports 0 discrepancies across all audited fields', () => {
      const report = Ashrae621Table63CrossCheckService.auditDataset();
      expect(report.totalExpectedRecords).toBe(7);
      expect(report.totalActualRecords).toBe(7);
      expect(report.missingRecords).toHaveLength(0);
      expect(report.extraRecords).toHaveLength(0);
      expect(report.duplicateRecords).toHaveLength(0);
      expect(report.discrepancies).toHaveLength(0);
      expect(report.discrepanciesCount).toBe(0);
      expect(report.completenessStatus).toBe('COMPLETE');
      expect(report.isCompliant).toBe(true);
      expect(report.recordsVerified).toBe(7);
      expect(report.referenceBasis).toBe(AUTHORITATIVE_TABLE_6_3_REFERENCE_BASIS);
      expect(report.auditSummary).toBe('0 discrepancies across all audited fields.');
    });

    it('D. Architectural separation: Production and Authoritative datasets are independent object instances', () => {
      expect(ASHRAE_621_2022_TABLE_6_3_SOURCES).not.toBe(AUTHORITATIVE_TABLE_6_3);
      for (let i = 0; i < 7; i++) {
        expect(ASHRAE_621_2022_TABLE_6_3_SOURCES[i]).not.toBe(AUTHORITATIVE_TABLE_6_3[i]);
      }
    });
  });

  // =========================================================================
  // 2. NEGATIVE AUDIT TESTS (DELIBERATE FIELD CORRUPTIONS)
  // =========================================================================
  describe('2. Negative Audit Corruption Tests (Field Coverage)', () => {
    it('Negative: Air Class corruption (Class 4 -> Class 3) is detected', () => {
      const corrupted = cloneProduction();
      const hood = corrupted.find(s => s.id === 'kitchen_grease_hoods')!;
      hood.airClass = 3 as any;

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      expect(report.discrepanciesCount).toBeGreaterThan(0);
      const airClassDisc = report.discrepancies.find(d => d.id === 'kitchen_grease_hoods' && d.field === 'airClass');
      expect(airClassDisc).toBeDefined();
      expect(airClassDisc?.expectedValue).toBe(4);
      expect(airClassDisc?.actualValue).toBe(3);
    });

    it('Negative: Removing one source is detected as missing record and SUBSET', () => {
      const corrupted = cloneProduction().filter(s => s.id !== 'laboratory_hoods');

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      expect(report.missingRecords).toContain('laboratory_hoods');
      expect(report.completenessStatus).toBe('SUBSET');
    });

    it('Negative: Adding an unrecognized fake source is detected as extra record and INCOMPLETE', () => {
      const corrupted = cloneProduction();
      corrupted.push({
        id: 'residential_bathroom_exhaust',
        name: 'Residential Bathroom Exhaust',
        description: 'Fake Table 6-3 record',
        airClass: 2,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-3',
        referenceSection: '6.5.1',
        referenceTable: 'Table 6-3',
        referenceBasis: 'ASHRAE 62.1-2022 + Addendum x',
        sourceType: SourceType.ASHRAE_PUBLISHED,
        verificationStatus: 'VERIFIED',
        verificationDate: '2026-09-22',
        applicableAddenda: ['Addendum x']
      });

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      expect(report.extraRecords).toContain('residential_bathroom_exhaust');
      expect(report.completenessStatus).toBe('INCOMPLETE');
    });

    it('Negative: Duplicate source ID is detected', () => {
      const corrupted = cloneProduction();
      corrupted.push({ ...corrupted[0] });

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      expect(report.duplicateRecords).toContain(corrupted[0].id);
    });

    it('Negative: Corrupt description is detected', () => {
      const corrupted = cloneProduction();
      corrupted[0].description = 'Tampered description text';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[0].id && d.field === 'description');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt sourceType is detected', () => {
      const corrupted = cloneProduction();
      corrupted[1].sourceType = 'MANUAL_OVERRIDE' as any;

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[1].id && d.field === 'sourceType');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt applicableAddenda is detected', () => {
      const corrupted = cloneProduction();
      corrupted[2].applicableAddenda = ['Addendum a', 'Addendum b'];

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[2].id && d.field === 'applicableAddenda');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt notes is detected', () => {
      const corrupted = cloneProduction();
      corrupted[3].notes = 'Corrupted unauthorized engineering note';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[3].id && d.field === 'notes');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt specialStandardReference is detected', () => {
      const corrupted = cloneProduction();
      corrupted[4].specialStandardReference = 'NFPA 9999 (Invalid)';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[4].id && d.field === 'specialStandardReference');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt revisionState is detected', () => {
      const corrupted = cloneProduction();
      if (corrupted[0].revisionState) {
        corrupted[0].revisionState = {
          ...corrupted[0].revisionState,
          edition: '2025' as any
        };
      }

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const disc = report.discrepancies.find(d => d.id === corrupted[0].id && d.field === 'revisionState.edition');
      expect(disc).toBeDefined();
    });

    it('Negative: Corrupt edition (2022 -> 2025) is detected', () => {
      const corrupted = cloneProduction();
      corrupted[0].edition = '2025';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const editionDisc = report.discrepancies.find(d => d.id === corrupted[0].id && d.field === 'edition');
      expect(editionDisc).toBeDefined();
      expect(editionDisc?.actualValue).toBe('2025');
    });

    it('Negative: Corrupt reference table (Table 6-3 -> Table 6-2) is detected', () => {
      const corrupted = cloneProduction();
      corrupted[1].referenceTable = 'Table 6-2';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const tableDisc = report.discrepancies.find(d => d.id === corrupted[1].id && d.field === 'referenceTable');
      expect(tableDisc).toBeDefined();
      expect(tableDisc?.actualValue).toBe('Table 6-2');
    });

    it('Negative: Corrupt verificationStatus (VERIFIED -> NOT_VERIFIED) is detected', () => {
      const corrupted = cloneProduction();
      corrupted[2].verificationStatus = 'NOT_VERIFIED';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const verDisc = report.discrepancies.find(d => d.id === corrupted[2].id && d.field === 'verificationStatus');
      expect(verDisc).toBeDefined();
      expect(verDisc?.actualValue).toBe('NOT_VERIFIED');
    });

    it('Negative: Corrupt source name is detected', () => {
      const corrupted = cloneProduction();
      corrupted[3].name = 'Corrupted Elevator Room Name';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const nameDisc = report.discrepancies.find(d => d.id === corrupted[3].id && d.field === 'name');
      expect(nameDisc).toBeDefined();
    });

    it('Negative: Corrupt referenceBasis is detected', () => {
      const corrupted = cloneProduction();
      corrupted[4].referenceBasis = 'Unverified Draft Basis';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const basisDisc = report.discrepancies.find(d => d.id === corrupted[4].id && d.field === 'referenceBasis');
      expect(basisDisc).toBeDefined();
    });

    it('Negative: Corrupt metadataSourceType is detected', () => {
      const corrupted = cloneProduction();
      corrupted[0].metadataSourceType = 'SUPPLEMENTARY_GUIDANCE';

      const report = Ashrae621Table63CrossCheckService.auditDataset(corrupted);
      expect(report.isCompliant).toBe(false);
      const metaDisc = report.discrepancies.find(d => d.id === corrupted[0].id && d.field === 'metadataSourceType');
      expect(metaDisc).toBeDefined();
      expect(metaDisc?.expectedValue).toBe('STANDARD_TABLE');
      expect(metaDisc?.actualValue).toBe('SUPPLEMENTARY_GUIDANCE');
    });
  });

  // =========================================================================
  // 3. EXACT AIR CLASS VERIFICATION FOR ALL 7 TABLE 6-3 SOURCES
  // =========================================================================
  describe('3. Exact Air Class Requirements per Published Table 6-3', () => {
    const sources = StandardDataProvider.getProduction621Table63Sources();
    const map = new Map(sources.map(s => [s.id, s]));

    it('1. Kitchen grease hoods: Air Class = 4', () => {
      const src = map.get('kitchen_grease_hoods')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Kitchen grease hoods');
      expect(src.airClass).toBe(4);
      expect(src.specialStandardReference).toContain('Standard 154');
    });

    it('2. Kitchen hoods other than grease hoods: Air Class = 3', () => {
      const src = map.get('kitchen_hoods_non_grease')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Kitchen hoods other than grease hoods');
      expect(src.airClass).toBe(3);
      expect(src.specialStandardReference).toContain('Standard 154');
    });

    it('3. Diazo printing equipment discharge: Air Class = 4', () => {
      const src = map.get('diazo_printing_discharge')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Diazo printing equipment discharge');
      expect(src.airClass).toBe(4);
    });

    it('4. Hydraulic elevator machine room: Air Class = 2', () => {
      const src = map.get('hydraulic_elevator_machine_room')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Hydraulic elevator machine room');
      expect(src.airClass).toBe(2);
    });

    it('5. Laboratory hoods: Air Class = 4', () => {
      const src = map.get('laboratory_hoods')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Laboratory hoods');
      expect(src.airClass).toBe(4);
      expect(src.specialStandardReference).toContain('Z9.5');
    });

    it('6. Paint spray booths: Air Class = 4', () => {
      const src = map.get('paint_spray_booths')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Paint spray booths');
      expect(src.airClass).toBe(4);
      expect(src.specialStandardReference).toContain('OSHA 1910.107');
    });

    it('7. Refrigerating machinery rooms: Air Class = 3', () => {
      const src = map.get('refrigerating_machinery')!;
      expect(src).toBeDefined();
      expect(src.name).toBe('Refrigerating machinery rooms');
      expect(src.airClass).toBe(3);
      expect(src.specialStandardReference).toContain('Standard 15');
    });
  });

  // =========================================================================
  // 4. VALIDATE EXPECTED STANDARD (PROMPT 10 ITEM 3)
  // =========================================================================
  describe('4. Standard Validation (ASHRAE 62.1 vs Non-62.1)', () => {
    it('evaluateSourceClassification rejects non-62.1 standard (e.g. ASHRAE 62.2) as BLOCKED', () => {
      const result = Ashrae621Table63Service.evaluateSourceClassification('kitchen_grease_hoods', {
        expectedStandard: 'ASHRAE 62.2',
        expectedEdition: '2022'
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.airClass).toBeNull();
      expect(result.complianceNotes.some(n => n.includes('Standard \'ASHRAE 62.2\' is rejected'))).toBe(true);
    });

    it('validateAirClass rejects non-62.1 standard (e.g. ASHRAE 62.2) as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 4,
        expectedStandard: 'ASHRAE 62.2',
        expectedEdition: '2022'
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
      expect(result.message).toContain("Standard 'ASHRAE 62.2' is rejected");
    });

    it('evaluateSourceClassification and validateAirClass accept ASHRAE 62.1 normally', () => {
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification('kitchen_grease_hoods', {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022'
      });
      expect(evalRes.status).toBe('CLASSIFIED_SPECIAL_REQUIREMENT');
      expect(evalRes.airClass).toBe(4);

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 4,
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022'
      });
      expect(valRes.isValid).toBe(true);
      expect(valRes.status).toBe('VERIFIED');
    });
  });

  // =========================================================================
  // 5. VALIDATE AIR CLASS INPUT (PROMPT 10 ITEM 4)
  // =========================================================================
  describe('5. Air Class Input Validation', () => {
    it('Rejects invalid Air Class = 0 as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 0
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
      expect(result.message).toContain('Invalid Air Class input (0)');
    });

    it('Rejects invalid Air Class = 5 as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 5
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects out-of-range Air Class = 99 as BLOCKED (does not pass merely because 99 >= 4)', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 99
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects decimal Air Class = 2.5 as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'hydraulic_elevator_machine_room',
        selectedAirClass: 2.5
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects NaN as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: NaN
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects Infinity as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: Infinity
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects negative Air Class = -1 as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: -1
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('Rejects string-coerced value as BLOCKED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: '4' as any
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });
  });

  // =========================================================================
  // 6. NEVER INVENT AIR CLASS FOR BLOCKED / UNVERIFIED DATA (PROMPT 10 ITEM 5)
  // =========================================================================
  describe('6. Never Invent Air Class for Blocked / Unverified Data', () => {
    it('Blocked 2025 result returns airClass = null, numericRate = null, requiredExhaust = null', () => {
      const result = Ashrae621Table63Service.evaluateSourceClassification('kitchen_grease_hoods', {
        expectedEdition: '2025'
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.airClass).toBeNull();
      expect(result.numericRate).toBeNull();
      expect(result.requiredExhaust).toBeNull();
    });

    it('Unknown source returns airClass = null, numericRate = null, requiredExhaust = null', () => {
      const result = Ashrae621Table63Service.evaluateSourceClassification('unknown_air_stream_xyz');
      expect(result.status).toBe('BLOCKED');
      expect(result.airClass).toBeNull();
      expect(result.numericRate).toBeNull();
      expect(result.requiredExhaust).toBeNull();
    });

    it('Blocked standard returns airClass = null', () => {
      const result = Ashrae621Table63Service.evaluateSourceClassification('kitchen_grease_hoods', {
        expectedStandard: 'ASHRAE 62.2'
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.airClass).toBeNull();
    });
  });

  // =========================================================================
  // 7. VALIDATE SOURCE RECORD BEFORE USING CLASSIFICATION (PROMPT 10 ITEM 6)
  // =========================================================================
  describe('7. Source Record Integrity Validation Before Classification', () => {
    const validProd = cloneProduction()[0];

    it('Rejects source with standard != ASHRAE 62.1', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, standard: 'ASHRAE 62.2' as any };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();
      expect(evalRes.complianceNotes.some(n => n.includes('Standard \'ASHRAE 62.2\' is invalid'))).toBe(true);

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
      expect(valRes.isValid).toBe(false);
    });

    it('Rejects source with edition != 2022', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, edition: '2025' };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
    });

    it('Rejects source with referenceTable != Table 6-3', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, referenceTable: 'Table 6-2' };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
    });

    it('Rejects source with referenceSection != 6.5.1', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, referenceSection: '6.2.1' };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
    });

    it('Rejects source with verificationStatus != VERIFIED', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, verificationStatus: 'NOT_VERIFIED' as any };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
    });

    it('Rejects source with airClass out of 1-4 range', () => {
      const corrupted: Ashrae621Table63Source = { ...validProd, airClass: 99 as any };
      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(corrupted.id, {
        sourceOverride: corrupted
      });
      expect(evalRes.status).toBe('BLOCKED');
      expect(evalRes.airClass).toBeNull();

      const valRes = Ashrae621Table63Service.validateAirClass({
        sourceId: corrupted.id,
        selectedAirClass: 4,
        sourceOverride: corrupted
      });
      expect(valRes.status).toBe('BLOCKED');
    });
  });

  // =========================================================================
  // 8. AIR CLASS SAFETY & OVERRIDE METADATA WORDING (PROMPT 10 ITEMS 8 & 9)
  // =========================================================================
  describe('8. Air Class Safety & Override Metadata Integrity', () => {
    it('S. Silent downgrade remains BLOCKED (Class 4 -> Class 3)', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 3
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.isDowngraded).toBe(true);
      expect(result.effectiveAirClass).toBe(4);
      expect(result.message).toContain('Silent downgrade');
    });

    it('S. Silent downgrade remains BLOCKED (Class 4 -> Class 1)', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'laboratory_hoods',
        selectedAirClass: 1
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBe(4);
    });

    it('S. Silent downgrade remains BLOCKED (Class 3 -> Class 2)', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'refrigerating_machinery',
        selectedAirClass: 2
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBe(3);
    });

    it('T. Explicit downgrade metadata produces documented override state without claiming professional verification', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_hoods_non_grease',
        selectedAirClass: 2,
        overrideJustification: 'Low-temperature closed sous-vide equipment with separate steam condensation module per mechanical design specs',
        responsibleEhsProfessional: 'Jane Doe, PE / CIH'
      });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('OVERRIDE_PERMITTED');
      expect(result.isDowngraded).toBe(true);
      expect(result.effectiveAirClass).toBe(2);
      expect(result.message).toContain('Documented override metadata supplied by user');
      expect(result.complianceNotes.some(n => n.includes('Documented override metadata supplied by user: Jane Doe, PE / CIH'))).toBe(true);
      expect(result.complianceNotes.some(n => n.includes('not independently verified'))).toBe(true);
    });

    it('Upgrading to a more restrictive Air Class is always permitted and VERIFIED', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'hydraulic_elevator_machine_room',
        selectedAirClass: 3
      });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('VERIFIED');
      expect(result.isDowngraded).toBe(false);
      expect(result.effectiveAirClass).toBe(3);
    });
  });

  // =========================================================================
  // 9. NO-NUMERIC-RATE & CLASSIFICATION-ONLY SAFETY ENFORCEMENT
  // =========================================================================
  describe('9. Table 6-3 Does Not Invent Numeric Exhaust Rates', () => {
    it('V. Table 6-3 never produces numeric requiredExhaust across all 7 sources', () => {
      const sources = StandardDataProvider.getProduction621Table63Sources();
      sources.forEach(src => {
        const evalResult = Ashrae621Table63Service.evaluateSourceClassification(src.id);
        expect(evalResult.numericRate).toBeNull();
        expect(evalResult.requiredExhaust).toBeNull();
        expect(evalResult.rateStatus).toBe('NOT_APPLICABLE');
        expect(evalResult.status).not.toBe('PASS');
        expect(evalResult.status).toBe('CLASSIFIED_SPECIAL_REQUIREMENT');
        expect(evalResult.referenceTable).toBe('Table 6-3');
        expect(evalResult.referenceSection).toBe('6.5.1');
        expect(evalResult.complianceNotes.some(n => n.includes('Table 6-3 does NOT prescribe numeric airflow rates'))).toBe(true);
      });
    });
  });

  // =========================================================================
  // 10. TABLE 6-2 AND TABLE 6-3 OVERLAP AGREEMENT
  // =========================================================================
  describe('10. Table 6-2 / Table 6-3 Overlap Agreement', () => {
    const table62Rates = StandardDataProvider.getProduction621ExhaustRates();

    it('U. Paint spray booths: Table 6-2 and Table 6-3 overlap remains valid', () => {
      const t62 = table62Rates.find(r => r.id === 'paint_spray_booths')!;
      expect(t62).toBeDefined();
      expect(t62.airClass).toBe(4);
      expect(t62.exhaustClass).toBe(4);
      expect(t62.rateStatus).toBe('SPECIAL_REQUIREMENT');
      expect(t62.rate).toBeNull();

      const overlapCheck = Ashrae621Table63Service.verifyTable62OverlapAgreement(t62);
      expect(overlapCheck.hasOverlap).toBe(true);
      expect(overlapCheck.matches).toBe(true);
      expect(overlapCheck.discrepancies).toHaveLength(0);
    });

    it('U. Refrigerating machinery rooms: Table 6-2 and Table 6-3 overlap remains valid', () => {
      const t62 = table62Rates.find(r => r.id === 'refrigerating_machinery')!;
      expect(t62).toBeDefined();
      expect(t62.airClass).toBe(3);
      expect(t62.exhaustClass).toBe(3);
      expect(t62.rateStatus).toBe('SPECIAL_REQUIREMENT');
      expect(t62.rate).toBeNull();

      const overlapCheck = Ashrae621Table63Service.verifyTable62OverlapAgreement(t62);
      expect(overlapCheck.hasOverlap).toBe(true);
      expect(overlapCheck.matches).toBe(true);
      expect(overlapCheck.discrepancies).toHaveLength(0);
    });

    it('Non-overlapping Table 6-2 categories return hasOverlap = false with no conflicts', () => {
      const t62Restroom = table62Rates.find(r => r.id === 'toilet_public')!;
      const overlapCheck = Ashrae621Table63Service.verifyTable62OverlapAgreement(t62Restroom);
      expect(overlapCheck.hasOverlap).toBe(false);
      expect(overlapCheck.matches).toBe(true);
    });
  });

  // =========================================================================
  // 11. 2025 ISOLATION-GUARD TESTS
  // =========================================================================
  describe('11. 2025 Isolation-Guard Tests', () => {
    it('Q. evaluateSourceClassification rejects 2025 as BLOCKED with airClass = null', () => {
      const result = Ashrae621Table63Service.evaluateSourceClassification('kitchen_grease_hoods', {
        expectedEdition: '2025'
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.airClass).toBeNull();
      expect(result.complianceNotes.some(n => n.includes('Edition 2025 is not active in production'))).toBe(true);
    });

    it('validateAirClass rejects 2025 as BLOCKED with effectiveAirClass = null', () => {
      const result = Ashrae621Table63Service.validateAirClass({
        sourceId: 'kitchen_grease_hoods',
        selectedAirClass: 4,
        expectedEdition: '2025'
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.effectiveAirClass).toBeNull();
    });

    it('StandardDataProvider.get621Table63Sources("2025") throws INVALID_STANDARD_EDITION', () => {
      expect(() => {
        StandardDataProvider.get621Table63Sources('2025');
      }).toThrow('INVALID_STANDARD_EDITION');
    });
  });

  // =========================================================================
  // 12. COMPLETE TABLE 6-3 PROVENANCE MODELING & SAFETY (TASKS 1 - 5)
  // =========================================================================
  describe('12. Complete Table 6-3 Provenance Modeling & Safety Suite', () => {
    const expectedIds = [
      'kitchen_grease_hoods',
      'kitchen_hoods_non_grease',
      'diazo_printing_discharge',
      'hydraulic_elevator_machine_room',
      'laboratory_hoods',
      'paint_spray_booths',
      'refrigerating_machinery'
    ];

    it('Task 1 & 4. All seven expected Table 6-3 records are present with unique IDs', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      expect(records).toHaveLength(7);

      const ids = records.map(r => r.id);
      expect(new Set(ids).size).toBe(7);

      expectedIds.forEach(expectedId => {
        expect(ids).toContain(expectedId);
      });
    });

    it('Task 1 & 4. Every Table 6-3 record preserves primary standard identity', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      records.forEach(record => {
        // Standard: ANSI/ASHRAE Standard 62.1
        expect(record.standard).toBe('ASHRAE 62.1');
        // Edition: 2022
        expect(record.edition).toBe('2022');
        // Section: 6.5.1
        expect(record.referenceSection).toBe('6.5.1');
        // Table: Table 6-3
        expect(record.referenceTable).toBe('Table 6-3');
        // Combined reference
        expect(record.reference).toBe('Section 6.5.1, Table 6-3');
        // Metadata source type is STANDARD_TABLE, never changed to SUPPLEMENTARY_GUIDANCE
        expect(record.metadataSourceType).toBe('STANDARD_TABLE');
        // Verification status
        expect(record.verificationStatus).toBe('VERIFIED');
        expect(record.sourceType).toBe(SourceType.ASHRAE_PUBLISHED);
      });
    });

    it('Task 2 & 4. Air Class provenance is primary Table 6-3 across all seven records', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      records.forEach(record => {
        expect(record.provenance).toBeDefined();
        const prov = record.provenance!;

        // Air Class provenance
        expect(prov.airClass).toBeDefined();
        expect(prov.airClass.value).toBe(record.airClass);
        expect([1, 2, 3, 4]).toContain(prov.airClass.value);
        expect(prov.airClass.standard).toBe('ASHRAE 62.1');
        expect(prov.airClass.edition).toBe('2022');
        expect(prov.airClass.reference).toBe('Section 6.5.1, Table 6-3');
        expect(prov.airClass.sourceType).toBe(SourceType.ASHRAE_PUBLISHED);
        expect(prov.airClass.verificationStatus).toBe('VERIFIED');
        expect(prov.airClass.revision).toBe('2022');

        // Reference provenance
        expect(prov.reference).toBeDefined();
        expect(prov.reference.value).toBe('Section 6.5.1, Table 6-3');
        expect(prov.reference.standard).toBe('ASHRAE 62.1');
        expect(prov.reference.edition).toBe('2022');
        expect(prov.reference.reference).toBe('Section 6.5.1, Table 6-3');
        expect(prov.reference.sourceType).toBe(SourceType.ASHRAE_PUBLISHED);
        expect(prov.reference.verificationStatus).toBe('VERIFIED');
      });
    });

    it('Task 2 & 4. Supplementary references are separate engineering context and not the source of Air Class', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      records.forEach(record => {
        const prov = record.provenance!;
        expect(prov.supplementaryGuidance).toBeDefined();
        const supp = prov.supplementaryGuidance!;

        // Supplementary reference is distinct and populated
        expect(typeof supp.reference).toBe('string');
        expect(supp.reference.length).toBeGreaterThan(0);
        expect(supp.role).toBe('SUPPLEMENTARY_GUIDANCE');
        expect(typeof supp.notes).toBe('string');

        // The Air Class reference is NOT the supplementary reference
        expect(prov.airClass.reference).toBe('Section 6.5.1, Table 6-3');
        expect(prov.airClass.standard).toBe('ASHRAE 62.1');

        // Supplementary standard is separate from primary Table 6-3 standard
        expect(supp.reference).not.toBe(prov.airClass.reference);
      });
    });

    it('Task 2 & 4. Supplementary references cover all required engineering standards across all 7 records', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      const map = new Map(records.map(r => [r.id, r]));

      // 1. Kitchen grease hoods -> ANSI/ASHRAE Standard 154
      const greaseHood = map.get('kitchen_grease_hoods')!;
      expect(greaseHood.provenance?.supplementaryGuidance?.reference).toContain('Standard 154');
      expect(greaseHood.specialStandardReference).toContain('Standard 154');

      // 2. Kitchen hoods non-grease -> ANSI/ASHRAE Standard 154
      const nonGreaseHood = map.get('kitchen_hoods_non_grease')!;
      expect(nonGreaseHood.provenance?.supplementaryGuidance?.reference).toContain('Standard 154');
      expect(nonGreaseHood.specialStandardReference).toContain('Standard 154');

      // 3. Diazo printing -> manufacturer / EHS specifications
      const diazo = map.get('diazo_printing_discharge')!;
      expect(diazo.provenance?.supplementaryGuidance?.reference.toLowerCase()).toContain('manufacturer');
      expect(diazo.specialStandardReference?.toLowerCase()).toContain('manufacturer');

      // 4. Hydraulic elevator -> ASME A17.1
      const elevator = map.get('hydraulic_elevator_machine_room')!;
      expect(elevator.provenance?.supplementaryGuidance?.reference).toContain('ASME A17.1');
      expect(elevator.specialStandardReference).toContain('ASME A17.1');

      // 5. Laboratory hoods -> ANSI/AIHA Z9.5 / NFPA 45
      const lab = map.get('laboratory_hoods')!;
      expect(lab.provenance?.supplementaryGuidance?.reference).toContain('Z9.5');
      expect(lab.provenance?.supplementaryGuidance?.reference).toContain('NFPA 45');
      expect(lab.specialStandardReference).toContain('Z9.5');

      // 6. Paint spray booths -> OSHA 1910.107 / NFPA 33
      const paint = map.get('paint_spray_booths')!;
      expect(paint.provenance?.supplementaryGuidance?.reference).toContain('OSHA 1910.107');
      expect(paint.provenance?.supplementaryGuidance?.reference).toContain('NFPA 33');
      expect(paint.specialStandardReference).toContain('OSHA 1910.107');

      // 7. Refrigerating machinery -> ANSI/ASHRAE Standard 15
      const refrig = map.get('refrigerating_machinery')!;
      expect(refrig.provenance?.supplementaryGuidance?.reference).toContain('Standard 15');
      expect(refrig.specialStandardReference).toContain('Standard 15');
    });

    it('Task 4 & 5. Supplementary references cannot be interpreted as Table 6-3 numeric values', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      records.forEach(record => {
        const supp = record.provenance?.supplementaryGuidance as any;
        expect(supp).toBeDefined();

        // No numeric rate fields exist on supplementary guidance
        expect(supp.rate).toBeUndefined();
        expect(supp.continuousRate).toBeUndefined();
        expect(supp.intermittentRate).toBeUndefined();
        expect(supp.numericRate).toBeUndefined();
        expect(supp.requiredExhaust).toBeUndefined();

        // Table 6-3 service classification returns null rates for all records
        const evalResult = Ashrae621Table63Service.evaluateSourceClassification(record.id);
        expect(evalResult.numericRate).toBeNull();
        expect(evalResult.requiredExhaust).toBeNull();
        expect(evalResult.rateStatus).toBe('NOT_APPLICABLE');
        expect(evalResult.status).toBe('CLASSIFIED_SPECIAL_REQUIREMENT');
        expect(evalResult.status).not.toBe('PASS');
        expect(evalResult.provenance).toBeDefined();
        expect(evalResult.provenance?.airClass.value).toBe(record.airClass);
      });
    });

    it('Task 3. Authoritative fixture remains independent from production data and table63Data', () => {
      // Authoritative fixture has all 7 records
      expect(AUTHORITATIVE_TABLE_6_3).toHaveLength(7);
      // Independent object instances
      expect(StandardDataProvider.getProduction621Table63Sources()).not.toBe(AUTHORITATIVE_TABLE_6_3);

      for (let i = 0; i < 7; i++) {
        const prod = StandardDataProvider.getProduction621Table63Sources()[i];
        const auth = AUTHORITATIVE_TABLE_6_3[i];
        expect(prod).not.toBe(auth);
        expect(prod.id).toBe(auth.id);
        expect(prod.airClass).toBe(auth.airClass);
        expect(auth.provenance).toBeDefined();
        expect(auth.provenance?.airClass.value).toBe(auth.airClass);
        expect(auth.provenance?.airClass.standard).toBe('ASHRAE 62.1');
        expect(auth.provenance?.reference.value).toBe('Section 6.5.1, Table 6-3');
        expect(auth.provenance?.supplementaryGuidance?.reference).toBeDefined();
      }
    });

    it('Task 5. Safety: Special-requirement blocking behavior remains intact for all 7 records', () => {
      const records = StandardDataProvider.getProduction621Table63Sources();
      records.forEach(record => {
        // Attempting to downgrade without justification is strictly BLOCKED
        if (record.airClass > 1) {
          const downgradeAttempt = Ashrae621Table63Service.validateAirClass({
            sourceId: record.id,
            selectedAirClass: record.airClass - 1
          });
          expect(downgradeAttempt.isValid).toBe(false);
          expect(downgradeAttempt.status).toBe('BLOCKED');
          expect(downgradeAttempt.isDowngraded).toBe(true);
        }
      });
    });

    it('Negative: Source record integrity validation rejects corrupted provenance airClass value', () => {
      const valid = cloneProduction()[0];
      const corrupted: Ashrae621Table63Source = {
        ...valid,
        provenance: {
          ...valid.provenance!,
          airClass: {
            ...valid.provenance!.airClass,
            value: 2 // does not match record.airClass (4)
          }
        }
      };

      const check = Ashrae621Table63Service.validateSourceIntegrity(corrupted);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Provenance airClass value');
    });

    it('Negative: Source record integrity validation rejects corrupted provenance standard', () => {
      const valid = cloneProduction()[0];
      const corrupted: Ashrae621Table63Source = {
        ...valid,
        provenance: {
          ...valid.provenance!,
          airClass: {
            ...valid.provenance!.airClass,
            standard: 'NFPA 45' // not ASHRAE 62.1
          }
        }
      };

      const check = Ashrae621Table63Service.validateSourceIntegrity(corrupted);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Provenance airClass standard');
    });

    it('Negative: Source record integrity validation rejects corrupted provenance reference', () => {
      const valid = cloneProduction()[0];
      const corrupted: Ashrae621Table63Source = {
        ...valid,
        provenance: {
          ...valid.provenance!,
          airClass: {
            ...valid.provenance!.airClass,
            reference: 'Table 6-2' // not Section 6.5.1, Table 6-3
          }
        }
      };

      const check = Ashrae621Table63Service.validateSourceIntegrity(corrupted);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Provenance airClass reference');
    });
  });
});
