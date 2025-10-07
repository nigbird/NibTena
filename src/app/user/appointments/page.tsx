
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Appointment, Doctor } from '@/lib/definitions';
import {
  getAppointmentsByDoctorId,
  getDoctors,
  updateAppointment,
} from '@/lib/data';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CalendarPlus, FileX } from 'lucide-react';
import AppointmentCard from '@/components/patient-portal/appointment-card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Mocking a single patient 'Alice Johnson'
async function getMyAppointments(patientName: string): Promise<Appointment[]> {
  const allDocs = await getDoctors();
  const allAppointments = await Promise.all(
    allDocs.map(doc => getAppointmentsByDoctorId(doc.id))
  );
  return allAppointments.flat()
    .filter(a => a.patientName === patientName)
    .sort((a,b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
}

const appointmentStatuses = ['upcoming', 'completed', 'cancelled'] as const;
type AppointmentStatusFilter = (typeof appointmentStatuses)[number];

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<AppointmentStatusFilter>('upcoming');
  const { toast } = useToast();
  
  // In a real app, you'd get this from an auth context
  const loggedInPatientName = 'Alice Johnson';

  const fetchData = async () => {
    setIsLoading(true);
    const [appointmentData, doctorData] = await Promise.all([
      getMyAppointments(loggedInPatientName),
      getDoctors(),
    ]);
    setAppointments(appointmentData);
    setDoctors(doctorData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActionSuccess = (message: string) => {
    fetchData();
    toast({
      title: 'Success',
      description: message,
    });
  };

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by status
    if (activeFilter === 'upcoming') {
      filtered = filtered.filter(a => a.status === 'confirmed' || a.status === 'rescheduled');
    } else {
      filtered = filtered.filter(a => a.status === activeFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(appointment => {
            const doctor = doctors.find(d => d.id === appointment.doctorId);
            return (
                (doctor && doctor.name.toLowerCase().includes(lowercasedFilter)) ||
                appointment.appointmentDate.toLowerCase().includes(lowercasedFilter)
            );
        });
    }

    return filtered;
  }, [appointments, doctors, activeFilter, searchTerm]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (filteredAppointments.length > 0) {
      return (
        <div className="space-y-4">
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              doctor={doctors.find(d => d.id === appointment.doctorId)}
              onActionSuccess={handleActionSuccess}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-12">
        <FileX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold font-headline">
          No Appointments Found
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You don’t have any {activeFilter} appointments.
        </p>
         <Button asChild className="mt-6" variant="accent">
            <Link href="/user/doctors">Book an Appointment</Link>
        </Button>
      </div>
    );
  };

  return (
    <>
      <Header title="My Appointments" />
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by doctor or date..."
            className="w-full appearance-none bg-background pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {appointmentStatuses.map(status => (
            <Button
              key={status}
              variant={activeFilter === status ? 'accent' : 'outline'}
              onClick={() => setActiveFilter(status)}
              className="capitalize flex-1"
            >
              {status}
            </Button>
          ))}
        </div>
        
        {renderContent()}

      </div>
    </>
  );
}
