
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import { getAppointmentById, getDoctorById } from '@/lib/data';
import { notFound } from 'next/navigation';
import type { Appointment, Doctor } from '@/lib/definitions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ConfirmationPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const [appointment, setAppointment] = useState<Appointment | undefined>();
  const [doctor, setDoctor] = useState<Doctor | undefined>();
  const searchParams = useSearchParams();
  const { toast } = useToast();

   useEffect(() => {
    async function fetchData() {
      if (!appointmentId) return;
      const appt = await getAppointmentById(appointmentId);
      if (!appt) {
        notFound();
      }
      setAppointment(appt);
      
      const doc = await getDoctorById(appt.doctorId);
      if (!doc) {
        notFound();
      }
      setDoctor(doc);
    }
    fetchData();
  }, [appointmentId]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: 'Booking Confirmed!',
        description: 'Your appointment has been successfully booked.',
      });
      // Clean up the URL
      window.history.replaceState(null, '', `/user/confirmation/${appointmentId}`);
    }
  }, [searchParams, toast, appointmentId]);

  const confirmationImage = placeholderImages.find(p => p.id === 'confirmation-image');

  if (!appointment || !doctor) {
    return <div>Loading confirmation...</div>;
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden shadow-xl">
          {confirmationImage && (
            <div className="relative h-48 w-full">
              <Image
                src={confirmationImage.imageUrl}
                alt={confirmationImage.description}
                fill
                className="object-cover"
                data-ai-hint={confirmationImage.imageHint}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}
          <div className="p-8 text-center -mt-16">
            <div className="inline-block rounded-full bg-accent p-4 ring-4 ring-background">
              <CheckCircle2 className="h-12 w-12 text-accent-foreground" />
            </div>

            <CardHeader className="p-0 pt-4">
              <CardTitle className="font-headline text-3xl">Appointment Confirmed!</CardTitle>
              <CardDescription className="text-lg">
                Your appointment with {doctor.name} is booked.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 text-left">
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start">
                  <Stethoscope className="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">{doctor.name}</span>
                    <p className="text-sm">{doctor.specialty}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <User className="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">{appointment.patientName}</span>
                    <p className="text-sm">Age: {appointment.patientAge}, Gender: {appointment.patientGender}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span>{appointment.appointmentDate}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span>{appointment.appointmentSlot}</span>
                </div>
              </div>

              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-foreground">Symptoms & Concerns</h3>
                <p className="text-sm whitespace-pre-wrap">{appointment.symptoms}</p>
              </div>

               <p className="mt-6 text-center text-sm text-muted-foreground">
                You will receive an SMS confirmation shortly.
              </p>
            </CardContent>
          </div>
        </Card>
        <div className="mt-6 text-center">
            <Button asChild>
                <Link href="/user">Back to Home</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
