
'use client';

import { useActionState, useEffect, useState, useContext } from 'react';
import { useFormStatus } from 'react-dom';
import { updateDoctorProfile, type DoctorProfileState, getSpecialties } from './actions';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DoctorPortalContext } from '@/components/doctor-portal/doctor-portal-context';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button variant="accent" type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving Changes...
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  );
}

export default function DoctorProfilePage() {
  const { doctor } = useContext(DoctorPortalContext);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(doctor?.imageUrl || null);
  const { toast } = useToast();

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
  
  const initialState: DoctorProfileState = { message: null, errors: {} };
  const updateDoctorAction = doctor ? updateDoctorProfile.bind(null, doctor.id) : null;
  
  const [state, dispatch] = useActionState(updateDoctorAction || (async () => initialState), initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: 'Profile Updated',
        description: state.message,
      });
    } else if (state.message) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: state.message,
      });
    }
  }, [state, toast]);

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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Manage Your Profile</CardTitle>
          <CardDescription>
            Keep your professional information up-to-date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} className="space-y-8">
            <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                    {imagePreview && <AvatarImage src={imagePreview} alt={doctor.name} />}
                    <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="image">Change Profile Photo</Label>
                    <Input id="image" type="file" name="image" accept="image/*" onChange={handleImageChange} />
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={doctor.name} required />
                {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Select name="specialty" defaultValue={doctor.specialty} required>
                  <SelectTrigger id="specialty">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.errors?.specialty && <p className="text-sm font-medium text-destructive">{state.errors.specialty[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input id="experience" name="experience" type="number" defaultValue={doctor.experience || ''} required />
                    {state.errors?.experience && <p className="text-sm font-medium text-destructive">{state.errors.experience[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                    <Input id="consultationFee" name="consultationFee" type="number" defaultValue={doctor.consultationFee} required />
                    {state.errors?.consultationFee && <p className="text-sm font-medium text-destructive">{state.errors.consultationFee[0]}</p>}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={doctor.bio}
                className="min-h-[150px]"
                required
              />
              {state.errors?.bio && <p className="text-sm font-medium text-destructive">{state.errors.bio[0]}</p>}
            </div>
            
            <div className="flex justify-end">
                <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
