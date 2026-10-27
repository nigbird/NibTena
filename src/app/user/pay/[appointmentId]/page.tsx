import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, Hospital, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getWebPatientFromCookie } from '@/lib/session';
import PatientAuth from '@/app/user/appointments/PatientAuth';
import { YagoutAutoSubmitForm } from './auto-submit-form';

/**
 * Hands the patient off to YagoutPay. Modelled on payget's pay/yagout/[token].
 *
 * Yagout will not accept a server-side call for the hosted flow: the request
 * has to arrive as a form POST from a browser on a domain they have
 * whitelisted. A server component reads the signed form fields straight from
 * the appointment, so they are never exposed through a JSON endpoint.
 */

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ appointmentId: string }> };

type StoredRequest = {
  meId?: unknown;
  postUrl?: unknown;
  merchantRequest?: unknown;
  hash?: unknown;
  amount?: unknown;
  currency?: unknown;
};

function Notice({ title, message, doctorId }: { title: string; message: string; doctorId?: number }) {
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="shadow-lg text-center">
        <CardHeader>
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="accent">
            <Link href={doctorId ? `/user/doctors/${doctorId}` : '/user/doctors'}>Book again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/user/appointments">My appointments</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function YagoutHandoffPage({ params }: PageProps) {
  const { appointmentId } = await params;

  const patient = await getWebPatientFromCookie();
  if (!patient) {
    return <PatientAuth />;
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: patient.id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentExpiresAt: true,
      paymentRequest: true,
      doctorId: true,
      appointmentDate: true,
      appointmentSlot: true,
      doctor: { select: { name: true, specialty: true } },
      hospital: { select: { name: true } },
    },
  });

  if (!appointment || appointment.paymentMethod !== 'YAGOUT') {
    return <Notice title="Payment not found" message="We could not find a payment for this appointment." />;
  }

  if (appointment.status !== 'pending-payment') {
    return (
      <Notice
        title="This payment can no longer be made"
        message={appointment.status === 'confirmed' ? 'This appointment is already paid and confirmed.' : 'This booking is no longer awaiting payment.'}
        doctorId={appointment.doctorId}
      />
    );
  }

  if (!appointment.paymentExpiresAt || appointment.paymentExpiresAt <= new Date()) {
    return (
      <Notice
        title="Your slot hold has expired"
        message="The time reserved for this payment has run out and the slot has been released. Please book again."
        doctorId={appointment.doctorId}
      />
    );
  }

  // Built when the payment was raised and stored verbatim. Rebuilding here
  // could produce a different hash, and only the stored pair is the one Yagout
  // will accept for this order.
  const stored = (appointment.paymentRequest ?? {}) as StoredRequest;
  if (
    typeof stored.merchantRequest !== 'string' ||
    typeof stored.hash !== 'string' ||
    typeof stored.meId !== 'string' ||
    typeof stored.postUrl !== 'string'
  ) {
    return (
      <Notice
        title="This payment is not ready"
        message="The payment request for this booking is missing. Please book again."
        doctorId={appointment.doctorId}
      />
    );
  }

  const amount = typeof stored.amount === 'string' ? stored.amount : '';
  const currency = typeof stored.currency === 'string' ? stored.currency : 'ETB';

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardDescription className="uppercase tracking-wider text-xs font-semibold">Consultation fee</CardDescription>
          <CardTitle className="font-headline text-3xl">
            {amount} {currency}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Hospital className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">{appointment.hospital.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Stethoscope className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium text-foreground">{appointment.doctor.name}</span> · {appointment.doctor.specialty}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{format(appointment.appointmentDate, 'PPP')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{appointment.appointmentSlot}</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Taking you to YagoutPay to complete this payment securely. Your slot is held until{' '}
            {format(appointment.paymentExpiresAt, 'p')}.
          </p>

          <YagoutAutoSubmitForm
            postUrl={stored.postUrl}
            meId={stored.meId}
            merchantRequest={stored.merchantRequest}
            hash={stored.hash}
          />

          <p className="text-center text-[11px] text-muted-foreground">Do not close this window until the payment completes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
