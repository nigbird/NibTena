'use client';

import { useActionState, useContext, useEffect } from 'react';
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
import { updatePatientProfile, type ProfileSetupState } from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" variant="accent" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  );
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { patient } = useContext(PatientContext);

  const initialState: ProfileSetupState = {
    message: null,
    errors: {},
    success: false,
  };

  // ✅ Correct useActionState signature (prevState, formData)
  const [state, dispatch] = useActionState(
    async (prevState: ProfileSetupState, formData: FormData) => {
      if (!patient) return prevState;
      return await updatePatientProfile(patient.id, formData);
    },
    initialState
  );

  useEffect(() => {
    if (!patient) {
      router.replace('/user/profile');
    }
  }, [patient, router]);

  useEffect(() => {
    if (state.success) {
      toast({
        title: '✅ Profile Saved!',
        description: state.message ?? 'Your changes have been saved successfully.',
      });
      router.push('/user/profile');
    } else if (state.message && !state.success) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: state.message,
      });
    }
  }, [state, toast, router]);

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
          <CardTitle className="font-headline text-2xl pt-2">
            Edit Your Profile
          </CardTitle>
          <CardDescription>Keep your information up-to-date.</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={dispatch} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={patient.name ?? ''} required />
              {state.errors?.name && (
                <p className="text-sm font-medium text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={patient.phone}
                required
                readOnly
                className="bg-muted"
              />
              {state.errors?.phone && (
                <p className="text-sm font-medium text-destructive">
                  {state.errors.phone[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="Enter your age"
                defaultValue={patient.age?.toString() ?? ''}
              />
              {state.errors?.age && (
                <p className="text-sm font-medium text-destructive">
                  {state.errors.age[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup
                name="gender"
                defaultValue={patient.gender ?? undefined}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
              {state.errors?.gender && (
                <p className="text-sm font-medium text-destructive">
                  {state.errors.gender[0]}
                </p>
              )}
            </div>

            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
