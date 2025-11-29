
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, PlusCircle, Copy } from 'lucide-react';
import type { Doctor, TimeSlot } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { getDoctorSchedules, saveDoctorSchedule, type ScheduleSaveState, getHospitalSettings } from '@/app/hospital-admin/schedule/actions';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
// note: useFormStatus wasn't providing the submission state here; we'll use useTransition instead
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


function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button form="schedule-form" type="submit" disabled={pending} variant="accent">
      {pending ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Schedule'}
    </Button>
  );
}

export default function DoctorScheduleDrawer({ isOpen, setIsOpen, doctor, hospitalId, doctors, onScheduleSaved }: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  doctor?: Doctor | null; // Optional: for editing
  hospitalId: number;
  doctors?: Doctor[]; // Optional: for adding
  onScheduleSaved?: () => void;
}) {
  const isEditing = !!doctor;
  const { toast } = useToast();
  
  const [schedules, setSchedules] = useState<DaySchedule[]>(
     weekDays.map(day => ({ dayOfWeek: day, shift: 'unavailable', workingHours: [], breakHours: [], patientsPerHour: 2 }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hospitalHours, setHospitalHours] = useState<{ startTime: string, endTime: string } | null>(null);

  const [copySourceDay, setCopySourceDay] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);
  const [isCopyPopoverOpen, setIsCopyPopoverOpen] = useState(false);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(doctor?.id.toString());
  const [localErrors, setLocalErrors] = useState<ScheduleSaveState['errors'] | undefined>(undefined);

  const initialState: ScheduleSaveState = { message: null, errors: {} };
  const saveScheduleWithId = saveDoctorSchedule.bind(null, hospitalId);
  const [state, formAction] = useActionState(saveScheduleWithId, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  // track if this component initiated a submission so we don't show stale toasts
  const submissionAttemptRef = useRef(false);
  
  // Ref to track if a toast has been shown for the current form state
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const doctorIdToFetch = isEditing ? doctor?.id : Number(selectedDoctorId);

      // Reset state when opening
      setSchedules(weekDays.map(day => ({ dayOfWeek: day, shift: 'unavailable', workingHours: [], breakHours: [], patientsPerHour: 2 })));
      setSelectedDoctorId(isEditing ? doctor?.id.toString() : undefined);
      setLocalErrors(undefined);
      
      Promise.all([
        (isEditing || selectedDoctorId) ? getDoctorSchedules(doctorIdToFetch!, hospitalId) : Promise.resolve([]),
        getHospitalSettings(hospitalId)
      ]).then(([data, settings]) => {
        setHospitalHours(settings);
        if (data.length > 0) {
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
        }
        setIsLoading(false);
      });
    } else {
      setSelectedDoctorId(undefined);
    }
  }, [isOpen, doctor, hospitalId, isEditing]);


    useEffect(() => {
      setLocalErrors(state.errors); // Update local errors when server state changes

      // Only show toasts for submissions initiated from this component
      if (submissionAttemptRef.current && state.message && !toastShownRef.current) {
        if (state.success) {
            toast({ title: "Success", description: state.message });
            onScheduleSaved?.();
            setIsOpen(false);
        } else {
            toast({
            variant: "destructive",
            title: "Error",
            description: state.message || "Please correct the errors below.",
            });
        }
        toastShownRef.current = true; // Mark that a toast has been shown
        submissionAttemptRef.current = false; // reset submission tracker
      }
    }, [state, onScheduleSaved, setIsOpen, toast]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toastShownRef.current = false; // Reset toast tracker on new submission
    const currentDoctorId = isEditing ? doctor!.id : Number(selectedDoctorId);
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

    // mark that we're attempting a submission from this component
    submissionAttemptRef.current = true;

    // Use startTransition to indicate pending state while calling the action
    startTransition(() => {
      try {
        // clear local errors before new submit
        setLocalErrors(undefined);
        formAction(formData as unknown as FormData);
      } catch (err) {
        // Defensive: show a toast on unexpected failures
        console.error('Error submitting schedule:', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save schedule. Please try again.' });
        submissionAttemptRef.current = false;
      }
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

        // Clear errors for this day when changing shift
        setLocalErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            if (newErrors.schedules) {
                delete newErrors.schedules[schedules.findIndex(sc => sc.dayOfWeek === day)];
            }
            return newErrors;
        });

        return { ...s, shift, workingHours: newWorking, breakHours: newBreaks };
    }));
  };

  const handleTimeChange = (day: string, type: 'workingHours' | 'breakHours', index: number, field: 'startTime' | 'endTime', value: string) => {
    const dayIndex = schedules.findIndex(s => s.dayOfWeek === day);
    // Clear the specific error for this field on change
    setLocalErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors?.schedules?.[dayIndex]) {
            delete newErrors.schedules[dayIndex];
        }
        return newErrors;
    });

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
    setIsCopyPopoverOpen(false);
    toast({ title: 'Schedules Copied', description: `Copied ${copySourceDay}'s schedule to selected days.`})
  }

  const fieldErrors = localErrors?.schedules;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-3xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? `Edit Schedule for ${doctor.name}` : 'Add New Doctor Schedule'}</SheetTitle>
          <SheetDescription>
            Define the weekly available days and working hours for the doctor.
          </SheetDescription>
        </SheetHeader>
        <form ref={formRef} onSubmit={handleSubmit} id="schedule-form" className="flex-1 flex flex-col overflow-hidden">
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
                                    </div>
                                ))}
                                 {fieldErrors?.[index]?.[`workingHours.0`] && <p className="text-xs text-destructive">{fieldErrors[index][`workingHours.0`]}</p>}
                                <Button type="button" variant="outline" size="sm" onClick={() => addSlot(daySchedule.dayOfWeek, 'workingHours')}><PlusCircle className="mr-2 h-4 w-4"/> Add Slot</Button>
                                {fieldErrors?.[index]?.workingHours && <p className="text-xs text-destructive">{fieldErrors[index].workingHours}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Break Hours (Optional)</Label>
                                {daySchedule.breakHours.map((slot, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input type="time" step="900" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', i, 'startTime', e.target.value)} className="h-9"/>
                                        <span className="text-muted-foreground">-</span>
                                        <Input type="time" step="900" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', i, 'endTime', e.target.value)} className="h-9"/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'breakHours', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                                {fieldErrors?.[index]?.[`breakHours.0`] && <p className="text-xs text-destructive">{fieldErrors[index][`breakHours.0`]}</p>}
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
            <SubmitButton pending={isPending} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
