
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, User, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';


import { Button } from '@/components/ui/button';
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
import { startBookingProcess, type State } from './actions';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

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

// Mock data for the logged-in user
const loggedInPatient = {
    name: 'Hana Worku',
    age: 28,
    gender: 'female' as 'male' | 'female',
    phone: '912345678',
}

export default function BookingPage() {
  const params = useParams();
  const doctorId = Number(params.doctorId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const slot = searchParams.get('slot') || 'Not specified';
  const hospitalId = Number(searchParams.get('hospitalId'));
  const dateParam = searchParams.get('date');
  const date = dateParam 
    ? format(new Date(dateParam), 'yyyy-MM-dd')
    : new Date().toISOString().split('T')[0];
  
  const displayDate = dateParam
    ? format(new Date(dateParam), 'EEEE, MMMM d, yyyy')
    : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [bookingFor, setBookingFor] = useState<'myself' | 'someoneElse'>('myself');

  const initialState: State = { message: null, errors: {} };
  const startBookingWithParams = startBookingProcess.bind(null, doctorId, hospitalId, slot, date);
  const [state, dispatch] = useActionState<State, FormData>(startBookingWithParams, initialState);
  const { toast } = useToast();
  
  useEffect(() => {
    if (state?.success === true) {
      const bookingData = {
        bookingFor,
        fullName: state.data?.fullName,
        phone: state.data?.phone,
        age: state.data?.age,
        gender: state.data?.gender,
        symptoms: state.data?.symptoms,
      };
      
      const params = new URLSearchParams({
        bookingData: JSON.stringify({
          ...bookingData,
          doctorId,
          hospitalId,
          appointmentSlot: slot,
          appointmentDate: date,
        }),
      });
      router.push(`/user/verify/phone?${params.toString()}`);

    } else if (state?.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: state.message,
      });
    }
  }, [state, toast, router, bookingFor, doctorId, hospitalId, slot, date]);
  
  const isBookingForSelf = bookingFor === 'myself';

  return (
    <div className="container mx-auto max-w-2xl py-12">
        <div className="mb-4">
            <Button variant="ghost" asChild>
                <Link href={`/user/doctors/${doctorId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Profile
                </Link>
            </Button>
        </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Book Your Appointment</CardTitle>
          <CardDescription>
            You are booking for <span className="font-semibold text-foreground">{slot}</span> on <span className="font-semibold text-foreground">{displayDate}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} className="space-y-6">
            
            <div className="space-y-3">
                <Label>Who are you booking for?</Label>
                <RadioGroup name="bookingFor" value={bookingFor} onValueChange={(value: 'myself' | 'someoneElse') => setBookingFor(value)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="myself" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", bookingFor === 'myself' && "border-accent")}>
                        <RadioGroupItem value="myself" id="myself" className="sr-only" />
                        <User className="mb-3 h-6 w-6" />
                        Myself
                    </Label>
                    <Label htmlFor="someoneElse" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", bookingFor === 'someoneElse' && "border-accent")}>
                         <RadioGroupItem value="someoneElse" id="someoneElse" className="sr-only" />
                        <Users className="mb-3 h-6 w-6" />
                        Someone Else
                    </Label>
                </RadioGroup>
            </div>
            
            <Card className="bg-muted/30">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg font-semibold">Patient's Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-6">
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input key={`name-${bookingFor}`} id="fullName" name="fullName" placeholder="John Doe" defaultValue={isBookingForSelf ? loggedInPatient.name : ''} required />
                            {state.errors?.fullName && <p className="text-sm font-medium text-destructive">{state.errors.fullName[0]}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" name="phone" defaultValue={loggedInPatient.phone} placeholder="(123) 456-7890" required />
                          {state.errors?.phone && <p className="text-sm font-medium text-destructive">{state.errors.phone[0]}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input key={`age-${bookingFor}`} id="age" name="age" type="number" placeholder="30" defaultValue={isBookingForSelf ? loggedInPatient.age : ''} required />
                            {state.errors?.age && <p className="text-sm font-medium text-destructive">{state.errors.age[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select key={`gender-${bookingFor}`} name="gender" defaultValue={isBookingForSelf ? loggedInPatient.gender : undefined} required>
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
                </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms & Concerns</Label>
              <Textarea
                id="symptoms"
                name="symptoms"
                placeholder="Briefly describe the patient's symptoms."
                className="min-h-[120px]"
                required
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
