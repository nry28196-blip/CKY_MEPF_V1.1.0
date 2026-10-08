export interface Ashrae622Coefficients {
  standard?: string;
  edition?: string;
  areaCoefficientSI: number;
  occupancyCoefficientSI: number;
  areaCoefficientIP: number;
  occupancyCoefficientIP: number;
  localExhaustDeficitCoefficient: number;
}
