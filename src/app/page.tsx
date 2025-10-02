'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Hospital as HospitalIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getHospitals,
  getDoctors,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const [hospital, setHospital] = useState<Hospital | undefined>();

  useEffect(() => {
    getHospitalById(doctor.hospitalId).then(setHospital);
  }, [doctor.hospitalId]);

  return (
    <Card className="flex flex-col text-center items-center p-4 shadow-lg transition-transform hover:-translate-y-1 h-full">
       <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50">
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
      <CardHeader className="p-2 items-center">
        <CardTitle className="font-headline text-lg">{doctor.name}</CardTitle>
        <Badge variant="secondary" className="mt-1 font-normal">{doctor.specialty}</Badge>
      </CardHeader>
      <CardContent className="flex-grow text-sm text-muted-foreground">
        {hospital && <p>{hospital.name}</p>}
      </CardContent>
      <CardFooter className="p-2 w-full">
         <Button asChild className="w-full" variant="outline">
            <Link href={`/doctors/${doctor.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function HospitalCard({ hospital }: { hospital: Hospital }) {
  const hospitalImage = placeholderImages.find((p) => p.id === hospital.imageId);
  return (
    <Card className="overflow-hidden shadow-lg transition-transform hover:-translate-y-1 h-full flex flex-col">
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
      <CardHeader>
        <CardTitle className="font-headline text-lg">{hospital.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow"></CardContent>
      <CardFooter>
        <Button asChild className="w-full" variant="outline">
            <Link href={`/hospitals/${hospital.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getHospitals().then(setHospitals);
    getDoctors().then(doctors => {
        setDoctors(doctors);
        // Mocking recommended doctors logic by taking a slice
        setRecommendedDoctors(doctors.slice(0, 4));
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold font-headline mb-2">
          Welcome to MediVerse
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Your health, simplified. Find and book appointments with top doctors near you.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/search">Book Appointment</Link>
        </Button>
      </section>

      {/* Tabbed Filter Area */}
      <Tabs defaultValue="hospitals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-8">
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
        </TabsList>

        <TabsContent value="hospitals">
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {hospitals.map((hospital) => (
                <HospitalCard key={hospital.id} hospital={hospital} />
            ))}
            </div>
        </TabsContent>

        <TabsContent value="doctors">
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
            </div>
        </TabsContent>

        <TabsContent value="recommended">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommendedDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
