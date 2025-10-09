
'use client';

import prisma from '@/lib/prisma';
import { notFound, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Heart,
  Brain,
  Baby,
  Bone,
  Smile,
  Sparkles,
  Star,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import { useEffect, useState, useMemo } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

async function getHospitalById(id: number): Promise<Hospital | null> {
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital) return null;
  return { ...hospital, status: hospital.status as 'active' | 'inactive' };
}

async function getDoctorsByHospitalId(hospitalId: number): Promise<Doctor[]> {
  const doctorsOnHospitals = await prisma.doctorsOnHospitals.findMany({
    where: { hospitalId },
    include: { doctor: true }
  });
  return doctorsOnHospitals.map(doh => ({
    ...doh.doctor,
    hospitalIds: [hospitalId], // context specific
    status: doh.doctor.status as any,
  }));
}

const specialtyIcons: { [key: string]: React.ElementType } = {
  Cardiology: Heart,
  Neurology: Brain,
  Pediatrics: Baby,
  Orthopedics: Bone,
  Dentistry: Smile,
  Dermatology: Sparkles,
};

const specialtyColors = {
  Cardiology: 'bg-red-100 text-red-700',
  Neurology: 'bg-blue-100 text-blue-700',
  Pediatrics: 'bg-pink-100 text-pink-700',
  Orthopedics: 'bg-gray-200 text-gray-800',
  Dentistry: 'bg-sky-100 text-sky-700',
  Dermatology: 'bg-purple-100 text-purple-700',
};


export default function HospitalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const hospitalId = Number(params.id);
  const [hospital, setHospital] = useState<Hospital | undefined>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    
    async function fetchData() {
      const hospitalData = await getHospitalById(hospitalId);
      if (!hospitalData) {
        notFound();
      }
      setHospital(hospitalData);

      const doctorsData = await getDoctorsByHospitalId(hospitalId);
      setDoctors(doctorsData);
      
      const uniqueSpecialties = Array.from(new Set(doctorsData.map(d => d.specialty)));
      setSpecialties(uniqueSpecialties);
    }
    fetchData();
  }, [hospitalId]);

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) {
      // Initially show top 5 rated as featured
      return doctors.sort((a, b) => b.rating - a.rating).slice(0, 5);
    }
    return doctors.filter(doctor => doctor.specialty === selectedSpecialty);
  }, [doctors, selectedSpecialty]);

  if (!hospital) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  const hospitalImage = placeholderImages.find(
    (p) => p.id === hospital.imageId
  );
  
  return (
    <div className="flex flex-col">
        <div className="relative h-48 w-full">
          {hospitalImage && (
            <Image
              src={hospitalImage.imageUrl}
              alt={hospital.name}
              fill
              className="object-cover"
              data-ai-hint={hospitalImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
           <div className="absolute bottom-0 left-0 p-4">
                <h1 className="font-headline text-3xl font-bold text-foreground shadow-black/50 text-shadow-lg">
                  {hospital.name}
                </h1>
                <p className="text-md font-semibold text-foreground/90 shadow-black/50 text-shadow">
                  {hospital.city}
                </p>
            </div>
        </div>
        
      <div className="px-4 pt-6 pb-4">
        <h2 className="font-headline text-xl font-bold mb-4">Specialties</h2>
         <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
                {specialties.map((specialty) => {
                    const Icon = specialtyIcons[specialty] || User;
                    const colorClasses = specialtyColors[specialty as keyof typeof specialtyColors] || 'bg-gray-100 text-gray-700';
                    return (
                        <CarouselItem key={specialty} className="basis-1/4 sm:basis-1/5 md:basis-1/6 pl-4">
                             <button onClick={() => setSelectedSpecialty(specialty)} className="flex flex-col items-center justify-center space-y-2 group w-full">
                                <div className={cn(
                                    "flex h-16 w-16 items-center justify-center rounded-full shadow-md transition-all group-hover:scale-105", 
                                    colorClasses,
                                    selectedSpecialty === specialty && 'ring-2 ring-primary ring-offset-2'
                                    )}>
                                    <Icon className="h-8 w-8" />
                                </div>
                                <p className="text-xs font-medium text-center text-muted-foreground">{specialty}</p>
                            </button>
                        </CarouselItem>
                    )
                })}
            </CarouselContent>
        </Carousel>
      </div>

       <div className="p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline text-xl font-bold">
                {selectedSpecialty ? `${selectedSpecialty} Doctors` : 'Featured Doctors'}
            </h2>
            {selectedSpecialty && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedSpecialty(null)} className="flex items-center gap-1">
                    <X className="h-4 w-4" /> Clear
                </Button>
            )}
        </div>
        <div className="space-y-4">
          {filteredDoctors.map((doctor) => {
            const doctorImage = placeholderImages.find(
              (p) => p.id === doctor.imageId
            );
            return (
              <Card
                key={doctor.id}
                className="flex items-center p-3 gap-4 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
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
                  <Badge 
                    variant="outline" 
                    className="border-0 bg-primary/20 text-secondary font-medium px-3 py-1 text-sm"
                    style={{ color: 'hsl(var(--secondary))', backgroundColor: 'hsla(var(--primary), 0.2)' }}
                    >
                    {doctor.specialty}
                  </Badge>
                </div>
                <Button
                    asChild
                    size="sm"
                    variant="primary"
                    className="rounded-lg text-primary-foreground font-semibold"
                >
                    <Link href={`/user/doctors/${doctor.id}?hospitalId=${hospitalId}`}>
                        Book
                    </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
