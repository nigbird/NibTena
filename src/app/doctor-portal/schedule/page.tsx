
'use client';

import { useState, useContext, useEffect, useTransition, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarClock, PlusCircle, Trash2 } from 'lucide-react';
import { DoctorPortalContext } from '@/components/doctor-portal/doctor-portal-context';
import type { DaySchedule, TimeSlot } from './actions';
import { getDoctorSchedulesForHospital, saveDoctorSchedulesForHospital } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';


const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorSchedulePage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { doctor, activeHospitalId } = useContext(DoctorPortalContext);

  const [schedules, setSchedules] = useState<DaySchedule[]>(
    weekDays.map(day => ({ dayOfWeek: day, workingHours: [], breakHours: [], active: false }))
  );
  
  const fetchSchedule = useCallback(async () => {
    if (!doctor || !activeHospitalId) return;
    setIsLoading(true);
    try {
        const data = await getDoctorSchedulesForHospital(doctor.id, activeHospitalId);
        const newSchedules = weekDays.map(day => {
            const existing = data.find(d => d.dayOfWeek === day);
            return existing 
                ? { ...existing, workingHours: existing.workingHours as TimeSlot[], breakHours: existing.breakHours as TimeSlot[], active: true }
                : { dayOfWeek: day, workingHours: [], breakHours: [], active: false };
        });
        setSchedules(newSchedules);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load schedule data.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [doctor, activeHospitalId, toast]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleDayToggle = (day: string, checked: boolean | 'indeterminate') => {
    setSchedules(prev => prev.map(s => s.dayOfWeek === day ? {
        ...s,
        active: !!checked,
        // Add default slots if activating for the first time and no slots exist
        workingHours: (!!checked && s.workingHours.length === 0) ? [{startTime: '09:00', endTime: '17:00'}] : s.workingHours,
        breakHours: (!!checked && s.breakHours.length === 0) ? [{startTime: '12:30', endTime: '13:30'}] : s.breakHours,
     } : s));
  };
  
  const handleTimeChange = (day: string, type: 'workingHours' | 'breakHours', index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => prev.map(s => 
        s.dayOfWeek === day 
        ? { ...s, [type]: s[type].map((slot, i) => i === index ? {...slot, [field]: value} : slot) }
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!doctor || !activeHospitalId) {
        toast({
            variant: "destructive",
            title: "No Hospital Selected",
            description: "Please select a hospital to update the schedule.",
        });
        return;
    }
    
    startTransition(async () => {
        const result = await saveDoctorSchedulesForHospital(doctor.id, activeHospitalId, schedules);
        if (result.success) {
            toast({
                title: "Schedule Updated",
                description: result.message,
            });
            fetchSchedule(); // Re-fetch to confirm changes
        } else {
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.message,
            });
        }
    });
  };
  
  const renderSchedule = () => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    return (
        <Tabs defaultValue="Monday" className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="flex">
                    {weekDays.map(day => (
                        <TabsTrigger key={day} value={day} className="flex-1">{day}</TabsTrigger>
                    ))}
                </TabsList>
            </ScrollArea>
             {schedules.map(daySchedule => (
                <TabsContent key={daySchedule.dayOfWeek} value={daySchedule.dayOfWeek}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`day-toggle-${daySchedule.dayOfWeek}`}
                                    checked={daySchedule.active}
                                    onCheckedChange={(checked) => handleDayToggle(daySchedule.dayOfWeek, checked)}
                                />
                                <Label htmlFor={`day-toggle-${daySchedule.dayOfWeek}`} className="text-lg font-semibold cursor-pointer">
                                    {daySchedule.dayOfWeek} - {daySchedule.active ? 'Available' : 'Unavailable'}
                                </Label>
                            </div>
                        </CardHeader>
                         {daySchedule.active && (
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="font-semibold">Working Hours</Label>
                                    {daySchedule.workingHours.map((slot, index) => (
                                        <div key={`work-${index}`} className="flex items-center gap-2">
                                            <Input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', index, 'startTime', e.target.value)} />
                                            <span>-</span>
                                            <Input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'workingHours', index, 'endTime', e.target.value)} />
                                            {/* <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'workingHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button> */}
                                        </div>
                                    ))}
                                    {/* <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addSlot(daySchedule.dayOfWeek, 'workingHours')}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Working Slot
                                    </Button> */}
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold">Break Hours</Label>
                                    {daySchedule.breakHours.map((slot, index) => (
                                        <div key={`break-${index}`} className="flex items-center gap-2">
                                            <Input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', index, 'startTime', e.target.value)} />
                                            <span>-</span>
                                            <Input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(daySchedule.dayOfWeek, 'breakHours', index, 'endTime', e.target.value)} />
                                            {/* <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(daySchedule.dayOfWeek, 'breakHours', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button> */}
                                        </div>
                                    ))}
                                    {/* <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addSlot(daySchedule.dayOfWeek, 'breakHours')}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Break Slot
                                    </Button> */}
                                </div>
                            </CardContent>
                         )}
                    </Card>
                </TabsContent>
            ))}
        </Tabs>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Schedule</h1>
        <p className="text-lg text-muted-foreground">Manage your weekly availability for the selected hospital.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Weekly Availability
            </CardTitle>
            <CardDescription>
              Select available days and set the working and break hours for each day. This schedule is specific to the currently selected hospital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {renderSchedule()}
          </CardContent>
          {/* <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isPending || isLoading} variant="accent">
              {isPending ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </CardFooter> */}
        </Card>
      </form>
    </div>
  );
}

