
'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { updateUserProfile, updateUserPassword, type UserProfileState, type PasswordChangeState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession, signOut } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

function ProfileSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="accent" type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
    </Button>
  );
}

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="accent" type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Password'}
    </Button>
  );
}

export default function HospitalUserProfilePage() {
  const { data: session, status, update } = useSession();
  const { toast } = useToast();
  const [passwordFormKey, setPasswordFormKey] = useState(Date.now());
  const user = session?.user;
  const userId = user?.id ? Number(user.id) : null;
  const isHospitalAdmin = (session?.user as any)?.isAdmin;
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileInitialState: UserProfileState = { message: null, errors: {} };
  const updateUserAction = userId ? updateUserProfile.bind(null, userId) : null;
  const [profileState, dispatchProfile] = useActionState(updateUserAction || (async () => profileInitialState), profileInitialState);

  const passwordInitialState: PasswordChangeState = { message: null, errors: {} };
  const updatePasswordAction = userId ? updateUserPassword.bind(null, userId) : null;
  const [passwordState, dispatchPassword] = useActionState(updatePasswordAction || (async () => passwordInitialState), passwordInitialState);

  useEffect(() => {
    if (profileState.success) {
      toast({ title: 'Profile Updated', description: profileState.message });
      update(); // This re-fetches the session
    } else if (profileState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: profileState.message });
    }
  }, [profileState, toast, update]);
  
  useEffect(() => {
    if (passwordState.success) {
      toast({ title: 'Password Updated', description: passwordState.message });
      setTimeout(() => {
        signOut({ callbackUrl: '/hospital-admin/login' });
      }, 2000);
      setPasswordFormKey(Date.now());
    } else if (passwordState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: passwordState.message });
    }
  }, [passwordState, toast]);

  if (status === 'loading' || !user) {
    return (
      <div className="container mx-auto max-w-4xl py-2">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
          <CardContent className="space-y-8"><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-2">
      <h1 className="text-3xl font-bold tracking-tight font-headline mb-2">My Profile</h1>
      <p className="text-lg text-muted-foreground mb-6">Manage your personal information and account security.</p>
        
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="security">Password & Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
            <Card className="shadow-lg mt-4">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Personal Information</CardTitle>
                    <CardDescription>This information is used for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={dispatchProfile} className="space-y-6 max-w-md">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" defaultValue={user.name} required />
                            {profileState.errors?.name && <p className="text-sm font-medium text-destructive">{profileState.errors.name[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" name="email" type="email" defaultValue={user.email} required readOnly={isHospitalAdmin} className={isHospitalAdmin ? 'bg-muted' : ''}/>
                             {isHospitalAdmin && <p className="text-xs text-muted-foreground pt-1">The primary hospital email cannot be changed here. Please contact support.</p>}
                            {profileState.errors?.email && <p className="text-sm font-medium text-destructive">{profileState.errors.email[0]}</p>}
                        </div>
                        <div className="flex justify-end">
                            <ProfileSubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="security">
             <Card className="shadow-lg mt-4">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Change Your Password</CardTitle>
                    <CardDescription>For security, you will be logged out after changing your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={dispatchPassword} key={passwordFormKey} className="space-y-6 max-w-md">
                         <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input id="currentPassword" name="currentPassword" type={showCurrentPassword ? 'text' : 'password'} required />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    {showCurrentPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                            {passwordState.errors?.currentPassword && <p className="text-sm font-medium text-destructive">{passwordState.errors.currentPassword[0]}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input id="newPassword" name="newPassword" type={showNewPassword ? 'text' : 'password'} required />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                             {passwordState.errors?.newPassword && <p className="text-sm font-medium text-destructive">{passwordState.errors.newPassword[0]}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                             <div className="relative">
                                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required />
                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                             {passwordState.errors?.confirmPassword && <p className="text-sm font-medium text-destructive">{passwordState.errors.confirmPassword[0]}</p>}
                        </div>
                        <div className="flex justify-end">
                            <PasswordSubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
