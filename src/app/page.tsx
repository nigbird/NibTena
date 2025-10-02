'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Hospital as HospitalIcon,
  Stethoscope,
  User,
  Search,
  Bot,
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getHospitals,
  getDoctors,
  getDoctorById,
  getHospitalById,
} from '@/lib/data';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { placeholderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import type { Hospital, Doctor } from '@/lib/definitions';

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const [hospital, setHospital] = useState<Hospital | undefined>();

  useEffect(() => {
    getHospitalById(doctor.hospitalId).then(setHospital);
  }, [doctor.hospitalId]);

  return (
    <Card className="flex flex-col text-center items-center pt-6 shadow-lg transition-transform hover:-translate-y-1 h-full">
      <CardHeader className="items-center p-4">
        <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
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
        <CardTitle className="font-headline">{doctor.name}</CardTitle>
        <Badge variant="secondary" className="mt-1">
          {doctor.specialty}
        </Badge>
        {hospital && (
          <p className="text-sm text-muted-foreground mt-2">{hospital.name}</p>
        )}
      </CardHeader>
      <CardContent className="flex-grow w-full">
        <Button asChild className="w-full" variant="accent">
          <Link href={`/doctors/${doctor.id}`}>View Profile</Link>
        </Button>
      </CardContent>
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

  const heroBannerImage = placeholderImages.find((p) => p.id === 'hero-banner');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Welcome back!</h1>
        <p className="text-muted-foreground">How are you feeling today?</p>
      </div>

      {/* Hero Banner */}
      {heroBannerImage && (
        <div className="relative rounded-lg overflow-hidden bg-primary/20 p-8 mb-12 flex items-center justify-between min-h-[180px]">
          <div className="z-10">
            <h2 className="text-2xl font-bold text-primary-foreground">
              Book and schedule with
              <br />
              the nearest doctor
            </h2>
            <Button asChild variant="accent" className="mt-4">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" /> Find Nearby
              </Link>
            </Button>
          </div>
          <Image
            src={heroBannerImage.imageUrl}
            alt={heroBannerImage.description}
            width={200}
            height={200}
            className="absolute right-4 bottom-0 z-0 opacity-80 hidden sm:block"
            data-ai-hint={heroBannerImage.imageHint}
          />
        </div>
      )}

      {/* Hospitals Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold font-headline">Hospitals</h2>
          <Button variant="link" asChild>
            <Link href="/hospitals">
              See All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent>
            {hospitals.map((hospital) => {
              const hospitalImage = placeholderImages.find(
                (p) => p.id === hospital.imageId
              );
              return (
                <CarouselItem
                  key={hospital.id}
                  className="basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <Card className="overflow-hidden">
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
                      <CardTitle className="font-headline text-base truncate">
                        {hospital.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/hospitals/${hospital.id}`}>Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:inline-flex" />
          <CarouselNext className="hidden md:inline-flex" />
        </Carousel>
      </section>

      {/* Recommended Doctors Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold font-headline">
            Recommended Doctors
          </h2>
          <Button variant="link" asChild>
            <Link href="/search">
              See All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {doctors.slice(0, 4).map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </section>
    </div>
  );
}
