
'use client';

import { useState } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import type { Appointment } from '@/lib/definitions';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { getAvailableTimeWindows } from '@/app/user/doctors/[id]/actions';


type RescheduleDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  appointment: Appointment;
  onReschedule: (date: string, slot: string) => Promise<void>;
};

export default function RescheduleDrawer({ isOpen, setIsOpen, appointment, onReschedule }: RescheduleDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date(appointment.appointmentDate));
  const [slot, setSlot] = useState<string>(appointment.appointmentSlot);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date) return;
    
    setIsLoading(true);
    try {
        await onReschedule(format(date, 'yyyy-MM-dd'), slot);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch available time windows for the doctor's hospital and selected date
    if (!date) return;
    const fetchWindows = async () => {
      if (!appointment.doctorId || !appointment.hospitalId) return;
      setIsLoadingSchedule(true);
      try {
        const windows = await getAvailableTimeWindows(appointment.doctorId, format(date, 'yyyy-MM-dd'), appointment.hospitalId);
        setAvailableSlots(windows);
        // If current slot is not in the new list, reset it
        if (slot && !windows.includes(slot)) {
          setSlot(windows[0] || '');
        }
      } catch (err) {
        console.error('Failed to fetch available windows for reschedule', err);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchWindows();
  }, [date, appointment.doctorId, appointment.hospitalId]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reschedule Appointment</SheetTitle>
          <SheetDescription>
            Select a new date and time for this appointment.
          </SheetDescription>
        </SheetHeader>
        <form id="reschedule-form" onSubmit={handleSubmit} className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="appointmentDate">New Appointment Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="space-y-2">
                <Label htmlFor="appointmentSlot">New Time Slot</Label>
                <Select name="appointmentSlot" value={slot} onValueChange={setSlot} required>
                    <SelectTrigger id="appointmentSlot"><SelectValue placeholder="Select a time" /></SelectTrigger>
                    <SelectContent>
                        {isLoadingSchedule ? (
                          <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin h-4 w-4 text-muted-foreground" /></div>
                        ) : availableSlots.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No available slots for the selected date.</div>
                        ) : (
                          availableSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                        )}
                    </SelectContent>
                </Select>
            </div>
        </form>
        <SheetFooter>
            <SheetClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" form="reschedule-form" disabled={isLoading} variant="accent">
            {isLoading ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
