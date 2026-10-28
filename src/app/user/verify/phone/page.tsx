
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Smartphone } from 'lucide-react';
import { CenteredCard, PhoneInput, ctaClass } from '@/components/patient-portal/ui';
import { cn } from '@/lib/utils';

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
        return <CenteredCard icon={Smartphone} tone="danger" title="Booking information is missing" description="Please start your booking again." />;
    }
    const bookingData = JSON.parse(bookingDataString);
    return (
        <CenteredCard
            icon={Smartphone}
            title="Verify your phone"
            description="Enter your phone number to confirm your appointment."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                        id="phone"
                        name="phone"
                        placeholder="912 345 678"
                        defaultValue={bookingData.phone}
                        required
                    />
                </div>
                <Button type="submit" className={cn(ctaClass, 'w-full')} variant="brand">
                    Send OTP
                </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
                We’ll send a one-time code to verify your number.
            </p>
        </CenteredCard>
    )
}

export default function PhoneVerificationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PhoneVerificationForm />
        </Suspense>
    )
}
