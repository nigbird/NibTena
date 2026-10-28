

'use client';

import { useActionState, useEffect, useState, useContext } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { Loader2, User, Users, CreditCard, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
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
import { startBookingProcess, initiateBookingAndPayment, type State, getPhoneNumberFromCookie } from './actions';
import { initiateYagoutBooking, getYagoutAvailability } from './yagout-actions';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { PatientContext } from '@/context/PatientContext';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import { CenteredCard, PageShell, PhoneInput, PortalCard, SectionTitle, ctaClass } from '@/components/patient-portal/ui';


// Normalises the +251 phone field the same way the server does.
function toCanonicalPhone(input: string) {
  const s = String(input || '').replace(/\s+/g, '').replace(/^\+/, '');
  return s.startsWith('251') ? s : `251${s}`;
}

type BookingPageState = State & { redirectTo?: string };

function SubmitButton({ isMiniApp, label }: { isMiniApp: boolean; label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button variant="accent" type="submit" className={cn(ctaClass, 'w-full text-base')} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        label ?? (isMiniApp ? 'Proceed to Payment' : 'Proceed to Verification')
      )}
    </Button>
  );
}

export default function BookingPage() {
  const params = useParams();
  const doctorId = Number(params.doctorId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { patient, superAppToken } = useContext(PatientContext);
  const csrfToken = useCsrfToken();

  const isMiniApp = !!superAppToken;

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
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  // Web only: the number the payer uses on YagoutPay. Follows the patient's
  // phone until the user edits it.
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [paymentPhoneEdited, setPaymentPhoneEdited] = useState(false);
  useEffect(() => {
    if (!paymentPhoneEdited) setPaymentPhone(phoneNumber);
  }, [phoneNumber, paymentPhoneEdited]);
  // Web only: whether this hospital can take YagoutPay payments (null = checking).
  const [yagoutAvailable, setYagoutAvailable] = useState<boolean | null>(isMiniApp ? true : null);

  useEffect(() => {
    if (isMiniApp) return;
    getYagoutAvailability(hospitalId)
      .then(result => setYagoutAvailable(result.available))
      .catch(() => setYagoutAvailable(false));
  }, [isMiniApp, hospitalId]);

  // A web patient already verified for this phone goes straight to payment;
  // anyone else verifies by OTP first. The server re-checks both.
  const isVerifiedForPhone = !isMiniApp && !!patient?.phone && toCanonicalPhone(phoneNumber) === String(patient.phone);

  const initialState: BookingPageState = { message: null, errors: {} };

  const webAction = async (prevState: BookingPageState, formData: FormData): Promise<BookingPageState> => {
    if (isVerifiedForPhone) {
      const result = await initiateYagoutBooking(doctorId, hospitalId, slot, date, {}, formData);
      if (result.success) return { success: true, redirectTo: result.redirectTo };
      // Session expired since the page loaded: fall back to OTP verification.
      if (result.message !== 'Please verify your phone number to book.') {
        return { success: false, message: result.message, errors: result.errors as State['errors'] };
      }
    }
    return startBookingProcess(doctorId, hospitalId, slot, date, prevState, formData);
  };

  const actionToDispatch = isMiniApp 
    ? initiateBookingAndPayment.bind(null, doctorId, hospitalId, slot, date, superAppToken || '')
    : webAction;

  const [state, dispatch] = useActionState<BookingPageState, FormData>(actionToDispatch, initialState);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchPhoneNumber = async () => {
      try {
        // Booking for self: prefer patient.phone, otherwise (mini-app) try cookie/token
        if (bookingFor === 'myself') {
          if (patient?.phone) {
            setPhoneNumber(String(patient.phone).replace(/^\+?251/, ''));
          } else if (isMiniApp && superAppToken) {
            const phoneFromCookie = await getPhoneNumberFromCookie();
            if (phoneFromCookie) {
              setPhoneNumber(String(phoneFromCookie).replace(/^\+?251/, ''));
            }
          }
        }

        // Booking for someone else:
        // - In mini-app: fetch phone from super-app token/cookie and keep it (uneditable)
        // - In standalone web: clear so the user can type a different phone
        if (bookingFor === 'someoneElse') {
          if (isMiniApp && superAppToken) {
            const phoneFromCookie = await getPhoneNumberFromCookie();
            if (phoneFromCookie) {
              setPhoneNumber(String(phoneFromCookie).replace(/^\+?251/, ''));
            }
          } else {
            // standalone: clear the phone so it's editable for someone else
            setPhoneNumber('');
          }
        }
      } catch (error) {
        console.error('Error fetching phone number:', error);
      }
    };

    fetchPhoneNumber();
  }, [patient, isMiniApp, superAppToken, bookingFor]);

  
  useEffect(() => {
    if (state?.success) {
      if (isMiniApp) {
        if (state.paymentToken) {
          if (typeof window !== 'undefined' && (window as any).myJsChannel?.postMessage) {
            toast({
              title: "Redirecting to Payment",
              description: "Please complete your payment in the Super App.",
            });
            (window as any).myJsChannel.postMessage({ token: state.paymentToken });
            
            const transactionId = state.transactionId;
            if (transactionId) {
              let attempts = 0;
              const maxAttempts = 15; // Poll for 30 seconds
              const pollInterval = setInterval(async () => {
                try {
                  attempts++;
                  const response = await fetch(`/api/appointments/status?transactionId=${transactionId}`);
                  const data = await response.json();
                  
                  if (data.status === 'confirmed') {
                    clearInterval(pollInterval);
                    toast({
                      title: "Payment Successful",
                      description: "Your appointment has been confirmed!",
                    });
                    const redirectUrl = `/user/confirmation/${data.id}?success=true`;
                    router.push(redirectUrl);

                  } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    toast({
                      variant: "destructive",
                      title: "Payment Verification Timed Out",
                      description: "Please check your appointments list later to see if your booking was confirmed.",
                    });
                     router.push('/user/appointments');
                  }
                } catch (error) {
                  console.error("Error polling appointment status:", error);
                  if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    router.push('/user');
                  }
                }
              }, 2000);
            }
          } else {
            console.error("NIB Super App channel (window.myJsChannel) not found.");
            toast({
              variant: "destructive",
              title: "Integration Error",
              description: "Could not communicate with the payment app.",
            });
          }
        }
      } else { // Standalone app flow
        if (state.redirectTo) {
          toast({
            title: 'Redirecting to Payment',
            description: 'Taking you to YagoutPay to complete your payment.',
          });
          router.push(state.redirectTo);
        } else if (state.data) {
          toast({
            title: 'OTP Sent',
            description: 'A verification code has been sent to your phone.',
          });

          const bookingDetails = {
            bookingFor: state.data.bookingFor,
            fullName: state.data.fullName,
            phone: state.data.phone,
            age: state.data.age,
            gender: state.data.gender,
            symptoms: state.data.symptoms,
            paymentPhone,
            doctorId,
            hospitalId,
            appointmentSlot: slot,
            appointmentDate: date,
          };
          
          const params = new URLSearchParams({
            bookingData: JSON.stringify(bookingDetails),
            phone: state.data.phone,
          });
          router.push(`/user/verify/otp?${params.toString()}`);
        }
      }
    } else if (state?.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: state.message,
      });
    }
  }, [state, toast, router, doctorId, hospitalId, slot, date, isMiniApp, patient]);
  
  const isBookingForSelf = bookingFor === 'myself';

  if (!isMiniApp && yagoutAvailable === null) {
    return (
      <div className="flex w-full justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isMiniApp && !yagoutAvailable) {
    return (
      <CenteredCard
        icon={CreditCard}
        tone="muted"
        title="Online payment not yet available"
        description="This hospital is not accepting online payments yet, so appointments cannot be booked here on the web. Please contact the hospital directly or choose another hospital."
      >
        <Button variant="outline" className={cn(ctaClass, 'w-full')} onClick={() => router.back()}>Go back</Button>
      </CenteredCard>
    );
  }

  return (
    <PageShell size="medium">
      <PortalCard className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-primary/15 p-4 text-sm">
        <span className="flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4 text-secondary" /> {displayDate}</span>
        <span className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-secondary" /> {slot}</span>
      </PortalCard>
      <PortalCard className="p-5 sm:p-6">
          <SectionTitle title="Patient details" subtitle="Tell us who the appointment is for" />
          <form action={dispatch} className="mt-5 space-y-6">
            <input type="hidden" name="_csrf" value={csrfToken} />
            
            <div className="space-y-3">
                <Label>Who are you booking for?</Label>
                <RadioGroup name="bookingFor" value={bookingFor} onValueChange={(value: 'myself' | 'someoneElse') => setBookingFor(value)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="myself" className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors", bookingFor === 'myself' ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card hover:border-secondary/40 hover:bg-muted")}>
                        <RadioGroupItem value="myself" id="myself" className="sr-only" />
                        <User className="h-5 w-5" />
                        Myself
                    </Label>
                    <Label htmlFor="someoneElse" className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors", bookingFor === 'someoneElse' ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card hover:border-secondary/40 hover:bg-muted")}>
                         <RadioGroupItem value="someoneElse" id="someoneElse" className="sr-only" />
                        <Users className="h-5 w-5" />
                        Someone Else
                    </Label>
                </RadioGroup>
            </div>
            
            <div className="space-y-6 rounded-xl bg-muted/50 p-4">
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input key={`name-${bookingFor}`} id="fullName" name="fullName" placeholder="John Doe" defaultValue={isBookingForSelf && patient ? patient.name : ''} required />
                            {state.errors?.fullName && <p className="text-sm font-medium text-destructive">{state.errors.fullName[0]}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <PhoneInput
                            id="phone"
                            name="phone"
                            placeholder="912345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            readOnly={isMiniApp}
                          />
                          {state.errors?.phone && <p className="text-sm font-medium text-destructive">{state.errors.phone[0]}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input key={`age-${bookingFor}`} id="age" name="age" type="number" placeholder="30" defaultValue={isBookingForSelf && patient && patient.age ? patient.age.toString() : ''} required />
                            {state.errors?.age && <p className="text-sm font-medium text-destructive">{state.errors.age[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select key={`gender-${bookingFor}`} name="gender" defaultValue={isBookingForSelf && patient ? patient.gender || undefined : undefined} required>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms & Concerns (Optional)</Label>
              <Textarea
                id="symptoms"
                name="symptoms"
                placeholder="Briefly describe the patient's symptoms."
                className="min-h-[120px]"
              />
               {state.errors?.symptoms && <p className="text-sm font-medium text-destructive">{state.errors.symptoms[0]}</p>}
            </div>
            {!isMiniApp && (
              <div className="space-y-2">
                <Label htmlFor="paymentPhone">Phone Number for Payment</Label>
                <PhoneInput
                  id="paymentPhone"
                  name="paymentPhone"
                  placeholder="912345678"
                  value={paymentPhone}
                  onChange={(e) => { setPaymentPhoneEdited(true); setPaymentPhone(e.target.value); }}
                  required
                />
                <p className="text-xs text-muted-foreground">The number you will pay with on YagoutPay. It can differ from the patient&apos;s number.</p>
                {(state.errors as Record<string, string[] | undefined> | undefined)?.paymentPhone && (
                  <p className="text-sm font-medium text-destructive">{(state.errors as Record<string, string[]>).paymentPhone[0]}</p>
                )}
              </div>
            )}
            <SubmitButton isMiniApp={isMiniApp} label={isVerifiedForPhone ? 'Proceed to Payment' : undefined} />
          </form>
      </PortalCard>
    </PageShell>
  );
}

