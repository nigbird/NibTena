'use client';

import React, { createContext, ReactNode } from 'react';

type PatientContextType = {
  patientId: number | null;
  superAppToken: string | null;
  isSuperApp: boolean;
};

export const PatientContext = createContext<PatientContextType>({
  patientId: null,
  superAppToken: null,
  isSuperApp: false,
});

type PatientProviderProps = {
  children: ReactNode;
  patientId: number | null;
  superAppToken: string | null;
  isSuperApp?: boolean;
};

export const PatientProvider = ({ children, patientId, superAppToken, isSuperApp = false }: PatientProviderProps) => {
  return (
    <PatientContext.Provider value={{ patientId, superAppToken, isSuperApp }}>
      {children}
    </PatientContext.Provider>
  );
};
