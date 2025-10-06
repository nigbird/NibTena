'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function BookingSuccessPage() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    useEffect(() => {
        const appointmentId = searchParams.get('appointmentId');
        
        toast({
            title: "Booking Confirmed!",
            description: "Your appointment has been successfully booked.",
        });

        const redirectUrl = appointmentId ? `/confirmation/${appointmentId}` : '/';
        
        const timer = setTimeout(() => {
            router.replace(redirectUrl);
        }, 500);

        return () => clearTimeout(timer);
    }, [router, toast, searchParams]);

    return (
        <div className="flex h-screen flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold text-muted-foreground">
                Finalizing your appointment...
            </h1>
            <p className="text-muted-foreground">You will be redirected shortly.</p>
        </div>
    );
}
