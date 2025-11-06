
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { placeholderImages } from '@/lib/placeholder-images';
import { Phone } from 'lucide-react';

function PhoneVerificationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const phone = formData.get('phone');
        
        // In a real app, we would send an OTP here.
        // For this mock, we'll just redirect to the OTP page.
        const newParams = new URLSearchParams(searchParams);
        newParams.set('phone', phone as string);
        router.push(`/user/verify/otp?${newParams.toString()}`);
    };
    
    const bookingDataString = searchParams.get('bookingData');
    if (!bookingDataString) {
        // Handle case where bookingData is missing
        return <div>Error: Booking information is missing.</div>;
    }
    const bookingData = JSON.parse(bookingDataString);
    const illustration = placeholderImages.find(p => p.id === 'doctor-2');

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="max-w-md w-full shadow-lg">
                {illustration && (
                    <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                         <Image src={illustration.imageUrl} alt="Verification" fill className="object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                    </div>
                )}
                <CardHeader className="text-center -mt-16 relative z-20">
                    <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
                        <Phone className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="font-headline text-2xl pt-2">Verify your phone</CardTitle>
                    <CardDescription>
                        Enter your phone number to confirm your appointment.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex items-center">
                            <span className="inline-flex h-10 items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground sm:text-sm">
                            +251
                            </span>
                            <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="912 345 678"
                            defaultValue={bookingData.phone}
                            required
                            className="rounded-l-none"
                            />
                        </div>
                        </div>
                        <Button type="submit" className="w-full" variant="accent">
                        Send OTP
                        </Button>
                    </form>
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        We’ll send a one-time code to verify your number.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

export default function PhoneVerificationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PhoneVerificationForm />
        </Suspense>
    )
}
