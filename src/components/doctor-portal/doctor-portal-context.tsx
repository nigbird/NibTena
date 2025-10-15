
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
    if (doctorHospitals.length > 0 && !activeHospitalId) {
        const storedHospitalId = localStorage.getItem('activeHospitalId');
        if (storedHospitalId && doctorHospitals.some(h => h.id === Number(storedHospitalId))) {
          setActiveHospitalIdState(Number(storedHospitalId));
        } else {
          setActiveHospitalIdState(doctorHospitals[0].id);
        }
    }
  }, [doctorHospitals, activeHospitalId]);

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
