
'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
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
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="accent" disabled={pending}>
       {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Signing in...</> : 'Sign In'}
    </Button>
  );
}

export default function SuperAdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/super-admin';
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
            role: 'superadmin',
            callbackUrl
        });

        if (!result) {
            setError('Sign-in failed. Please try again.');
        } else if (result?.error) {
              const errStr = typeof result.error === 'string' ? result.error.toLowerCase() : '';
              const isFriendlyLock =
                 errStr.includes('temporarily locked') ||
                 errStr.includes('too many failed login attempts');
              const message = isFriendlyLock ? result.error : 'Invalid email or password. Please try again.';
              // Show inline error only; do not trigger a destructive toast for auth failures.
              setError(message);
        } else if (result?.url) {
            toast({
                title: 'Login Successful',
                description: 'Redirecting to your dashboard...',
            });
            router.push(result.url);
        }
    }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAF9F6] p-4">
        <div className="max-w-md w-full">
            <div className="text-center mb-6">
                <Link href="/">
                    <Logo />
                </Link>
            </div>
            <Card className="bg-white p-2 rounded-2xl shadow-md">
                <CardHeader className="text-center">
                    <div className="inline-block mx-auto rounded-full bg-primary/20 p-3">
                        <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-headline pt-2 text-[#2E2E2E]">Super Admin Portal</CardTitle>
                    <CardDescription>
                        Global platform management access.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#2E2E2E]">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="super@NibAppointment.com" required />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password" className="text-[#2E2E2E]">Password</Label>
                                <Link href="/forgot-password" prefetch={false} className="ml-auto inline-block text-sm underline text-muted-foreground">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
