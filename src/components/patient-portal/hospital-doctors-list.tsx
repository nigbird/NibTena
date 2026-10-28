
'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import type { Doctor } from '@/lib/definitions';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DoctorRow, EmptyState, FilterChip, SectionTitle } from '@/components/patient-portal/ui';

export default function HospitalDoctorsList({
  hospitalId,
  doctors,
  specialties,
}: {
  hospitalId: number;
  doctors: Doctor[];
  specialties: string[];
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  const filteredDoctors =
    selectedSpecialty === 'All'
      ? doctors
      : doctors.filter((doctor) => doctor.specialty === selectedSpecialty);

  const allSpecialties = ['All', ...specialties];

  return (
    <section className="space-y-4">
      <SectionTitle title="Our Doctors" subtitle={`${doctors.length} ${doctors.length === 1 ? 'doctor' : 'doctors'} at this hospital`} />
      {doctors.length > 0 && (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-3">
          {allSpecialties.map((specialty) => (
            <FilterChip
              key={specialty}
              active={selectedSpecialty === specialty}
              onClick={() => setSelectedSpecialty(specialty)}
            >
              {specialty}
            </FilterChip>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      )}

      {filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredDoctors.map((doctor) => (
            <DoctorRow
              key={doctor.id}
              doctor={doctor}
              href={`/user/doctors/${doctor.id}?hospitalId=${hospitalId}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found"
          description={doctors.length > 0 ? 'No doctors match the selected specialty.' : 'This hospital has no doctors available for booking yet.'}
        />
      )}
    </section>
  );
}
