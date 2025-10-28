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

export const PatientProvider = ({
  children,
  initialPatient,
  initialSuperAppToken,
}: PatientProviderProps) => {
  const [patient, setPatientState] = useState<Patient | null>(initialPatient);
  const [superAppToken, setSuperAppToken] = useState<string | null>(initialSuperAppToken || null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initialSuperAppToken) {
      /**
       * MINI APP MODE:
       * Token and patient are managed by the SuperApp and provided via cookies.
       * No localStorage usage.
       */
      setPatientState(initialPatient);
      setSuperAppToken(initialSuperAppToken);
    } else {
      /**
       * STANDALONE WEB MODE:
       * Manage session using localStorage.
       */
      try {
        const storedSessionJSON = localStorage.getItem(SESSION_KEY);
        if (storedSessionJSON) {
          const storedSession: StoredSession = JSON.parse(storedSessionJSON);
          if (Date.now() < storedSession.expiry) {
            setPatientState(storedSession.patient);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to load patient session:', err);
        localStorage.removeItem(SESSION_KEY);
      }
    }

    setIsInitialized(true);
  }, [initialPatient, initialSuperAppToken]);

  const handleSetPatient = useCallback(
    (newPatient: Patient | null) => {
      setPatientState(newPatient);

      // MINI APP → cookies handle persistence, do nothing
      if (superAppToken) return;

      // STANDALONE WEB → persist to localStorage
      if (newPatient) {
        const session: StoredSession = {
          patient: newPatient,
          expiry: Date.now() + SESSION_DURATION_MS,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    },
    [superAppToken]
  );

  if (!isInitialized) {
    // Avoids flicker before determining session source
    return null;
  }

  return (
    <PatientContext.Provider
      value={{
        patient,
        setPatient: handleSetPatient,
        superAppToken,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};
