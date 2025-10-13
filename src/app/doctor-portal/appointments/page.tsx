
'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import type { Appointment } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ClipboardList } from 'lucide-react';
import DoctorAppointmentList from '@/components/doctor-portal/appointment-list';
import { useToast } from '@/hooks/use-toast';
import { DoctorPortalContext } from '@/components/doctor-portal/doctor-portal-context';
import { getAppointmentsByDoctorIdForDoctor } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import AppointmentDetailsDrawer from '@/components/doctor-portal/appointment-details-drawer';

const appointmentStatuses = ['upcoming', 'completed', 'cancelled', 'rescheduled'] as const;
type AppointmentStatusFilter = typeof appointmentStatuses[number];

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<AppointmentStatusFilter>('upcoming');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();
  const { doctor, activeHospitalId } = useContext(DoctorPortalContext);

  const fetchAppointments = async () => {
    if (!doctor || !activeHospitalId) return;
    setIsLoading(true);
    const data = await getAppointmentsByDoctorIdForDoctor(doctor.id, activeHospitalId);
    setAppointments(data as Appointment[]);
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (doctor && activeHospitalId) {
        fetchAppointments();
    }
  }, [doctor, activeHospitalId]);

  useEffect(() => {
    let newFiltered = appointments.filter(a => {
        const patientNameMatch = a.patientName.toLowerCase().includes(searchTerm.toLowerCase());
        const dateMatch = (a.appointmentDate as unknown as string).toLowerCase().includes(searchTerm.toLowerCase());
        return searchTerm ? (patientNameMatch || dateMatch) : true;
    });

    switch (activeFilter) {
      case 'upcoming':
        newFiltered = newFiltered.filter(a => a.status === 'confirmed');
        break;
      case 'completed':
        newFiltered = newFiltered.filter(a => a.status === 'completed');
        break;
      case 'cancelled':
        newFiltered = newFiltered.filter(a => a.status === 'cancelled');
        break;
      case 'rescheduled':
        newFiltered = newFiltered.filter(a => a.status === 'rescheduled');
        break;
      default:
        break;
    }
    
    setFilteredAppointments(newFiltered);
  }, [searchTerm, appointments, activeFilter]);
  
  const handleActionSuccess = () => {
    fetchAppointments();
    toast({
      title: 'Success',
      description: 'Appointment has been updated.',
    });
  };

  const handleCardClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const renderContent = () => {
    if (isLoading) {
       return (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      );
    }
    if (filteredAppointments.length > 0) {
        return (
            <DoctorAppointmentList
              appointments={filteredAppointments}
              onActionSuccess={handleActionSuccess}
              onCardClick={handleCardClick}
            />
        );
    }
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No appointments found</h3>
            <p className="mt-2 text-sm text-muted-foreground">There are no appointments that match your current filters.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Appointments</h1>
        <p className="text-lg text-muted-foreground">View and manage your patient appointments.</p>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsDrawer
            isOpen={isDrawerOpen}
            setIsOpen={setIsDrawerOpen}
            appointment={selectedAppointment}
            onActionSuccess={handleActionSuccess}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>A list of all your scheduled appointments.</CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by patient name or date..."
                  className="w-full appearance-none bg-background pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2">
                {appointmentStatuses.map(status => (
                    <Button
                        key={status}
                        variant={activeFilter === status ? 'accent' : 'outline'}
                        onClick={() => setActiveFilter(status)}
                        className="capitalize"
                    >
                        {status}
                    </Button>
                ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
