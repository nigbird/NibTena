
'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Smartphone } from 'lucide-react';
import { generateAndSendOtp } from './actions';
import { CenteredCard, PhoneInput, ctaClass } from '@/components/patient-portal/ui';
import { cn } from '@/lib/utils';

export default function PatientAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const phoneInput = formData.get('phone') as string;

    if (!phoneInput || phoneInput.length < 9) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid phone number.' });
      return;
    }

    startTransition(async () => {
      const result = await generateAndSendOtp(phoneInput);
      if (result.success) {
        toast({
          title: 'OTP Sent',
          description: 'A verification code has been sent to your phone.',
        });
  const params = new URLSearchParams(searchParams);
  params.set('phone', phoneInput);
  // Determine redirectUrl: avoid sending users back to profile after login in standalone.
  // If the current path is the profile page, redirect to the user home instead.
  const safeRedirect = pathname && pathname.startsWith('/user/profile') ? '/user' : (pathname || '/user');
  params.set('redirectUrl', safeRedirect);
  router.push(`/user/verify/otp?${params.toString()}`);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  return (
    <CenteredCard
      icon={Smartphone}
      title="Sign in with your phone"
      description="Enter your phone number to sign in or create an account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <PhoneInput
            id="phone"
            name="phone"
            placeholder="912 345 678"
            required
            disabled={isPending}
          />
        </div>
        <Button type="submit" className={cn(ctaClass, 'w-full')} variant="brand" disabled={isPending}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Code'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        We’ll send a one-time code to verify your number.
      </p>
    </CenteredCard>
  );
}
