import React, { createContext, useContext, useState, useEffect } from 'react';

export type UnitSystem = 'metric' | 'imperial';

interface UnitContextType {
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  setUnitSystem: (unit: UnitSystem) => void;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Try to load from localStorage, default to imperial
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    const saved = localStorage.getItem('cky_mepf_units');
    return (saved === 'metric' || saved === 'imperial') ? saved : 'imperial';
  });

  useEffect(() => {
    localStorage.setItem('cky_mepf_units', unitSystem);
  }, [unitSystem]);

  const toggleUnitSystem = () => {
    setUnitSystem(prev => prev === 'metric' ? 'imperial' : 'metric');
  };

  return (
    <UnitContext.Provider value={{ unitSystem, toggleUnitSystem, setUnitSystem }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = () => {
  const context = useContext(UnitContext);
  if (!context) throw new Error('useUnit must be used within a UnitProvider');
  return context;
};
