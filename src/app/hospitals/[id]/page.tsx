'use client';

import {
  getDoctorsByHospitalId,
  getHospitalById,
  getHospitalSpecialties,
} from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useEffect, useState } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';

type GroupedDoctors = { [key: string]: Doctor[] };

export default function HospitalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const hospitalId = Number(params.id);
  const [hospital, setHospital] = useState<Hospital | undefined>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [groupedDoctors, setGroupedDoctors] = useState<GroupedDoctors>({});

  useEffect(() => {
    async function fetchData() {
      const hospitalData = await getHospitalById(hospitalId);
      if (!hospitalData) {
        notFound();
      }
      setHospital(hospitalData);

      const doctorsData = await getDoctorsByHospitalId(hospitalId);
      setDoctors(doctorsData);

      const specialtyData = await getHospitalSpecialties(hospitalId);
      setSpecialties(specialtyData);

      const grouped: GroupedDoctors = {};
      for (const doctor of doctorsData) {
        if (!grouped[doctor.specialty]) {
          grouped[doctor.specialty] = [];
        }
        grouped[doctor.specialty].push(doctor);
      }
      setGroupedDoctors(grouped);
    }
    fetchData();
  }, [hospitalId]);

  if (!hospital) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  const hospitalImage = placeholderImages.find(
    (p) => p.id === hospital.imageId
  );

  return (
    <div className="container py-12">
      <div className="mb-12">
        <div className="relative h-64 w-full rounded-lg overflow-hidden mb-8">
          {hospitalImage && (
            <Image
              src={hospitalImage.imageUrl}
              alt={hospital.name}
              fill
              className="object-cover"
              data-ai-hint={hospitalImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <h1 className="font-headline text-5xl font-bold text-white">
              {hospital.name}
            </h1>
          </div>
        </div>
        <p className="text-center text-lg text-muted-foreground">
          {hospital.city}
        </p>
      </div>

      <div className="text-center mb-12">
        <h2 className="font-headline text-3xl font-bold">Our Specialties</h2>
        <p className="mt-2 text-muted-foreground">
          Find doctors by their specialization.
        </p>
      </div>

      {specialties.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {specialties.map((specialty) => (
            <AccordionItem key={specialty} value={specialty}>
              <AccordionTrigger className="text-xl font-semibold">
                {specialty}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                  {(groupedDoctors[specialty] || []).map((doctor) => {
                    const doctorImage = placeholderImages.find(
                      (p) => p.id === doctor.imageId
                    );
                    return (
                      <Card
                        key={doctor.id}
                        className="flex items-center p-4 gap-4"
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
                        <div className="flex-1">
                          <h3 className="font-bold">{doctor.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {doctor.specialty}
                          </p>
                          <Button
                            asChild
                            variant="link"
                            className="p-0 h-auto mt-2"
                          >
                            <Link href={`/doctors/${doctor.id}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-center text-muted-foreground">
          No doctors found for this hospital.
        </p>
      )}
    </div>
  );
}
