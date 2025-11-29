
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
import { Loader2, Trash2, PlusCircle, Copy } from 'lucide-react';
import type { Doctor, TimeSlot } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { getDoctorSchedules, saveDoctorSchedule, type ScheduleSaveState, getHospitalSettings } from '@/app/hospital-admin/schedule/actions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = {
  dayOfWeek: string;
  shift: string; // 'unavailable', 'morning', 'afternoon', 'full_day', 'custom'
  workingHours: TimeSlot[];
  breakHours: TimeSlot[];
  patientsPerHour: number;
}

const shiftTemplates = {
    morning: { working: [{ startTime: '09:00', endTime: '13:00' }], breaks: [] },
    afternoon: { working: [{ startTime: '14:00', endTime: '18:00' }], breaks: [] },
    full_day: { working: [{ startTime: '09:00', endTime: '18:00' }], breaks: [{ startTime: '13:00', endTime: '14:00' }] },
};


export default function DoctorScheduleDrawer({ isOpen, setIsOpen, doctor, hospitalId, doctors, onScheduleSaved }: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctor?: Doctor | null; // Optional: for editing
  hospitalId: number;
  doctors?: Doctor[]; // Optional: for adding
  onScheduleSaved?: () => void; // Make this optional too
}) {
  const isEditing = !!doctor;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [schedules, setSchedules] = useState<DaySchedule[]>(
     weekDays.map(day => ({ dayOfWeek: day, shift: 'unavailable', workingHours: [], breakHours: [], patientsPerHour: 2 }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hospitalHours, setHospitalHours] = useState<{ startTime: string, endTime: string } | null>(null);

  const [copySourceDay, setCopySourceDay] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);
  const [isCopyPopoverOpen, setIsCopyPopoverOpen] = useState(false);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(doctor?.id.toString());

  const initialState: ScheduleSaveState = { message: null, errors: {} };
  const saveScheduleWithId = saveDoctorSchedule.bind(null, hospitalId);
  const [state, formAction] = useActionState(saveScheduleWithId, initialState);
  
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const doctorIdToFetch = isEditing ? doctor?.id : Number(selectedDoctorId);

      Promise.all([
        (isEditing || selectedDoctorId) ? getDoctorSchedules(doctorIdToFetch!, hospitalId) : Promise.resolve([]),
        getHospitalSettings(hospitalId)
      ]).then(([data, settings]) => {
        setHospitalHours(settings);
        const newSchedules = weekDays.map(day => {
          const existing = data.find(d => d.dayOfWeek === day);
          if (existing) {
             const workingHours = existing.workingHours as TimeSlot[];
             let shift = 'custom';
             if(workingHours.length === 1 && workingHours[0].startTime === '09:00' && workingHours[0].endTime === '18:00') {
                shift = 'full_day';
             } else if(workingHours.length === 1 && workingHours[0].startTime === '09:00' && workingHours[0].endTime === '13:00') {
                shift = 'morning';
             } else if(workingHours.length === 1 && workingHours[0].startTime === '14:00' && workingHours[0].endTime === '18:00') {
                shift = 'afternoon';
             }

            return { dayOfWeek: day, shift, workingHours, breakHours: existing.breakHours as TimeSlot[], patientsPerHour: (existing as any).patientsPerHour || 2 }
          }
          return { dayOfWeek: day, shift: 'unavailable', workingHours: [], breakHours: [], patientsPerHour: 2 };
        });
        setSchedules(newSchedules);
        setIsLoading(false);
      });
    } else {
        setSelectedDoctorId(undefined);
    }
  }, [isOpen, doctor, hospitalId, selectedDoctorId, isEditing]);

 // Prevent repeated success toasts + re-closing animation
    const prevSuccess = useRef(false);

    useEffect(() => {
      if (state.success && !prevSuccess.current) {
        prevSuccess.current = true;

        toast({ title: "Success", description: state.message });
        onScheduleSaved?.();
        setIsOpen(false);
      }

      if (!state.success && state.message) {
        toast({
          variant: "destructive",
          title: "Error",
          description: state.message || "Please correct the errors below.",
        });
      }
    }, [state.success, state.message]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentDoctorId = isEditing ? doctor.id : Number(selectedDoctorId);
    if (!currentDoctorId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a doctor.' });
        return;
    }

    const formData = new FormData();
    const scheduleData = {
        doctorId: currentDoctorId,
        schedules: schedules
    };
    formData.append('scheduleData', JSON.stringify(scheduleData));
    
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleShiftChange = (day: string, shift: string) => {
    setSchedules(prev => prev.map(s => {
        if (s.dayOfWeek !== day) return s;
        
        let newWorking: TimeSlot[] = [];
        let newBreaks: TimeSlot[] = [];
        
        if(shift === 'morning') {
            newWorking = shiftTemplates.morning.working;
            newBreaks = shiftTemplates.morning.breaks;
        } else if (shift === 'afternoon') {
            newWorking = shiftTemplates.afternoon.working;
            newBreaks = shiftTemplates.afternoon.breaks;
        } else if (shift === 'full_day') {
            newWorking = shiftTemplates.full_day.working;
            newBreaks = shiftTemplates.full_day.breaks;
        } else if (shift === 'custom' && s.workingHours.length === 0) {
             newWorking = [{startTime: hospitalHours?.startTime || '09:00', endTime: hospitalHours?.endTime || '17:00'}];
        } else {
             newWorking = s.workingHours;
             newBreaks = s.breakHours;
        }

        return { ...s, shift, workingHours: newWorking, breakHours: newBreaks };
    }));
  };

  const handleTimeChange = (day: string, type: 'workingHours' | 'breakHours', index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day 
        ? { ...s, [type]: s[type].map((slot, i) => i === index ? {...slot, [field]: value} : slot) }
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
  
  const handleApplyCopy = () => {
    if (!copySourceDay) return;
    const sourceSchedule = schedules.find(s => s.dayOfWeek === copySourceDay);
    if (!sourceSchedule) return;

    setSchedules(prev => prev.map(s => {
      if (copyTargetDays.includes(s.dayOfWeek)) {
        return { ...s, ...sourceSchedule, dayOfWeek: s.dayOfWeek };
      }
      return s;
    }));

    setCopySourceDay(null);
    setCopyTargetDays([]);
    setIsCopyPopoverOpen(false); // Close popover on apply
    toast({ title: 'Schedules Copied', description: `Copied ${copySourceDay}'s schedule to selected days.`})
  }

  const fieldErrors = state.errors?.schedules;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-3xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? `Edit Schedule for ${doctor.name}` : 'Add New Doctor Schedule'}</SheetTitle>
          <SheetDescription>
            Define the weekly available days and working hours for the doctor.
          </SheetDescription>
        </SheetHeader>
        <form id="schedule-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {!isEditing && (
                <div className="space-y-2 py-4">
                    <Label htmlFor="doctorId">Doctor</Label>
                    <Select name="doctorId" required value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                        <SelectTrigger id="doctorId">
                            <SelectValue placeholder="Select a doctor to create a schedule for" />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors?.map(doc => (
                                <SelectItem key={doc.id} value={doc.id.toString()}>
                                    {doc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
          {(isLoading) ? <p className="py-10 text-center">Loading schedule...</p> : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                 <Popover open={isCopyPopoverOpen} onOpenChange={setIsCopyPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><Copy className="mr-2"/> Copy Schedule</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-4">
                        <div className="space-y-2">
                          <Label>Copy schedule from:</Label>
                           <Select onValueChange={setCopySourceDay}>
                            <SelectTrigger><SelectValue placeholder="Select a day..." /></SelectTrigger>
                            <SelectContent>
                              {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Apply to:</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {weekDays.map(day => (
                              <div key={day} className="flex items-center gap-2">
                                <Checkbox 
                                  id={`copy-to-${day}`} 
                                  checked={copyTargetDays.includes(day)}
                                  onCheckedChange={(checked) => {
                                    setCopyTargetDays(prev => checked ? [...prev, day] : prev.filter(d => d !== day))
                                  }}
                                />
                                <Label htmlFor={`copy-to-${day}`} className="text-sm font-normal">{day.substring(0,3)}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full" size="sm" onClick={handleApplyCopy} disabled={!copySourceDay || copyTargetDays.length === 0}>Apply</Button>
                    </PopoverContent>
                 </Popover>
                 
                {schedules.map((daySchedule, index) => (
                  <Card key={daySchedule.dayOfWeek} className={fieldErrors?.[index] ? 'border-destructive' : ''}>
                    <CardHeader className="p-4 flex-row items-center justify-between">
                       <CardTitle className="text-base font-semibold">{daySchedule.dayOfWeek}</CardTitle>
                       <div className="w-48">
                          <Select value={daySchedule.shift} onValueChange={(val) => handleShiftChange(daySchedule.dayOfWeek, val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unavailable">Unavailable</SelectItem>
                              <SelectItem value="full_day">Full Day</SelectItem>
                              <SelectItem value="morning">Morning</SelectItem>
                              <SelectItem value="afternoon">Afternoon</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                       </div>
                    </CardHeader>
                    {daySchedule.shift !== 'unavailable' && (
                        <CardContent className="p-4 pt-0 space-y-4">
                           {daySchedule.shift === 'custom' && (
                           <>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Working Hours</Label>
                                {daySchedule.workingHours.map((slot, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input type="time" step="900" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', i, 'startTime', e.target.value)} className="h-9"/>
                                        <span className="text-muted-foreground">-</span>
                                        <Input type="time" step="900" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', i, 'endTime', e.target.value)} className="h-9"/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'workingHours', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                         {fieldErrors?.[index]?.[`workingHours.${i}`] && <p className="text-xs text-destructive">{fieldErrors[index][`workingHours.${i}`]}</p>}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addSlot(daySchedule.dayOfWeek, 'workingHours')}><PlusCircle className="mr-2 h-4 w-4"/> Add Slot</Button>
                                {fieldErrors?.[index]?.workingHours && !fieldErrors?.[index]?.workingHours.includes('Outside') && <p className="text-xs text-destructive">{fieldErrors[index].workingHours}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Break Hours (Optional)</Label>
                                {daySchedule.breakHours.map((slot, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input type="time" step="900" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', i, 'startTime', e.target.value)} className="h-9"/>
                                        <span className="text-muted-foreground">-</span>
                                        <Input type="time" step="900" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', i, 'endTime', e.target.value)} className="h-9"/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'breakHours', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        {fieldErrors?.[index]?.[`breakHours.${i}`] && <p className="text-xs text-destructive">{fieldErrors[index][`breakHours.${i}`]}</p>}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addSlot(daySchedule.dayOfWeek, 'breakHours')}><PlusCircle className="mr-2 h-4 w-4"/> Add Break</Button>
                            </div>
                           </>
                           )}
                           <div className="space-y-2">
                                <Label className="text-xs font-semibold">Patients Per Hour</Label>
                                <Input type="number" value={daySchedule.patientsPerHour} min="1" max="12" onChange={(e) => handlePatientsPerHourChange(daySchedule.dayOfWeek, e.target.value)} className="w-24 h-9"/>
                                <p className="text-xs text-muted-foreground">Determines appointment slot duration.</p>
                           </div>
                        </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
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
