import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportExhaustToCsv,
  exportStaticPressureToCsv,
  exportKitchenVentilationToCsv,
  exportAirBalanceToCsv,
  exportDuctSizingToCsv,
  exportCoolingLoadToCsv,
  exportDuctFittingsToCsv,
  exportSystemPerformanceToCsv
} from '../../lib/exportCsv';

describe('Mechanical Calculations CSV Export Functionality Suite', () => {
  // Mock document and URL.createObjectURL
  let mockClicked = false;
  let mockDownloadFilename = '';

  beforeEach(() => {
    mockClicked = false;
    mockDownloadFilename = '';

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    });

    const mockElement = {
      setAttribute: (name: string, val: string) => {
        if (name === 'download') mockDownloadFilename = val;
      },
      click: () => {
        mockClicked = true;
      }
    };

    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockElement),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports exhaust calculation data to CSV correctly', () => {
    exportExhaustToCsv({
      isMetric: true,
      complianceProcedure: 'prescriptive',
      overallStatus: 'PASS',
      rows: [
        {
          name: 'Restroom 1',
          categoryName: 'Public Restrooms',
          quantity: 2,
          unitType: 'wc',
          requiredExhaust: 50,
          designExhaust: 60,
          status: 'PASS',
          airClass: 2,
          operationMode: 'continuous'
        }
      ]
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('commercial_exhaust_calculation');
  });

  it('exports static pressure calculation data to CSV correctly', () => {
    exportStaticPressureToCsv({
      isMetric: false,
      density: 0.075,
      roughness: 0.0003,
      safetyFactor: 10,
      criticalPathId: 'path-1',
      criticalPathName: 'Main Index Run',
      maxPressure: 1.45,
      designPressure: 1.60,
      maxPathAirflow: 2500,
      paths: [
        {
          name: 'Main Index Run',
          isCritical: true,
          sections: [
            {
              name: 'Trunk Section A',
              airflow: 2500,
              shape: 'rect',
              dimensions: '24x16in',
              length: 40,
              fittingLossCoeff: 1.2,
              equipmentLoss: 0.5,
              frictionLoss: 0.4,
              totalLoss: 1.1
            }
          ]
        }
      ]
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('fan_static_pressure_calculation');
  });

  it('exports kitchen ventilation data to CSV correctly', () => {
    exportKitchenVentilationToCsv({
      isMetric: true,
      standard: 'unlisted',
      hoodType: 'wall',
      duty: 'medium',
      hoodLength: 3.0,
      hoodDepth: 1.2,
      exhaustAirflow: 900,
      muaTotalFlow: 720,
      totalMuaRatio: 80,
      ductArea: 450,
      ductVelocity: 2.5,
      status: 'PASS'
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('commercial_kitchen_ventilation');
  });

  it('exports air balance data to CSV correctly', () => {
    exportAirBalanceToCsv({
      isMetric: true,
      mode: 'system',
      supplyAir: 10000,
      exhaustAir: 2000,
      returnAir: 7500,
      outdoorAir: 2500,
      netAirflow: 500,
      pressureRelationship: 'Positive',
      airChangesPerHour: 4.5
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('air_balance_calculation');
  });

  it('exports cooling load calculation to CSV correctly', () => {
    exportCoolingLoadToCsv({
      basis: 'area',
      area: 250,
      volume: 750,
      occupants: 15,
      tons: 7.5,
      btu: 90000,
      watts: 26377
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('cooling_load_calculation');
  });

  it('exports duct sizing calculation to CSV correctly', () => {
    exportDuctSizingToCsv({
      airflow: 2000,
      frictionRate: 0.1,
      velocityLimit: 1200,
      ductHeight: 14,
      widthMain: 22,
      deMain: 18.5,
      velRoundMain: 1050,
      velRectMain: 940,
      branches: []
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('duct_sizing_calculation');
  });

  it('exports comprehensive cooling load calculation with detailed inputs and outputs to CSV correctly', () => {
    exportCoolingLoadToCsv({
      basis: 'area',
      projectType: 'Commercial',
      area: 250,
      volume: 750,
      occupants: 15,
      outdoorTemp: 35,
      indoorTemp: 24,
      ceilingHeight: 3.0,
      sensiblePerPerson: 75,
      latentPerPerson: 55,
      lightingWpm2: 12,
      equipmentWatts: 500,
      wallArea: 80,
      wallUValue: 1.8,
      roofArea: 250,
      roofUValue: 0.4,
      windowArea: 40,
      windowUValue: 2.8,
      windowShgc: 0.5,
      ventilationLps: 150,
      infiltrationACH: 0.3,
      safetyFactor: 10,
      tons: 8.2,
      btu: 98400,
      watts: 28839,
      sensibleWatts: 21500,
      latentWatts: 4700,
      safetyWatts: 2639,
      status: 'READY'
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('cooling_load_calculation');
  });

  it('exports duct fittings loss analysis to CSV correctly', () => {
    exportDuctFittingsToCsv({
      isMetric: true,
      velocity: 6.5,
      airDensity: 1.204,
      velocityPressure: 25.43,
      selectedCategory: 'elbows',
      fittings: [
        {
          id: 'CR3-1',
          name: 'Smooth Radius Rectangular Elbow (r/W = 1.5)',
          category: 'elbows',
          description: 'Die stamped or continuous radius',
          lossCoefficient: 0.14,
          deltaP: 3.56
        }
      ]
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('duct_fittings_loss_analysis');
  });

  it('exports fan system aerodynamic performance duty point to CSV correctly', () => {
    exportSystemPerformanceToCsv({
      isMetric: true,
      qOutdoorAir: 500,
      qReturnAir: 1500,
      densityRatio: 0.985,
      criticalDuctLength: 45,
      ductFrictionRate: 1.0,
      fittingLosses: 120,
      equipmentPressureDrop: 220,
      fanEfficiency: 68,
      motorEfficiency: 88,
      qSupplyStandard: 2000,
      qSupplyActual: 2030,
      totalStaticPressure: 385.0,
      fanBrakeHorsepower: 1.52,
      motorElectricalPower: 1.29,
      status: 'DIAGNOSTIC_ESTIMATE'
    });

    expect(mockClicked).toBe(true);
    expect(mockDownloadFilename).toContain('fan_system_aerodynamic_performance');
  });
});
