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
    doctor: Doctor | null;
    doctorHospitals: Hospital[];
};

export const DoctorPortalProvider = ({ children, doctor: initialDoctor, doctorHospitals: initialHospitals }: DoctorPortalProviderProps) => {
  const [doctor, setDoctor] = useState<Doctor | null>(initialDoctor);
  const [doctorHospitals, setDoctorHospitals] = useState<Hospital[]>(initialHospitals);
  const [activeHospitalId, setActiveHospitalId] = useState<number | null>(null);

  useEffect(() => {
    setDoctor(initialDoctor);
    setDoctorHospitals(initialHospitals);
    if (initialHospitals.length > 0 && !activeHospitalId) {
        const storedHospitalId = localStorage.getItem('activeHospitalId');
        if (storedHospitalId && initialHospitals.some(h => h.id === Number(storedHospitalId))) {
          setActiveHospitalId(Number(storedHospitalId));
        } else {
          setActiveHospitalId(initialHospitals[0].id);
        }
    }
  }, [initialDoctor, initialHospitals, activeHospitalId]);

  const handleSetActiveHospitalId = (id: number) => {
    localStorage.setItem('activeHospitalId', id.toString());
    setActiveHospitalId(id);
  }

  return (
    <DoctorPortalContext.Provider
      value={{
        doctor,
        doctorHospitals,
        activeHospitalId,
        setActiveHospitalId: handleSetActiveHospitalId,
      }}
    >
      {children}
    </DoctorPortalContext.Provider>
  );
};
