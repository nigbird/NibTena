
'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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

function OtpForm() {
    const searchParams = useSearchParams();
    const phone = searchParams.get('phone');
    const bookingDataString = searchParams.get('bookingData');
    const { toast } = useToast();

    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        toast({
            title: 'Test OTP',
            description: 'Your test code is: 123456',
            duration: 10000,
        })
    }, [toast]);

    useEffect(() => {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      }
    }, [countdown]);
    
    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.nextSibling && element.value) {
            (element.nextSibling as HTMLInputElement).focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]!.focus();
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        
        // Mock OTP verification
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const enteredOtp = otp.join("");
        if (enteredOtp !== "123456") { // Mock OTP
             toast({
                variant: "destructive",
                title: "Invalid Code",
                description: "The code you entered is incorrect. Please try again.",
            });
            setIsLoading(false);
            return;
        }

        toast({
            title: "✅ Phone Verified",
            description: "Your phone number has been successfully verified.",
        });

        if (bookingDataString) {
            const bookingData = JSON.parse(bookingDataString);
            await completeBooking(bookingData);
        } else {
             toast({
                variant: "destructive",
                title: "Booking Failed",
                description: "Could not find booking data. Please try again.",
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader className="text-center">
                    <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
                        <KeyRound className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="font-headline text-2xl pt-2">Enter Verification Code</CardTitle>
                    <CardDescription>
                        We've sent a 6-digit code to +251 {phone}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    />
                                );
                            })}
                        </div>
                        </div>
                        <Button type="submit" className="w-full" variant="accent" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verifying...</> : 'Verify & Continue'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        {countdown > 0 ? (
                            <p className="text-muted-foreground">Didn't receive code? Resend in {countdown}s</p>
                        ) : (
                             <button onClick={() => setCountdown(30)} className="text-primary hover:underline">Resend Code</button>
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
