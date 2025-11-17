
'use client';

import { useActionState, useTransition } from 'react';
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
import { Logo } from '@/components/icons';
import { KeyRound, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { requestPasswordReset } from './actions';
import type { RequestResetState } from './actions';

function SubmitButton() {
  const [isPending] = useTransition();
  return (
    <Button type="submit" className="w-full" variant="accent" disabled={isPending}>
      {isPending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
      ) : (
        'Send Reset Link'
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const initialState: RequestResetState = { success: false, message: null };
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAF9F6] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <Card className="bg-white p-2 rounded-2xl shadow-md">
          <CardHeader className="text-center">
            <div className="inline-block mx-auto rounded-full bg-primary/20 p-3">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-headline pt-2 text-[#2E2E2E]">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.success ? (
              <div className="text-center space-y-4 py-8">
                <MailCheck className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Check Your Email</h3>
                <p className="text-muted-foreground">{state.message}</p>
                <Button asChild variant="secondary">
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            ) : (
              <form action={formAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-[#2E2E2E]">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                {state.message && !state.success && (
                  <p className="text-sm font-medium text-destructive">{state.message}</p>
                )}
                <SubmitButton />
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
