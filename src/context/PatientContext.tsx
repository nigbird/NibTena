'use client';

import { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import type { Patient } from '@/lib/definitions';
import { logoutPatient } from '@/app/user/appointments/actions';

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
  initialSuperAppToken?: string;
};

export const PatientProvider = ({
  children,
  initialPatient,
  initialSuperAppToken,
}: PatientProviderProps) => {
  const [patient, setPatientState] = useState<Patient | null>(initialPatient);
  const [superAppToken] = useState<string | null>(initialSuperAppToken || null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Sync state with props if they change (e.g. re-validation from server)
    setPatientState(initialPatient);
    setIsInitialized(true);
  }, [initialPatient]);

  const handleSetPatient = useCallback(
    async (newPatient: Patient | null) => {
      setPatientState(newPatient);

      if (superAppToken) return; // MINI APP handled externally

      if (!newPatient) {
        // Logout requested: clear server-side cookie
        try {
            await logoutPatient();
        } catch (e) {
            console.error('Logout failed', e);
        }
      }
      // If newPatient is set, we assume the server action (login/update) has already set the cookie.
    },
    [superAppToken]
  );

  if (!isInitialized) return null;

  return (
    <PatientContext.Provider value={{ patient, setPatient: handleSetPatient, superAppToken }}>
      {children}
    </PatientContext.Provider>
  );
};
