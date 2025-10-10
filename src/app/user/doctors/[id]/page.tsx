import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Stethoscope, User, Hospital, Wallet, Calendar, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import DoctorBooking from './DoctorBooking';
import { prisma } from '@/lib/prisma';
import type { Hospital as HospitalType } from '@/lib/definitions';


async function getDoctorData(doctorId: number) {
  const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
          hospitals: {
              include: {
                  hospital: true,
              },
          },
      },
  });

  if (!doctor) {
    return { doctor: null, doctorHospitals: [] };
  }
  
  const doctorHospitals = doctor.hospitals.map(h => h.hospital);

  return { doctor, doctorHospitals };
}


export default async function DoctorProfilePage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const doctorId = Number(params.id);
  
  const { doctor, doctorHospitals } = await getDoctorData(doctorId);

  if (!doctor) {
    notFound();
  }
  
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const hospitalIdParam = searchParams?.hospitalId;
  const initialHospitalId = hospitalIdParam 
    ? Number(hospitalIdParam) 
    : (doctorHospitals[0]?.id || null);

  return (
    <div className="bg-muted/20">
      <div className="container py-8">
        <Card className="overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-3">
            <div className="md:col-span-1 p-8 bg-primary/10 flex flex-col items-center justify-center text-center">
              <Avatar className="h-32 w-32 mb-4 border-4 border-primary/50">
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
              <h1 className="font-headline text-3xl font-bold text-primary-foreground">
                {doctor.name}
              </h1>
              <Badge variant="outline" className="mt-2 text-lg bg-background">
                <Stethoscope className="mr-2 h-4 w-4" />
                {doctor.specialty}
              </Badge>
              
               <div className="w-full max-w-xs mx-auto mt-6">
                <div 
                    className="flex items-center justify-center gap-3 rounded-lg px-4 py-3 shadow-sm border"
                    style={{ color: 'hsl(var(--secondary))', backgroundColor: 'hsla(var(--primary), 0.2)', borderColor: 'hsl(var(--primary))' }}
                >
                    <Wallet className="h-5 w-5" />
                    <span className="font-bold text-lg">${doctor.consultationFee} Appointment Fee</span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 p-8">
              <div className="mb-8">
                <h2 className="font-headline text-2xl font-semibold mb-2">
                  About
                </h2>
                <p className="text-muted-foreground">{doctor.bio}</p>
              </div>

              <DoctorBooking 
                doctor={doctor} 
                doctorHospitals={doctorHospitals as HospitalType[]} 
                initialHospitalId={initialHospitalId}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
