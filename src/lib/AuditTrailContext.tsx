import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AuditLogicStep {
  stepNumber: number;
  title: string;
  description: string;
  formula?: string;
  calculation?: string;
  result?: string | number;
  unit?: string;
  status?: 'PASS' | 'VERIFIED' | 'INPUT' | 'DERIVED' | 'CRITICAL';
}

export interface AuditConstant {
  symbol: string;
  name: string;
  value: string | number;
  unit?: string;
  source: string;
}

export interface AuditTrailData {
  metricName: string;
  computedValue: string | number;
  unit?: string;
  discipline: string; // e.g. 'Mechanical / Cooling Load', 'Mechanical / Ventilation'
  subSystem?: string;
  governingCode: string; // e.g. 'ANSI/ASHRAE Standard 62.1-2022'
  codeClause?: string; // e.g. 'Section 6.2.1.1 & Table 6-1'
  primaryFormula: string; // e.g. 'Voz = (Rp * Pz + Ra * Az) / Ez'
  substitutedFormula?: string; // e.g. 'Voz = (2.5 * 80 + 0.3 * 400) / 1.0 = 320 L/s'
  steps: AuditLogicStep[];
  constants: AuditConstant[];
  verificationNotes?: string;
}

interface AuditTrailContextType {
  openAuditTrail: (data: AuditTrailData) => void;
  closeAuditTrail: () => void;
  activeAudit: AuditTrailData | null;
  isOpen: boolean;
}

const AuditTrailContext = createContext<AuditTrailContextType | undefined>(undefined);

export const AuditTrailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAudit, setActiveAudit] = useState<AuditTrailData | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openAuditTrail = (data: AuditTrailData) => {
    setActiveAudit(data);
    setIsOpen(true);
  };

  const closeAuditTrail = () => {
    setIsOpen(false);
  };

  return (
    <AuditTrailContext.Provider value={{ openAuditTrail, closeAuditTrail, activeAudit, isOpen }}>
      {children}
    </AuditTrailContext.Provider>
  );
};

export const useAuditTrail = () => {
  const context = useContext(AuditTrailContext);
  if (!context) {
    throw new Error('useAuditTrail must be used within an AuditTrailProvider');
  }
  return context;
};
