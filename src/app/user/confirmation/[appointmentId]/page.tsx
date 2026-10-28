import Link from 'next/link';
import { CheckCircle2, Calendar, Clock, User, Stethoscope, XCircle, Hourglass, AlertTriangle, Receipt, Hospital as HospitalIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DetailRow, IconBadge, PageShell, PortalCard, ctaClass, type Tone } from '@/components/patient-portal/ui';
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

const headings: Record<ViewState, { title: string; icon: typeof CheckCircle2; tone: Tone }> = {
    confirmed: { title: 'Appointment Confirmed!', icon: CheckCircle2, tone: 'success' },
    pending: { title: 'Payment Pending', icon: Hourglass, tone: 'warning' },
    failed: { title: 'Payment Failed', icon: XCircle, tone: 'danger' },
    expired: { title: 'Payment Window Expired', icon: Hourglass, tone: 'muted' },
    conflict: { title: 'Payment Received — Slot Unavailable', icon: AlertTriangle, tone: 'warning' },
    'needs-action': { title: 'Payment Needs Review', icon: AlertTriangle, tone: 'warning' },
    cancelled: { title: 'Appointment Cancelled', icon: XCircle, tone: 'muted' },
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

  return (
    <PageShell size="medium">
      <ConfirmationClient success={view === 'confirmed' && resolvedSearchParams?.success === 'true'} appointmentId={appointmentId}>
        <div className="space-y-4">
          <PortalCard className="p-6 text-center sm:p-8">
            <IconBadge icon={HeadingIcon} tone={heading.tone} size="lg" className="mx-auto rounded-full" />
            <h1 className="mt-4 font-headline text-2xl font-bold tracking-tight sm:text-3xl">{heading.title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">{descriptions[view]}</p>

            {isYagout && (view === 'failed' || view === 'expired') && (
              <div className="mt-6 flex justify-center">
                <RetryPaymentButton appointmentId={appointmentId} />
              </div>
            )}
            {isYagout && view === 'pending' && (
              <div className="mt-6 flex justify-center">
                <Button asChild variant="brand" className={ctaClass}>
                  <Link href={`/user/pay/${appointmentId}`}>Continue to payment</Link>
                </Button>
              </div>
            )}
          </PortalCard>

          <PortalCard className="p-5 sm:p-6">
            <h2 className="font-headline text-lg font-bold tracking-tight">Appointment details</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow icon={Stethoscope} label={doctor.specialty}>{doctor.name}</DetailRow>
              {appointment.hospital?.name && (
                <DetailRow icon={HospitalIcon} label="Hospital">{appointment.hospital.name}</DetailRow>
              )}
              <DetailRow icon={Calendar} label="Date">{format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}</DetailRow>
              <DetailRow icon={Clock} label="Time">{appointment.appointmentSlot}</DetailRow>
              <DetailRow icon={User} label={`Age ${appointment.patient.age ?? '-'} · ${appointment.patient.gender ?? '-'}`}>
                {appointment.patient.name}
              </DetailRow>
              {isYagout && appointment.paymentRef && (
                <DetailRow icon={Receipt} label={`Reference: ${appointment.paymentRef}`}>
                  {appointment.paidAmount != null ? `${appointment.paidAmount.toFixed(2)} ETB paid via YagoutPay` : 'YagoutPay'}
                </DetailRow>
              )}
            </div>

            {appointment.symptoms && (
              <div className="mt-5 rounded-xl bg-muted/60 p-4">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Symptoms & concerns</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{appointment.symptoms}</p>
              </div>
            )}

            {view === 'confirmed' && (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                You will receive an SMS confirmation shortly.
              </p>
            )}
            {(view === 'conflict' || view === 'needs-action') && appointment.hospital?.contactPhone && (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {hospitalName}: {appointment.hospital.contactPhone}
              </p>
            )}
          </PortalCard>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button asChild variant="brandOutline" className={ctaClass}>
              <Link href="/user/appointments">My bookings</Link>
            </Button>
            <Button asChild variant="brand" className={ctaClass}>
              <Link href="/user">Back to Home</Link>
            </Button>
          </div>
        </div>
      </ConfirmationClient>
    </PageShell>
  );
}
