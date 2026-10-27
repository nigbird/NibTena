import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Landing page for YagoutPay returns we could not match to an appointment.
// Nothing was changed; the patient can check their bookings.
export default function PaymentErrorPage() {
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="shadow-lg text-center">
        <CardHeader>
          <div className="mx-auto rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="font-headline text-xl pt-2">We could not confirm this payment</CardTitle>
          <CardDescription>
            We could not match the payment response to a booking. If money was taken from your account, please contact the
            hospital with your payment reference. Otherwise, check your appointments or book again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="accent">
            <Link href="/user/appointments">My appointments</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/user/doctors">Book an appointment</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
