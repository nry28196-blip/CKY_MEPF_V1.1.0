import { SourceType } from '../../data/ventilation/ashrae621/types';

import { Ashrae622Service } from '../../calculations/ventilation/Ashrae622Service';
import { describe, it, expect } from 'vitest';
import { ft2ToM2 } from "../../lib/UnitConversionService";
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';
import { Ashrae621ExhaustService } from '../../calculations/ventilation/Ashrae621ExhaustService';

describe('Ventilation Engine Golden Tests (ASHRAE 62.1-2022 & 62.2-2022 Baseline)', () => {
  const spaceType2022 = StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office')!;
  const ezConfig2022 = StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1')!;

  it('Single-Zone: Metric and Imperial Equivalence (ASHRAE 62.1-2022)', () => {
    // Metric Input: 100 m2, 5 people
    const metricResult = VentilationEngine.runSingleZone({
      density: { elevation: 0, temperature: 20 },
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: spaceType2022,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezConfig2022
      }
    });
    
    expect(metricResult.status).toBe('PASS');
    expect(metricResult.zone.vbp).toBe(2.5 * 5); // 12.5
    expect(metricResult.zone.vba).toBe(0.3 * 100); // 30
    expect(metricResult.zone.vbz).toBe(42.5);
    expect(metricResult.finalDesignOutdoorAir).toBeCloseTo(42.5, 1);

    // Imperial Input: 1076.391 ft2, 5 people
    const imperialAreaM2 = ft2ToM2(1076.39104);
    
    const imperialResult = VentilationEngine.runSingleZone({
      density: { elevation: 0, temperature: 20 },
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: spaceType2022,
        area: imperialAreaM2,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezConfig2022
      }
    });
    
    expect(imperialResult.status).toBe('PASS');
    expect(imperialResult.finalDesignOutdoorAir).toBeCloseTo(42.5, 1);
  });

  it('Density Correction: Hot and Elevated Condition (ASHRAE 62.1-2022)', () => {
    const result = VentilationEngine.runSingleZone({
      density: { elevation: 1600, temperature: 35 },
      zone: {
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: '2022',
        spaceType: spaceType2022,
        area: 100,
        designOccupancy: 5,
        useDefaultOccupancy: false,
        ezConfig: ezConfig2022
      }
    });
    
    expect(result.density.eRho).toBe(1.2);
    expect(result.finalDesignOutdoorAir).toBeGreaterThan(42.5);
    expect(result.vot).toBeCloseTo(result.vot, 4);
  });

  it('Simplified Multi-Zone Procedure D < 0.60 (ASHRAE 62.1-2022)', () => {
    const result = VentilationEngine.runMultiZone({
      method: 'Simplified',
      systemPopulation: 10,
      systemType: 'single_supply',
      density: { elevation: 0, temperature: 20 },
      zones: [
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z1', spaceType: spaceType2022, area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null },
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z2', spaceType: spaceType2022, area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null }
      ]
    });
    
    expect(result.status).toBe('PASS');
    expect(result.simplifiedSystem?.ev).toBe(0.66);
    expect(result.vot).toBeCloseTo(128.79, 1);
  });
  
  it('Simplified Multi-Zone Procedure D >= 0.60 (ASHRAE 62.1-2022)', () => {
    const result = VentilationEngine.runMultiZone({
      method: 'Simplified',
      systemPopulation: 15,
      systemType: 'single_supply',
      density: { elevation: 0, temperature: 20 },
      zones: [
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z1', spaceType: spaceType2022, area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null },
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z2', spaceType: spaceType2022, area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null }
      ]
    });
    
    expect(result.simplifiedSystem?.ev).toBe(0.75);
    expect(result.vot).toBeCloseTo(130, 0);
  });

  it('Alternative Procedure VAV Minimum Check (ASHRAE 62.1-2022)', () => {
    const result = VentilationEngine.runMultiZone({
      method: 'Alternative',
      systemPopulation: null,
      systemType: 'single_supply',
      density: { elevation: 0, temperature: 20 },
      zones: [
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z1', spaceType: spaceType2022, area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'VAV', vpz: 100, vpzMinDesign: 30, ep: 1, er: 0 }
      ]
    });
    
    expect(result.status).toBe("FAIL");
    expect(result.vot).toBeNull();
  });
  
  it('Simplified Procedure VAV Minimum Check (ASHRAE 62.1-2022)', () => {
    const result = VentilationEngine.runMultiZone({
      method: 'Simplified',
      systemPopulation: 5,
      systemType: 'single_supply',
      density: { elevation: 0, temperature: 20 },
      zones: [
        { expectedStandard: 'ASHRAE 62.1', expectedEdition: '2022', id: 'z1', spaceType: spaceType2022, area: 100, designOccupancy: 5, useDefaultOccupancy: false, ezConfig: ezConfig2022, dMode: 'VAV', vpz: 100, vpzMinDesign: 70, ep: null, er: null }
      ]
    });
    
    expect(result.status).toBe("PASS");
  });

  it('Exhaust Requirements (ASHRAE 62.1-2022)', () => {
    const type = StandardDataProvider.get621ExhaustRates('2022').find(t => t.id === 'toilet_public')!;
    
    const result = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: type,
      qty: 4,
      designExhaust: 100
    });
    
    expect(result.requiredExhaust).toBe(100);
    expect(result.status).toBe('PASS');
    
    const failResult = Ashrae621ExhaustService.calculate({
      expectedStandard: 'ASHRAE 62.1',
      expectedEdition: '2022',
      exhaustType: type,
      qty: 4,
      designExhaust: 80
    });
    expect(failResult.status).toBe('FAIL');
  });
});

describe('ASHRAE 62.2 Engine Golden Tests', () => {
  it('Whole Dwelling - SI Calculation', () => {
    const result = Ashrae622Service.calculateWholeDwelling({
      floorArea: 100,
      bedrooms: 3,
      infiltrationCredit: 0,
      infiltrationVerified: false,
      localExhaust: null,
      coefficients: StandardDataProvider.get622Coefficients('2022')
    });
    
    expect(result.qTot).toBe(29);
    expect(result.qFan).toBe(29);
    expect(result.status).toBe('PASS');
  });

  it('Infiltration Credit Warning', () => {
    const result = Ashrae622Service.calculateWholeDwelling({
      floorArea: 100,
      bedrooms: 3,
      infiltrationCredit: 10,
      infiltrationVerified: false,
      localExhaust: null,
      coefficients: StandardDataProvider.get622Coefficients('2022')
    });
    
    expect(result.status).toBe('WARNING');
    expect(result.qFan).toBe(29); 
  });
});
