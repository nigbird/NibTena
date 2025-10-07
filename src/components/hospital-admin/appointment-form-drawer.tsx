'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
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
import { saveAppointment, type AppointmentFormState } from "@/app/hospital-admin/appointments/actions";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import type { Appointment, Doctor } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const availableSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM'
];

type AppointmentFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAppointmentSaved: () => void;
  appointmentToEdit?: Appointment | null;
  doctors: Doctor[];
};

export default function AppointmentFormDrawer({ isOpen, setIsOpen, onAppointmentSaved, appointmentToEdit, doctors }: AppointmentFormDrawerProps) {
  const isEditing = !!appointmentToEdit;
  const initialState: AppointmentFormState = { message: null, errors: {} };
  
  const action = isEditing ? saveAppointment.bind(null, appointmentToEdit.id) : saveAppointment.bind(null, null);
  const [state, formAction] = useActionState<AppointmentFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // Ref to prevent multiple toast calls
  const successToastShownRef = useRef(false);

  useEffect(() => {
    if (state.success && !isPending && !successToastShownRef.current) {
        toast({
            title: "Success",
            description: state.message,
        });
        onAppointmentSaved();
        successToastShownRef.current = true; // Mark toast as shown
    } else if (state.message && !state.success && !isPending) {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  }, [state, isPending, onAppointmentSaved, toast]);

  useEffect(() => {
    // Reset form and success flag when the drawer is opened or changes mode
    if (isOpen) {
      formRef.current?.reset();
      successToastShownRef.current = false;
    }
  }, [isOpen, appointmentToEdit]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
        formAction(formData);
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Appointment' : 'Add New Appointment'}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the appointment details below." : "Fill in the details to book a new appointment."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <form ref={formRef} onSubmit={handleSubmit} id="appointment-form" className="space-y-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input id="patientName" name="patientName" defaultValue={appointmentToEdit?.patientName} required />
                  {state.errors?.patientName && <p className="text-sm font-medium text-destructive">{state.errors.patientName[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Patient Phone</Label>
                  <Input id="patientPhone" name="patientPhone" defaultValue={appointmentToEdit?.patientPhone} required />
                  {state.errors?.patientPhone && <p className="text-sm font-medium text-destructive">{state.errors.patientPhone[0]}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input id="patientAge" name="patientAge" type="number" defaultValue={appointmentToEdit?.patientAge} required />
                  {state.errors?.patientAge && <p className="text-sm font-medium text-destructive">{state.errors.patientAge[0]}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select name="patientGender" defaultValue={appointmentToEdit?.patientGender} required>
                        <SelectTrigger id="patientGender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                     {state.errors?.patientGender && <p className="text-sm font-medium text-destructive">{state.errors.patientGender[0]}</p>}
                </div>
              </div>

               <div className="space-y-2">
                  <Label htmlFor="doctorId">Doctor</Label>
                  <Select name="doctorId" defaultValue={appointmentToEdit?.doctorId?.toString()} required>
                      <SelectTrigger id="doctorId"><SelectValue placeholder="Select a doctor" /></SelectTrigger>
                      <SelectContent>
                          {doctors.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name} - <span className="text-muted-foreground">{d.specialty}</span></SelectItem>)}
                      </SelectContent>
                  </Select>
                  {state.errors?.doctorId && <p className="text-sm font-medium text-destructive">{state.errors.doctorId[0]}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="appointmentDate">Appointment Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Input name="appointmentDate" id="appointmentDate" defaultValue={appointmentToEdit?.appointmentDate} placeholder="Select a date" className="justify-start text-left font-normal" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" onSelect={(date) => {
                                const input = document.getElementById('appointmentDate') as HTMLInputElement;
                                if (input && date) {
                                    input.value = format(date, 'yyyy-MM-dd');
                                }
                            }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    {state.errors?.appointmentDate && <p className="text-sm font-medium text-destructive">{state.errors.appointmentDate[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="appointmentSlot">Time Slot</Label>
                    <Select name="appointmentSlot" defaultValue={appointmentToEdit?.appointmentSlot} required>
                        <SelectTrigger id="appointmentSlot"><SelectValue placeholder="Select a time" /></SelectTrigger>
                        <SelectContent>
                          {availableSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {state.errors?.appointmentSlot && <p className="text-sm font-medium text-destructive">{state.errors.appointmentSlot[0]}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms / Notes</Label>
                <Textarea id="symptoms" name="symptoms" defaultValue={appointmentToEdit?.symptoms} />
                 {state.errors?.symptoms && <p className="text-sm font-medium text-destructive">{state.errors.symptoms[0]}</p>}
              </div>
            </form>
        </ScrollArea>
        <div className="flex justify-end space-x-2 pt-4 border-t -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="appointment-form" disabled={isPending} variant="accent">
                {isPending ? (
                    <><Loader2 className="animate-spin mr-2" /> {isEditing ? 'Saving...' : 'Booking...'}</>
                ) : (
                    isEditing ? 'Save Changes' : 'Book Appointment'
                )}
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
