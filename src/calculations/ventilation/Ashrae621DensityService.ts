import { DensityCorrectionService, DensityInput, DensityResult } from '../../lib/DensityCorrectionService';

export type { DensityInput, DensityResult };

export class Ashrae621DensityService {
  static calculateDensityCorrection(input: DensityInput | null): DensityResult {
    return DensityCorrectionService.calculate(input);
  }
}
