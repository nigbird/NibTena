import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import ConfirmationClient from './ConfirmationClient';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

async function getConfirmationData(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
    });

    if (!appointment) {
        return { appointment: null, doctor: null };
    }

    const doctor = await prisma.doctor.findUnique({
        where: { id: appointment.doctorId },
    });

    return { appointment, doctor };
}


export default async function ConfirmationPage({ params, searchParams }: { params: { appointmentId: string }, searchParams?: { success?: string } }) {
  const appointmentId = params.appointmentId;
  const { appointment, doctor } = await getConfirmationData(appointmentId);

  if (!appointment || !doctor) {
    notFound();
  }

  const confirmationImage = placeholderImages.find(p => p.id === 'confirmation-image');

  return (
    <div className="container py-12">
      <ConfirmationClient success={searchParams?.success === 'true'} appointmentId={appointmentId}>
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
                    <span>{format(new Date(appointment.appointmentDate), 'PPP')}</span>
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
      </ConfirmationClient>
    </div>
  );
}
