
'use client';

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2 } from 'lucide-react';
import { PatientContext } from '@/context/PatientContext';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { patient, setPatient } = useContext(PatientContext);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If there's no patient in the context, redirect away
    if (!patient) {
      router.replace('/user/appointments');
    }
  }, [patient, router]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const updatedPatient = {
      id: patient!.id,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      age: Number(formData.get('age')),
      gender: formData.get('gender') as string,
    };

    // Mock saving data
    setTimeout(() => {
      // In a real app, you would save the form data to the DB via a server action.
      // Then, you'd update the context with the new patient data.
      setPatient(updatedPatient);
      setIsLoading(false);
      toast({
        title: '✅ Profile Saved!',
        description: 'Your information has been updated successfully.',
      });
      router.push('/user/profile');
    }, 1000);
  };
  
  // Render a loading or empty state while checking for patient
  if (!patient) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center relative z-10">
            <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
                <User className="h-6 w-6 text-primary-foreground" />
            </div>
          <CardTitle className="font-headline text-2xl pt-2">Edit Your Profile</CardTitle>
          <CardDescription>
            Keep your information up-to-date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={patient.name} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center">
                    <span className="inline-flex h-10 items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground sm:text-sm">
                    +251
                    </span>
                    <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="912 345 678"
                    defaultValue={patient.phone}
                    className="rounded-l-none"
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" placeholder="Enter your age" defaultValue={patient.age?.toString() ?? ''}/>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup name="gender" defaultValue={patient.gender ?? undefined} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" variant="accent" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
