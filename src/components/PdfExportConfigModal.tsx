import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckSquare,
  Square,
  Download,
  X,
  Sliders,
  ShieldCheck,
  Building2,
  Activity,
  Wind,
  CheckCircle2,
  BookOpen,
  Info,
  Printer,
  Stamp,
  BadgeCheck,
  FolderKanban,
  Type,
  Lock,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { exportElementToPdf } from '../lib/exportPdf';

export interface PdfSectionOption {
  key: string;
  label: string;
  description: string;
  category: 'results' | 'inputs' | 'verification' | 'documentation';
  defaultEnabled: boolean;
  icon: React.ElementType;
}

export const PDF_EXPORT_SECTIONS: PdfSectionOption[] = [
  // Results
  {
    key: 'results-hero',
    label: 'Primary Results (Voz, Vbz, Ez, Eρ)',
    description: 'Main airflow sizing summary and design ventilation rates',
    category: 'results',
    defaultEnabled: true,
    icon: CheckCircle2
  },
  {
    key: 'result-summary',
    label: 'Result Summary Breakdown',
    description: 'People (Vbp), Area (Vba), Breathing Zone (Vbz), and Total Intake (Vot)',
    category: 'results',
    defaultEnabled: true,
    icon: Wind
  },
  {
    key: 'performance-dashboard',
    label: 'Mechanical Performance Dashboard',
    description: 'Dynamic load distribution, fan ESP curves, and psychrometric performance charts',
    category: 'results',
    defaultEnabled: true,
    icon: Activity
  },

  // Inputs
  {
    key: 'input-summary',
    label: 'Input Summary',
    description: 'Selected space type, floor area Az, and design occupancy Pz',
    category: 'inputs',
    defaultEnabled: true,
    icon: Building2
  },
  {
    key: 'zone-info',
    label: 'Zone & Space Information Cards',
    description: 'Space category geometry, air classification, and occupancy values',
    category: 'inputs',
    defaultEnabled: true,
    icon: Building2
  },
  {
    key: 'vent-params',
    label: 'Ventilation Parameters (Rp, Ra, Ez)',
    description: 'ASHRAE Table 6-1 default rates and air distribution effectiveness',
    category: 'inputs',
    defaultEnabled: true,
    icon: Sliders
  },
  {
    key: 'advanced-params',
    label: 'Advanced System Topology',
    description: 'Stratified / displacement ventilation and density correction parameters',
    category: 'inputs',
    defaultEnabled: true,
    icon: Sliders
  },

  // Verification & Audit
  {
    key: 'validation-status',
    label: 'Validation Status Checklist',
    description: 'Code rule pass/fail status and prerequisite parameter checks',
    category: 'verification',
    defaultEnabled: true,
    icon: ShieldCheck
  },
  {
    key: 'calculation-details',
    label: 'Calculation Details & Math Step Trace',
    description: 'Step-by-step mathematical trace for Eq 6-1, Ez distribution, and Eρ',
    category: 'verification',
    defaultEnabled: true,
    icon: Activity
  },
  {
    key: 'audit-info',
    label: 'Audit Information & Code Basis',
    description: 'Standard edition (62.1-2022), Addendum j, calculation engine traceability',
    category: 'verification',
    defaultEnabled: true,
    icon: ShieldCheck
  },

  // Documentation
  {
    key: 'formulas',
    label: 'Formula Reference Cards',
    description: 'Mathematical equations, definitions, and code citations',
    category: 'documentation',
    defaultEnabled: false,
    icon: BookOpen
  },
  {
    key: 'disclaimer',
    label: 'Engineering QA Notice & Disclaimer',
    description: 'Engineering calculation scope, limitations, and AHJ submittal notice',
    category: 'documentation',
    defaultEnabled: true,
    icon: Info
  }
];

export interface PdfExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetElementId?: string;
  defaultFilename?: string;
  systemName?: string;
  initialProjectName?: string;
  initialCompanyName?: string;
  initialEngineerName?: string;
  initialWatermarkText?: string;
  initialWatermarkEnabled?: boolean;
  initialIncludeQrCode?: boolean;
  initialQrCodeUrl?: string;
}

export default function PdfExportConfigModal({
  isOpen,
  onClose,
  targetElementId = 'calculation-workspace',
  defaultFilename = 'CKY_MEPF_Calculation_Report.pdf',
  systemName = 'Ventilation System',
  initialProjectName = 'Construction MEP Package',
  initialCompanyName = 'CKY MEP Consultants',
  initialEngineerName = 'MEP Design Engineer',
  initialWatermarkText = '',
  initialWatermarkEnabled = false,
  initialIncludeQrCode = false,
  initialQrCodeUrl = ''
}: PdfExportConfigModalProps) {
  // Section toggle state (map of key -> boolean)
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PDF_EXPORT_SECTIONS.forEach(s => {
      initial[s.key] = s.defaultEnabled;
    });
    return initial;
  });

  const defaultAppUrl = typeof window !== 'undefined' && window.location.href
    ? window.location.href
    : 'https://ais-pre-lrluh3xexldj7xwvzbtpf3-234593661332.asia-southeast1.run.app';

  const [projectName, setProjectName] = useState<string>(initialProjectName);
  const [companyName, setCompanyName] = useState<string>(initialCompanyName);
  const [engineerName, setEngineerName] = useState<string>(initialEngineerName);
  const [includeRunningHeader, setIncludeRunningHeader] = useState<boolean>(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(initialWatermarkEnabled);
  const [watermarkSource, setWatermarkSource] = useState<'company' | 'project' | 'custom' | 'status'>('company');
  const [customWatermarkText, setCustomWatermarkText] = useState<string>(initialWatermarkText || 'CONFIDENTIAL');
  const [statusStamp, setStatusStamp] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.15);
  const [watermarkAngle, setWatermarkAngle] = useState<number>(45);

  // Verification QR code configuration state
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(initialIncludeQrCode);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(initialQrCodeUrl || defaultAppUrl);
  const [qrCodePosition, setQrCodePosition] = useState<'footer-right' | 'footer-left' | 'header-right'>('footer-right');
  const [qrPages, setQrPages] = useState<'all' | 'first'>('all');
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>('');

  const [printMode, setPrintMode] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Automatically generate interactive QR code preview whenever QR settings or URL change
  useEffect(() => {
    if (!includeQrCode) {
      setQrPreviewDataUrl('');
      return;
    }
    const target = qrCodeUrl.trim() || defaultAppUrl;
    let isMounted = true;
    QRCode.toDataURL(target, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) setQrPreviewDataUrl(url);
      })
      .catch(err => {
        console.warn('QR code preview generation failed:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [includeQrCode, qrCodeUrl, defaultAppUrl]);

  // Compute the live watermark text based on active source configuration
  const getEffectiveWatermarkText = (): string => {
    if (watermarkSource === 'company') {
      return companyName.trim() || 'CKY MEP CONSULTANTS';
    }
    if (watermarkSource === 'project') {
      return projectName.trim() || 'CONSTRUCTION MEP PACKAGE';
    }
    if (watermarkSource === 'status') {
      return statusStamp.trim() || 'CONFIDENTIAL';
    }
    return customWatermarkText.trim() || companyName || projectName || 'WATERMARK';
  };

  // Toggle individual section
  const handleToggle = (key: string) => {
    setSectionToggles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Presets
  const handleApplyPreset = (preset: 'all' | 'executive' | 'audit_focus') => {
    if (preset === 'all') {
      const next: Record<string, boolean> = {};
      PDF_EXPORT_SECTIONS.forEach(s => { next[s.key] = true; });
      setSectionToggles(next);
    } else if (preset === 'executive') {
      const next: Record<string, boolean> = {};
      PDF_EXPORT_SECTIONS.forEach(s => {
        next[s.key] = ['results-hero', 'result-summary', 'input-summary', 'validation-status', 'disclaimer'].includes(s.key);
      });
      setSectionToggles(next);
    } else if (preset === 'audit_focus') {
      const next: Record<string, boolean> = {};
      PDF_EXPORT_SECTIONS.forEach(s => {
        next[s.key] = ['results-hero', 'input-summary', 'validation-status', 'calculation-details', 'audit-info', 'disclaimer'].includes(s.key);
      });
      setSectionToggles(next);
    }
  };

  // Execute PDF generation
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    // Identify sections that user has toggled OFF
    const hiddenSections = Object.entries(sectionToggles)
      .filter(([_, enabled]) => !enabled)
      .map(([key]) => key);

    const effectiveWatermark = getEffectiveWatermarkText();

    try {
      await exportElementToPdf(targetElementId, {
        filename: defaultFilename,
        hiddenSections,
        title: `${systemName} Calculation Report`,
        projectNumber: projectName,
        projectName,
        companyName,
        engineer: engineerName,
        printMode,
        watermarkEnabled,
        watermarkText: effectiveWatermark,
        watermarkOpacity,
        watermarkAngle,
        includeRunningHeader,
        includeQrCode,
        qrCodeUrl: qrCodeUrl.trim() || defaultAppUrl,
        qrCodeDataUrl: qrPreviewDataUrl || undefined,
        qrCodePosition,
        qrPages
      });

      setExportSuccess(true);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('PDF export failed:', err);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'results', label: '1. Primary Results & Sizing' },
    { id: 'inputs', label: '2. Input & Space Parameters' },
    { id: 'verification', label: '3. Engineering Verification & Audit' },
    { id: 'documentation', label: '4. Documentation & Legal' }
  ];

  const totalEnabled = Object.values(sectionToggles).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-2xl bg-[#090F22] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                PDF Export Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle specific calculation and audit sections before generating your report.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Print Mode Toggle Card (Physical Printer Layout Optimization) */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                printMode
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Print Mode (Physical Paper Output)
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition-colors ${
                    printMode
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    {printMode ? 'White Background • Ink Friendly' : 'Dark Screen Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Forces a clean, pure-white background with high-contrast typography, dark borders, and ink-friendly metrics for physical printer outputs.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrintMode(!printMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-start sm:self-center ${
                printMode ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
              role="switch"
              aria-checked={printMode}
              title="Toggle Clean White Print Mode"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  printMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="font-semibold text-white">Preset Packages:</span>
              <span className="text-[11px] text-cyan-400 font-bold">({totalEnabled} of {PDF_EXPORT_SECTIONS.length} selected)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('executive')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                Executive Summary
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('audit_focus')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                Standard Audit Trail
              </button>
            </div>
          </div>

          {/* Section Selection Groups */}
          <div className="space-y-5">
            {categories.map(cat => {
              const items = PDF_EXPORT_SECTIONS.filter(s => s.category === cat.id);
              if (items.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block px-1">
                    {cat.label}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {items.map(item => {
                      const isChecked = !!sectionToggles[item.key];
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggle(item.key)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                            isChecked
                              ? 'bg-slate-900/90 border-cyan-500/50 shadow-sm shadow-cyan-950/20 text-white'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 text-cyan-400 shrink-0"
                            aria-label={`Toggle ${item.label}`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-cyan-950/60" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-cyan-400' : 'text-slate-500'}`} />
                              <span className={`text-xs font-bold leading-snug truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                                {item.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Project Branding & Submittal Details */}
          <div className="pt-3 border-t border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Project & Company Branding Details
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Sheet title blocks & submittal attribution
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Custom Project Name */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Custom Project Name</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkEnabled(true);
                        setWatermarkSource('project');
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline hover:no-underline transition-colors cursor-pointer"
                      title="Set custom project name as sheet watermark"
                    >
                      + Watermark
                    </button>
                  </div>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                    placeholder="e.g. Hospital Wing B HVAC"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Stamps into sheet running header & optional watermark
                  </p>
                </div>

                {/* Company / Firm Name */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Company / Firm Name</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkEnabled(true);
                        setWatermarkSource('company');
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline hover:no-underline transition-colors cursor-pointer"
                      title="Set company name as sheet watermark"
                    >
                      + Watermark
                    </button>
                  </div>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                    placeholder="e.g. CKY MEP Consultants"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Firm attribution in running header & watermark
                  </p>
                </div>

                {/* Lead Engineer / Author */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Lead Engineer / Author
                  </label>
                  <input
                    type="text"
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    className="w-full bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none"
                    placeholder="e.g. Lead MEP Engineer, PE"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Printed in submittal compliance footer
                  </p>
                </div>
              </div>

              {/* Running Header & Page Numbering Option */}
              <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-850 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Stamp Running Header, Custom Project Name, and Page Numbers on Sheets</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeRunningHeader(!includeRunningHeader)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeRunningHeader ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                  role="switch"
                  aria-checked={includeRunningHeader}
                  title="Toggle Running Header & Page Numbers"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      includeRunningHeader ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Custom Project Name or Company Watermark Configuration Card */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
                    watermarkEnabled
                      ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <Stamp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        PDF Sheet Watermark
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition-colors ${
                        watermarkEnabled
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {watermarkEnabled ? 'Watermark Enabled' : 'Off'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add a custom project name or company watermark across all exported PDF calculation sheets.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-start sm:self-center ${
                    watermarkEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                  role="switch"
                  aria-checked={watermarkEnabled}
                  title="Toggle Calculation Sheet Watermark"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      watermarkEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {watermarkEnabled && (
                <div className="pt-3 border-t border-slate-800/70 space-y-3.5 animate-in fade-in duration-150">
                  {/* Watermark Content Source Selector */}
                  <div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                      Watermark Content Source:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setWatermarkSource('company')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          watermarkSource === 'company'
                            ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-sm shadow-cyan-950/40'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 className={`w-3.5 h-3.5 ${watermarkSource === 'company' ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="text-[11px] font-bold">Company Name</span>
                        </div>
                        <p className="text-[10px] font-mono truncate opacity-80">
                          {companyName || 'CKY Consultants'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermarkSource('project')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          watermarkSource === 'project'
                            ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-sm shadow-cyan-950/40'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <FolderKanban className={`w-3.5 h-3.5 ${watermarkSource === 'project' ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="text-[11px] font-bold">Project Name</span>
                        </div>
                        <p className="text-[10px] font-mono truncate opacity-80">
                          {projectName || 'MEP Package'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermarkSource('custom')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          watermarkSource === 'custom'
                            ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-sm shadow-cyan-950/40'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Type className={`w-3.5 h-3.5 ${watermarkSource === 'custom' ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="text-[11px] font-bold">Custom Text</span>
                        </div>
                        <p className="text-[10px] font-mono truncate opacity-80">
                          {customWatermarkText || 'Freeform text'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermarkSource('status')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          watermarkSource === 'status'
                            ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-sm shadow-cyan-950/40'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Lock className={`w-3.5 h-3.5 ${watermarkSource === 'status' ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="text-[11px] font-bold">Status Stamp</span>
                        </div>
                        <p className="text-[10px] font-mono truncate opacity-80">
                          {statusStamp || 'CONFIDENTIAL'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Contextual input based on selection */}
                  {watermarkSource === 'custom' && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Custom Watermark Text
                      </label>
                      <input
                        type="text"
                        value={customWatermarkText}
                        onChange={(e) => setCustomWatermarkText(e.target.value)}
                        className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none font-mono"
                        placeholder="e.g. CKY CONSULTING or PROPRIETARY"
                      />
                    </div>
                  )}

                  {watermarkSource === 'company' && (
                    <div className="flex items-center gap-2 p-2 bg-slate-950/70 border border-slate-850 rounded-lg text-xs text-slate-300 font-mono">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Company watermark: <strong className="text-white">{companyName || 'CKY MEP CONSULTANTS'}</strong> (mirrors company name above)</span>
                    </div>
                  )}

                  {watermarkSource === 'project' && (
                    <div className="flex items-center gap-2 p-2 bg-slate-950/70 border border-slate-850 rounded-lg text-xs text-slate-300 font-mono">
                      <FolderKanban className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Custom project name watermark: <strong className="text-white">{projectName || 'CONSTRUCTION MEP PACKAGE'}</strong> (mirrors project name above)</span>
                    </div>
                  )}

                  {watermarkSource === 'status' && (
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-mono text-slate-400 uppercase">
                        Select Security / Status Stamp:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'CONFIDENTIAL',
                          'PRELIMINARY - NOT FOR CONSTRUCTION',
                          'FOR REVIEW ONLY',
                          'APPROVED FOR CONSTRUCTION',
                          'DRAFT / WORK IN PROGRESS'
                        ].map(stamp => (
                          <button
                            key={stamp}
                            type="button"
                            onClick={() => setStatusStamp(stamp)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              statusStamp === stamp
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {stamp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Watermark Style: Opacity & Orientation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Watermark Opacity:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Subtle (10%)', val: 0.10 },
                          { label: 'Standard (18%)', val: 0.18 },
                          { label: 'Bold (28%)', val: 0.28 }
                        ].map(op => (
                          <button
                            key={op.label}
                            type="button"
                            onClick={() => setWatermarkOpacity(op.val)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                              watermarkOpacity === op.val
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Watermark Angle:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: 'Diagonal (45°)', val: 45 },
                          { label: 'Horizontal (0°)', val: 0 }
                        ].map(ang => (
                          <button
                            key={ang.label}
                            type="button"
                            onClick={() => setWatermarkAngle(ang.val)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                              watermarkAngle === ang.val
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            {ang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Sheet Watermark Preview Box */}
                  <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-850 flex items-center justify-center overflow-hidden h-14 relative">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="font-bold font-mono tracking-widest text-slate-300 uppercase whitespace-nowrap select-none text-sm sm:text-base"
                        style={{
                          opacity: watermarkOpacity * 2.5,
                          transform: `rotate(${watermarkAngle === 45 ? '-15deg' : '0deg'})`
                        }}
                      >
                        {getEffectiveWatermarkText()}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 relative z-10">
                      Live Sheet Preview ({Math.round(watermarkOpacity * 100)}% opacity • {watermarkAngle}° • {watermarkSource.toUpperCase()})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Digital Verification QR Code Card */}
            <div className={`p-4 rounded-xl border transition-all shadow-sm ${
              includeQrCode
                ? 'bg-slate-900/90 border-cyan-500/40 shadow-cyan-950/20'
                : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div className="flex items-start sm:items-center justify-between gap-4">
                <label htmlFor="include-qr-checkbox" className="flex items-start gap-3 cursor-pointer select-none flex-1">
                  <div className="pt-0.5 sm:pt-0">
                    <input
                      type="checkbox"
                      id="include-qr-checkbox"
                      name="includeQrCode"
                      checked={includeQrCode}
                      onChange={(e) => setIncludeQrCode(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer accent-cyan-500"
                    />
                  </div>
                  <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
                    includeQrCode
                      ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Include Verification QR Code
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition-colors ${
                        includeQrCode
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {includeQrCode ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Enable or disable the scannable QR code on the generated PDF export linking directly to the current app URL for verification purposes.
                    </p>
                  </div>
                </label>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="include-qr-checkbox" className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer font-medium">
                    {includeQrCode ? (
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        <CheckSquare className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Square className="w-4 h-4" /> Disabled
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {includeQrCode && (
                <div className="pt-3 border-t border-slate-800/70 space-y-3.5 animate-in fade-in duration-150">
                  {/* Verification URL Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Verification App URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.location.href) {
                            setQrCodeUrl(window.location.href);
                          }
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline hover:no-underline transition-colors cursor-pointer"
                        title="Reset to current browser URL"
                      >
                        Reset to Current App URL
                      </button>
                    </div>
                    <input
                      type="url"
                      value={qrCodeUrl}
                      onChange={(e) => setQrCodeUrl(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-800 focus:border-cyan-500 outline-none font-mono"
                      placeholder="https://..."
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Target address embedded in QR code & interactive PDF hyperlink for AHJ inspection.
                    </p>
                  </div>

                  {/* QR Position and Scope */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        QR Code Position:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'footer-right', label: 'Footer Right' },
                          { id: 'footer-left', label: 'Footer Left' },
                          { id: 'header-right', label: 'Header Right' }
                        ].map(pos => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setQrCodePosition(pos.id as any)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                              qrCodePosition === pos.id
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Sheet Placement:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'all', label: 'All Pages' },
                          { id: 'first', label: 'First Page Only' }
                        ].map(pageOpt => (
                          <button
                            key={pageOpt.id}
                            type="button"
                            onClick={() => setQrPages(pageOpt.id as any)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                              qrPages === pageOpt.id
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            {pageOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live QR Code Preview Card */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center shadow-sm">
                      {qrPreviewDataUrl ? (
                        <img
                          src={qrPreviewDataUrl}
                          alt="Verification QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <QrCode className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Instant Verification Link Ready</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {qrCodeUrl || defaultAppUrl}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                        <span>• Position: {qrCodePosition}</span>
                        <span>• Target: {qrPages === 'all' ? 'Every Sheet' : 'Cover Sheet'}</span>
                        <span>• Dual Scan & Clickable</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-xs font-mono text-slate-400">
            Target: <span className="text-cyan-400 font-bold">{defaultFilename}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting || totalEnabled === 0}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                exportSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-950/50'
                  : isExporting
                    ? 'bg-cyan-800 text-white cursor-wait opacity-80'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50 cursor-pointer'
              }`}
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PDF Downloaded!</span>
                </>
              ) : isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating {printMode ? 'Print' : 'PDF'}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF ({totalEnabled} Sections{printMode ? ' • Clean Print' : ''}{watermarkEnabled ? ' • Watermarked' : ''}{includeQrCode ? ' • QR Verified' : ''})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
