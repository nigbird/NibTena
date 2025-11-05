
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { Doctor, TimeSlot } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { saveDoctorSchedule, type ScheduleSaveState } from '@/app/hospital-admin/schedule/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';

type AddScheduleDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctors: Doctor[];
  hospitalId: number;
  onScheduleSaved: () => void;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = {
  dayOfWeek: string;
  workingHours: TimeSlot[];
  breakHours: TimeSlot[];
  patientsPerHour: number;
}

export default function AddScheduleDrawer({ isOpen, setIsOpen, doctors, hospitalId, onScheduleSaved }: AddScheduleDrawerProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const initialState: ScheduleSaveState = { message: null, errors: {} };
  const addScheduleWithId = saveDoctorSchedule.bind(null, hospitalId);
  const [state, formAction] = useActionState(addScheduleWithId, initialState);
  const [isPending, startTransition] = useTransition();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [schedules, setSchedules] = useState<DaySchedule[]>(
     weekDays.map(day => ({ dayOfWeek: day, workingHours: [], breakHours: [], patientsPerHour: 2 }))
  );

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
        setSelectedDoctorId('');
        setSchedules(weekDays.map(day => ({ dayOfWeek: day, workingHours: [], breakHours: [], patientsPerHour: 2 })));
    }
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDoctorId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a doctor.' });
        return;
    }
    const formData = new FormData();
    const scheduleData = {
        doctorId: Number(selectedDoctorId),
        schedules: schedules
    };
    formData.append('scheduleData', JSON.stringify(scheduleData));
    startTransition(() => {
        formAction(formData);
    });
  }

  const handleTimeChange = (day: string, type: 'workingHours' | 'breakHours', index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day 
        ? {
            ...s,
            [type]: s[type].map((slot, i) => i === index ? {...slot, [field]: value} : slot)
          }
        : s
    ));
  };

  const handlePatientsPerHourChange = (day: string, value: string) => {
    setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day 
        ? { ...s, patientsPerHour: Number(value) }
        : s
    ));
  };
  
  const addSlot = (day: string, type: 'workingHours' | 'breakHours') => {
     setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day
        ? { ...s, [type]: [...s[type], {startTime: '', endTime: ''}]}
        : s
    ));
  };
  
  const removeSlot = (day: string, type: 'workingHours' | 'breakHours', index: number) => {
     setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day
        ? { ...s, [type]: s[type].filter((_, i) => i !== index)}
        : s
    ));
  }


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Add New Doctor Schedule</SheetTitle>
          <SheetDescription>
            Select a doctor and define their weekly availability.
          </SheetDescription>
        </SheetHeader>
        <form ref={formRef} id="add-schedule-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="space-y-2 py-4">
                <Label htmlFor="doctorId">Doctor</Label>
                <Select name="doctorId" required value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
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
            <Tabs defaultValue="Monday" className="flex-1 flex flex-col overflow-hidden">
                 <ScrollArea className="w-full whitespace-nowrap">
                   <TabsList className="flex">
                    {weekDays.map(day => (
                        <TabsTrigger key={day} value={day} className="flex-1">{day.substring(0,3)}</TabsTrigger>
                    ))}
                    </TabsList>
                </ScrollArea>
                <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
                     {schedules.map(daySchedule => (
                         <TabsContent key={daySchedule.dayOfWeek} value={daySchedule.dayOfWeek}>
                           <div className="space-y-6">
                              <Card>
                                 <CardContent className="pt-6 space-y-4">
                                    <div>
                                      <Label className="font-semibold">Working Hours</Label>
                                      <div className="space-y-3 mt-2">
                                      {daySchedule.workingHours.map((slot, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                              <Input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', index, 'startTime', e.target.value)} />
                                              <span>-</span>
                                              <Input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', index, 'endTime', e.target.value)} />
                                              <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'workingHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      ))}
                                      </div>
                                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => addSlot(daySchedule.dayOfWeek, 'workingHours')}>
                                          <PlusCircle className="mr-2 h-4 w-4" /> Add Working Slot
                                      </Button>
                                    </div>
                                    <div>
                                      <Label className="font-semibold">Break Hours</Label>
                                       <div className="space-y-3 mt-2">
                                      {daySchedule.breakHours.map((slot, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                              <Input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', index, 'startTime', e.target.value)} />
                                              <span>-</span>
                                              <Input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', index, 'endTime', e.target.value)} />
                                              <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'breakHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      ))}
                                      </div>
                                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => addSlot(daySchedule.dayOfWeek, 'breakHours')}>
                                          <PlusCircle className="mr-2 h-4 w-4" /> Add Break Slot
                                      </Button>
                                    </div>
                                     <div>
                                        <Label className="font-semibold">Patients Per Hour</Label>
                                        <Input type="number" value={daySchedule.patientsPerHour} min="1" onChange={(e) => handlePatientsPerHourChange(daySchedule.dayOfWeek, e.target.value)} className="mt-2 w-24" />
                                     </div>
                                 </CardContent>
                              </Card>
                           </div>
                         </TabsContent>
                    ))}
                </ScrollArea>
            </Tabs>
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
