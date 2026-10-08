export type TabType = 'mechanical' | 'electrical' | 'plumbing' | 'fire' | 'bulk' | 'cost';

export interface HistoryItem {
  id: string;
  timestamp: string;
  tab: TabType;
  subType?: string; // e.g. 'ductSizing' or 'cooling'
  title: string;
  summary: string; // Short string showing main results
  parameters: any;
  notes?: string;
  projectId?: string; // Associated Project Container ID
  projectName?: string; // Associated Project Name for display
}

export interface ProjectContainer {
  id: string;
  name: string;
  description?: string;
  client?: string;
  projectNumber?: string;
  location?: string;
  engineer?: string;
  createdAt: string;
  updatedAt: string;
  runIds: string[]; // List of HistoryItem IDs grouped in this project container
}

export enum AuditStatus {
  INPUT_VERIFIED = 'INPUT_VERIFIED',
  INPUT_NOT_VERIFIED = 'INPUT_NOT_VERIFIED',
  DERIVED = 'DERIVED',
  PASS = 'PASS',
  FAIL = 'FAIL',
  BLOCKED = 'BLOCKED',
  ESTIMATED = 'ESTIMATED'
}

export * from './calculations/audit';

