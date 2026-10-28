import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CenteredCard, ctaClass } from '@/components/patient-portal/ui';

// Landing page for YagoutPay returns we could not match to an appointment.
// Nothing was changed; the patient can check their bookings.
export default function PaymentErrorPage() {
  return (
    <CenteredCard
      icon={AlertTriangle}
      tone="danger"
      title="We could not confirm this payment"
      description="We could not match the payment response to a booking. If money was taken from your account, please contact the hospital with your payment reference. Otherwise, check your appointments or book again."
    >
      <div className="flex flex-col gap-2">
        <Button asChild variant="brand" className={ctaClass}>
          <Link href="/user/appointments">My appointments</Link>
        </Button>
        <Button asChild variant="brandOutline" className={ctaClass}>
          <Link href="/user/doctors">Book an appointment</Link>
        </Button>
      </div>
    </CenteredCard>
  );
}
