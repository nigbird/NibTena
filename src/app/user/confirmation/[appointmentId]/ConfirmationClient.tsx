'use client';

import { useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import { retryYagoutPayment } from '@/app/user/book/[doctorId]/yagout-actions';

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

// "Try payment again" for a failed or expired YagoutPay booking. The server
// creates a new booking with a new order number and hold; this one is kept.
export function RetryPaymentButton({ appointmentId }: { appointmentId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const csrfToken = useCsrfToken();
    const [isPending, startTransition] = useTransition();

    const handleRetry = () => {
        startTransition(async () => {
            const fd = new FormData();
            fd.set('_csrf', csrfToken);
            const result = await retryYagoutPayment(appointmentId, fd);
            if (result.success && result.redirectTo) {
                router.push(result.redirectTo);
            } else {
                toast({ variant: 'destructive', title: 'Could not retry payment', description: result.message || 'Please book again.' });
            }
        });
    };

    return (
        <Button variant="brand" className="h-11 rounded-xl font-semibold" onClick={handleRetry} disabled={isPending}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting payment...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Try payment again</>}
        </Button>
    );
}
