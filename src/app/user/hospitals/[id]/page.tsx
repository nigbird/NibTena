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
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import type { Doctor } from '@/lib/definitions';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import HospitalDoctorsList from './HospitalDoctorsList';
import { prisma } from '@/lib/prisma';

const specialtyIcons: { [key: string]: React.ElementType } = {
  Cardiology: Heart,
  Neurology: Brain,
  Pediatrics: Baby,
  Orthopedics: Bone,
  Dentistry: Smile,
  Dermatology: Sparkles,
};

async function getHospitalData(hospitalId: number) {
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
    });

    if (!hospital) return { hospital: null, doctors: [], specialties: [] };

    const doctors = await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } }
    });

    const specialties = Array.from(new Set(doctors.map(d => d.specialty)));

    return { hospital, doctors, specialties };
}


export default async function HospitalDetailsPage({ params }: { params: { id: string }}) {
  const hospitalId = Number(params.id);
  const { hospital, doctors, specialties } = await getHospitalData(hospitalId);

  if (!hospital) {
    notFound();
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
        
      <HospitalDoctorsList 
        hospitalId={hospitalId}
        doctors={doctors as Doctor[]} 
        specialties={specialties} 
      />
    </div>
  );
}
