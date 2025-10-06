'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDoctor, getSpecialties, type DoctorFormState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Doctor } from '@/lib/definitions';

type AddDoctorDrawerProps = {
    children: React.ReactNode;
    hospitalId: number;
    onDoctorAdded: (newDoctor: Doctor) => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="accent">
      {pending ? <><Loader2 className="animate-spin mr-2" /> Adding...</> : 'Add Doctor'}
    </Button>
  );
}

export default function AddDoctorDrawer({ children, hospitalId, onDoctorAdded }: AddDoctorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: DoctorFormState = { message: null, errors: {} };
  const addDoctorWithHospitalId = addDoctor.bind(null, hospitalId);
  const [state, formAction] = useActionState<DoctorFormState, FormData>(addDoctorWithHospitalId, initialState);
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    getSpecialties().then(setSpecialties);
  }, []);

  useEffect(() => {
    if (state.success && state.newDoctor) {
      toast({
        title: "Success",
        description: state.message,
      });
      onDoctorAdded(state.newDoctor);
      setIsOpen(false);
    } else if (state.message && !state.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, onDoctorAdded, toast]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add a New Doctor</SheetTitle>
          <SheetDescription>
            Enter the details for the new doctor to add them to your hospital.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Full Name
            </Label>
            <div className="col-span-3">
              <Input id="name" name="name" className="w-full" />
              {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="text-right">
              Specialty
            </Label>
            <div className="col-span-3">
               <Select name="specialty" required>
                    <SelectTrigger id="specialty">
                        <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                        {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
              {state.errors?.specialty && <p className="text-sm font-medium text-destructive">{state.errors.specialty[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="experience" className="text-right">
              Experience
            </Label>
            <div className="col-span-3">
              <Input id="experience" name="experience" type="number" placeholder="Years" className="w-full" />
               {state.errors?.experience && <p className="text-sm font-medium text-destructive">{state.errors.experience[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consultationFee" className="text-right">
              Fee ($)
            </Label>
            <div className="col-span-3">
              <Input id="consultationFee" name="consultationFee" type="number" placeholder="150" className="w-full" />
               {state.errors?.consultationFee && <p className="text-sm font-medium text-destructive">{state.errors.consultationFee[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bio" className="text-right">
              Bio
            </Label>
            <div className="col-span-3">
              <Textarea id="bio" name="bio" className="w-full" />
               {state.errors?.bio && <p className="text-sm font-medium text-destructive">{state.errors.bio[0]}</p>}
            </div>
          </div>
          <SheetFooter>
             <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <SubmitButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
