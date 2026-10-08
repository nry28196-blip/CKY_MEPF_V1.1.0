export interface DuctFitting {
  id: string;
  name: string;
  category: 'elbows' | 'tees' | 'transitions' | 'entries_exits';
  lossCoefficient: number;
  description: string;
}

export const ASHRAE_FITTINGS_DB: DuctFitting[] = [
  { id: 'CR3-1', name: 'Round Elbow, Smooth, R/D=1.5', category: 'elbows', lossCoefficient: 0.15, description: 'CR3-1: 90 degree smooth radius elbow' },
  { id: 'CR3-3', name: 'Round Elbow, Mitered, 90 deg', category: 'elbows', lossCoefficient: 1.2, description: 'CR3-3: 90 degree mitered elbow' },
  { id: 'SR3-1', name: 'Rectangular Elbow, Smooth, R/W=1.5', category: 'elbows', lossCoefficient: 0.18, description: 'SR3-1: 90 degree smooth radius elbow' },
  { id: 'SR3-2', name: 'Rectangular Elbow, Mitered', category: 'elbows', lossCoefficient: 1.25, description: 'SR3-2: 90 degree mitered elbow (no vanes)' },
  { id: 'SR3-4', name: 'Rectangular Elbow, Mitered with Turning Vanes', category: 'elbows', lossCoefficient: 0.22, description: 'SR3-4: 90 degree mitered elbow with standard trailing edge vanes' },
  
  { id: 'SD5-1', name: 'Tee, Rectangular Main to Round Branch', category: 'tees', lossCoefficient: 1.4, description: 'Branch takeoff loss coefficient (typical)' },
  { id: 'CD5-1', name: 'Tee, Round Main to Round Branch', category: 'tees', lossCoefficient: 1.3, description: 'Branch takeoff' },
  { id: 'CD5-1-main', name: 'Tee, Round, Main Straight Through', category: 'tees', lossCoefficient: 0.05, description: 'Straight through pressure loss' },

  { id: 'SR4-1', name: 'Transition, Rectangular, Expanding', category: 'transitions', lossCoefficient: 0.25, description: 'Abrupt expansion' },
  { id: 'SR4-2', name: 'Transition, Rectangular, Contracting', category: 'transitions', lossCoefficient: 0.15, description: 'Abrupt contraction' },

  { id: 'EN1-1', name: 'Duct flush with wall', category: 'entries_exits', lossCoefficient: 0.5, description: 'Flush intake' },
  { id: 'EX1-1', name: 'Discharge to room/atmosphere', category: 'entries_exits', lossCoefficient: 1.0, description: 'Abrupt exit (Pv lost entirely)' }
];
