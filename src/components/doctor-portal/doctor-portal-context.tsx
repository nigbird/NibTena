'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';
import { getDoctorById, getHospitalById } from '@/lib/data';

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

export const DoctorPortalProvider = ({ children }: { children: ReactNode }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorHospitals, setDoctorHospitals] = useState<Hospital[]>([]);
  const [activeHospitalId, setActiveHospitalId] = useState<number | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const doctorData = await getDoctorById(MOCK_DOCTOR_ID);
      if (doctorData) {
        setDoctor(doctorData);

        const hospitalPromises = doctorData.hospitalIds.map(id => getHospitalById(id));
        const hospitals = (await Promise.all(hospitalPromises)).filter((h): h is Hospital => !!h);
        setDoctorHospitals(hospitals);

        if (hospitals.length > 0) {
          setActiveHospitalId(hospitals[0].id);
        }
      }
    }
    loadInitialData();
  }, []);

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
