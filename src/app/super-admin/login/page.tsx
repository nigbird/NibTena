'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login } from '@/lib/auth.actions';
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
import { Shield, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="accent" disabled={pending}>
       {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Signing in...</> : 'Sign In'}
    </Button>
  );
}

export default function SuperAdminLoginPage() {
  const [state, formAction] = useActionState(login, undefined);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.success === false) {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: state.message,
        })
    } else if (state?.success === true) {
        toast({
            title: 'Login Successful',
            description: 'Redirecting to your dashboard...',
        });
        router.push('/super-admin');
    }
  }, [state, toast, router]);

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
                    <form action={formAction} className="grid gap-4">
                        <input type="hidden" name="role" value="superadmin" />
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#2E2E2E]">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="super@mediverse.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-[#2E2E2E]">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
