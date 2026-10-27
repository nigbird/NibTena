import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Calendar, Clock, User, Stethoscope, XCircle, Hourglass, AlertTriangle, Receipt } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import ConfirmationClient, { RetryPaymentButton } from './ConfirmationClient';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { getPatientFromCookie, hasValidMiniAppSession } from '@/lib/session';
import PatientAuth from '@/app/user/appointments/PatientAuth';

export const dynamic = 'force-dynamic';

async function getConfirmationData(appointmentId: string, patientId: number) {
    // Only the owning patient may view their appointment.
    const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId },
        select: {
            doctorId: true,
            appointmentDate: true,
            appointmentSlot: true,
            symptoms: true,
            status: true,
            paymentMethod: true,
            paymentExpiresAt: true,
            paymentRef: true,
            paidAmount: true,
            paidAt: true,
            hospital: { select: { name: true, contactPhone: true } },
            patient: {
                select: { name: true, age: true, gender: true },
            },
        },
    });

    if (!appointment) {
        return { appointment: null, doctor: null };
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: appointment.doctorId },
      select: {
        name: true,
        specialty: true,
      }
    });

    return { appointment, doctor };
}

type ViewState = 'confirmed' | 'pending' | 'failed' | 'expired' | 'conflict' | 'needs-action' | 'cancelled';

function viewStateFor(appointment: { status: string; paymentMethod: string | null; paymentExpiresAt: Date | null; paidAmount: number | null }): ViewState {
    switch (appointment.status) {
        case 'pending-payment':
            // A lapsed Yagout hold reads as expired even before the sweep marks it.
            if (appointment.paymentMethod === 'YAGOUT' && appointment.paymentExpiresAt && appointment.paymentExpiresAt <= new Date()) {
                return 'expired';
            }
            return 'pending';
        case 'payment-failed':
            // Money was reported taken but the amount did not match: not retryable.
            return appointment.paidAmount != null ? 'needs-action' : 'failed';
        case 'payment-expired':
            return 'expired';
        case 'paid-slot-conflict':
            return 'conflict';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'confirmed';
    }
}

const headings: Record<ViewState, { title: string; icon: typeof CheckCircle2; tone: string }> = {
    confirmed: { title: 'Appointment Confirmed!', icon: CheckCircle2, tone: 'bg-accent text-accent-foreground' },
    pending: { title: 'Payment Pending', icon: Hourglass, tone: 'bg-muted text-muted-foreground' },
    failed: { title: 'Payment Failed', icon: XCircle, tone: 'bg-destructive text-destructive-foreground' },
    expired: { title: 'Payment Window Expired', icon: Hourglass, tone: 'bg-muted text-muted-foreground' },
    conflict: { title: 'Payment Received — Slot Unavailable', icon: AlertTriangle, tone: 'bg-amber-500 text-white' },
    'needs-action': { title: 'Payment Needs Review', icon: AlertTriangle, tone: 'bg-amber-500 text-white' },
    cancelled: { title: 'Appointment Cancelled', icon: XCircle, tone: 'bg-muted text-muted-foreground' },
};

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>, searchParams?: Promise<{ success?: string }> }) {
  const { appointmentId } = await params;

  const patient = await getPatientFromCookie();
  if (!patient) {
    // Web patients returning from YagoutPay after their 15-minute session has
    // lapsed re-verify and come straight back here.
    if (await hasValidMiniAppSession()) notFound();
    return <PatientAuth />;
  }

  const { appointment, doctor } = await getConfirmationData(appointmentId, patient.id);

  if (!appointment || !doctor) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const view = viewStateFor(appointment);
  const heading = headings[view];
  const HeadingIcon = heading.icon;
  const isYagout = appointment.paymentMethod === 'YAGOUT';
  const hospitalName = appointment.hospital?.name ?? 'the hospital';

  const descriptions: Record<ViewState, string> = {
    confirmed: `Your appointment with ${doctor.name} is booked.`,
    pending: isYagout
      ? 'We have not received your payment yet. Your slot is held until the payment window closes.'
      : 'We are waiting for your payment to be confirmed by the Super App.',
    failed: 'Your payment did not go through, so the slot has been released. You can try again.',
    expired: 'The time to pay ran out and the slot was released. You can try again if it is still free.',
    conflict: `Your payment was received, but the slot was taken before it arrived. Please contact ${hospitalName} to rebook or get a refund.`,
    'needs-action': `Your payment was received but could not be matched to this booking. Please contact ${hospitalName} with your payment reference.`,
    cancelled: 'This appointment has been cancelled.',
  };

  const confirmationImage = placeholderImages.find(p => p.id === 'confirmation-image');

  return (
    <div className="container py-12">
      <ConfirmationClient success={view === 'confirmed' && resolvedSearchParams?.success === 'true'} appointmentId={appointmentId}>
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
              <div className={`inline-block rounded-full p-4 ring-4 ring-background ${heading.tone}`}>
                <HeadingIcon className="h-12 w-12" />
              </div>

              <CardHeader className="p-0 pt-4">
                <CardTitle className="font-headline text-3xl">{heading.title}</CardTitle>
                <CardDescription className="text-lg">
                  {descriptions[view]}
                </CardDescription>
              </CardHeader>

              {isYagout && (view === 'failed' || view === 'expired') && (
                <div className="mt-6 flex justify-center">
                  <RetryPaymentButton appointmentId={appointmentId} />
                </div>
              )}
              {isYagout && view === 'pending' && (
                <div className="mt-6 flex justify-center">
                  <Button asChild variant="accent">
                    <Link href={`/user/pay/${appointmentId}`}>Continue to payment</Link>
                  </Button>
                </div>
              )}

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
                      <span className="font-semibold text-foreground">{appointment.patient.name}</span>
                      <p className="text-sm">Age: {appointment.patient.age}, Gender: {appointment.patient.gender}</p>
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
                  {isYagout && appointment.paymentRef && (
                    <div className="flex items-start">
                      <Receipt className="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">
                          {appointment.paidAmount != null ? `${appointment.paidAmount.toFixed(2)} ETB paid via YagoutPay` : 'YagoutPay'}
                        </span>
                        <p className="text-sm">Reference: {appointment.paymentRef}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                  <h3 className="mb-2 font-semibold text-foreground">Symptoms & Concerns</h3>
                  <p className="text-sm whitespace-pre-wrap">{appointment.symptoms}</p>
                </div>

                {view === 'confirmed' && (
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    You will receive an SMS confirmation shortly.
                  </p>
                )}
                {(view === 'conflict' || view === 'needs-action') && appointment.hospital?.contactPhone && (
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {hospitalName}: {appointment.hospital.contactPhone}
                  </p>
                )}
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
