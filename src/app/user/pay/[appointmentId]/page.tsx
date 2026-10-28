import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, Hospital, Stethoscope, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CenteredCard, DetailRow, PageShell, PortalCard, ctaClass } from '@/components/patient-portal/ui';
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
    <CenteredCard icon={CreditCard} tone="muted" title={title} description={message}>
      <div className="flex flex-col gap-2">
        <Button asChild variant="brand" className={ctaClass}>
          <Link href={doctorId ? `/user/doctors/${doctorId}` : '/user/doctors'}>Book again</Link>
        </Button>
        <Button asChild variant="brandOutline" className={ctaClass}>
          <Link href="/user/appointments">My appointments</Link>
        </Button>
      </div>
    </CenteredCard>
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
    <PageShell size="narrow" className="py-10">
      <PortalCard className="overflow-hidden">
        <div className="bg-gradient-to-br from-[hsl(var(--primary-foreground))] to-secondary px-6 py-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Consultation fee</p>
          <p className="mt-1 font-headline text-3xl font-bold">
            {amount} {currency}
          </p>
        </div>
        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <DetailRow icon={Hospital} label="Hospital">{appointment.hospital.name}</DetailRow>
            <DetailRow icon={Stethoscope} label={appointment.doctor.specialty}>{appointment.doctor.name}</DetailRow>
            <DetailRow icon={Calendar} label="Date">{format(appointment.appointmentDate, 'PPP')}</DetailRow>
            <DetailRow icon={Clock} label="Time">{appointment.appointmentSlot}</DetailRow>
          </div>

          <p className="rounded-xl bg-muted/60 p-3 text-center text-sm text-muted-foreground">
            Taking you to YagoutPay to complete this payment securely. Your slot is held until{' '}
            <span className="font-semibold text-foreground">{format(appointment.paymentExpiresAt, 'p')}</span>.
          </p>

          <YagoutAutoSubmitForm
            postUrl={stored.postUrl}
            meId={stored.meId}
            merchantRequest={stored.merchantRequest}
            hash={stored.hash}
          />

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Do not close this window until the payment completes.
          </p>
        </div>
      </PortalCard>
    </PageShell>
  );
}
