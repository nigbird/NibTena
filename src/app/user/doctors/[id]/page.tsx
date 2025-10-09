
'use client';

import prisma from '@/lib/prisma';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Stethoscope, User, Hospital, Wallet, Calendar, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import type { Doctor, Hospital as HospitalType } from '@/lib/definitions';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

async function getDoctorById(id: number): Promise<(Doctor & { hospitalIds: number[] }) | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: { hospitals: true }
  });
  if (!doctor) return null;
  return {
    ...doctor,
    status: doctor.status as any,
    hospitalIds: doctor.hospitals.map(h => h.hospitalId),
  };
}

async function getHospitalById(id: number): Promise<HospitalType | null> {
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital) return null;
  return { ...hospital, status: hospital.status as 'active' | 'inactive' };
}

// Mock schedules for different hospitals
const hospital1Slots = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
];

const hospital2Slots = [
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
];

const defaultSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
];


export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = Number(params.id);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | undefined>();
  const [doctorHospitals, setDoctorHospitals] = useState<HospitalType[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      if (!doctorId) return;
      const doctorData = await getDoctorById(doctorId);
      if (!doctorData) {
        notFound();
      }
      setDoctor(doctorData);
      
      if (doctorData.hospitalIds.length > 0) {
         const hospitalPromises = doctorData.hospitalIds.map(id => getHospitalById(id));
         const hospitals = (await Promise.all(hospitalPromises)).filter((h): h is HospitalType => !!h);
         setDoctorHospitals(hospitals);
         
         // Set selected hospital from URL param or default to first
         const hospitalIdParam = searchParams.get('hospitalId');
         const initialHospitalId = hospitalIdParam ? Number(hospitalIdParam) : hospitals[0]?.id;
         setSelectedHospitalId(initialHospitalId);
      }
    }
    fetchData();
  }, [doctorId, searchParams]);

  useEffect(() => {
    // Reset selected slot when hospital changes
    setSelectedSlot(null);
  }, [selectedHospitalId]);

  const availableSlots = useMemo(() => {
    if (selectedHospitalId === 1) return hospital1Slots;
    if (selectedHospitalId === 2) return hospital2Slots;
    return defaultSlots;
  }, [selectedHospitalId]);

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  }, []);

  const doctorImage = useMemo(() => {
    if (!doctor) return null;
    return placeholderImages.find((p) => p.id === doctor.imageId);
  }, [doctor]);
  
  const selectedHospital = useMemo(() => {
      return doctorHospitals.find(h => h.id === selectedHospitalId);
  }, [selectedHospitalId, doctorHospitals]);

  if (!doctor) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading doctor profile...</p>
      </div>
    );
  }

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


               {doctorHospitals.length > 1 ? (
                <Select 
                    value={selectedHospitalId?.toString()}
                    onValueChange={(val) => setSelectedHospitalId(Number(val))}
                >
                    <SelectTrigger className="w-full max-w-xs mx-auto mt-4">
                        <SelectValue placeholder="Select Hospital" />
                    </SelectTrigger>
                    <SelectContent>
                        {doctorHospitals.map(h => <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>)}
                    </SelectContent>
                </Select>
               ) : selectedHospital && (
                 <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Hospital className="h-4 w-4" />
                    <span>{selectedHospital.name}</span>
                </div>
               )}
            </div>
            <div className="md:col-span-2 p-8">
              <div className="mb-8">
                <h2 className="font-headline text-2xl font-semibold mb-2">
                  About
                </h2>
                <p className="text-muted-foreground">{doctor.bio}</p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h2 className="font-headline text-2xl font-semibold flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-accent-foreground" />
                    Book an Appointment
                  </h2>
                </div>
                
                {/* Date Picker */}
                <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
                    <CarouselContent className="-ml-2">
                        {next7Days.map((day, index) => (
                            <CarouselItem key={index} className="basis-auto pl-2">
                                <button
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-20 h-24 rounded-lg transition-colors",
                                        format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'bg-background hover:bg-muted'
                                    )}
                                >
                                    <span className="text-sm font-semibold">{format(day, 'EEE')}</span>
                                    <span className="text-2xl font-bold">{format(day, 'd')}</span>
                                    <span className="text-xs">{format(day, 'MMM')}</span>
                                </button>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>

                {/* Time Slots */}
                <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Available Slots for <span className="text-accent-foreground">{format(selectedDate, 'MMMM d')}</span>
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                        <Button
                            key={slot}
                            variant={selectedSlot === slot ? 'accent' : 'outline'}
                            onClick={() => setSelectedSlot(slot)}
                            className="transition-all duration-200"
                        >
                        {slot}
                        </Button>
                    ))}
                    </div>
                </div>

                <Button 
                    asChild
                    size="lg" 
                    className="w-full"
                    disabled={!selectedSlot || !selectedHospitalId}
                >
                    <Link
                        href={`/user/book/${doctor.id}?slot=${encodeURIComponent(selectedSlot || '')}&date=${encodeURIComponent(format(selectedDate, 'yyyy-MM-dd'))}&hospitalId=${selectedHospitalId}`}
                    >
                       Book Now
                    </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
