import { describe, it, expect } from 'vitest';
import { VentilationEngine } from '../../lib/VentilationEngine';
import { StandardDataProvider } from '../../data/ventilation/StandardDataProvider';


const makeVerified = (item: any) => {
    if (!item) return item;
    const ref = item.reference || 'ASHRAE 62.1 Section 6.2.2.1';
    const fakeProvenanceItem = {
        value: 1,
        standard: 'ASHRAE 62.1',
        edition: '2025',
        reference: ref,
        sourceType: 'ASHRAE_PUBLISHED',
        verificationStatus: 'VERIFIED',
        verificationDate: '2025-01-01',
        revision: '2025'
    };

    return {
      ...item,
      sourceType: 'ASHRAE_PUBLISHED',
      verificationStatus: 'VERIFIED',
        verificationDate: '2025-01-01',
      reference: ref,
      revisionState: {
        ...item.revisionState,
        standard: 'ASHRAE 62.1',
        edition: '2025',
        baseEdition: '2025',
        source: 'ASHRAE_PUBLISHED'
      },
      provenance: item.category ? {
          rp: { ...fakeProvenanceItem, value: item.rpMetric },
          ra: { ...fakeProvenanceItem, value: item.raMetric },
          defaultOccupancy: { ...fakeProvenanceItem, value: item.defaultOccupancyMetric },
          reference: { ...fakeProvenanceItem, value: ref }
      } : {
          ez: { ...fakeProvenanceItem, value: item.ez },
          applicability: { ...fakeProvenanceItem, value: item.applicableCondition },
          reference: { ...fakeProvenanceItem, value: ref }
      }
    };
};

describe('ASHRAE 62.1-2025 & 2019 Production Isolation Tests', () => {

  const getSpaceType = (id: string) => makeVerified(StandardDataProvider.get621SpaceTypes('2025').find(s => s.id === id)!);
  const getEzConfig = (id: string) => makeVerified(StandardDataProvider.get621EzValues('2025').find(e => e.id === id)!);

  describe('1. Production Engine 2025 Isolation Safeguards', () => {
    it('Blocks 2025 Single Zone calculation even when artificial VERIFIED metadata is supplied', () => {
      const result = VentilationEngine.runSingleZone({
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2025',
          spaceType: getSpaceType('office'),
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: getEzConfig('ez-1')
        }
      });
      
      expect(result.status).toBe('BLOCKED');
      expect(result.vot).toBeNull();
      expect(result.finalDesignOutdoorAir).toBeNull();
      expect(result.zone.status).toBe('BLOCKED');
    });

    it('Blocks 2025 MultiZone Simplified calculation even when artificial VERIFIED metadata is supplied', () => {
      const result = VentilationEngine.runMultiZone({
        method: 'Simplified',
        edition: '2025',
        systemPopulation: 10,
        systemType: 'single_supply',
        density: { elevation: 0, temperature: 20 },
        zones: [
          { id: 'z1', expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2025',
            spaceType: getSpaceType('office'), area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1'), dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null },
          { id: 'z2', expectedStandard: 'ASHRAE 62.1',
            expectedEdition: '2025',
            spaceType: getSpaceType('office'), area: 100, designOccupancy: 10, useDefaultOccupancy: false, ezConfig: getEzConfig('ez-1'), dMode: 'CV', vpz: null, vpzMinDesign: null, ep: null, er: null }
        ]
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.vou).toBeNull();
      expect(result.ev).toBeNull();
      expect(result.vot).toBeNull();
      expect(result.finalDesignOutdoorAir).toBeNull();
    });

    it('Blocks 2019 archived calculation at VentilationEngine entry point', () => {
      const result = VentilationEngine.runSingleZone({
        edition: '2019',
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2019',
          spaceType: StandardDataProvider.get621SpaceTypes('2019').find(s => s.id === 'office') || null,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: StandardDataProvider.get621EzValues('2019').find(e => e.id === 'ez-1') || null
        }
      });
      
      expect(result.status).toBe('BLOCKED');
      expect(result.vot).toBeNull();
      expect(result.finalDesignOutdoorAir).toBeNull();
    });

    it('Blocks ASHRAE 62.2 standard at VentilationEngine entry point (out of scope)', () => {
      const result = VentilationEngine.runSingleZone({
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.2' as any,
          expectedEdition: '2022',
          spaceType: StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office') || null,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1') || null
        }
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.vot).toBeNull();
    });

    it('Blocks invalid edition at VentilationEngine entry point', () => {
      const result = VentilationEngine.runSingleZone({
        edition: '2016' as any,
        density: { elevation: 0, temperature: 20 },
        zone: {
          expectedStandard: 'ASHRAE 62.1',
          expectedEdition: '2022',
          spaceType: StandardDataProvider.get621SpaceTypes('2022').find(s => s.id === 'office') || null,
          area: 100,
          designOccupancy: 5,
          useDefaultOccupancy: false,
          ezConfig: StandardDataProvider.get621EzValues('2022').find(e => e.id === 'ez-1') || null
        }
      });
      expect(result.status).toBe('BLOCKED');
      expect(result.vot).toBeNull();
    });
  });
});
