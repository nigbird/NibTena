
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Hospital as HospitalIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DoctorSearch from '../app/user/doctors/DoctorSearch';

type DoctorsPageClientProps = {
  allDoctors: (Doctor & { hospitals: { hospital: Hospital }[] })[];
  specialties: string[];
  initialSpecialty?: string;
  initialQuery?: string;
};

function DoctorCard({ doctor }: { doctor: (Doctor & { hospitals: { hospital: Hospital }[] }) }) {
  const hospital = doctor.hospitals[0]?.hospital;

  return (
    <Card className="flex items-start p-4 gap-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
       <Avatar className="h-20 w-20 border-2 border-primary/20">
          {doctor.imageUrl && (
            <AvatarImage
              src={doctor.imageUrl}
              alt={doctor.name}
            />
          )}
          <AvatarFallback>
            <User />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
            <h3 className="font-bold text-lg">{doctor.name}</h3>
            <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-0 bg-primary/20 text-secondary font-medium px-3 py-1 text-sm"
                  style={{ color: 'hsl(var(--secondary))', backgroundColor: 'hsla(var(--primary), 0.2)' }}
                  >
                  {doctor.specialty}
                </Badge>
            </div>
            {hospital && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <HospitalIcon className="h-4 w-4" />
                <span>{hospital.name}</span>
            </div>
            )}
        </div>
        <Button asChild size="sm" variant="primary" className="self-center rounded-lg text-primary-foreground font-semibold hover:bg-primary/90">
            <Link href={`/user/doctors/${doctor.id}`}>View Profile</Link>
        </Button>
    </Card>
  );
}

export default function DoctorsPageClient({ allDoctors, specialties, initialSpecialty, initialQuery }: DoctorsPageClientProps) {
  const [specialty, setSpecialty] = useState(initialSpecialty || 'all');
  const [query, setQuery] = useState(initialQuery || '');

  const filteredDoctors = allDoctors.filter(doctor => {
    const specialtyMatch = specialty === 'all' || doctor.specialty === specialty;
    const nameMatch = query ? doctor.name.toLowerCase().includes(query.toLowerCase()) : true;
    return specialtyMatch && nameMatch;
  });

  return (
    <div className="p-4 space-y-8">
      <DoctorSearch
        specialties={specialties}
        selectedSpecialty={specialty}
        onSpecialtyChange={setSpecialty}
        searchQuery={query}
        onSearchQueryChange={setQuery}
      />

      {filteredDoctors.length > 0 ? (
        <div className="space-y-4">
          {filteredDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">
            No Doctors Found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filter.
          </p>
        </div>
      )}
    </div>
  );
}
