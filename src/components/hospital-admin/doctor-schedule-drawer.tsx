
'use client';

import { useState, useEffect, useTransition, useActionState, useRef } from 'react';
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
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import type { Doctor, DoctorSchedule, TimeSlot } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { getDoctorSchedules, saveDoctorSchedule, type ScheduleSaveState } from '@/app/hospital-admin/schedule/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from '../ui/card';

type DoctorScheduleDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctor: Doctor;
  hospitalId: number;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = {
  dayOfWeek: string;
  workingHours: TimeSlot[];
  breakHours: TimeSlot[];
  patientsPerHour: number;
}

export default function DoctorScheduleDrawer({ isOpen, setIsOpen, doctor, hospitalId }: DoctorScheduleDrawerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [schedules, setSchedules] = useState<DaySchedule[]>(
     weekDays.map(day => ({ dayOfWeek: day, workingHours: [], breakHours: [], patientsPerHour: 2 }))
  );
  const [isLoading, setIsLoading] = useState(true);

  const initialState: ScheduleSaveState = { message: null, errors: {} };
  const saveScheduleWithId = saveDoctorSchedule.bind(null, hospitalId);
  const [state, formAction] = useActionState(saveScheduleWithId, initialState);
  
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getDoctorSchedules(doctor.id, hospitalId).then(data => {
        const newSchedules = weekDays.map(day => {
          const existing = data.find(d => d.dayOfWeek === day);
          return existing 
            ? { dayOfWeek: day, workingHours: existing.workingHours as TimeSlot[], breakHours: existing.breakHours as TimeSlot[], patientsPerHour: (existing as any).patientsPerHour || 2 } 
            : { dayOfWeek: day, workingHours: [{startTime: '09:00', endTime: '17:00'}], breakHours: [{startTime: '12:30', endTime: '13:30'}], patientsPerHour: 2 };
        });
        setSchedules(newSchedules);
        setIsLoading(false);
      });
    }
  }, [isOpen, doctor, hospitalId]);

  useEffect(() => {
    if (state.success) {
      toast({ title: "Success", description: state.message });
      setIsOpen(false);
    } else if (state.message) {
      toast({ variant: "destructive", title: "Error", description: state.message });
    }
  }, [state, toast, setIsOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    const scheduleData = {
        doctorId: doctor.id,
        schedules: schedules
    };
    formData.append('scheduleData', JSON.stringify(scheduleData));
    
    startTransition(() => {
      formAction(formData);
    });
  };

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
          <SheetTitle>Edit Schedule for {doctor.name}</SheetTitle>
          <SheetDescription>
            Define the weekly available days and working hours for this doctor.
          </SheetDescription>
        </SheetHeader>
        <form id="schedule-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? <p>Loading schedule...</p> : (
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
                                              <Button variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'workingHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
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
                                              <Button variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'breakHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
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
          )}
        </form>
         <SheetFooter className="mt-auto pt-4 border-t -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="schedule-form" disabled={isPending || isLoading} variant="accent">
                {isPending ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Schedule'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
