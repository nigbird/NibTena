
'use client';

import { useActionState, useEffect, useState, useRef, useTransition } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import type { Doctor } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addDoctorSchedule, type ScheduleFormState } from '@/app/hospital-admin/schedule/actions';

type AddScheduleDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctors: Doctor[];
  hospitalId: number;
  onScheduleSaved: () => void;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AddScheduleDrawer({ isOpen, setIsOpen, doctors, hospitalId, onScheduleSaved }: AddScheduleDrawerProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const initialState: ScheduleFormState = { message: null, errors: {} };
  const addScheduleWithId = addDoctorSchedule.bind(null, hospitalId);
  const [state, formAction] = useActionState(addScheduleWithId, initialState);
  const [isPending, startTransition] = useTransition();

  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Schedule Added",
        description: state.message,
      });
      onScheduleSaved();
    } else if (state.message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, onScheduleSaved, toast]);

  useEffect(() => {
    if (isOpen) {
        formRef.current?.reset();
        setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    }
  }, [isOpen]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    selectedDays.forEach(day => {
        formData.append('workingDays', day);
    });
    startTransition(() => {
        formAction(formData);
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Add New Doctor Schedule</SheetTitle>
          <SheetDescription>
            Select a doctor and define their weekly availability.
          </SheetDescription>
        </SheetHeader>
        <form ref={formRef} id="add-schedule-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="doctorId">Doctor</Label>
                    <Select name="doctorId" required>
                        <SelectTrigger id="doctorId">
                            <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors.map(doctor => (
                                <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                    {doctor.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {state?.errors?.doctorId && <p className="text-sm text-destructive">{state.errors.doctorId[0]}</p>}
                </div>
              
              <div className="space-y-3">
                <Label>Available Days</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {weekDays.map(day => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day}-add`} 
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => handleDayToggle(day)}
                      />
                      <Label htmlFor={`day-${day}-add`} className="font-normal">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                 {state?.errors?.workingDays && <p className="text-sm text-destructive">{state.errors.workingDays[0]}</p>}
              </div>

              <div className="space-y-3">
                <Label>Available Time Slots</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between gap-4">
                     <div className="w-full space-y-1">
                        <Label htmlFor="start-time" className="text-xs">Start Time</Label>
                        <Input id="start-time" name="startTime" type="time" defaultValue="09:00" />
                        {state?.errors?.startTime && <p className="text-sm text-destructive">{state.errors.startTime[0]}</p>}
                     </div>
                     <div className="pt-5"> - </div>
                     <div className="w-full space-y-1">
                        <Label htmlFor="end-time" className="text-xs">End Time</Label>
                        <Input id="end-time" name="endTime" type="time" defaultValue="17:00" />
                        {state?.errors?.endTime && <p className="text-sm text-destructive">{state.errors.endTime[0]}</p>}
                     </div>
                  </div>
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">Optionally, add a break time.</p>
                  <div className="flex items-center justify-between gap-4">
                     <div className="w-full space-y-1">
                        <Label htmlFor="break-start-time" className="text-xs">Break Start</Label>
                        <Input id="break-start-time" name="breakStart" type="time" defaultValue="12:00" />
                     </div>
                      <div className="pt-5"> - </div>
                     <div className="w-full space-y-1">
                        <Label htmlFor="break-end-time" className="text-xs">Break End</Label>
                        <Input id="break-end-time" name="breakEnd" type="time" defaultValue="13:00" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </form>
         <SheetFooter className="mt-auto pt-4 border-t -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-schedule-form" disabled={isPending} variant="accent">
                {isPending ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Schedule'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
