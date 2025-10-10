'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';
import { prisma } from '@/lib/prisma';
import { getDoctorById } from '@/app/doctor-portal/profile/actions';

// Mocking a logged-in doctor with ID 1
const MOCK_DOCTOR_ID = 1;

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

// This is a client component, but it needs data that should be fetched on the server.
// The data fetching logic is now removed from here. The parent layout will fetch it.
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
        setActiveHospitalId(initialHospitals[0].id);
    }
  }, [initialDoctor, initialHospitals, activeHospitalId]);

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
