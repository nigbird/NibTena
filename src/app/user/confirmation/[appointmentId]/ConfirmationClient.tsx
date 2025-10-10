
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';

type ConfirmationClientProps = {
    success: boolean;
    appointmentId: string;
    children: React.ReactNode;
}

export default function ConfirmationClient({ success, appointmentId, children }: ConfirmationClientProps) {
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (success) {
            toast({
                title: '🎉 Booking Confirmed!',
                description: 'Your appointment has been successfully booked.',
            });

            // Clean up the URL
            window.history.replaceState(null, '', `/user/confirmation/${appointmentId}`);
        }
    }, [success, appointmentId, toast]);

    return <>{children}</>;
}
