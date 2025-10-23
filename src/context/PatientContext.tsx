
'use client';

import { createContext, ReactNode, useState, useEffect } from 'react';
import type { Patient } from '@/lib/definitions';

type PatientContextType = {
  patient: Patient | null;
  superAppToken: string | null;
  setPatient: (patient: Patient | null) => void;
};

export const PatientContext = createContext<PatientContextType>({
  patient: null,
  superAppToken: null,
  setPatient: () => {},
});

type PatientProviderProps = {
  children: ReactNode;
  initialPatient: Patient | null;
  initialSuperAppToken: string | undefined;
};

export const PatientProvider = ({ children, initialPatient, initialSuperAppToken }: PatientProviderProps) => {
  const [patient, setPatient] = useState<Patient | null>(initialPatient);
  const [superAppToken] = useState<string | null>(initialSuperAppToken || null);
  
  useEffect(() => {
    setPatient(initialPatient);
  }, [initialPatient]);

  return (
    <PatientContext.Provider value={{ patient, setPatient, superAppToken }}>
      {children}
    </PatientContext.Provider>
  );
};
