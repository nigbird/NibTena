'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession, signOut } from 'next-auth/react';
import { updateUserPassword, type PasswordChangeState } from '../profile/actions';

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="accent" type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
        </>
      ) : (
        'Update Password'
      )}
    </Button>
  );
}

export default function HospitalChangePasswordPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(Date.now());
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const userId = session?.user?.id ? Number(session.user.id) : null;
  const passwordInitialState: PasswordChangeState = { message: null, errors: {} };
  const updatePasswordAction = userId ? updateUserPassword.bind(null, userId) : null;
  const [passwordState, dispatchPassword] = useActionState(
    updatePasswordAction || (async () => passwordInitialState),
    passwordInitialState
  );

  useEffect(() => {
    if (passwordState.success) {
      toast({ title: 'Password Updated', description: passwordState.message });
      setFormKey(Date.now());
      setTimeout(() => signOut({ callbackUrl: '/hospital-admin/login' }), 1500);
    } else if (passwordState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: passwordState.message });
    }
  }, [passwordState, toast]);

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Change Password</h1>
        <p className="text-muted-foreground">
          For security reasons, you must set a new password before accessing the dashboard.
        </p>
      </div>

      <Alert className="mb-6 border-amber-500/50 bg-amber-50 text-amber-900">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Action required</AlertTitle>
        <AlertDescription>
          This account is using a temporary password. Update it now to continue.
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Update your password</CardTitle>
          <CardDescription>We will sign you out after a successful change.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatchPassword} key={formKey} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {passwordState.errors?.currentPassword && (
                <p className="text-sm font-medium text-destructive">{passwordState.errors.currentPassword[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {passwordState.errors?.newPassword && (
                <p className="text-sm font-medium text-destructive">{passwordState.errors.newPassword[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {passwordState.errors?.confirmPassword && (
                <p className="text-sm font-medium text-destructive">{passwordState.errors.confirmPassword[0]}</p>
              )}
            </div>

            <div className="flex justify-end">
              <PasswordSubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


