'use client';

import { useActionState, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { revokeThenSignOut } from '@/lib/auth-client';
import { updateSuperAdminPassword, type PasswordChangeState } from './actions';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import { useFormStatus } from 'react-dom';

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : (
        'Update Password'
      )}
    </Button>
  );
}

export default function SuperAdminChangePasswordPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(Date.now());
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const csrfToken = useCsrfToken();

  const userId = session?.user?.id ? Number(session.user.id) : null;
  const passwordInitialState: PasswordChangeState = { message: null, errors: {} };
  const updatePasswordAction = userId ? updateSuperAdminPassword.bind(null, userId) : null;
  const [passwordState, dispatchPassword] = useActionState(
    updatePasswordAction || (async () => passwordInitialState),
    passwordInitialState
  );

  useEffect(() => {
    if (passwordState.success) {
      toast({ title: 'Password Updated', description: passwordState.message });
      setFormKey(Date.now());
      setTimeout(() => revokeThenSignOut({ callbackUrl: '/super-admin/login' }), 1500);
    } else if (passwordState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: passwordState.message });
    }
  }, [passwordState, toast]);

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Change Password</h1>
        <p className="text-muted-foreground">
          Update your password to keep your account secure.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password and a new strong password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatchPassword} key={formKey} className="space-y-4">
              <input type="hidden" name="_csrf" value={csrfToken} />
              
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
