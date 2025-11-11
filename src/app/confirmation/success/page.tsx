
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';


import { Button } from '@/components/ui/button';
import { useContext } from 'react';
import { PatientContext } from '@/context/PatientContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { bookAppointment, type State } from './actions';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button variant="accent" type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        'Confirm & Book'
      )}
    </Button>
  );
}

export default function BookingPage() {
  const params = useParams();
  const doctorId = Number(params.doctorId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const slot = searchParams.get('slot') || 'Not specified';
  const dateParam = searchParams.get('date');
  const date = dateParam 
    ? format(new Date(dateParam), 'EEEE, MMMM d, yyyy')
    : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });


  const initialState: State = { message: null, errors: {} };
  const bookAppointmentWithParams = bookAppointment.bind(null, doctorId, slot, date);
  const [state, dispatch] = useActionState<State, FormData>(bookAppointmentWithParams, initialState);
  const { toast } = useToast();
  const { superAppToken } = useContext(PatientContext);
  const isMiniApp = !!superAppToken;

  useEffect(() => {
    if (state?.success === true && state.appointmentId) {
      // The toast is now shown on the confirmation page.
      // Redirect with a query param to trigger the toast there.
      router.push(`/user/confirmation/${state.appointmentId}?success=true`);
    } else if (state?.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: state.message,
      });
    }
  }, [state, toast, router]);

  return (
    <div className="container mx-auto max-w-2xl py-12">
        <div className="mb-4">
                {!isMiniApp && (
                  <Button variant="ghost" asChild className="group">
                      <Link href={`/user/doctors/${doctorId}`}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="mr-2 h-5 w-5 fill-secondary transition-colors duration-200 group-hover:fill-primary"
                            aria-hidden="true"
                          >
                            <path d="M10.78 19.03a.75.75 0 0 1-1.06 0l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 1 1 1.06 1.06L4.81 11.5h14.44a.75.75 0 0 1 0 1.5H4.81l5.97 5.97a.75.75 0 0 1 0 1.06Z" />
                          </svg>
                          Back to Profile
                      </Link>
                  </Button>
                )}
            </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Book Your Appointment</CardTitle>
          <CardDescription>
            You are booking for <span className="font-semibold text-accent-foreground">{slot}</span> on <span className="font-semibold text-accent-foreground">{date}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" name="fullName" placeholder="John Doe" required />
                    {state.errors?.fullName && <p className="text-sm font-medium text-destructive">{state.errors.fullName[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" placeholder="(123) 456-7890" required />
                     {state.errors?.phone && <p className="text-sm font-medium text-destructive">{state.errors.phone[0]}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" name="age" type="number" placeholder="30" required />
                     {state.errors?.age && <p className="text-sm font-medium text-destructive">{state.errors.age[0]}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select name="gender" required>
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                     {state.errors?.gender && <p className="text-sm font-medium text-destructive">{state.errors.gender[0]}</p>}
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms & Concerns (Optional)</Label>
              <Textarea
                id="symptoms"
                name="symptoms"
                placeholder="Briefly describe your symptoms."
                className="min-h-[120px]"
              />
               {state.errors?.symptoms && <p className="text-sm font-medium text-destructive">{state.errors.symptoms[0]}</p>}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
