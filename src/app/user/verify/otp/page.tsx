
'use client';

import { Suspense, useState, useRef, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2 } from 'lucide-react';
import { completeBooking } from '../../book/[doctorId]/actions';
import { verifyOtpAndGetPatient, generateAndSendOtp } from '@/app/user/appointments/actions';

function OtpForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const phone = searchParams.get('phone');
    const bookingDataString = searchParams.get('bookingData');
    const isBooking = !!bookingDataString;

    const { toast } = useToast();

    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [isVerifying, startVerification] = useTransition();
    const [isResending, startResend] = useTransition();
    const [countdown, setCountdown] = useState(30);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!phone) {
            router.push('/user'); // Or a more appropriate page
            toast({ variant: 'destructive', title: 'Error', description: 'Phone number is missing.' });
        } else {
            toast({
                title: 'Check your console for OTP',
                description: `For testing, the OTP for ${phone} will be logged to the server console.`,
                duration: 10000,
            });
        }
    }, [phone, router, toast]);

    useEffect(() => {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      }
    }, [countdown]);
    
    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return;

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        if (element.nextSibling && element.value) {
            (element.nextSibling as HTMLInputElement).focus();
        }
        
        // Auto-submit when all fields are filled
        if (newOtp.every(digit => digit !== "") && newOtp.length === 6) {
             handleSubmit(newOtp.join(""));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]!.focus();
        }
    };
    
    const handleResend = () => {
        if (!phone) return;
        startResend(async () => {
            const result = await generateAndSendOtp(phone);
             if (result.success) {
                toast({
                    title: 'OTP Resent',
                    description: 'A new OTP has been generated. Check the console.',
                });
                setCountdown(30);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Resend',
                    description: result.message,
                });
            }
        });
    }
    
    const handleSubmit = (enteredOtp: string) => {
       if (!phone) return;
        
       startVerification(async () => {
            const result = await verifyOtpAndGetPatient(phone, enteredOtp);

            if (!result.success) {
                toast({
                    variant: "destructive",
                    title: "Invalid Code",
                    description: result.message || "The code you entered is incorrect. Please try again.",
                });
                return;
            }
            
            toast({
                title: "✅ Phone Verified",
                description: isBooking ? "Finalizing your booking..." : "Accessing your appointments...",
            });

            if (isBooking && bookingDataString) {
                const bookingData = JSON.parse(bookingDataString);
                // The completeBooking action now handles the redirect, so we just await it.
                // It will redirect to the appointments page with the patientId.
                await completeBooking(bookingData);
            } else {
                // If not booking, redirect to appointments page with patientId
                router.push(`/user/appointments?patientId=${result.patient?.id}`);
            }
       });
    }
    
    const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSubmit(otp.join(""));
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader className="text-center">
                    <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
                        <KeyRound className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="font-headline text-2xl pt-2">Enter Verification Code</CardTitle>
                    <CardDescription>
                        We've sent a 6-digit code to {phone}. Check your server console for the code.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onFormSubmit} className="space-y-6">
                        <div className="space-y-2">
                        <Label htmlFor="otp-1">Verification Code</Label>
                        <div className="flex justify-center gap-2">
                            {otp.map((data, index) => {
                                return (
                                    <Input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        name="otp"
                                        maxLength={1}
                                        className="w-12 h-12 text-center text-lg"
                                        value={data}
                                        onChange={e => handleChange(e.target, index)}
                                        onKeyDown={e => handleKeyDown(e, index)}
                                        onFocus={e => e.target.select()}
                                        ref={el => inputRefs.current[index] = el}
                                        autoFocus={index === 0}
                                        disabled={isVerifying}
                                    />
                                );
                            })}
                        </div>
                        </div>
                        <Button type="submit" className="w-full" variant="accent" disabled={isVerifying}>
                            {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verifying...</> : 'Verify & Continue'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        {countdown > 0 ? (
                            <p className="text-muted-foreground">Didn't receive code? Resend in {countdown}s</p>
                        ) : (
                             <Button onClick={handleResend} variant="link" className="p-0 h-auto" disabled={isResending}>
                                {isResending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Resending...</> : 'Resend Code'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function OtpVerificationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OtpForm />
        </Suspense>
    )
}
