'use client';

import { useActionState, useEffect, useState, useTransition, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDoctor, type DoctorFormState } from "@/app/hospital-admin/doctors/actions";
import { getSpecialties } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Doctor } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '../ui/scroll-area';

type DoctorFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  hospitalId: number;
  onDoctorSaved: () => void;
  doctorToEdit?: Doctor | null;
};

export default function DoctorFormDrawer({ isOpen, setIsOpen, hospitalId, onDoctorSaved, doctorToEdit }: DoctorFormDrawerProps) {
  const isEditing = !!doctorToEdit;
  const initialState: DoctorFormState = { message: null, errors: {} };
  
  const action = isEditing ? addDoctor.bind(null, hospitalId, doctorToEdit.id) : addDoctor.bind(null, hospitalId, null);
  const [state, formAction] = useActionState<DoctorFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(Date.now());
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submittedRef = useRef(false);

  useEffect(() => {
    getSpecialties().then(setSpecialties);
  }, []);
  
  useEffect(() => {
    if (!isOpen) {
      setFormKey(Date.now());
      submittedRef.current = false; // Reset submission tracker when closing
    }
  }, [isOpen]);

  useEffect(() => {
    if (state.success && submittedRef.current === false) {
      toast({
        title: "Success",
        description: state.message,
      });
      submittedRef.current = true; // Mark as submitted
      onDoctorSaved();
    } else if (state.message && !state.success && submittedRef.current === false) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
      submittedRef.current = true; // Mark as submitted to prevent multiple error toasts
    }
  }, [state, onDoctorSaved, toast]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submittedRef.current = false; // Reset for new submission
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
        formAction(formData);
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Doctor' : 'Add a New Doctor'}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the doctor's details below." : "Enter the details for the new doctor to add them to your hospital."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <form key={formKey} onSubmit={handleSubmit} id="doctor-form" className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                Full Name
                </Label>
                <div className="col-span-3">
                <Input id="name" name="name" defaultValue={doctorToEdit?.name} className="w-full" required />
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
                <Label htmlFor="photo" className="text-right">
                Profile Photo
                </Label>
                <div className="col-span-3">
                <Input id="photo" name="photo" type="file" className="w-full" />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="experience" className="text-right">
                Experience
                </Label>
                <div className="col-span-3">
                <Input id="experience" name="experience" type="number" defaultValue={doctorToEdit?.experience} placeholder="Years" className="w-full" required />
                {state.errors?.experience && <p className="text-sm font-medium text-destructive">{state.errors.experience[0]}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="consultationFee" className="text-right">
                Fee ($)
                </Label>
                <div className="col-span-3">
                <Input id="consultationFee" name="consultationFee" type="number" defaultValue={doctorToEdit?.consultationFee} placeholder="150" className="w-full" required/>
                {state.errors?.consultationFee && <p className="text-sm font-medium text-destructive">{state.errors.consultationFee[0]}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bio" className="text-right">
                Bio
                </Label>
                <div className="col-span-3">
                <Textarea id="bio" name="bio" defaultValue={doctorToEdit?.bio} className="w-full" required />
                {state.errors?.bio && <p className="text-sm font-medium text-destructive">{state.errors.bio[0]}</p>}
                </div>
            </div>
            </form>
        </ScrollArea>
        <div className="flex justify-end space-x-2 pt-4 border-t -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="doctor-form" disabled={isPending} variant="accent">
                {isPending ? (
                    <><Loader2 className="animate-spin mr-2" /> {isEditing ? 'Saving...' : 'Adding...'}</>
                ) : (
                    isEditing ? 'Save Changes' : 'Add Doctor'
                )}
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
