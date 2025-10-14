
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
  const [isActive, setIsActive] = useState(
    isEditing ? hospitalToEdit.status === 'active' : true
  );

  useEffect(() => {
    if (isOpen) {
      setIsActive(isEditing ? hospitalToEdit.status === 'active' : true);
      formRef.current?.reset();
    }
  }, [isOpen, isEditing, hospitalToEdit]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('status', isActive ? 'active' : 'inactive');

    startTransition(async () => {
      const result = await saveHospital(hospitalToEdit?.id ?? null, formData);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        onActionSuccess();
      } else {
        toast({
          variant: "destructive",
          title: "Error saving hospital",
          description: Object.values(result.errors || {}).flat().join('\\n') || result.message,
        });
      }
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
            <div className="space-y-2">
              <Label htmlFor="name">Hospital Name</Label>
              <Input id="name" name="name" defaultValue={hospitalToEdit?.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={hospitalToEdit?.description}
                required
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={hospitalToEdit?.city} required />
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Hospital Photo</Label>
              <Input id="photo" name="photo" type="file" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="status-switch"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="status-switch">Active</Label>
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="mt-auto border-t pt-4 -mx-6 px-6">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </SheetClose>
           <Button type="submit" form="hospital-form" disabled={isPending} variant="accent">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  {isEditing ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Add Hospital'
              )}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
