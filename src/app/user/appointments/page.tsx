
'use client';

import { useState, useEffect, useMemo, Suspense, useContext } from 'react';
import Link from 'next/link';
import { getMyAppointments, getMyAppointmentsForMiniApp } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileX } from 'lucide-react';
import AppointmentCard from '@/components/patient-portal/appointment-card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PatientAuth from './PatientAuth';
import { PatientContext } from '@/context/PatientContext';
import { getMiniAppCookie } from './server-utils';

const appointmentStatuses = ['upcoming', 'completed', 'cancelled'] as const;
type AppointmentStatusFilter = (typeof appointmentStatuses)[number];

function AppointmentsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { patient } = useContext(PatientContext);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<AppointmentStatusFilter>('upcoming');
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const urlPatientId = searchParams.get('patientId');
  
  useEffect(() => {
    getMiniAppCookie().then(hasCookie => {
      setIsMiniApp(hasCookie);
    });
  }, []);

  useEffect(() => {
    setIsAuthenticated(!!patient || !!urlPatientId);
  }, [patient, urlPatientId]);
  
  const fetchData = async (id: string, isMini: boolean) => {
    setIsLoading(true);
    try {
      const appointmentData = isMini 
        ? await getMyAppointmentsForMiniApp()
        : await getMyAppointments(Number(id));
      setAppointments(appointmentData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load appointments.'});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const patientId = urlPatientId || patient?.id?.toString();
    if (patientId) {
      fetchData(patientId, isMiniApp);
    } else {
      setIsLoading(false);
    }
  }, [patient, urlPatientId, isMiniApp]);

  useEffect(() => {
    const isSuccess = searchParams.get('success') === 'true';
    if (isSuccess) {
      toast({
        title: '🎉 Booking Confirmed!',
        description: 'Your appointment has been successfully booked.',
      });
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('success');
      router.replace(`${pathname}?${newParams.toString()}`);
    }
  }, [searchParams, toast, router, pathname]);

  useEffect(() => {
    if (isMiniApp && patient && !urlPatientId) {
      router.replace(`/user/appointments?patientId=${patient.id}`);
    }
  }, [isMiniApp, patient, urlPatientId, router]);


  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (activeFilter === 'upcoming') {
      filtered = filtered.filter(a => a.status === 'confirmed' || a.status === 'rescheduled');
    } else {
      filtered = filtered.filter(a => a.status === activeFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.doctor?.name?.toLowerCase() ?? '').includes(term) ||
        (a.hospital?.name?.toLowerCase() ?? '').includes(term) ||
        new Date(a.appointmentDate).toLocaleDateString().toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  }, [appointments, activeFilter, searchTerm]);
  
  if (!isAuthenticated && !isMiniApp) {
    return <PatientAuth />;
  }
  
  if (isLoading) {
    return (
       <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
       </div>
    );
  }

  const renderContent = () => {
    if (filteredAppointments.length > 0) {
      return (
        <div className="space-y-4">
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onActionSuccess={() => {
                toast({ title: 'Success', description: 'Your appointment has been updated.'});
                const patientId = urlPatientId || patient?.id?.toString();
                if(patientId) fetchData(patientId, isMiniApp);
              }}
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
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by doctor, hospital or date..."
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
  );
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
