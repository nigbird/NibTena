
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

const availableSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM'
];

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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reschedule Appointment</SheetTitle>
          <SheetDescription>
            Select a new date and time for {appointment.patientName}.
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
                        {availableSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
