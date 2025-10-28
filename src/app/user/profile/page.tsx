
'use client';

import { useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientContext } from '@/context/PatientContext';

export default function ProfilePage() {
  const router = useRouter();
  const { patient, setPatient } = useContext(PatientContext);

  const handleLogout = () => {
    // Clear the patient from context to log them out
    setPatient(null);
    // In a real app with server-side sessions, you would also call a sign-out API endpoint.
    // For this OTP-based flow, clearing client state is sufficient.
    router.push('/user');
  };

  if (!patient) {
    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg text-center">
                <CardHeader>
                    <div className="inline-block mx-auto rounded-full bg-muted p-4">
                        <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="font-headline text-2xl pt-4">My Profile</CardTitle>
                    <CardDescription>
                        Log in to view and manage your profile information.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        It looks like you're not logged in. Please verify your phone number to access your profile.
                    </p>
                    <Button asChild variant="accent">
                        <Link href="/user/appointments">Log In / Sign Up</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
             {/* The user model doesn't have an avatar, so we use a fallback */}
            <AvatarFallback className="text-3xl">
              {patient.name ? patient.name.charAt(0) : <User />}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="font-headline text-2xl">{patient.name}</CardTitle>
          <CardDescription>+251 {patient.phone}</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 flex flex-col gap-2">
          <Button variant="outline" asChild>
            <Link href="/user/profile/setup">Edit Profile</Link>
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
