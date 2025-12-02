
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
import { Hospital, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function HospitalAdminLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/hospital-admin';
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
            role: 'hospital',
            callbackUrl
        });

        if (result?.error) {
            const errStr = typeof result.error === 'string' ? result.error.toLowerCase() : '';
            const isFriendlyLock =
                errStr.includes('temporarily locked') ||
                errStr.includes('too many failed login attempts');
            const message = isFriendlyLock ? result.error : 'Invalid email or password.';
            setError(message);
        } else if (result?.url) {
            // Fetch session to check permissions
            const res = await fetch('/api/auth/session');
            const sessionData = await res.json();
            const user = sessionData?.user || {};
            const canViewDashboard = user.isAdmin === true
                || (user.permissionKeys && (
                    user.permissionKeys.includes('Appointments:View') ||
                    user.permissionKeys.includes('Doctors:View') ||
                    user.permissionKeys.includes('Users:View') ||
                    user.permissionKeys.includes('Queue:View') ||
                    user.permissionKeys.includes('Reports:View') ||
                    user.permissionKeys.includes('Settings:View')
                ));

            toast({
                title: 'Login Successful',
                description: canViewDashboard ? 'Redirecting to your dashboard...' : 'Redirecting to your profile...',
            });
            if (canViewDashboard) {
                router.push(result.url);
            } else {
                router.push('/hospital-admin/profile');
            }
        }
    }


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
                        <Hospital className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-headline pt-2 text-[#2E2E2E]">Hospital Admin Portal</CardTitle>
                    <CardDescription>
                        Sign in to manage your hospital's operations.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-[#2E2E2E]">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="admin@hospital.com" required />
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
