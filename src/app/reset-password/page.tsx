
'use client';

import { useActionState, useState, useTransition, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { KeyRound, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { resetPassword, type ResetPasswordState } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="accent" disabled={pending}>
      {pending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
      ) : (
        'Reset Password'
      )}
    </Button>
  );
}

function ResetPasswordForm({ onStateChange }: { onStateChange: (state: ResetPasswordState) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const initialState: ResetPasswordState = { success: false, message: null };
  const resetPasswordWithToken = resetPassword.bind(null, token || '');
  const [state, formAction] = useActionState(resetPasswordWithToken, initialState);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
       <div className="flex justify-center items-center h-24">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  
  if (!token) {
    return (
        <div className="text-center space-y-4">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Link</AlertTitle>
                <AlertDescription>
                    The password reset link is missing or invalid.
                </AlertDescription>
            </Alert>
            <Button asChild className="mt-4 w-full">
                <Link href="/forgot-password">Request New Link</Link>
            </Button>
        </div>
    );
  }

  if (state.success) {
    return (
        <div className="text-center space-y-4">
             <Alert variant="default" className="border-green-500/50 bg-green-50 text-green-900">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                    {state.message}
                </AlertDescription>
            </Alert>
            <Button asChild variant="accent" onClick={() => router.push(state.redirectUrl || '/')}>
                <Link href={state.redirectUrl || '/'}>Proceed to Login</Link>
            </Button>
        </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input id="newPassword" name="newPassword" type={showPassword ? 'text' : 'password'} required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
         {state.errors?.newPassword && <p className="text-sm font-medium text-destructive">{state.errors.newPassword[0]}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
         {state.errors?.confirmPassword && <p className="text-sm font-medium text-destructive">{state.errors.confirmPassword[0]}</p>}
      </div>

       {state.message && !state.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
       )}
      <SubmitButton />
    </form>
  );
}


export default function ResetPasswordPage() {
  const [formState, setFormState] = useState<ResetPasswordState>({ success: false, message: null });

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
              {formState.success ? (
                <CheckCircle className="h-6 w-6 text-primary-foreground" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl font-headline pt-2 text-[#2E2E2E]">
              {formState.success ? 'Password Reset' : 'Reset Your Password'}
            </CardTitle>
            {!formState.success && (
                <CardDescription>Enter and confirm your new password below.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader2 className="animate-spin mx-auto"/>}>
                <ResetPasswordForm onStateChange={setFormState} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
