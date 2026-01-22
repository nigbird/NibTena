
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { saveHospital, type HospitalFormState } from '@/app/super-admin/hospitals/actions';
import type { Hospital } from '@/lib/definitions';
import { Switch } from '../ui/switch';
import Image from 'next/image';
import MapLocationPicker from './map-location-picker';

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
  const [showPassword, setShowPassword] = useState(false);
  
  const initialState: HospitalFormState = { message: null, errors: {} };
  const action = saveHospital.bind(null, hospitalToEdit?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  const [imagePreview, setImagePreview] = useState<string | null>(hospitalToEdit?.imageUrl || null);
  const [imageValidationErrors, setImageValidationErrors] = useState<string[]>([]);
  const [phoneErrors, setPhoneErrors] = useState<{ contactPhone?: string; ownerPhone?: string }>({});
  const [locationData, setLocationData] = useState<{
    latitude: number | null;
    longitude: number | null;
    mapDisplayAddress: string | null;
  }>({
    latitude: (hospitalToEdit as any)?.latitude || null,
    longitude: (hospitalToEdit as any)?.longitude || null,
    mapDisplayAddress: (hospitalToEdit as any)?.mapDisplayAddress || null,
  });
  
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
      setPhoneErrors({});
      setLocationData({
        latitude: (hospitalToEdit as any)?.latitude || null,
        longitude: (hospitalToEdit as any)?.longitude || null,
        mapDisplayAddress: (hospitalToEdit as any)?.mapDisplayAddress || null,
      });
    } else {
      // Reset location data when drawer closes to ensure fresh map initialization
      setLocationData({
        latitude: null,
        longitude: null,
        mapDisplayAddress: null,
      });
    }
  }, [isOpen, hospitalToEdit]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024;
      const vErrors: string[] = [];
      if (!allowedTypes.includes(file.type)) {
        vErrors.push('Unsupported file type. Allowed: JPEG, PNG, GIF, WebP.');
      }
      if (file.size > maxSize) {
        vErrors.push(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 5 MB.`);
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
    startTransition(async () => {
      const original = new FormData(event.currentTarget);

      // Validate and normalize phone numbers for contactPhone and ownerPhone
      const rawContact = String(original.get('contactPhone') || '').trim();
      const rawOwner = String(original.get('ownerPhone') || '').trim();

      const normalizeAndValidate = (input: string) => {
        if (!input) return { ok: false, msg: 'Phone is required', value: '' };
        // remove spaces, dashes, parentheses, but keep leading + if present
        let s = input.replace(/[^0-9+]/g, '');
        const hadPlus = s.startsWith('+');
        if (hadPlus) s = s.slice(1);
        // now s contains only digits

        // Helpful constants
        const digits = s.length;

        // If starts with country code 251
        if (s.startsWith('251')) {
          if (digits === 12) {
            return { ok: true, value: '+' + s };
          }
          return { ok: false, msg: 'When using country code 251 the number must be 12 digits (251 + 9 digits), e.g. +2519XXXXXXXX.' , value: '' };
        }

        // If local format starts with 0 (0 + 9 digits = 10)
        if (s.startsWith('0')) {
          if (digits === 10) {
            return { ok: true, value: '+251' + s.slice(1) };
          }
          return { ok: false, msg: 'When using a leading 0 the number must be 10 digits (0 + 9 digits), e.g. 09XXXXXXXX.', value: '' };
        }

        // If user provided 9 digits (no leading 0) -> assume local and prefix +251
        if (digits === 9) {
          return { ok: true, value: '+251' + s };
        }

        // Catch-all length error message
        return { ok: false, msg: 'Phone must be 9 digits (local), or 10 digits with leading 0, or 12 digits with country code 251 (e.g. +2519XXXXXXXX).', value: '' };
      };

      const contactCheck = normalizeAndValidate(rawContact);
      const ownerCheck = rawOwner ? normalizeAndValidate(rawOwner) : { ok: true, value: '' };
      const newPhoneErrors: typeof phoneErrors = {};
      if (!contactCheck.ok) newPhoneErrors.contactPhone = contactCheck.msg;
      if (rawOwner && !ownerCheck.ok) newPhoneErrors.ownerPhone = ownerCheck.msg;
      if (Object.keys(newPhoneErrors).length > 0) {
        setPhoneErrors(newPhoneErrors);
        return;
      }

      // replace with normalized values
      if (contactCheck.ok) original.set('contactPhone', contactCheck.value);
      if (rawOwner && ownerCheck.ok) original.set('ownerPhone', ownerCheck.value);

      const fileInput = (event.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('input[name="image"]');
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

      const fd = new FormData();
      for (const [key, value] of original.entries()) {
        if (key === 'image') continue;
        fd.append(key, value as string);
      }
      if (imageUrl) fd.set('imageUrl', imageUrl);
      
      // Add location data
      if (locationData.latitude !== null && locationData.longitude !== null) {
        fd.set('latitude', locationData.latitude.toString());
        fd.set('longitude', locationData.longitude.toString());
        if (locationData.mapDisplayAddress) {
          fd.set('mapDisplayAddress', locationData.mapDisplayAddress);
        }
      }
      
      fd.append('_csrf', csrfToken);

      formAction(fd);
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
              {imageValidationErrors.map((msg, i) => (
                <p key={i} className="text-destructive text-sm">{msg}</p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Hospital Name</Label>
              <Input id="name" name="name" defaultValue={hospitalToEdit?.name} required />
              {state.errors?.name && <p className="text-destructive text-sm">{state.errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={hospitalToEdit?.description} required />
              {state.errors?.description && <p className="text-destructive text-sm">{state.errors.description[0]}</p>}
            </div>
            
             <div className="grid sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={hospitalToEdit?.city} required />
                  {state.errors?.city && <p className="text-destructive text-sm">{state.errors.city[0]}</p>}
              </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Specific Address</Label>
                    <Input id="address" name="address" defaultValue={(hospitalToEdit as any)?.address || ''} />
                    {state.errors?.address && <p className="text-destructive text-sm">{state.errors.address[0]}</p>}
                </div>
            </div>

            <MapLocationPicker
              latitude={locationData.latitude}
              longitude={locationData.longitude}
              mapDisplayAddress={locationData.mapDisplayAddress}
              city={hospitalToEdit?.city}
              address={(hospitalToEdit as any)?.address}
              onLocationChange={(data) => {
                setLocationData({
                  latitude: data.latitude,
                  longitude: data.longitude,
                  mapDisplayAddress: data.mapDisplayAddress,
                });
              }}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={hospitalToEdit?.contactEmail} required />
                 {state.errors?.contactEmail && <p className="text-destructive text-sm">{state.errors.contactEmail[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={hospitalToEdit?.contactPhone} required onInput={() => setPhoneErrors((p) => ({ ...p, contactPhone: undefined }))} />
                 {phoneErrors.contactPhone ? (
                   <p className="text-destructive text-sm">{phoneErrors.contactPhone}</p>
                 ) : (
                   state.errors?.contactPhone && <p className="text-destructive text-sm">{state.errors.contactPhone[0]}</p>
                 )}
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner/Manager Name</Label>
                    <Input id="ownerName" name="ownerName" defaultValue={(hospitalToEdit as any)?.ownerName || ''} />
                    {state.errors?.ownerName && <p className="text-destructive text-sm">{state.errors.ownerName[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Owner/Manager Phone</Label>
                    <Input id="ownerPhone" name="ownerPhone" type="tel" defaultValue={(hospitalToEdit as any)?.ownerPhone || ''} onInput={() => setPhoneErrors((p) => ({ ...p, ownerPhone: undefined }))} />
                    {phoneErrors.ownerPhone ? (
                      <p className="text-destructive text-sm">{phoneErrors.ownerPhone}</p>
                    ) : (
                      state.errors?.ownerPhone && <p className="text-destructive text-sm">{state.errors.ownerPhone[0]}</p>
                    )}
                </div>
            </div>

             <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bankDistrict">Bank District</Label>
                    <Input id="bankDistrict" name="bankDistrict" defaultValue={(hospitalToEdit as any)?.bankDistrict || ''} />
                    {state.errors?.bankDistrict && <p className="text-destructive text-sm">{state.errors.bankDistrict[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bankBranch">Bank Branch</Label>
                    <Input id="bankBranch" name="bankBranch" defaultValue={(hospitalToEdit as any)?.bankBranch || ''} />
                    {state.errors?.bankBranch && <p className="text-destructive text-sm">{state.errors.bankBranch[0]}</p>}
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" name="accountNumber" defaultValue={hospitalToEdit?.accountNumber} required />
                    {state.errors?.accountNumber && <p className="text-destructive text-sm">{state.errors.accountNumber[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
                   <div className="relative">
                        <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder={isEditing ? 'Leave blank to keep current' : 'Leave blank to auto-generate'} autoComplete="new-password" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                   </div>
                  {state.errors?.password && <p className="text-destructive text-sm">{state.errors.password[0]}</p>}
                </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="status" name="status" defaultChecked={hospitalToEdit?.status === 'active' || !isEditing} />
              <Label htmlFor="status">Active</Label>
            </div>
          </form>
        </ScrollArea>
        <div className="flex justify-end space-x-2 pt-4 border-t -mx-6 px-6">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
           <Button type="submit" form="hospital-form" variant="accent" disabled={isPending || imageValidationErrors.length > 0}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : isEditing ? 'Save Changes' : 'Add Hospital'}
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
