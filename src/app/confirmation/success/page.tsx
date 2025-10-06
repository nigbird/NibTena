'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function BookingSuccessPage() {
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        toast({
            title: "Booking Confirmed!",
            description: "Your appointment has been successfully booked.",
        });

        // Find the latest appointment to redirect to its confirmation page
        // This is a simplification. In a real app, you'd get the ID from the server action.
        const redirectUrl = '/'; // Fallback to home
        
        // In a real app you might fetch the last appointment ID
        // For now, we just show the toast and send them home after a delay.
        const timer = setTimeout(() => {
            router.replace(redirectUrl);
        }, 500); // Give user a moment to see the toast

        return () => clearTimeout(timer);
    }, [router, toast]);

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
