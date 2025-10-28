
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone } from 'lucide-react';
import { generateAndSendOtp } from './actions';

export default function PatientAuth() {
  const router = useRouter();
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
        if (result.otp) {
            toast({
              title: 'OTP For Testing',
              description: `Your verification code is: ${result.otp}`,
              duration: 10000,
            });
        }
        const params = new URLSearchParams(searchParams);
        params.set('phone', phoneInput);
        // We no longer need to pass bookingData, the OTP page will handle the redirect logic
        params.delete('bookingData'); 
        router.push(`/user/verify/otp?${params.toString()}`);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
            <Phone className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-2xl pt-2">Verify Your Account</CardTitle>
          <CardDescription>
            Enter your phone number to sign in or create an account.
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
                  required
                  className="rounded-l-none"
                  disabled={isPending}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" variant="accent" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Code'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            We’ll send a one-time code to verify your number.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
