
'use client';

import { useActionState, useEffect, useState, useContext, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { updateDoctorProfile, type DoctorProfileState, getSpecialties, updateDoctorPassword, type PasswordChangeState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DoctorPortalContext } from '@/components/doctor-portal/doctor-portal-context';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signOut, useSession } from 'next-auth/react';
import { revokeThenSignOut } from '@/lib/auth-client';

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

export default function DoctorProfilePage() {
  const { doctor } = useContext(DoctorPortalContext);
  const { update: updateSession } = useSession();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(doctor?.imageUrl || null);
  const { toast } = useToast();
  const [passwordFormKey, setPasswordFormKey] = useState(Date.now());
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const specialtiesData = await getSpecialties();
      setSpecialties(specialtiesData);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (doctor) {
      setImagePreview(doctor.imageUrl);
    }
  }, [doctor]);

  const profileInitialState: DoctorProfileState = { message: null, errors: {} };
  const updateDoctorAction = doctor ? updateDoctorProfile.bind(null, doctor.id) : null;
  const [profileState, dispatchProfile] = useActionState(updateDoctorAction || (async () => profileInitialState), profileInitialState);
  
  const passwordInitialState: PasswordChangeState = { message: null, errors: {} };
  const updatePasswordAction = doctor ? updateDoctorPassword.bind(null, doctor.id) : null;
  const [passwordState, dispatchPassword] = useActionState(updatePasswordAction || (async () => passwordInitialState), passwordInitialState);

  useEffect(() => {
    if (profileState.success) {
      toast({ title: 'Profile Updated', description: profileState.message });
      if (profileState.updatedDoctor) {
        updateSession({ 
            name: profileState.updatedDoctor.name, 
            picture: profileState.updatedDoctor.imageUrl 
        });
      }
    } else if (profileState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: profileState.message });
    }
  }, [profileState, toast, updateSession]);
  
  useEffect(() => {
    if (passwordState.success) {
      toast({ title: 'Password Updated', description: passwordState.message });
      setPasswordFormKey(Date.now()); // Reset password form by changing its key
      setTimeout(() => {
        revokeThenSignOut({ callbackUrl: '/doctor-portal/login' });
      }, 2000);
    } else if (passwordState.message) {
      toast({ variant: 'destructive', title: 'Update Failed', description: passwordState.message });
    }
  }, [passwordState, toast]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  if (!doctor) {
    return (
      <div className="container mx-auto max-w-4xl py-2">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-2">
      <h1 className="text-3xl font-bold tracking-tight font-headline mb-2">My Profile</h1>
      <p className="text-lg text-muted-foreground mb-6">Manage your professional information and account security.</p>
        
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="security">Password & Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
            <Card className="shadow-lg mt-4">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Public Profile Information</CardTitle>
                    <CardDescription>This information will be visible to patients.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={dispatchProfile} className="space-y-8">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24 border-4 border-primary/20">
                                {imagePreview && <AvatarImage src={imagePreview} alt={doctor.name} />}
                                <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="image">Change Profile Photo</Label>
                                <Input id="image" type="file" name="image" accept="image/*" onChange={handleImageChange} />
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" defaultValue={doctor.name} required />
                                {profileState.errors?.name && <p className="text-sm font-medium text-destructive">{profileState.errors.name[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty</Label>
                                <Select name="specialty" defaultValue={doctor.specialty} required>
                                <SelectTrigger id="specialty"><SelectValue placeholder="Select specialty" /></SelectTrigger>
                                <SelectContent>
                                    {specialties.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                                </SelectContent>
                                </Select>
                                {profileState.errors?.specialty && <p className="text-sm font-medium text-destructive">{profileState.errors.specialty[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="experience">Years of Experience</Label>
                                <Input id="experience" name="experience" type="number" defaultValue={doctor.experience || ''} required />
                                {profileState.errors?.experience && <p className="text-sm font-medium text-destructive">{profileState.errors.experience[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="consultationFee">Consultation Fee (ETB)</Label>
                                <Input id="consultationFee" name="consultationFee" type="number" defaultValue={doctor.consultationFee} required readOnly />
                                {profileState.errors?.consultationFee && <p className="text-sm font-medium text-destructive">{profileState.errors.consultationFee[0]}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Professional Bio</Label>
                            <Textarea id="bio" name="bio" defaultValue={doctor.bio} className="min-h-[150px]" required />
                            {profileState.errors?.bio && <p className="text-sm font-medium text-destructive">{profileState.errors.bio[0]}</p>}
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
