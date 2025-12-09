
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
import { saveDoctor, type DoctorFormState } from "@/app/hospital-admin/doctors/actions";
import { getSpecialties } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Doctor } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

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
  
  const action = isEditing ? saveDoctor.bind(null, hospitalId, doctorToEdit.id) : saveDoctor.bind(null, hospitalId, null);
  const [state, formAction] = useActionState<DoctorFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(doctorToEdit?.imageUrl || null);
  const [imageValidationErrors, setImageValidationErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    getSpecialties(hospitalId).then(setSpecialties);
  }, [hospitalId]);
  
  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success",
        description: state.message,
      });
      onDoctorSaved();
    } else if (state.message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, onDoctorSaved, toast]);

  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
      setImagePreview(doctorToEdit?.imageUrl || null);
      setImageValidationErrors([]);
    }
  }, [isOpen, doctorToEdit]);

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
        // focus the input to make it obvious to the user
        fileInput.focus();
        return;
      }
    }

    if (imageValidationErrors.length > 0) {
      // prevent submit if there are outstanding validation errors
      const fileInputEl = formRef.current?.querySelector<HTMLInputElement>('input[name="image"]');
      fileInputEl?.focus();
      return;
    }

    startTransition(async () => {
      const original = new FormData(event.currentTarget);

      // Check for a selected file and upload it to /api/upload
      const fileInput = formRef.current?.querySelector<HTMLInputElement>('input[name="image"]');
      let imageUrl: string | null = null;
      if (fileInput?.files?.[0]) {
        const file = fileInput.files[0];
        const uploadFd = new FormData();
        uploadFd.append('file', file);
        try {
          const resp = await fetch('/api/upload', { method: 'POST', body: uploadFd });
          const json = await resp.json().catch(() => ({}));
          const returnedUrl = json?.path || json?.url || json?.publicPath || json?.location;
          if (resp.ok && returnedUrl) {
            imageUrl = returnedUrl;
          } else {
            const errMsg = json?.error || json?.message || 'Upload failed';
            setImageValidationErrors([errMsg]);
            return;
          }
        } catch (e) {
          setImageValidationErrors(['Upload failed']);
          return;
        }
      }

      // Build a new FormData with all original fields except the file input
      const fd = new FormData();
      for (const [key, value] of original.entries()) {
        if (key === 'image') continue;
        fd.append(key, value as string);
      }
      if (imageUrl) fd.set('imageUrl', imageUrl);

      formAction(fd);
    });
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // validate type and size (max 5MB)
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Doctor' : 'Add a New Doctor'}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the doctor's details below." : "Enter the details for the new doctor. A password will be auto-generated and sent to their email."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <form ref={formRef} onSubmit={handleSubmit} id="doctor-form" className="grid gap-4 py-4">
              {imagePreview && (
                <div className="space-y-2">
                    <Label>Image Preview</Label>
                    <div className="w-24 h-24 relative rounded-full overflow-hidden border-2 border-primary">
                        <Image src={imagePreview} alt="Doctor preview" fill style={{ objectFit: 'cover' }} />
                    </div>
                </div>
              )}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                Profile Photo
                </Label>
                <div className="col-span-3">
                <Input id="image" name="image" type="file" accept="image/*" className="w-full" onChange={handleImageChange}/>
                {imageValidationErrors.length > 0 && (
                  <div className="mt-2 space-y-1 text-sm">
                    {imageValidationErrors.map((msg, i) => (
                      <p key={i} className="text-destructive">{msg}</p>
                    ))}
                  </div>
                )}
                </div>
            </div>
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
                <Label htmlFor="contact" className="text-right">
                  Email
                </Label>
                <div className="col-span-3">
                  <Input id="contact" name="contact" type="email" defaultValue={doctorToEdit?.contact} className="w-full" required />
                  {state.errors?.contact && <p className="text-sm font-medium text-destructive">{state.errors.contact[0]}</p>}
                </div>
              </div>
              {isEditing && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                    Password
                    </Label>
                    <div className="col-span-3 relative">
                      <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Leave blank to keep unchanged" />
                       <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                     {state.errors?.password && <p className="text-sm font-medium text-destructive col-start-2 col-span-3">{state.errors.password[0]}</p>}
                </div>
              )}
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
                <Input id="experience" name="experience" type="number" defaultValue={doctorToEdit?.experience} placeholder="Years" className="w-full" required />
                {state.errors?.experience && <p className="text-sm font-medium text-destructive">{state.errors.experience[0]}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="consultationFee" className="text-right">
                Fee (ETB)
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
            <Button type="submit" form="doctor-form" disabled={isPending || imageValidationErrors.length > 0} variant="accent">
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
