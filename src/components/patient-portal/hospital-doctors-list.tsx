
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Stethoscope } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import type { Doctor } from '@/lib/definitions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    <div className="p-4 space-y-4">
      <h2 className="font-headline text-xl font-bold">Our Doctors</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex pb-2 space-x-2">
          {allSpecialties.map((specialty) => (
            <button
              key={specialty}
              onClick={() => setSelectedSpecialty(specialty)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm font-semibold transition-colors',
                selectedSpecialty === specialty
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-transparent hover:bg-muted'
              )}
            >
              {specialty}
            </button>
          ))}
        </div>
      </ScrollArea>

      {filteredDoctors.length > 0 ? (
        <div className="space-y-4">
          {filteredDoctors.map((doctor) => {
            const doctorImage = placeholderImages.find(
              (p) => p.id === doctor.imageId
            );
            return (
              <Card
                key={doctor.id}
                className="flex items-start p-4 gap-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  {doctorImage && (
                    <AvatarImage
                      src={doctorImage.imageUrl}
                      alt={doctor.name}
                      data-ai-hint={doctorImage.imageHint}
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
                </div>
                 <Button asChild size="sm" variant="primary" className="self-center rounded-lg text-primary-foreground font-semibold hover:bg-primary/90">
                  <Link href={`/user/doctors/${doctor.id}?hospitalId=${hospitalId}`}>
                    View Profile
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-4">
          <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">
            No Doctors Found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No doctors match the selected specialty.
          </p>
        </div>
      )}
    </div>
  );
}
