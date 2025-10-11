
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Settings, User, PlusCircle } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctorsByHospitalId } from './actions';
import DoctorScheduleDrawer from '@/components/hospital-admin/doctor-schedule-drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import AddScheduleDrawer from '@/components/hospital-admin/add-schedule-drawer';

// In a real app, this would come from an authentication session
const LOGGED_IN_HOSPITAL_ID = 1;

export default function ScheduleSettingsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingWindow, setBookingWindow] = useState('30');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const { toast } = useToast();

  const fetchDoctors = useCallback(async () => {
    const doctorsData = await getDoctorsByHospitalId(LOGGED_IN_HOSPITAL_ID);
    setDoctors(doctorsData);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleEditScheduleClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsEditDrawerOpen(true);
  };
  
  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false);
    setSelectedDoctor(null);
  }

  const handleAddDrawerClose = () => {
    setIsAddDrawerOpen(false);
    fetchDoctors();
  }

  const handleHospitalSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ bookingWindow, startTime, endTime });
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
          setIsOpen={handleEditDrawerClose}
          doctor={selectedDoctor}
        />
      )}
      
      <AddScheduleDrawer
          isOpen={isAddDrawerOpen}
          setIsOpen={setIsAddDrawerOpen}
          doctors={doctors}
          hospitalId={LOGGED_IN_HOSPITAL_ID}
          onScheduleSaved={handleAddDrawerClose}
      />


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Doctor Schedules
          </CardTitle>
          <CardDescription>Manage the weekly availability for each doctor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {doctors.map(doctor => {
            const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
            return (
              <div key={doctor.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                      {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} />}
                      <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => handleEditScheduleClick(doctor)}>Edit Schedule</Button>
              </div>
            )
          })}
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
