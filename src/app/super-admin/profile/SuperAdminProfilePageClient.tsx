'use client';

import { useFormState } from 'react-dom';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateSuperAdminProfile, updateSuperAdminPassword } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession, signOut } from 'next-auth/react';
import { getCsrfToken } from '@/lib/csrf-common';

function SubmitButton({ children }: { children: React.ReactNode }) {
  return <Button type="submit">{children}</Button>;
}

export default function SuperAdminProfilePageClient({ admin }: { admin: { id: number; name: string; email: string; } }) {
  const { toast } = useToast();
  const { data: session, update } = useSession();
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    async function fetchToken() {
      const token = await getCsrfToken();
      setCsrfToken(token);
    }
    fetchToken();
  }, []);

  const [profileState, profileAction] = useFormState(updateSuperAdminProfile.bind(null, admin.id), { message: null });
  const [passwordState, passwordAction] = useFormState(updateSuperAdminPassword.bind(null, admin.id), { message: null });

  const profileFormRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  const lastProcessedProfileState = useRef<any>(null);
  const lastProcessedPasswordState = useRef<any>(null);

  useEffect(() => {
    if (profileState && profileState !== lastProcessedProfileState.current) {
      lastProcessedProfileState.current = profileState;
      if (profileState.success) {
        toast({ title: "Success", description: profileState.message });
        if (profileState.message?.includes('logged out')) {
           setTimeout(() => signOut({ callbackUrl: '/super-admin/login' }), 2000);
        } else {
           update({ name: profileFormRef.current?.name.value });
        }
      } else if (profileState.errors || profileState.message) {
        toast({ variant: "destructive", title: "Error", description: profileState.message || "Please check the fields." });
      }
    }
  }, [profileState, toast, update]);

  useEffect(() => {
    if (passwordState && passwordState !== lastProcessedPasswordState.current) {
      lastProcessedPasswordState.current = passwordState;
      if (passwordState.success) {
        toast({ title: "Success", description: passwordState.message });
        setTimeout(() => signOut({ callbackUrl: '/super-admin/login' }), 2000);
      } else if (passwordState.errors || passwordState.message) {
        toast({ variant: "destructive", title: "Error", description: passwordState.message || "Please check the fields." });
      }
    }
  }, [passwordState, toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">My Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={profileFormRef} action={profileAction} className="space-y-4">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={admin.name} />
                {profileState?.errors?.name && <p className="text-sm text-destructive">{profileState.errors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={admin.email} />
                {profileState?.errors?.email && <p className="text-sm text-destructive">{profileState.errors.email[0]}</p>}
              </div>
              <SubmitButton>Save Changes</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your login password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={passwordFormRef} action={passwordAction} className="space-y-4">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" name="currentPassword" type="password" />
                {passwordState?.errors?.currentPassword && <p className="text-sm text-destructive">{passwordState.errors.currentPassword[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" name="newPassword" type="password" />
                {passwordState?.errors?.newPassword && <p className="text-sm text-destructive">{passwordState.errors.newPassword[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" />
                {passwordState?.errors?.confirmPassword && <p className="text-sm text-destructive">{passwordState.errors.confirmPassword[0]}</p>}
              </div>
              <SubmitButton>Update Password</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
