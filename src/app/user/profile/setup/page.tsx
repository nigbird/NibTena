
'use client';

import { useActionState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { UserPen, Loader2 } from 'lucide-react';
import { CenteredCard, ctaClass } from '@/components/patient-portal/ui';
import { cn } from '@/lib/utils';
import { PatientContext } from '@/context/PatientContext';
import { updatePatientProfile, type ProfileSetupState } from './actions';
import { useFormStatus } from 'react-dom';
import type { Patient } from '@/lib/definitions';
import { useCsrfToken } from '@/hooks/use-csrf-token';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={cn(ctaClass, 'w-full')} variant="accent" disabled={pending}>
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
  const { patient, setPatient } = useContext(PatientContext);
  const csrfToken = useCsrfToken();

  const initialState: ProfileSetupState = {
    message: null,
    errors: {},
    success: false,
  };

  const [state, dispatch] = useActionState(
    async (prevState: ProfileSetupState, formData: FormData) => {
      if (!patient) return prevState;
      const result = await updatePatientProfile(patient.id, formData);
      // After a successful DB update, update the client-side context
      if (result.success) {
        setPatient({
          ...patient,
          name: formData.get('name') as string,
          age: Number(formData.get('age')),
          gender: formData.get('gender') as 'male' | 'female',
        });
      }
      return result;
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
      <div className="flex w-full justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <CenteredCard icon={UserPen} title="Edit your profile" description="Keep your information up to date.">
      <form action={dispatch} className="space-y-6">
        <input type="hidden" name="_csrf" value={csrfToken} />
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
    </CenteredCard>
  );
}
