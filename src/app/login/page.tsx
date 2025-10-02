import Link from 'next/link';
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

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <div className="max-w-sm w-full mx-4">
            <div className="text-center mb-6">
                <Link href="/">
                    <Logo />
                </Link>
            </div>
            <Card>
                <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
                <CardDescription>
                    Enter your email below to login to your account
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link href="#" className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                        </Link>
                    </div>
                    <Input id="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" variant="accent">
                    Login
                    </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="underline">
                    Sign up
                    </Link>
                </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
