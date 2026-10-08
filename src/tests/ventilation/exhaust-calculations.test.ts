import { describe, it, expect } from 'vitest';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';

describe('ASHRAE 62.1-2022 Prescriptive Exhaust Calculations (Table 6-2 & Section 6.5.1)', () => {
  const exhaustRates2022 = StandardDataProvider.get621ExhaustRates('2022');

  it('A. Art Classrooms (Area-based m² continuous rate)', () => {
    const artClassroom = exhaustRates2022.find(e => e.id === 'art_classroom')!;
    expect(artClassroom).toBeDefined();
    expect(artClassroom.rate).toBe(3.5);
    expect(artClassroom.unitType).toBe('m2');
    expect(artClassroom.airClass).toBe(2);

    const result = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: 100, // 100 m²
      designExhaust: 350 // 350 L/s
    });

    expect(result.status).toBe('PASS');
    expect(result.requiredExhaust).toBeCloseTo(350, 1);
    expect(result.airClass).toBe(2);
    expect(result.exhaustClass).toBe(2);
    expect(result.referenceTable).toBe('Table 6-2');
    expect(result.referenceSection).toBe('6.5.1');
  });

  it('B. Public Toilets - Continuous vs Intermittent Rates', () => {
    const publicToilet = exhaustRates2022.find(e => e.id === 'toilet_public')!;
    expect(publicToilet).toBeDefined();
    expect(publicToilet.continuousRate).toBe(25);
    expect(publicToilet.intermittentRate).toBe(35);
    expect(publicToilet.unitType).toBe('fixture');

    // Continuous mode (default)
    const continuousResult = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: publicToilet,
      qty: 4, // 4 fixtures
      designExhaust: 100,
      operationMode: 'continuous'
    });
    expect(continuousResult.status).toBe('PASS');
    expect(continuousResult.requiredExhaust).toBe(100); // 25 L/s * 4
    expect(continuousResult.operationMode).toBe('continuous');

    // Intermittent mode
    const intermittentResult = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: publicToilet,
      qty: 4, // 4 fixtures
      designExhaust: 140,
      operationMode: 'intermittent'
    });
    expect(intermittentResult.status).toBe('PASS');
    expect(intermittentResult.requiredExhaust).toBe(140); // 35 L/s * 4
    expect(intermittentResult.operationMode).toBe('intermittent');

    // Intermittent mode with insufficient design exhaust fails
    const failIntermittent = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: publicToilet,
      qty: 4,
      designExhaust: 120, // < 140
      operationMode: 'intermittent'
    });
    expect(failIntermittent.status).toBe('FAIL');
  });

  it('C. Rejection of Intermittent Mode when Not Permitted by Table 6-2', () => {
    const artClassroom = exhaustRates2022.find(e => e.id === 'art_classroom')!;
    expect(artClassroom.intermittentRate).toBeNull();

    const result = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: 100,
      designExhaust: 500,
      operationMode: 'intermittent'
    });

    expect(result.status).toBe('FAIL');
    expect(result.complianceNotes.some(n => n.includes('Intermittent exhaust is not permitted'))).toBe(true);
  });

  it('D. Private Toilets (Room-based continuous & intermittent)', () => {
    const privateToilet = exhaustRates2022.find(e => e.id === 'toilet_private')!;
    expect(privateToilet).toBeDefined();
    expect(privateToilet.continuousRate).toBe(12.5);
    expect(privateToilet.intermittentRate).toBe(25);
    expect(privateToilet.unitType).toBe('room');

    // Continuous: 12.5 * 2 = 25 L/s
    const contRes = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: privateToilet,
      qty: 2,
      designExhaust: 25,
      operationMode: 'continuous'
    });
    expect(contRes.status).toBe('PASS');
    expect(contRes.requiredExhaust).toBe(25);

    // Intermittent: 25 * 2 = 50 L/s
    const intRes = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: privateToilet,
      qty: 2,
      designExhaust: 50,
      operationMode: 'intermittent'
    });
    expect(intRes.status).toBe('PASS');
    expect(intRes.requiredExhaust).toBe(50);
  });

  it('E. Shower Rooms (Showerhead-based continuous & intermittent)', () => {
    const showerRooms = exhaustRates2022.find(e => e.id === 'shower_rooms')!;
    expect(showerRooms).toBeDefined();
    expect(showerRooms.continuousRate).toBe(10);
    expect(showerRooms.intermittentRate).toBe(25);
    expect(showerRooms.unitType).toBe('showerhead');

    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: showerRooms,
      qty: 6, // 6 showerheads
      designExhaust: 60, // 10 * 6 = 60 L/s
      operationMode: 'continuous'
    });
    expect(res.status).toBe('PASS');
    expect(res.requiredExhaust).toBe(60);
  });

  it('F. Commercial Kitchen - Correct Prescriptive Rate & Air Class 2', () => {
    const kitchen = exhaustRates2022.find(e => e.id === 'kitchen_commercial')!;
    expect(kitchen).toBeDefined();
    expect(kitchen.rate).toBe(3.5);
    expect(kitchen.rateIp).toBe(0.70);
    expect(kitchen.airClass).toBe(2);
    expect(kitchen.exhaustClass).toBe(2); // MUST NOT be Class 3
    expect(kitchen.unitType).toBe('m2');

    const res = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: kitchen,
      qty: 50,
      designExhaust: 175 // 3.5 * 50 = 175 L/s
    });
    expect(res.status).toBe('PASS');
    expect(res.requiredExhaust).toBe(175);
    expect(res.airClass).toBe(2);
    expect(res.recirculationClassification).toContain('Air Class 2');
  });

  it('G. Special Standard Spaces (Paint Spray Booths & Refrigerating Machinery) MUST RETURN BLOCKED', () => {
    const paintBooth = exhaustRates2022.find(e => e.id === 'paint_spray_booths')!;
    expect(paintBooth.isSpecialStandard).toBe(true);
    expect(paintBooth.specialStandardReference).toBe('OSHA 1910.107 / NFPA 33');
    expect(paintBooth.airClass).toBe(4);

    // TEST 1: Design exhaust = 1000 L/s MUST RETURN BLOCKED, NOT PASS
    const resPaint = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: paintBooth,
      qty: 1,
      designExhaust: 1000
    });
    expect(resPaint.status).toBe('BLOCKED');
    expect(resPaint.status).not.toBe('PASS');
    expect(resPaint.isSpecialStandard).toBe(true);
    expect(resPaint.specialStandardReference).toBe('OSHA 1910.107 / NFPA 33');
    expect(resPaint.recirculationClassification).toContain('Air Class 4');
    expect(resPaint.complianceNotes.some(n => n.includes('Numeric prescriptive exhaust rate is not defined'))).toBe(true);

    // TEST 2: Refrigerating machinery room, design exhaust = 800 L/s MUST RETURN BLOCKED, NOT PASS
    const refMachinery = exhaustRates2022.find(e => e.id === 'refrigerating_machinery')!;
    expect(refMachinery.isSpecialStandard).toBe(true);
    expect(refMachinery.specialStandardReference).toBe('ANSI/ASHRAE Standard 15');
    expect(refMachinery.airClass).toBe(3);

    const resRef = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: refMachinery,
      qty: 1,
      designExhaust: 800
    });
    expect(resRef.status).toBe('BLOCKED');
    expect(resRef.status).not.toBe('PASS');
    expect(resRef.specialStandardReference).toBe('ANSI/ASHRAE Standard 15');
    expect(resRef.recirculationClassification).toContain('Air Class 3');

    // TEST 3: Paint spray booth with zero design exhaust MUST NEVER return PASS
    const resPaintZero = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: paintBooth,
      qty: 1,
      designExhaust: 0
    });
    expect(resPaintZero.status).toBe('BLOCKED');
    expect(resPaintZero.status).not.toBe('PASS');

    // TEST 4: Unverified special-standard source MUST RETURN BLOCKED
    const unverifiedPaint = {
      ...paintBooth,
      verificationStatus: 'NOT_VERIFIED' as const
    };
    const resUnverified = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: unverifiedPaint,
      qty: 1,
      designExhaust: 1000
    });
    expect(resUnverified.status).toBe('BLOCKED');
  });

  it('H. IP Unit System Calculations', () => {
    const publicToilet = exhaustRates2022.find(e => e.id === 'toilet_public')!;
    const resIp = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: publicToilet,
      qty: 4, // 4 fixtures
      designExhaust: 200, // 200 cfm
      unitSystem: 'ip',
      operationMode: 'continuous'
    });

    expect(resIp.status).toBe('PASS');
    expect(resIp.requiredExhaust).toBe(200); // 50 cfm/fixture * 4 = 200 cfm
    expect(resIp.requiredExhaustIp).toBe(200);
    expect(resIp.requiredExhaustMetric).toBe(100); // 25 L/s * 4 = 100 L/s
  });

  it('I. Input Semantics and Error Handling', () => {
    // Null exhaust type
    const nullType = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: null,
      qty: 10,
      designExhaust: 100
    });
    expect(nullType.status).toBe('NOT_EVALUATED');
    expect(nullType.requiredExhaust).toBeNull();

    // Invalid negative quantity
    const artClassroom = exhaustRates2022.find(e => e.id === 'art_classroom')!;
    const negQty = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: -5,
      designExhaust: 100
    });
    expect(negQty.status).toBe('FAIL');

    // Missing quantity
    const missingQty = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: null,
      designExhaust: 100
    });
    expect(missingQty.status).toBe('INCOMPLETE');

    // Missing design exhaust
    const missingDesign = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: 100,
      designExhaust: null
    });
    expect(missingDesign.status).toBe('INCOMPLETE');

    // Design exhaust less than required
    const insufficientExhaust = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: artClassroom,
      qty: 100, // required: 350 L/s
      designExhaust: 300 // < 350
    });
    expect(insufficientExhaust.status).toBe('FAIL');
  });

  it('J. Parking Garage Exception 1 (Natural Ventilation >=50% open on 2+ sides)', () => {
    const garage = exhaustRates2022.find(e => e.id === 'parking_garage')!;
    
    // Case 1: Standard enclosed parking garage (parkingGarageOpenSides50PercentOrMore = false or undefined)
    const enclosedRes = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: garage,
      qty: 1000, // 1000 m²
      designExhaust: 3700, // 3.7 * 1000 = 3700 L/s
      parkingGarageOpenSides50PercentOrMore: false
    });
    expect(enclosedRes.status).toBe('PASS');
    expect(enclosedRes.requiredExhaust).toBe(3700);
    expect(enclosedRes.complianceNotes.some(n => n.includes('Enclosed parking garage prescriptive exhaust rate applied'))).toBe(true);

    // Case 2: Naturally ventilated parking garage (parkingGarageOpenSides50PercentOrMore = true)
    const openRes = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: garage,
      qty: 1000,
      designExhaust: 0, // Exempt from mechanical exhaust
      parkingGarageOpenSides50PercentOrMore: true
    });
    expect(openRes.status).toBe('PASS');
    expect(openRes.requiredExhaust).toBe(0);
    expect(openRes.rateApplied).toBe(0);
    expect(openRes.parkingGarageOpenSides50PercentOrMore).toBe(true);
    expect(openRes.complianceNotes.some(n => n.includes('Naturally ventilated parking garage exception applied'))).toBe(true);
  });

  it('K. Auto Repair & Commercial Kitchen Dedicated Source Capture / Hood Notes', () => {
    // Auto Repair direct engine connection note
    const autoRepair = exhaustRates2022.find(e => e.id === 'auto_repair')!;
    const resAuto = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: autoRepair,
      qty: 100,
      designExhaust: 750
    });
    expect(resAuto.status).toBe('PASS');
    expect(resAuto.complianceNotes.some(n => n.includes('Direct engine exhaust connection requirement'))).toBe(true);

    // Commercial Kitchen dedicated hood note
    const kitchen = exhaustRates2022.find(e => e.id === 'kitchen_commercial')!;
    const resKitchen = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: kitchen,
      qty: 100,
      designExhaust: 350
    });
    expect(resKitchen.status).toBe('PASS');
    expect(resKitchen.complianceNotes.some(n => n.includes('Commercial cooking exhaust safety'))).toBe(true);
  });

  describe('Finding 1 Regression: Area-based Exhaust Cross-Unit Calculations', () => {
    const kitchen = exhaustRates2022.find(e => e.id === 'kitchen_commercial')!;
    const autoRepair = exhaustRates2022.find(e => e.id === 'auto_repair')!;

    it('Case A — Metric input: 100 m² commercial kitchen (rateMetric=3.5 L/s·m², rateIp=0.70 cfm/ft²)', () => {
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: kitchen,
        qty: 100, // 100 m²
        designExhaust: 350,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(350); // 3.5 * 100 L/s
      expect(res.requiredExhaustMetric).toBe(350); // L/s
      // Converted area in ft²: 100 / 0.09290304 ≈ 1076.391 ft²
      // requiredExhaustIp: 0.70 * 1076.391 ≈ 753.47 cfm
      expect(res.requiredExhaustIp).toBeCloseTo(753.47, 1);
      expect(res.rateApplied).toBe(3.5);
      expect(res.rateAppliedMetric).toBe(3.5);
      expect(res.rateAppliedIp).toBe(0.70);
    });

    it('Case B — IP input: 1000 ft² commercial kitchen (rateMetric=3.5 L/s·m², rateIp=0.70 cfm/ft²)', () => {
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: kitchen,
        qty: 1000, // 1000 ft²
        designExhaust: 700,
        unitSystem: 'ip'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(700); // 0.70 * 1000 cfm
      expect(res.requiredExhaustIp).toBe(700); // cfm
      // Converted area in m²: 1000 * 0.09290304 = 92.90304 m²
      // requiredExhaustMetric: 3.5 * 92.90304 = 325.16 L/s
      expect(res.requiredExhaustMetric).toBeCloseTo(325.16, 1);
      expect(res.rateApplied).toBe(0.70);
      expect(res.rateAppliedMetric).toBe(3.5);
      expect(res.rateAppliedIp).toBe(0.70);
    });

    it('Case C — Auto Repair Metric input: 200 m² (rateMetric=7.5 L/s·m², rateIp=1.50 cfm/ft²)', () => {
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: autoRepair,
        qty: 200, // 200 m²
        designExhaust: 1500,
        unitSystem: 'metric'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(1500); // 7.5 * 200 L/s
      expect(res.requiredExhaustMetric).toBe(1500);
      // Converted area in ft²: 200 / 0.09290304 ≈ 2152.782 ft²
      // requiredExhaustIp: 1.50 * 2152.782 ≈ 3229.17 cfm
      expect(res.requiredExhaustIp).toBeCloseTo(3229.17, 1);
    });

    it('Case D — Non-area fixture-based space preserves identical quantity across cross-unit representation', () => {
      const toilet = exhaustRates2022.find(e => e.id === 'toilet_public')!;
      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        exhaustType: toilet,
        qty: 4, // 4 fixtures
        designExhaust: 100,
        unitSystem: 'metric',
        operationMode: 'continuous'
      });

      expect(res.status).toBe('PASS');
      expect(res.requiredExhaust).toBe(100); // 25 L/s * 4
      expect(res.requiredExhaustMetric).toBe(100);
      expect(res.requiredExhaustIp).toBe(200); // 50 cfm * 4
    });
  });
});
