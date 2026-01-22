
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Settings, PlusCircle } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctorsByHospitalId, getHospitalSettings, updateHospitalSettings } from './actions';
import DoctorScheduleDrawer from '@/components/hospital-admin/doctor-schedule-drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import DoctorScheduleDisplay from '@/components/hospital-admin/doctor-schedule-display';
import { useActionState } from 'react';
import { useCsrfToken } from '@/hooks/use-csrf-token';


export default function ScheduleSettingsPageContent({ hospitalId }: { hospitalId: number }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  const csrfToken = useCsrfToken();
  const [initialSettings, setInitialSettings] = useState({ bookingWindow: '30', startTime: '08:00', endTime: '18:30' });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [updateState, updateAction] = useActionState(updateHospitalSettings.bind(null, hospitalId), { success: false, message: null, errors: {} });


  const fetchDoctorsAndSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [doctorsData, settingsData] = await Promise.all([
          getDoctorsByHospitalId(hospitalId),
          getHospitalSettings(hospitalId)
      ]);
      setDoctors(doctorsData);
      if (settingsData) {
        setInitialSettings({
            startTime: settingsData.startTime,
            endTime: settingsData.endTime,
            bookingWindow: String(settingsData.bookingWindow)
        });
      }
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch data.'});
    } finally {
      setIsLoading(false);
    }
  }, [toast, hospitalId]);

  useEffect(() => {
    fetchDoctorsAndSettings();
  }, [fetchDoctorsAndSettings]);

  const handleEditScheduleClick = (doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedDoctor(null);
    // No need to refetch here, the drawer's success handler will manage it.
  }, []);
  
  const handleScheduleSaved = () => {
      fetchDoctorsAndSettings(); // Refetch all data when a schedule is saved
  }

  useEffect(() => {
    if (updateState.success) {
      toast({ title: 'Settings Saved', description: updateState.message });
      if (updateState.updatedSettings) {
        setInitialSettings({
            startTime: updateState.updatedSettings.startTime,
            endTime: updateState.updatedSettings.endTime,
            bookingWindow: String(updateState.updatedSettings.bookingWindow)
        })
      }
    } else if (updateState.message) {
      toast({ variant: 'destructive', title: 'Error', description: updateState.message });
    }
  }, [updateState, toast])


  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Schedule Settings</h1>
          <p className="text-lg text-muted-foreground">Configure doctor availability and hospital-wide booking rules.</p>
        </div>
         <Button onClick={() => handleEditScheduleClick(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add/Edit Schedule
        </Button>
      </div>

      <DoctorScheduleDrawer
          isOpen={isDrawerOpen}
          setIsOpen={setIsDrawerOpen}
          doctor={selectedDoctor}
          doctors={doctors}
          hospitalId={hospitalId}
          onScheduleSaved={handleScheduleSaved}
       />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Doctor Schedules
          </CardTitle>
          <CardDescription>Manage the weekly availability for each doctor. Click on a doctor to view their schedule.</CardDescription>
        </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : doctors.length > 0 ? (
        <div className="w-full">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {doctors.map(doctor => (
              <AccordionItem value={`doctor-${doctor.id}`} key={doctor.id} className="border rounded-lg overflow-hidden bg-background">
                <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            {doctor.imageUrl && <AvatarImage src={doctor.imageUrl} alt={doctor.name} />}
                            <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{doctor.name}</p>
                            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditScheduleClick(doctor); }}>Edit Schedule</Button>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 border-t">
                  <DoctorScheduleDisplay doctorId={doctor.id} hospitalId={hospitalId} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">No doctors found for this hospital.</p>
      )}
    </CardContent>
      </Card>

      <form action={updateAction}>
        <input type="hidden" name="_csrf" value={csrfToken} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Hospital-Wide Booking Rules
            </CardTitle>
            <CardDescription>Set global policies for appointment booking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bookingWindow">Booking Window Limit (Days)</Label>
              <Input 
                id="bookingWindow" 
                name="bookingWindow"
                type="number" 
                placeholder="e.g., 30" 
                defaultValue={initialSettings.bookingWindow}
                className="max-w-xs" 
              />
              <p className="text-sm text-muted-foreground">How many days in advance patients can book.</p>
              {updateState.errors?.bookingWindow && <p className="text-destructive text-sm">{updateState.errors.bookingWindow[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label>Hospital Working Hours</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    name="startTime"
                    defaultValue={initialSettings.startTime}
                    className="max-w-xs" 
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    name="endTime"
                    defaultValue={initialSettings.endTime}
                    className="max-w-xs" 
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">The general opening and closing times for the hospital.</p>
              {updateState.errors?.startTime && <p className="text-destructive text-sm">{updateState.errors.startTime[0]}</p>}
               {updateState.errors?.endTime && <p className="text-destructive text-sm">{updateState.errors.endTime[0]}</p>}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" variant="accent">Save Changes</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
