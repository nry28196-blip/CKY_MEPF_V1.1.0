import { describe, it, expect } from 'vitest';
import { 
  Ashrae621ExhaustService, 
  ExhaustInput,
  ExhaustResult
} from '../../calculations/ventilation/Ashrae621ExhaustService';
import { Ashrae621Table63Service } from '../../calculations/ventilation/Ashrae621Table63Service';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ExhaustType } from '../../data/ventilation/ashrae621/types';
import { AUTHORITATIVE_EXHAUST_TABLE_6_2 } from '../../data/ventilation/ashrae621/2022/authoritativeExhaust';

describe('PROMPT 3 — Exhaust Scope Safety & Prescriptive Compliance Path (Section 6.5.1 vs 6.5.2)', () => {
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');
  const table63Sources = StandardDataProvider.getProduction621Table63Sources();

  describe('1. Active Compliance Path Reporting', () => {
    it('reports Prescriptive Path 6.5.1 as SUPPORTED and Performance Path 6.5.2 as PERFORMANCE_PATH_UNIMPLEMENTED', () => {
      const report = Ashrae621ExhaustService.getCompliancePathReport();
      expect(report.prescriptivePath.status).toBe('SUPPORTED');
      expect(report.prescriptivePath.section).toBe('6.5.1');
      expect(report.prescriptivePath.basis).toContain('ANSI/ASHRAE Standard 62.1-2022 + Addendum x');

      expect(report.performancePath.status).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(report.performancePath.section).toBe('6.5.2');
      expect(report.performancePath.requirement).toContain('independent engineering evaluation');
    });
  });

  describe('2. Verified Prescriptive Rate → Allowed (rateStatus = PRESCRIPTIVE)', () => {
    it('sets rateStatus = PRESCRIPTIVE and allows calculation to proceed for verified Table 6-2 rates', () => {
      const toiletPublic = exhaustRates2022.find(e => e.id === 'toilet_public')!;
      expect(toiletPublic).toBeDefined();

      const input: ExhaustInput = {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toiletPublic,
        qty: 4, // 4 water closets / urinals
        designExhaust: 120, // L/s (required = 25 L/s * 4 = 100 L/s)
        operationMode: 'continuous',
        unitSystem: 'metric'
      };

      const result: ExhaustResult = Ashrae621ExhaustService.calculate(input);

      expect(result.rateStatus).toBe('PRESCRIPTIVE');
      expect(result.compliancePath).toBe('PRESCRIPTIVE');
      expect(result.pathStatus).toBe('SUPPORTED');
      expect(result.status).toBe('PASS');
      expect(result.requiredExhaust).toBe(100);
      expect(result.requiredExhaustMetric).toBe(100);
      expect(result.requiredExhaustIp).toBe(200); // 50 cfm * 4 = 200 cfm
      expect(result.airClass).toBe(2);
      expect(result.exhaustClass).toBe(2);
    });

    it('returns FAIL when design exhaust is less than prescriptive minimum (no false passes)', () => {
      const artClassroom = exhaustRates2022.find(e => e.id === 'art_classroom')!;
      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: artClassroom,
        qty: 100, // 100 m² * 3.5 L/s·m² = 350 L/s
        designExhaust: 300, // < 350
        operationMode: 'continuous',
        unitSystem: 'metric'
      });

      expect(result.rateStatus).toBe('PRESCRIPTIVE');
      expect(result.compliancePath).toBe('PRESCRIPTIVE');
      expect(result.status).toBe('FAIL');
      expect(result.requiredExhaust).toBe(350);
      expect(result.complianceNotes[0]).toContain('less than prescriptive minimum');
    });

    it('preserves area conversions and metric/IP calculations accurately', () => {
      const janitor = exhaustRates2022.find(e => e.id === 'janitor_closet')!;
      expect(janitor).toBeDefined();

      // Metric: 5.0 L/s·m²
      const resMetric = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: janitor,
        qty: 10, // 10 m²
        designExhaust: 60,
        unitSystem: 'metric'
      });
      expect(resMetric.status).toBe('PASS');
      expect(resMetric.requiredExhaust).toBe(50); // 5.0 * 10 = 50 L/s

      // IP: 1.0 cfm/ft²
      const resIp = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: janitor,
        qty: 100, // 100 ft²
        designExhaust: 120,
        unitSystem: 'ip'
      });
      expect(resIp.status).toBe('PASS');
      expect(resIp.requiredExhaust).toBe(100); // 1.0 * 100 = 100 cfm
    });

    it('preserves continuous vs intermittent operational handling', () => {
      // arenas does not permit intermittent
      const arenas = exhaustRates2022.find(e => e.id === 'arenas')!;
      const resIntermittent = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: arenas,
        qty: 100,
        designExhaust: 500,
        operationMode: 'intermittent'
      });
      expect(resIntermittent.status).toBe('FAIL');
      expect(resIntermittent.requiredExhaust).toBeNull();
      expect(resIntermittent.complianceNotes.some(n => n.includes('Intermittent exhaust is not permitted'))).toBe(true);
    });
  });

  describe('3. Special-Standard Case → No Invented Numeric Rate & Identifies Governing Reference', () => {
    it('blocks paint_spray_booths without inventing a numeric rate and identifies OSHA 1910.107 / NFPA 33', () => {
      const paintBooths = exhaustRates2022.find(e => e.id === 'paint_spray_booths')!;
      expect(paintBooths).toBeDefined();
      expect(paintBooths.isSpecialStandard).toBe(true);
      expect(paintBooths.rate).toBeNull();

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: paintBooths,
        qty: 1,
        designExhaust: 50000 // Engineer enters a huge number
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.rateStatus).toBe('SPECIAL_REQUIREMENT');
      expect(result.isSpecialStandard).toBe(true);
      expect(result.specialStandardReference).toBe('OSHA 1910.107 / NFPA 33');
      expect(result.requiredExhaust).toBeNull();
      expect(result.requiredExhaustMetric).toBeNull();
      expect(result.requiredExhaustIp).toBeNull();
      expect(result.rateApplied).toBeNull();
      expect(result.status).not.toBe('PASS');
      expect(result.complianceNotes.some(n => n.includes('OSHA 1910.107') || n.includes('NFPA 33'))).toBe(true);
    });

    it('blocks refrigerating_machinery without inventing a numeric rate and identifies ASHRAE 15', () => {
      const refrigerated = exhaustRates2022.find(e => e.id === 'refrigerating_machinery')!;
      expect(refrigerated).toBeDefined();
      expect(refrigerated.isSpecialStandard).toBe(true);

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: refrigerated,
        qty: 50,
        designExhaust: 999999
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.rateStatus).toBe('SPECIAL_REQUIREMENT');
      expect(result.isSpecialStandard).toBe(true);
      expect(result.specialStandardReference).toBe('ANSI/ASHRAE Standard 15');
      expect(result.requiredExhaust).toBeNull();
      expect(result.status).not.toBe('PASS');
    });
  });

  describe('4. Table 6-3 Classification → Air Class Only (No Invented Numeric Rate)', () => {
    it('classifies Air Class via Ashrae621Table63Service without inventing numeric rate', () => {
      const labSource = table63Sources.find(s => s.id === 'laboratory_hoods')!;
      expect(labSource).toBeDefined();

      const evalRes = Ashrae621Table63Service.evaluateSourceClassification(labSource.id);
      expect(evalRes.airClass).toBe(4);
      expect(evalRes.numericRate).toBeNull();
      expect(evalRes.requiredExhaust).toBeNull();
      expect(evalRes.rateStatus).toBe('NOT_APPLICABLE');
      expect(evalRes.status).toBe('CLASSIFIED_SPECIAL_REQUIREMENT');
      expect(evalRes.specialStandardReference).toBeDefined();
    });

    it('evaluating a Table 6-3 source in Ashrae621ExhaustService returns Air Class only and blocks numeric PASS', () => {
      const kitchenGrease = table63Sources.find(s => s.id === 'kitchen_grease_hoods')!;
      expect(kitchenGrease).toBeDefined();

      const exhaustRes = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: {
          id: kitchenGrease.id,
          name: kitchenGrease.name,
          category: 'Airstreams or Sources',
          rate: null,
          unitType: 'special',
          operatingCondition: 'Operation',
          airClass: kitchenGrease.airClass,
          exhaustClass: kitchenGrease.airClass,
          standard: 'ASHRAE 62.1',
          edition: '2022',
          reference: 'Table 6-3',
          referenceSection: '6.5.1',
          referenceTable: 'Table 6-3',
          isSpecialStandard: true,
          specialStandardReference: kitchenGrease.specialStandardReference,
          revisionState: { standard: 'ASHRAE 62.1', edition: '2022', baseEdition: '2022', publishedAddendaApplied: [], publishedErrataApplied: [], verificationDate: '2026-09-22', source: 'ASHRAE_PUBLISHED' as any },
          sourceType: 'ASHRAE_PUBLISHED' as any,
          verificationStatus: 'VERIFIED'
        },
        qty: 1,
        designExhaust: 50000 // Engineer enters a huge number
      });

      expect(exhaustRes.airClass).toBe(4);
      expect(exhaustRes.exhaustClass).toBe(4);
      expect(exhaustRes.requiredExhaust).toBeNull();
      expect(exhaustRes.requiredExhaustMetric).toBeNull();
      expect(exhaustRes.requiredExhaustIp).toBeNull();
      expect(exhaustRes.rateApplied).toBeNull();
      expect(exhaustRes.rateStatus).toBe('NOT_APPLICABLE');
      expect(exhaustRes.status).toBe('BLOCKED');
      expect(exhaustRes.status).not.toBe('PASS');
      expect(exhaustRes.recirculationClassification).toContain('Air Class 4: No recirculation or transfer permitted');
      expect(exhaustRes.complianceNotes[0]).toContain('Table 6-3 designates Air Class classification only');
    });
  });

  describe('5. Performance-Path Request (Section 6.5.2) → Blocked / Unimplemented', () => {
    it('returns PERFORMANCE_PATH_UNIMPLEMENTED when calculationProcedure is performance', () => {
      const toilet = exhaustRates2022.find(e => e.id === 'toilet_public')!;

      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 5,
        designExhaust: 500,
        calculationProcedure: 'performance'
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.compliancePath).toBe('PERFORMANCE');
      expect(res.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.rateStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.state).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.requiredExhaust).toBeNull();
      expect(res.requiredExhaustMetric).toBeNull();
      expect(res.requiredExhaustIp).toBeNull();
      expect(res.rateApplied).toBeNull();
      expect(res.referenceSection).toBe('6.5.2');
      expect(res.instructionalMessage).toContain('independent engineering evaluation');
      expect(res.instructionalMessage).toContain('Section 6.5.2 Performance Compliance Path');
      expect(res.complianceNotes.some(n => n.includes('PERFORMANCE_PATH_UNIMPLEMENTED'))).toBe(true);
      expect(res.complianceNotes.some(n => n.includes('Independent engineering evaluation is required'))).toBe(true);
      expect(res.complianceNotes.some(n => n.includes('licensed professional engineer'))).toBe(true);
    });

    it('does not calculate a fake performance result or fall back silently to Table 6-2', () => {
      const res = Ashrae621ExhaustService.requestPerformancePath({
        exhaustType: exhaustRates2022[0],
        qty: 10,
        designExhaust: 1000
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.rateStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.state).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.requiredExhaust).toBeNull(); // No fake result
      expect(res.rateApplied).toBeNull(); // Did not fall back to Table 6-2 rate
      expect(res.instructionalMessage).toContain('independent engineering evaluation');
    });

    it('rejects performance request when compliancePath is explicitly specified as performance', () => {
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: exhaustRates2022[1],
        qty: 100,
        designExhaust: 1000,
        compliancePath: 'performance'
      });

      expect(res.status).toBe('BLOCKED');
      expect(res.compliancePath).toBe('PERFORMANCE');
      expect(res.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.state).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(res.requiredExhaust).toBeNull();
      expect(res.instructionalMessage).toContain('engineering evaluation');
    });

    it('returns PERFORMANCE_PATH_UNIMPLEMENTED for any request involving Section 6.5.2 by referenceSection or section', () => {
      const toilet = exhaustRates2022.find(e => e.id === 'toilet_public')!;

      // Via referenceSection: '6.5.2'
      const resRef = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 4,
        designExhaust: 200,
        referenceSection: '6.5.2'
      });
      expect(resRef.status).toBe('BLOCKED');
      expect(resRef.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(resRef.rateStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(resRef.instructionalMessage).toContain('engineering evaluation is required');

      // Via section: '6.5.2'
      const resSec = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 4,
        designExhaust: 200,
        section: '6.5.2'
      });
      expect(resSec.status).toBe('BLOCKED');
      expect(resSec.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');

      // Via calculationProcedure: '6.5.2'
      const resProc = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 4,
        designExhaust: 200,
        calculationProcedure: '6.5.2'
      });
      expect(resProc.status).toBe('BLOCKED');
      expect(resProc.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');

      // Via compliancePath: '6.5.2'
      const resComp = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 4,
        designExhaust: 200,
        compliancePath: '6.5.2'
      });
      expect(resComp.status).toBe('BLOCKED');
      expect(resComp.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');

      // Via calculateSection652 dedicated helper
      const resHelper = Ashrae621ExhaustService.calculateSection652({
        exhaustType: toilet,
        qty: 4,
        designExhaust: 200
      });
      expect(resHelper.status).toBe('BLOCKED');
      expect(resHelper.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
      expect(resHelper.state).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');

      // Via exhaustType configured for Section 6.5.2
      const resExhaustType = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: {
          ...toilet,
          referenceSection: '6.5.2'
        },
        qty: 4,
        designExhaust: 200
      });
      expect(resExhaustType.status).toBe('BLOCKED');
      expect(resExhaustType.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
    });

    it('enforces PRESCRIPTIVE path for verified Table 6-2 rates and blocks unsupported paths', () => {
      const art = exhaustRates2022.find(e => e.id === 'art_classroom')!;

      // Prescriptive path explicitly verified
      const resPresc = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 50,
        designExhaust: 200,
        compliancePath: 'PRESCRIPTIVE'
      });
      expect(resPresc.compliancePath).toBe('PRESCRIPTIVE');
      expect(resPresc.rateStatus).toBe('PRESCRIPTIVE');
      expect(resPresc.pathStatus).toBe('SUPPORTED');
      expect(resPresc.status).toBe('PASS');

      // Unsupported custom path must be rejected and enforce PRESCRIPTIVE
      const resInvalid = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 50,
        designExhaust: 200,
        compliancePath: 'ALTERNATIVE_UNSUPPORTED_PATH'
      });
      expect(resInvalid.status).toBe('BLOCKED');
      expect(resInvalid.pathStatus).toBe('BLOCKED');
      expect(resInvalid.complianceNotes[0]).toContain('strictly enforce the \'PRESCRIPTIVE\' path');

      // Helper enforcePrescriptivePath returns null on prescriptive and unimplemented result on performance
      expect(Ashrae621ExhaustService.enforcePrescriptivePath({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 50,
        designExhaust: 200
      })).toBeNull();

      const intercepted = Ashrae621ExhaustService.enforcePrescriptivePath({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: art,
        qty: 50,
        designExhaust: 200,
        referenceSection: '6.5.2'
      });
      expect(intercepted).not.toBeNull();
      expect(intercepted?.pathStatus).toBe('PERFORMANCE_PATH_UNIMPLEMENTED');
    });
  });

  describe('6. Unknown Exhaust Source → Blocked', () => {
    it('blocks unknown exhaust sources not recognized in Table 6-2 or Table 6-3', () => {
      const unknownSource: any = {
        id: 'unknown_chemical_synthesizer',
        name: 'Custom Chemical Synthesizer Hood',
        category: 'Experimental Laboratory',
        rate: 15.0,
        unitType: 'm2',
        operatingCondition: 'Continuous',
        airClass: 4,
        exhaustClass: 4,
        standard: 'ASHRAE 62.1',
        edition: '2022',
        reference: 'Section 6.5.1, Table 6-2',
        verificationStatus: 'NOT_VERIFIED'
      };

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: unknownSource,
        qty: 10,
        designExhaust: 500
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.pathStatus).toBe('BLOCKED');
      expect(result.requiredExhaust).toBeNull();
      expect(result.complianceNotes[0]).toContain('blocked');
    });
  });

  describe('7. Unverified Exhaust Data → Blocked', () => {
    it('blocks exhaust data with verificationStatus = NOT_VERIFIED', () => {
      const tamperedRecord: Ashrae621ExhaustType = {
        ...exhaustRates2022[0],
        verificationStatus: 'NOT_VERIFIED' as any
      };

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: tamperedRecord,
        qty: 50,
        designExhaust: 500
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.pathStatus).toBe('BLOCKED');
      expect(result.requiredExhaust).toBeNull();
      expect(result.requiredExhaustMetric).toBeNull();
      expect(result.complianceNotes[0]).toContain('blocked');
    });

    it('blocks exhaust data with missing or invalid verificationDate / provenance', () => {
      const invalidDateRecord: Ashrae621ExhaustType = {
        ...exhaustRates2022[0],
        verificationDate: undefined
      };

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: invalidDateRecord,
        qty: 50,
        designExhaust: 500
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.requiredExhaust).toBeNull();
      expect(result.complianceNotes[0]).toContain('blocked');
    });

    it('blocks exhaust data with non-ASHRAE unverified sourceType', () => {
      const unverifiedSourceRecord: Ashrae621ExhaustType = {
        ...exhaustRates2022[0],
        sourceType: 'UNKNOWN' as any
      };

      const result = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: unverifiedSourceRecord,
        qty: 50,
        designExhaust: 500
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.requiredExhaust).toBeNull();
    });
  });
});
