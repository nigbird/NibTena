
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
import { getSpecialties } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Doctor } from '@/lib/definitions';
import { saveDoctor, type DoctorFormState } from '@/app/hospital-admin/doctors/actions';

type DoctorFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  hospitalId: number;
  onDoctorSaved: () => void;
  doctorToEdit?: Doctor | null;
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="accent">
      {pending ? (
        <><Loader2 className="animate-spin mr-2" /> {isEditing ? 'Saving...' : 'Adding...'}</>
      ) : (
        isEditing ? 'Save Changes' : 'Add Doctor'
      )}
    </Button>
  );
}

export default function DoctorFormDrawer({ isOpen, setIsOpen, hospitalId, onDoctorSaved, doctorToEdit }: DoctorFormDrawerProps) {
  const isEditing = !!doctorToEdit;
  const initialState: DoctorFormState = { message: null, errors: {} };
  
  // The action needs to be bound with the hospitalId and potentially the doctorId if editing
  const action = isEditing ? saveDoctor.bind(null, hospitalId, doctorToEdit.id) : saveDoctor.bind(null, hospitalId, null);
  const [state, formAction] = useActionState<DoctorFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(Date.now()); // Used to reset the form

  useEffect(() => {
    getSpecialties(hospitalId).then(setSpecialties);
  }, []);
  
  useEffect(() => {
    // Reset form when drawer is closed or when switching between add/edit
    if (!isOpen) {
      setFormKey(Date.now()); // This will reset the form state by changing the key
    }
  }, [isOpen]);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success",
        description: state.message,
      });
      onDoctorSaved();
    } else if (state.message && !state.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, onDoctorSaved, toast]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Doctor' : 'Add a New Doctor'}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the doctor's details below." : "Enter the details for the new doctor to add them to your hospital."}
          </SheetDescription>
        </SheetHeader>
        <form key={formKey} action={formAction} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Full Name
            </Label>
            <div className="col-span-3">
              <Input id="name" name="name" defaultValue={doctorToEdit?.name} className="w-full" />
              {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="text-right">
              Specialty
            </Label>
            <div className="col-span-3">
               <Select name="specialty" defaultValue={doctorToEdit?.specialty} required>
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
              <Input id="experience" name="experience" type="number" defaultValue={doctorToEdit?.experience} placeholder="Years" className="w-full" />
               {state.errors?.experience && <p className="text-sm font-medium text-destructive">{state.errors.experience[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consultationFee" className="text-right">
              Fee ($)
            </Label>
            <div className="col-span-3">
              <Input id="consultationFee" name="consultationFee" type="number" defaultValue={doctorToEdit?.consultationFee} placeholder="150" className="w-full" />
               {state.errors?.consultationFee && <p className="text-sm font-medium text-destructive">{state.errors.consultationFee[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bio" className="text-right">
              Bio
            </Label>
            <div className="col-span-3">
              <Textarea id="bio" name="bio" defaultValue={doctorToEdit?.bio} className="w-full" />
               {state.errors?.bio && <p className="text-sm font-medium text-destructive">{state.errors.bio[0]}</p>}
            </div>
          </div>
          <SheetFooter>
             <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <SubmitButton isEditing={isEditing} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
