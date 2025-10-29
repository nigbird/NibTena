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

  // ✅ Helper for cookie handling
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  const setCookie = (name: string, value: string, durationMs: number) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + durationMs).toUTCString();
    // Use SameSite=None and Secure when appropriate so the cookie is available
    // in embedded contexts (e.g., mobile webview / super app). Secure requires HTTPS.
    const sameSite = 'Lax';
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    // Use SameSite=None in production only if you need cross-site cookies (super-app WebView).
    // Default to Lax for regular standalone web usage.
    const sameSiteAttr = process.env.NODE_ENV === 'production' ? '; SameSite=None' : `; SameSite=${sameSite}`;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}${sameSiteAttr}${secure}`;
  };

  const removeCookie = (name: string) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  };

  // ✅ Initialize from cookies (works both SSR and CSR)
  useEffect(() => {
    if (initialSuperAppToken) {
      // MINI APP → use provided props
      setPatientState(initialPatient);
    } else {
      // STANDALONE → read session from cookies
      try {
        const storedSession = getCookie(SESSION_KEY);
        if (storedSession) {
          const session: StoredSession = JSON.parse(storedSession);
          if (Date.now() < session.expiry) {
            setPatientState(session.patient);
          } else {
            removeCookie(SESSION_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to load patient session from cookie:', err);
        removeCookie(SESSION_KEY);
      }
    }
    setIsInitialized(true);
  }, [initialPatient, initialSuperAppToken]);

  // ✅ Setter persists to cookies
  const handleSetPatient = useCallback(
    (newPatient: Patient | null) => {
      setPatientState(newPatient);

      if (superAppToken) return; // MINI APP handled externally

      if (newPatient) {
        // Normalize phone to include +251 prefix to keep stored data consistent
        const normalizedPhone = (newPatient.phone || '').toString().replace(/^\+?251/, '');
        const patientToStore = {
          id: newPatient.id,
          name: newPatient.name,
          phone: `+251${normalizedPhone}`,
          age: newPatient.age,
          gender: newPatient.gender,
        } as Patient;

        const session: StoredSession = {
          patient: patientToStore,
          expiry: Date.now() + SESSION_DURATION_MS,
        };

        setCookie(SESSION_KEY, JSON.stringify(session), SESSION_DURATION_MS);
      } else {
        removeCookie(SESSION_KEY);
      }
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
