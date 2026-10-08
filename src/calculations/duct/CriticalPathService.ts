import { DuctFrictionService, DuctFrictionInput } from './DuctFrictionService';

export interface DuctSection {
  id: string;
  name: string;
  airflow: number;
  width?: number;
  height?: number;
  diameter?: number;
  length: number;
  fittingLossCoeff: number; // Sum of C for all fittings in this section
  equipmentLoss: number; // Fixed pressure drop for dampers, coils, etc.
}

export interface PathInput {
  id: string;
  name: string;
  sections: DuctSection[];
}

export interface PathResult {
  pathId: string;
  name: string;
  totalStraightLoss: number;
  totalFittingLoss: number;
  totalEquipLoss: number;
  totalPressure: number;
  sections: any[];
}

export class CriticalPathService {
  static calculatePaths(paths: PathInput[], roughness: number, density: number, isMetric: boolean) {
    const results: PathResult[] = [];
    
    let criticalPathId = '';
    let maxPressure = 0;

    for (const path of paths) {
      let pathStraightLoss = 0;
      let pathFittingLoss = 0;
      let pathEquipLoss = 0;
      let pathTotal = 0;
      
      const sectionResults = [];

      for (const sec of path.sections) {
        // Straight duct
        const frictionInput: DuctFrictionInput = {
          airflow: sec.airflow,
          width: sec.width,
          height: sec.height,
          diameter: sec.diameter,
          length: sec.length,
          roughness,
          density,
          isMetric
        };
        
        const frictionRes = DuctFrictionService.calculateFriction(frictionInput);
        
        // Fitting loss: delta P = C * Pv
        const fittingLoss = sec.fittingLossCoeff * frictionRes.velocityPressure;
        
        // Total section
        const secTotal = frictionRes.pressureDrop + fittingLoss + sec.equipmentLoss;
        
        pathStraightLoss += frictionRes.pressureDrop;
        pathFittingLoss += fittingLoss;
        pathEquipLoss += sec.equipmentLoss;
        pathTotal += secTotal;
        
        sectionResults.push({
          sectionId: sec.id,
          name: sec.name,
          friction: frictionRes,
          fittingLoss,
          equipmentLoss: sec.equipmentLoss,
          total: secTotal
        });
      }
      
      if (pathTotal > maxPressure) {
        maxPressure = pathTotal;
        criticalPathId = path.id;
      }
      
      results.push({
        pathId: path.id,
        name: path.name,
        totalStraightLoss: pathStraightLoss,
        totalFittingLoss: pathFittingLoss,
        totalEquipLoss: pathEquipLoss,
        totalPressure: pathTotal,
        sections: sectionResults
      });
    }

    return {
      paths: results,
      criticalPathId,
      maxPressure
    };
  }
}
