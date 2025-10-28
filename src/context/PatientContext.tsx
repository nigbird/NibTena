
'use client';

import { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import type { Patient } from '@/lib/definitions';

const SESSION_KEY = 'nib-tena-patient-session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

type StoredSession = {
  patient: Patient;
  expiry: number;
};

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
  const [patient, setPatientState] = useState<Patient | null>(initialPatient);
  const [superAppToken] = useState<string | null>(initialSuperAppToken || null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only once on the client to initialize the session.
    if (initialSuperAppToken) {
      // Mini App session is prioritized and driven by the server-side cookie.
      // The initialPatient prop will be set correctly.
      setPatientState(initialPatient);
    } else {
      // For standalone web, try to load from localStorage.
      try {
        const storedSessionJSON = localStorage.getItem(SESSION_KEY);
        if (storedSessionJSON) {
          const storedSession: StoredSession = JSON.parse(storedSessionJSON);
          // Check if the session is expired
          if (new Date().getTime() < storedSession.expiry) {
            setPatientState(storedSession.patient);
          } else {
            // Clear expired session
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (error) {
        console.error("Could not parse patient session from localStorage", error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsInitialized(true);
  }, [initialPatient, initialSuperAppToken]);

  const handleSetPatient = useCallback((newPatient: Patient | null) => {
    // This function is the single point of truth for setting the patient state.
    setPatientState(newPatient);

    // Don't use localStorage for mini-app sessions
    if (initialSuperAppToken) return;

    if (newPatient) {
      // Set new session with expiry
      const session: StoredSession = {
        patient: newPatient,
        expiry: new Date().getTime() + SESSION_DURATION_MS,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      // Clear session on logout
      localStorage.removeItem(SESSION_KEY);
    }
  }, [initialSuperAppToken]);
  
  if (!isInitialized) {
      // Prevents a flash of incorrect UI while session is being determined.
      return null;
  }

  return (
    <PatientContext.Provider value={{ patient, setPatient: handleSetPatient, superAppToken }}>
      {children}
    </PatientContext.Provider>
  );
};
