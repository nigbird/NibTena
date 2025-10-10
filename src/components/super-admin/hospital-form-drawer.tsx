
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { saveHospital, type HospitalFormState } from '@/app/super-admin/hospitals/actions';
import type { Hospital } from '@/lib/definitions';
import { Switch } from '../ui/switch';

type HospitalFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onActionSuccess: () => void;
  hospitalToEdit?: Hospital | null;
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form="hospital-form" disabled={pending} variant="accent">
      {pending ? (
        <><Loader2 className="animate-spin mr-2" /> {isEditing ? 'Saving...' : 'Adding...'}</>
      ) : (
        isEditing ? 'Save Changes' : 'Add Hospital'
      )}
    </Button>
  );
}

export default function HospitalFormDrawer({ isOpen, setIsOpen, onActionSuccess, hospitalToEdit }: HospitalFormDrawerProps) {
  const isEditing = !!hospitalToEdit;
  const initialState: HospitalFormState = { message: null, errors: {} };
  
  const action = isEditing ? saveHospital.bind(null, hospitalToEdit.id) : saveHospital.bind(null, null);
  const [state, formAction] = useActionState<HospitalFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success",
        description: state.message,
      });
      onActionSuccess();
    } else if (state.message && state.errors) {
      toast({
        variant: "destructive",
        title: "Error saving hospital",
        description: Object.values(state.errors).flat().join('\n') || state.message,
      });
    } else if (state.message) {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  }, [state, onActionSuccess, toast]);
  
  useEffect(() => {
    if (!isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Hospital' : 'Add New Hospital'}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the hospital's details below." : "Enter the details for the new hospital."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <form ref={formRef} action={formAction} id="hospital-form" className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Hospital Name</Label>
                <Input id="name" name="name" defaultValue={hospitalToEdit?.name} required />
                {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={hospitalToEdit?.description} required />
                {state.errors?.description && <p className="text-sm font-medium text-destructive">{state.errors.description[0]}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" defaultValue={hospitalToEdit?.city} required />
                    {state.errors?.city && <p className="text-sm font-medium text-destructive">{state.errors.city[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" name="accountNumber" defaultValue={hospitalToEdit?.accountNumber} required />
                    {state.errors?.accountNumber && <p className="text-sm font-medium text-destructive">{state.errors.accountNumber[0]}</p>}
                </div>
            </div>
             <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input id="contactEmail" name="contactEmail" type="email" defaultValue={hospitalToEdit?.contactEmail} required />
                    {state.errors?.contactEmail && <p className="text-sm font-medium text-destructive">{state.errors.contactEmail[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={hospitalToEdit?.contactPhone} required />
                    {state.errors?.contactPhone && <p className="text-sm font-medium text-destructive">{state.errors.contactPhone[0]}</p>}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Hospital Photo</Label>
              <Input id="photo" name="photo" type="file" />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="status-switch"
                name="status"
                defaultChecked={!isEditing || hospitalToEdit?.status === 'active'}
              />
              <Label htmlFor="status-switch">Active</Label>
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="mt-auto border-t pt-4 -mx-6 px-6">
          <SheetClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </SheetClose>
          <SubmitButton isEditing={isEditing} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
