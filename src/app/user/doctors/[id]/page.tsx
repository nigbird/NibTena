
'use client';

import { getDoctorById, getHospitalById } from '@/lib/data';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Stethoscope, User, Hospital, Wallet, Calendar } from 'lucide-react';
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

const availableSlots = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
];

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = Number(params.id);

  const [doctor, setDoctor] = useState<Doctor | undefined>();
  const [hospital, setHospital] = useState<HospitalType | undefined>();
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
      
      const hospitalData = await getHospitalById(doctorData.hospitalId);
      setHospital(hospitalData);
    }
    fetchData();
  }, [doctorId]);

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  }, []);

  const doctorImage = useMemo(() => {
    if (!doctor) return null;
    return placeholderImages.find((p) => p.id === doctor.imageId);
  }, [doctor]);

  if (!doctor) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/20">
      <div className="container py-12">
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
              {hospital && (
                <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Hospital className="h-4 w-4" />
                    <span>{hospital.name}</span>
                </div>
              )}
               <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>${doctor.consultationFee} Consultation Fee</span>
                </div>
            </div>
            <div className="md:col-span-2 p-8">
              <div className="mb-8">
                <h2 className="font-headline text-2xl font-semibold mb-2">
                  About
                </h2>
                <p className="text-muted-foreground">{doctor.bio}</p>
              </div>

              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-accent-foreground" />
                  Book an Appointment
                </h2>
                
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
                    disabled={!selectedSlot}
                >
                    <Link
                        href={`/user/book/${doctor.id}?slot=${encodeURIComponent(selectedSlot || '')}&date=${encodeURIComponent(format(selectedDate, 'yyyy-MM-dd'))}`}
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
