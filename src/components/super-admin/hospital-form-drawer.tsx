
'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { saveHospital, type HospitalFormState } from '@/app/super-admin/hospitals/actions';
import type { Hospital } from '@/lib/definitions';
import { Switch } from '../ui/switch';
import Image from 'next/image';

type HospitalFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onActionSuccess: () => void;
  hospitalToEdit?: Hospital | null;
};

export default function HospitalFormDrawer({
  isOpen,
  setIsOpen,
  onActionSuccess,
  hospitalToEdit,
}: HospitalFormDrawerProps) {
  const isEditing = !!hospitalToEdit;
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  
  const initialState: HospitalFormState = { message: null, errors: {} };
  const action = saveHospital.bind(null, hospitalToEdit?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  const [imagePreview, setImagePreview] = useState<string | null>(hospitalToEdit?.imageUrl || null);
  const [imageValidationErrors, setImageValidationErrors] = useState<string[]>([]);
  
  useEffect(() => {
    if (state.success && !isPending) {
      toast({
        title: "Success",
        description: state.message,
      });
      onActionSuccess();
    } else if (state.message && !isPending && !state.success) {
      toast({
        variant: "destructive",
        title: "Error saving hospital",
        description: Object.values(state.errors || {}).flat().join('\n') || state.message,
      });
    }
  }, [state, onActionSuccess, toast, isPending]);

  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
      setImagePreview(hospitalToEdit?.imageUrl || null);
      setImageValidationErrors([]);
    }
  }, [isOpen, hospitalToEdit]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // client-side validation: type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const vErrors: string[] = [];

      if (!allowedTypes.includes(file.type)) {
        vErrors.push('Unsupported file type. Allowed: JPEG, PNG, GIF, WebP.');
      }

      if (file.size > maxSize) {
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        vErrors.push(`File is too large (${mb} MB). Maximum allowed is 5 MB.`);
      }

      if (vErrors.length > 0) {
        setImageValidationErrors(vErrors);
        setImagePreview(null);
        return;
      }

      setImageValidationErrors([]);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Re-validate image before submitting to avoid sending large/invalid files to server
    const fileInput = formRef.current?.querySelector<HTMLInputElement>('input[name="image"]');
    const file = fileInput?.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const vErrors: string[] = [];
      if (!allowedTypes.includes(file.type)) vErrors.push('Unsupported file type. Allowed: JPEG, PNG, GIF, WebP.');
      if (file.size > maxSize) vErrors.push(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed is 5 MB.`);
      if (vErrors.length > 0) {
        setImageValidationErrors(vErrors);
        fileInput.focus();
        return;
      }
    }

    if (imageValidationErrors.length > 0) {
      const fileInputEl = formRef.current?.querySelector<HTMLInputElement>('input[name="image"]');
      fileInputEl?.focus();
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  };


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Hospital' : 'Add New Hospital'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the hospital's details below."
              : "Enter the details for the new hospital."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            id="hospital-form"
            className="grid gap-6 py-4"
          >
            {imagePreview && (
                <div className="space-y-2">
                    <Label>Image Preview</Label>
                    <div className="w-full h-48 relative rounded-md overflow-hidden border">
                        <Image src={imagePreview} alt="Hospital preview" fill style={{ objectFit: 'cover' }} />
                    </div>
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="image">Hospital Photo</Label>
              <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
              {imageValidationErrors.length > 0 && (
                <div className="mt-2 space-y-1 text-sm">
                  {imageValidationErrors.map((msg, i) => (
                    <p key={i} className="text-destructive">{msg}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Hospital Name</Label>
              <Input id="name" name="name" defaultValue={hospitalToEdit?.name} required />
              {state.errors?.name && <p className="text-destructive text-sm">{state.errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={hospitalToEdit?.description}
                required
              />
              {state.errors?.description && <p className="text-destructive text-sm">{state.errors.description[0]}</p>}
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={hospitalToEdit?.city} required />
                  {state.errors?.city && <p className="text-destructive text-sm">{state.errors.city[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Enter password'}
                  required={!isEditing}
                />
                 {state.errors?.password && <p className="text-destructive text-sm">{state.errors.password[0]}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={hospitalToEdit?.contactEmail}
                  required
                />
                 {state.errors?.contactEmail && <p className="text-destructive text-sm">{state.errors.contactEmail[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  defaultValue={hospitalToEdit?.contactPhone}
                  required
                />
                 {state.errors?.contactPhone && <p className="text-destructive text-sm">{state.errors.contactPhone[0]}</p>}
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input id="accountNumber" name="accountNumber" defaultValue={hospitalToEdit?.accountNumber} required />
                {state.errors?.accountNumber && <p className="text-destructive text-sm">{state.errors.accountNumber[0]}</p>}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                name="status"
                defaultChecked={hospitalToEdit?.status === 'active' || !isEditing}
              />
              <Label htmlFor="status">Active</Label>
            </div>
          </form>
        </ScrollArea>
        <div className="flex justify-end space-x-2 pt-4 border-t -mx-6 px-6">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
           <Button type="submit" form="hospital-form" variant="accent" disabled={isPending || imageValidationErrors.length > 0}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : isEditing ? 'Save Changes' : 'Add Hospital'}
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
