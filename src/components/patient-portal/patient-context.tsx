'use client';

import React, { createContext, ReactNode } from 'react';

type PatientContextType = {
  patientId: number | null;
  superAppToken: string | null;
};

export const PatientContext = createContext<PatientContextType>({
  patientId: null,
  superAppToken: null,
});

type PatientProviderProps = {
  children: ReactNode;
  patientId: number | null;
  superAppToken: string | null;
};

export const PatientProvider = ({ children, patientId, superAppToken }: PatientProviderProps) => {
  return (
    <PatientContext.Provider value={{ patientId, superAppToken }}>
      {children}
    </PatientContext.Provider>
  );
};
