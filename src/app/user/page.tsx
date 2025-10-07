
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getHospitals, getDoctors, getHospitalById } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import type { Hospital, Doctor } from '@/lib/definitions';
import { Logo } from '@/components/icons';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const [hospital, setHospital] = useState<Hospital | undefined>();

  useEffect(() => {
    getHospitalById(doctor.hospitalId).then(setHospital);
  }, [doctor.hospitalId]);

  return (
     <div className="flex flex-col items-center text-center space-y-2">
        <Link href={`/user/doctors/${doctor.id}`} className="block">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
            {doctorImage && (
                <AvatarImage
                src={doctorImage.imageUrl}
                alt={doctor.name}
                data-ai-hint={doctorImage.imageHint}
                />
            )}
            <AvatarFallback><User /></AvatarFallback>
            </Avatar>
        </Link>
        <div className='w-40'>
            <p className="font-semibold text-foreground truncate">{doctor.name}</p>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
             {hospital && <p className="text-xs text-muted-foreground truncate">{hospital.name}</p>}
        </div>
         <Button asChild size="sm" variant="accent" className="rounded-full w-full">
            <Link href={`/user/doctors/${doctor.id}`}>Book</Link>
        </Button>
    </div>
  );
}

function HospitalCard({ hospital }: { hospital: Hospital }) {
  const hospitalImage = placeholderImages.find((p) => p.id === hospital.imageId);
  return (
    <Card className="overflow-hidden shadow-lg h-full flex flex-col w-full">
       {hospitalImage && (
        <div className="aspect-video relative overflow-hidden">
            <Image
                src={hospitalImage.imageUrl}
                alt={hospital.name}
                fill
                className="object-cover"
                data-ai-hint={hospitalImage.imageHint}
            />
        </div>
        )}
      <CardHeader className="p-4">
        <CardTitle className="font-headline text-base">{hospital.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{hospital.city}</p>
      </CardHeader>
      <CardFooter className="p-4 mt-auto">
        <Button asChild className="w-full" variant="outline">
            <Link href={`/user/hospitals/${hospital.id}`}>Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  useEffect(() => {
    getHospitals().then(setHospitals);
    getDoctors().then(setDoctors);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="space-y-8 p-4">

      {/* Welcome Banner */}
      <Card className="bg-primary/20 border-primary/50 text-center shadow-lg">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold font-headline text-primary-foreground">Welcome to MediVerse</h1>
          <p className="text-muted-foreground mt-2 mb-4">Your health, simplified. Book your appointments with top doctors near you.</p>
          <Button asChild size="lg" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/user/doctors">Book Appointment</Link>
          </Button>
        </CardContent>
      </Card>
      
      {/* Hospitals Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline text-2xl font-bold">Hospitals</h2>
            <Link href="/user/hospitals" className="text-sm font-medium text-accent-foreground flex items-center gap-1">
                See All <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
        <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
                {hospitals.map((hospital) => (
                <CarouselItem key={hospital.id} className="basis-3/4 md:basis-1/3 lg:basis-1/4 pl-4">
                    <HospitalCard hospital={hospital} />
                </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
      </section>

      {/* Doctors Section */}
       <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline text-2xl font-bold">Top Doctors</h2>
            <Link href="/user/doctors" className="text-sm font-medium text-accent-foreground flex items-center gap-1">
                See All <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
        <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
                {doctors.map((doctor) => (
                <CarouselItem key={doctor.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pl-4">
                   <DoctorCard doctor={doctor} />
                </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
      </section>

    </div>
    </div>
  );
}
