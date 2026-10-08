import { ProjectContainer, HistoryItem } from '../types';

const STORAGE_KEY = 'cky_mepf_projects';

export const INITIAL_DEFAULT_PROJECTS: ProjectContainer[] = [
  {
    id: 'proj-demo-1',
    name: 'Metropolitan Commercial Tower',
    description: 'Mixed-use commercial tower with office zones, central HVAC, booster pumping, and NFPA fire protection.',
    client: 'Apex Development Corp',
    projectNumber: 'MCT-2026-A',
    location: 'Tower 1, Downtown Central',
    engineer: 'Principal MEP Engineer',
    createdAt: new Date().toLocaleDateString(),
    updatedAt: new Date().toLocaleDateString(),
    runIds: []
  }
];

export function getProjects(): ProjectContainer[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_PROJECTS));
      return INITIAL_DEFAULT_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEFAULT_PROJECTS;
  } catch (err) {
    console.error('Failed to load projects from storage:', err);
    return INITIAL_DEFAULT_PROJECTS;
  }
}

export function saveProjects(projects: ProjectContainer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects to storage:', err);
  }
}

export function createProject(data: Partial<ProjectContainer>): ProjectContainer {
  const current = getProjects();
  const newProject: ProjectContainer = {
    id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: data.name?.trim() || 'New MEP Project',
    description: data.description?.trim() || 'Engineering calculation container',
    client: data.client?.trim() || 'Client',
    projectNumber: data.projectNumber?.trim() || `MEP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    location: data.location?.trim() || 'Project Site',
    engineer: data.engineer?.trim() || 'Lead MEP Engineer',
    createdAt: new Date().toLocaleDateString(),
    updatedAt: new Date().toLocaleDateString(),
    runIds: data.runIds || []
  };

  const next = [newProject, ...current];
  saveProjects(next);
  return newProject;
}

export function updateProject(id: string, updates: Partial<ProjectContainer>): ProjectContainer | null {
  const current = getProjects();
  const idx = current.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const updated: ProjectContainer = {
    ...current[idx],
    ...updates,
    updatedAt: new Date().toLocaleDateString()
  };

  current[idx] = updated;
  saveProjects([...current]);
  return updated;
}

export function deleteProject(id: string): void {
  const current = getProjects();
  const next = current.filter(p => p.id !== id);
  saveProjects(next);
}

export function addRunsToProject(projectId: string, runIdsToAdd: string[]): ProjectContainer | null {
  const current = getProjects();
  const idx = current.findIndex(p => p.id === projectId);
  if (idx === -1) return null;

  const existingIds = new Set(current[idx].runIds);
  runIdsToAdd.forEach(id => existingIds.add(id));

  const updated: ProjectContainer = {
    ...current[idx],
    runIds: Array.from(existingIds),
    updatedAt: new Date().toLocaleDateString()
  };

  current[idx] = updated;
  saveProjects([...current]);
  return updated;
}

export function removeRunFromProject(projectId: string, runId: string): ProjectContainer | null {
  const current = getProjects();
  const idx = current.findIndex(p => p.id === projectId);
  if (idx === -1) return null;

  const updated: ProjectContainer = {
    ...current[idx],
    runIds: current[idx].runIds.filter(id => id !== runId),
    updatedAt: new Date().toLocaleDateString()
  };

  current[idx] = updated;
  saveProjects([...current]);
  return updated;
}
