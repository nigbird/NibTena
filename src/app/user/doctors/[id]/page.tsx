
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Stethoscope, Wallet, Hospital as HospitalIcon } from 'lucide-react';
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

  const selectedHospital = doctorHospitals.find(h => h.id === initialHospitalId) || doctorHospitals[0];

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 md:p-8 text-center shadow-lg rounded-2xl bg-card">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 border-4 border-primary/50 mx-auto">
                    {doctorImage && (
                    <AvatarImage
                        src={doctorImage.imageUrl}
                        alt={doctor.name}
                        data-ai-hint={doctorImage.imageHint}
                    />
                    )}
                    <AvatarFallback>
                    {doctor.name.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <h1 className="font-headline text-xl md:text-2xl font-semibold">
                    {doctor.name}
                </h1>
                <Badge variant="default" className="mt-2 text-sm md:text-md">
                    <Stethoscope className="mr-2 h-4 w-4" />
                    {doctor.specialty}
                </Badge>
                
                <div className="w-full text-left pt-6 space-y-4">
                    {selectedHospital && (
                         <div className="flex items-center gap-3 text-muted-foreground">
                            <HospitalIcon className="h-5 w-5 flex-shrink-0 text-accent"/>
                            <span className="font-medium text-foreground">{selectedHospital.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Wallet className="h-5 w-5 flex-shrink-0 text-accent" />
                        <span className="font-bold text-base md:text-lg text-foreground">${doctor.consultationFee} Consultation Fee</span>
                    </div>
                </div>
            </Card>
             <Card className="p-6 shadow-lg rounded-2xl">
                 <h2 className="font-headline text-lg md:text-xl font-semibold mb-2">
                  Professional Bio
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{doctor.bio}</p>
             </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 shadow-lg rounded-2xl">
               <h2 className="font-headline text-xl md:text-2xl font-semibold mb-4">Book an Appointment</h2>
               <DoctorBooking 
                  doctor={doctor} 
                  doctorHospitals={doctorHospitals as HospitalType[]} 
                  searchParams={searchParams}
                />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
