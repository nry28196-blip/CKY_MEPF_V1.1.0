import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  FolderPlus,
  FileText,
  Download,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  X,
  Building2,
  User,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectContainer, HistoryItem } from '../types';
import {
  getProjects,
  saveProjects,
  createProject,
  updateProject,
  deleteProject,
  addRunsToProject,
  removeRunFromProject
} from '../lib/projectStorage';
import { exportCollectiveProjectPdf } from '../lib/exportCollectiveProjectPdf';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoadHistoryItem: (item: HistoryItem) => void;
}

export default function ProjectManagerModal({
  isOpen,
  onClose,
  history,
  onLoadHistoryItem
}: ProjectManagerModalProps) {
  const [projects, setProjects] = useState<ProjectContainer[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // UI Dialog States
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAssigningRuns, setIsAssigningRuns] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formNumber, setFormNumber] = useState<string>('');
  const [formClient, setFormClient] = useState<string>('');
  const [formEngineer, setFormEngineer] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');

  // Multi-select for assigning runs
  const [selectedRunIdsToAssign, setSelectedRunIdsToAssign] = useState<string[]>([]);

  // Load projects on open
  useEffect(() => {
    if (isOpen) {
      const loaded = getProjects();
      setProjects(loaded);
      if (loaded.length > 0 && !selectedProjectId) {
        setSelectedProjectId(loaded[0].id);
      }
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Runs attached to current project
  const assignedRuns = React.useMemo(() => {
    if (!selectedProject) return [];
    return history.filter(h => selectedProject.runIds.includes(h.id));
  }, [selectedProject, history]);

  // Runs not yet in this project
  const unassignedRuns = React.useMemo(() => {
    if (!selectedProject) return [];
    return history.filter(h => !selectedProject.runIds.includes(h.id));
  }, [selectedProject, history]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormNumber(`MEP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormClient('');
    setFormEngineer('Lead MEP Engineer');
    setFormLocation('');
    setFormDescription('');
    setIsCreating(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newProj = createProject({
      name: formName,
      projectNumber: formNumber,
      client: formClient,
      engineer: formEngineer,
      location: formLocation,
      description: formDescription
    });

    const refreshed = getProjects();
    setProjects(refreshed);
    setSelectedProjectId(newProj.id);
    setIsCreating(false);
    showToast(`Project container "${newProj.name}" created!`);
  };

  const handleOpenEdit = () => {
    if (!selectedProject) return;
    setFormName(selectedProject.name);
    setFormNumber(selectedProject.projectNumber || '');
    setFormClient(selectedProject.client || '');
    setFormEngineer(selectedProject.engineer || '');
    setFormLocation(selectedProject.location || '');
    setFormDescription(selectedProject.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !formName.trim()) return;

    updateProject(selectedProject.id, {
      name: formName,
      projectNumber: formNumber,
      client: formClient,
      engineer: formEngineer,
      location: formLocation,
      description: formDescription
    });

    setProjects(getProjects());
    setIsEditing(false);
    showToast('Project details updated successfully!');
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the project container "${name}"? (Individual saved calculation runs will NOT be deleted).`)) {
      deleteProject(id);
      const remaining = getProjects();
      setProjects(remaining);
      setSelectedProjectId(remaining[0]?.id || '');
      showToast('Project container deleted.');
    }
  };

  const handleOpenAssign = () => {
    setSelectedRunIdsToAssign([]);
    setIsAssigningRuns(true);
  };

  const handleSaveAssignRuns = () => {
    if (!selectedProject || selectedRunIdsToAssign.length === 0) {
      setIsAssigningRuns(false);
      return;
    }

    addRunsToProject(selectedProject.id, selectedRunIdsToAssign);
    setProjects(getProjects());
    setIsAssigningRuns(false);
    showToast(`Added ${selectedRunIdsToAssign.length} calculation runs to ${selectedProject.name}!`);
  };

  const handleRemoveRun = (runId: string) => {
    if (!selectedProject) return;
    removeRunFromProject(selectedProject.id, runId);
    setProjects(getProjects());
    showToast('Run removed from project.');
  };

  const handleExportCollectivePdf = () => {
    if (!selectedProject) return;
    setIsGeneratingPdf(true);
    try {
      exportCollectiveProjectPdf(selectedProject, assignedRuns);
      showToast('Collective MEP Project PDF generated successfully!');
    } catch (err) {
      console.error('Failed to generate collective PDF:', err);
      showToast('Failed to generate collective PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="w-full max-w-5xl bg-[#090F22] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px]"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400 shadow-sm shadow-cyan-950/40">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  MEP Project Manager
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/70 text-cyan-300 font-bold">
                  {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Group multiple saved calculation runs into cohesive project containers for organization and collective submittal reporting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-cyan-950/50 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-6 py-2 text-xs font-medium text-emerald-300 flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Modal Main Body (2 Columns: Left Projects List, Right Project Details & Runs) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Projects List */}
          <div className="w-full md:w-80 lg:w-88 border-r border-slate-800/80 bg-slate-950/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-bold uppercase tracking-wider">Project Containers</span>
              <span>{projects.length} Available</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {projects.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  No projects yet. Click "+ New Project" to get started.
                </div>
              ) : (
                projects.map(proj => {
                  const isSelected = proj.id === selectedProjectId;
                  const runCount = proj.runIds.length;

                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-500/60 shadow-md shadow-cyan-950/20 text-white'
                          : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold truncate max-w-[140px]">
                          {proj.projectNumber || 'MEP'}
                        </span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          runCount > 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {runCount} {runCount === 1 ? 'Run' : 'Runs'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold truncate leading-snug">{proj.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-1">
                        Client: {proj.client || 'General'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Project Details, Grouped Runs & Collective Actions */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
            {selectedProject ? (
              <>
                {/* Project Header Banner */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                        {selectedProject.projectNumber || 'MEP'}
                      </span>
                      <h3 className="text-lg font-bold text-white tracking-wide">
                        {selectedProject.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Client: <strong className="text-slate-200">{selectedProject.client || 'N/A'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Engineer: <strong className="text-slate-200">{selectedProject.engineer || 'Lead MEP'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Created: <strong className="text-slate-200">{selectedProject.createdAt}</strong>
                      </span>
                    </div>
                    {selectedProject.description && (
                      <p className="text-xs text-slate-400 pt-1.5 italic">
                        {selectedProject.description}
                      </p>
                    )}
                  </div>

                  {/* Actions for this Project */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportCollectivePdf}
                      disabled={isGeneratingPdf || assignedRuns.length === 0}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all ${
                        assignedRuns.length === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : isGeneratingPdf
                            ? 'bg-cyan-800 text-white cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer'
                      }`}
                      title={assignedRuns.length === 0 ? 'Add runs to export collective report' : 'Generate collective PDF for all grouped calculations'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isGeneratingPdf ? 'Generating Package...' : 'Collective PDF Submittal'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="p-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
                      title="Edit Project Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}
                      className="p-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-800/60 transition-colors cursor-pointer"
                      title="Delete Project Container"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Attached Calculation Runs Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                        Grouped Calculation Runs ({assignedRuns.length})
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAssign}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg border border-slate-800 hover:border-cyan-800/60 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Saved Runs</span>
                    </button>
                  </div>

                  {assignedRuns.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 bg-slate-950/30">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-300">No Calculation Runs Grouped Yet</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Add your saved HVAC, plumbing, fire protection, or electrical calculations to this project.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAssign}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Runs from Saved Calculations</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {assignedRuns.map((run, idx) => (
                        <div
                          key={run.id}
                          className="p-3.5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                {run.tab}
                              </span>
                              <h5 className="text-xs font-bold text-white truncate">
                                {run.title}
                              </h5>
                              <span className="text-[10px] text-slate-500 font-mono">
                                #{idx + 1}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-mono truncate">
                              {run.summary}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Saved: {run.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                onLoadHistoryItem(run);
                                onClose();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-lg border border-cyan-800/50 transition-colors cursor-pointer"
                              title="Load parameters into active workspace"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Load Run</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveRun(run.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Remove run from this project"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500 font-mono">
                Select a project container on the left or create a new one.
              </div>
            )}
          </div>
        </div>

        {/* CREATE / EDIT PROJECT MODAL DIALOG */}
        <AnimatePresence>
          {(isCreating || isEditing) && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#0B132B] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-cyan-400" />
                    <span>{isCreating ? 'Create New Project Container' : 'Edit Project Details'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. City Center Mall - Phase 2"
                      className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Project Number
                      </label>
                      <input
                        type="text"
                        value={formNumber}
                        onChange={(e) => setFormNumber(e.target.value)}
                        placeholder="e.g. MEP-2026-04"
                        className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Client / Owner
                      </label>
                      <input
                        type="text"
                        value={formClient}
                        onChange={(e) => setFormClient(e.target.value)}
                        placeholder="e.g. Global Realty"
                        className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Lead Engineer
                      </label>
                      <input
                        type="text"
                        value={formEngineer}
                        onChange={(e) => setFormEngineer(e.target.value)}
                        placeholder="e.g. Lead MEP Engineer"
                        className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Site Location
                      </label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Plot 4B, Sector 7"
                        className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Project Scope Description
                    </label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief notes on HVAC, plumbing, or fire scopes..."
                      className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      {isCreating ? 'Create Container' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ASSIGN SAVED RUNS MODAL DIALOG */}
        <AnimatePresence>
          {isAssigningRuns && selectedProject && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#0B132B] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span>Assign Runs to {selectedProject.name}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select saved calculations from your workspace to group into this container.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssigningRuns(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 py-2">
                  {unassignedRuns.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 font-mono">
                      {history.length === 0
                        ? 'No saved calculations in your workspace yet. Click "Save" on any calculation screen first!'
                        : 'All available saved runs are already grouped in this project container.'}
                    </div>
                  ) : (
                    unassignedRuns.map(run => {
                      const isChecked = selectedRunIdsToAssign.includes(run.id);

                      return (
                        <div
                          key={run.id}
                          onClick={() => {
                            setSelectedRunIdsToAssign(prev =>
                              isChecked ? prev.filter(id => id !== run.id) : [...prev, run.id]
                            );
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-cyan-950/40 border-cyan-500/60 text-white'
                              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono uppercase font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                                {run.tab}
                              </span>
                              <h5 className="text-xs font-bold truncate">{run.title}</h5>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{run.summary}</p>
                            <span className="text-[9px] text-slate-500 font-mono block">Saved: {run.timestamp}</span>
                          </div>

                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div click
                            className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedRunIdsToAssign.length} runs selected
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAssigningRuns(false)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAssignRuns}
                      disabled={selectedRunIdsToAssign.length === 0}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Add to Project
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
