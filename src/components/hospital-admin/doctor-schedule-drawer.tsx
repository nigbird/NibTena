'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock } from 'lucide-react';
import type { Doctor } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';

type DoctorScheduleDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctor: Doctor;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorScheduleDrawer({ isOpen, setIsOpen, doctor }: DoctorScheduleDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    // Mock saving the schedule
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Schedule Updated",
      description: `Dr. ${doctor.name}'s schedule has been saved.`,
    });
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Schedule for {doctor.name}</SheetTitle>
          <SheetDescription>
            Define the weekly available days and working hours for this doctor.
          </SheetDescription>
        </SheetHeader>
        <form id="schedule-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Available Days */}
              <div className="space-y-3">
                <Label>Available Days</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {weekDays.map(day => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox id={`day-${day}`} defaultChecked={!['Saturday', 'Sunday'].includes(day)} />
                      <Label htmlFor={`day-${day}`} className="font-normal">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Times */}
              <div className="space-y-3">
                <Label>Available Time Slots</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">Define the standard working hours for the available days.</p>
                  <div className="flex items-center justify-between gap-4">
                     <div className="w-full space-y-1">
                        <Label htmlFor="start-time" className="text-xs">Start Time</Label>
                        <Input id="start-time" type="time" defaultValue="09:00" />
                     </div>
                     <div className="pt-5"> - </div>
                     <div className="w-full space-y-1">
                        <Label htmlFor="end-time" className="text-xs">End Time</Label>
                        <Input id="end-time" type="time" defaultValue="17:00" />
                     </div>
                  </div>
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">Optionally, add a break time.</p>
                  <div className="flex items-center justify-between gap-4">
                     <div className="w-full space-y-1">
                        <Label htmlFor="break-start-time" className="text-xs">Break Start</Label>
                        <Input id="break-start-time" type="time" defaultValue="12:00" />
                     </div>
                      <div className="pt-5"> - </div>
                     <div className="w-full space-y-1">
                        <Label htmlFor="break-end-time" className="text-xs">Break End</Label>
                        <Input id="break-end-time" type="time" defaultValue="13:00" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t -mx-6 px-6 mt-auto">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" form="schedule-form" disabled={isLoading} variant="accent">
                  {isLoading ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Schedule'}
              </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
