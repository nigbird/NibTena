
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';

type DoctorPortalContextType = {
  doctor: Doctor | null;
  doctorHospitals: Hospital[];
  activeHospitalId: number | null;
  setActiveHospitalId: (id: number) => void;
};

export const DoctorPortalContext = createContext<DoctorPortalContextType>({
  doctor: null,
  doctorHospitals: [],
  activeHospitalId: null,
  setActiveHospitalId: () => {},
});

type DoctorPortalProviderProps = {
    children: ReactNode;
    doctor: Doctor;
    doctorHospitals: Hospital[];
};

export const DoctorPortalProvider = ({ children, doctor, doctorHospitals }: DoctorPortalProviderProps) => {
  const [activeHospitalId, setActiveHospitalIdState] = useState<number | null>(null);

  useEffect(() => {
    // This effect runs on the client after the initial server render
    if (doctorHospitals.length > 0) {
        const storedHospitalId = localStorage.getItem('activeHospitalId');
        // Ensure the stored ID is valid for the current doctor
        const isValidStoredId = storedHospitalId && doctorHospitals.some(h => h.id === Number(storedHospitalId));
        
        if (isValidStoredId) {
          setActiveHospitalIdState(Number(storedHospitalId));
        } else {
          // If no valid stored ID, default to the first hospital in the list
          const defaultHospitalId = doctorHospitals[0].id;
          setActiveHospitalIdState(defaultHospitalId);
          localStorage.setItem('activeHospitalId', defaultHospitalId.toString());
        }
    }
  }, [doctorHospitals]);

  const setActiveHospitalId = (id: number) => {
    localStorage.setItem('activeHospitalId', id.toString());
    setActiveHospitalIdState(id);
  }

  return (
    <DoctorPortalContext.Provider
      value={{
        doctor,
        doctorHospitals,
        activeHospitalId,
        setActiveHospitalId,
      }}
    >
      {children}
    </DoctorPortalContext.Provider>
  );
};
