'use client';

import { getDoctorsByHospitalId, getHospitalById } from '@/lib/data';
import { notFound } from 'next/navigation';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import Header from '@/components/header';

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


export default function HospitalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const hospitalId = Number(params.id);
  const [hospital, setHospital] = useState<Hospital | undefined>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
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

  if (!hospital) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  const hospitalImage = placeholderImages.find(
    (p) => p.id === hospital.imageId
  );
  
  const featuredDoctors = doctors.sort((a, b) => b.rating - a.rating).slice(0, 5);

  return (
    <div className="flex flex-col">
       <Header title={hospital.name} />
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
        </div>
        <div className="p-4 -mt-8">
            <h1 className="font-headline text-2xl font-bold text-foreground">
              {hospital.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hospital.city}
            </p>
        </div>

      <div className="px-4 pb-4">
        <h2 className="font-headline text-xl font-bold mb-4">Specialties</h2>
         <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
                {specialties.map((specialty) => {
                    const Icon = specialtyIcons[specialty] || User;
                    const colorClasses = specialtyColors[specialty as keyof typeof specialtyColors] || 'bg-gray-100 text-gray-700';
                    return (
                        <CarouselItem key={specialty} className="basis-1/4 sm:basis-1/5 md:basis-1/6 pl-4">
                             <Link href={`/search?specialty=${specialty}`} className="flex flex-col items-center justify-center space-y-2 group">
                                <div className={cn("flex h-16 w-16 items-center justify-center rounded-full transition-all group-hover:scale-105", colorClasses)}>
                                    <Icon className="h-8 w-8" />
                                </div>
                                <p className="text-xs font-medium text-center text-muted-foreground">{specialty}</p>
                            </Link>
                        </CarouselItem>
                    )
                })}
            </CarouselContent>
        </Carousel>
      </div>

       <div className="p-4">
        <h2 className="font-headline text-xl font-bold mb-4">Featured Doctors</h2>
        <div className="space-y-4">
          {featuredDoctors.map((doctor) => {
            const doctorImage = placeholderImages.find(
              (p) => p.id === doctor.imageId
            );
            return (
              <Card
                key={doctor.id}
                className="flex items-center p-3 gap-4 shadow-md"
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
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-muted-foreground">{doctor.rating}</span>
                  </div>
                </div>
                <Button
                    asChild
                    size="sm"
                    variant="accent"
                    className="rounded-full"
                >
                    <Link href={`/doctors/${doctor.id}`}>
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
