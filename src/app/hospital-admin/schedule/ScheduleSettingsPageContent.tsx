
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Settings, PlusCircle } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctorsByHospitalId, getHospitalSettings } from './actions';
import DoctorScheduleDrawer from '@/components/hospital-admin/doctor-schedule-drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// removed placeholder images; use uploaded imageUrl with fallback
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import AddScheduleDrawer from '@/components/hospital-admin/add-schedule-drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import DoctorScheduleDisplay from '@/components/hospital-admin/doctor-schedule-display';


export default function ScheduleSettingsPageContent({ hospitalId }: { hospitalId: number }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingWindow, setBookingWindow] = useState('30');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDoctorsAndSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [doctorsData, settingsData] = await Promise.all([
          getDoctorsByHospitalId(hospitalId),
          getHospitalSettings(hospitalId)
      ]);
      setDoctors(doctorsData);
      if (settingsData) {
        setStartTime(settingsData.startTime);
        setEndTime(settingsData.endTime);
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

  const handleEditScheduleClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsEditDrawerOpen(true);
  };
  
  const handleDrawerClose = useCallback(() => {
    setIsEditDrawerOpen(false);
    setIsAddDrawerOpen(false);
    setSelectedDoctor(null);
    fetchDoctorsAndSettings();
  }, [fetchDoctorsAndSettings]);

  const handleHospitalSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    // This should be a server action
    toast({
      title: 'Settings Saved',
      description: 'Hospital-wide booking rules have been updated.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Schedule Settings</h1>
          <p className="text-lg text-muted-foreground">Configure doctor availability and hospital-wide booking rules.</p>
        </div>
         <Button onClick={() => setIsAddDrawerOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {selectedDoctor && (
        <DoctorScheduleDrawer
          isOpen={isEditDrawerOpen}
          setIsOpen={handleDrawerClose}
          doctor={selectedDoctor}
          hospitalId={hospitalId}
        />
      )}
      
      <AddScheduleDrawer
        isOpen={isAddDrawerOpen}
        setIsOpen={setIsAddDrawerOpen}
        doctors={doctors}
        hospitalId={hospitalId}
        onScheduleSaved={handleDrawerClose}
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
                <Accordion type="single" collapsible className="w-full">
                    {doctors.map(doctor => (
                        <AccordionItem value={`doctor-${doctor.id}`} key={doctor.id}>
                            <div className="flex items-center pr-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                                <AccordionTrigger className="flex-1 p-4 text-left hover:no-underline">
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
                                </AccordionTrigger>
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditScheduleClick(doctor); }}>Edit Schedule</Button>
                            </div>
                            <AccordionContent className="bg-muted/30">
                                <DoctorScheduleDisplay doctorId={doctor.id} hospitalId={hospitalId} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
           ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No doctors found for this hospital.</p>
           )}
        </CardContent>
      </Card>

      <form onSubmit={handleHospitalSettingsSave}>
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
              <Label htmlFor="booking-window">Booking Window Limit (Days)</Label>
              <Input 
                id="booking-window" 
                type="number" 
                placeholder="e.g., 30" 
                value={bookingWindow}
                onChange={(e) => setBookingWindow(e.target.value)}
                className="max-w-xs" 
              />
              <p className="text-sm text-muted-foreground">How many days in advance patients can book.</p>
            </div>
            <div className="space-y-2">
              <Label>Hospital Working Hours</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="max-w-xs" 
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="max-w-xs" 
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">The general opening and closing times for the hospital.</p>
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
