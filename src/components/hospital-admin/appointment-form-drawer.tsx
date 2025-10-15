
'use client';

import { useActionState, useEffect, useRef, useTransition, useState } from 'react';
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
import { saveAppointment, getDoctorScheduleForDate, type AppointmentFormState } from "@/app/hospital-admin/appointments/actions";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Loader2, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import type { Appointment, Doctor, DoctorSchedule } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';

type AppointmentFormDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAppointmentSaved: () => void;
  appointmentToEdit?: Appointment | null;
  doctors: Doctor[];
  hospitalId: number;
};

function formatTime(timeStr: string) {
    const [hour, minute] = timeStr.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const formattedHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${String(formattedHour).padStart(2, '0')}:${minute} ${ampm}`;
}

export default function AppointmentFormDrawer({ isOpen, setIsOpen, onAppointmentSaved, appointmentToEdit, doctors, hospitalId }: AppointmentFormDrawerProps) {
  const isEditing = !!appointmentToEdit;
  const initialState: AppointmentFormState = { message: null, errors: {} };
  
  const action = saveAppointment.bind(null, hospitalId, appointmentToEdit?.id ?? null);
  const [state, formAction] = useActionState<AppointmentFormState, FormData>(action, initialState);

  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState<Date | undefined>(
    appointmentToEdit ? parseISO(appointmentToEdit.appointmentDate) : new Date()
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(appointmentToEdit?.doctorId?.toString());
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorSchedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [formKey, setFormKey] = useState(Date.now());


  useEffect(() => {
    if (selectedDoctorId && date) {
      setIsLoadingSchedule(true);
      getDoctorScheduleForDate(Number(selectedDoctorId), format(date, 'yyyy-MM-dd'), hospitalId)
        .then(schedule => setDoctorSchedule(schedule as DoctorSchedule | null))
        .finally(() => setIsLoadingSchedule(false));
    } else {
      setDoctorSchedule(null);
    }
  }, [selectedDoctorId, date, hospitalId]);

  useEffect(() => {
    if (state.success && !isPending) {
        toast({
            title: "Success",
            description: state.message,
        });
        onAppointmentSaved();
    } else if (state.message && !state.success && !isPending) {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  }, [state, isPending, onAppointmentSaved, toast]);

  useEffect(() => {
    if (isOpen) {
      setFormKey(Date.now());
      setDate(appointmentToEdit ? parseISO(appointmentToEdit.appointmentDate) : new Date());
      setSelectedDoctorId(appointmentToEdit?.doctorId.toString());
    }
  }, [isOpen, appointmentToEdit]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
        formAction(formData);
    });
  }

  const renderScheduleInfo = () => {
    if (isLoadingSchedule) {
      return <p className="text-sm text-muted-foreground">Loading schedule...</p>;
    }
    if (doctorSchedule) {
      const workingHours = doctorSchedule.workingHours as {startTime: string, endTime: string}[];
      const breakHours = doctorSchedule.breakHours as {startTime: string, endTime: string}[];
      return (
        <div className="text-xs space-y-1">
          <p className="font-medium text-foreground">Available hours for this day:</p>
          {workingHours.length > 0 ? (
            workingHours.map((slot, i) => (
              <Badge variant="secondary" key={`wh-${i}`}>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</Badge>
            ))
          ) : (
            <Badge variant="outline">Not available</Badge>
          )}

          {breakHours.length > 0 && (
             <div className="flex gap-2 items-center">
                <p className="font-medium text-foreground">Breaks:</p>
                {breakHours.map((slot, i) => (
                    <Badge variant="outline" key={`bh-${i}`}>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</Badge>
                ))}
             </div>
          )}
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground">Select a doctor and date to see their schedule.</p>;
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
            <form key={formKey} ref={formRef} onSubmit={handleSubmit} id="appointment-form" className="space-y-4 py-4">
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
                  <Select name="doctorId" value={selectedDoctorId} onValueChange={setSelectedDoctorId} required>
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
                     <Input type="hidden" name="appointmentDate" value={date ? format(date, "yyyy-MM-dd") : ""} />
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
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
                    {state.errors?.appointmentDate && <p className="text-sm font-medium text-destructive">{state.errors.appointmentDate[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentSlot">Appointment Time</Label>
                  <Input id="appointmentSlot" name="appointmentSlot" type="time" defaultValue={appointmentToEdit?.appointmentSlot} required />
                  <div className="pt-1">{renderScheduleInfo()}</div>
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
