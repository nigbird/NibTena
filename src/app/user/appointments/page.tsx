
'use client';

import { useState, useEffect, useMemo, Suspense, useContext } from 'react';
import Link from 'next/link';
import { getMyAppointments, getMyAppointmentsForMiniApp } from './actions';
import { Button } from '@/components/ui/button';
import { CalendarX2 } from 'lucide-react';
import AppointmentCard from '@/components/patient-portal/appointment-card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PatientAuth from './PatientAuth';
import { PatientContext } from '@/context/PatientContext';
import { getMiniAppCookie } from './server-utils';
import { EmptyState, PageShell, SearchField, SegmentedControl, ctaClass } from '@/components/patient-portal/ui';

const appointmentStatuses = ['upcoming', 'completed', 'cancelled'] as const;
type AppointmentStatusFilter = (typeof appointmentStatuses)[number];

function AppointmentsSkeleton() {
  return (
    <PageShell size="medium">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </PageShell>
  );
}

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
  useEffect(() => {
    getMiniAppCookie().then(hasCookie => {
      setIsMiniApp(hasCookie);
    });
  }, []);

  useEffect(() => {
    setIsAuthenticated(!!patient || isMiniApp);
  }, [patient, isMiniApp]);

  const fetchData = async (isMini: boolean = false) => {
    setIsLoading(true);
    try {
      let appointmentData: any[] = [];
      if (isMini) {
        appointmentData = await getMyAppointmentsForMiniApp();
      } else if (patient) {
        appointmentData = await getMyAppointments(Number(patient.id));
      } else {
        appointmentData = [];
      }
      setAppointments(appointmentData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load appointments.'});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMiniApp) {
      fetchData(true);
    } else if (patient) {
      fetchData(false);
    } else {
      setIsLoading(false);
    }
  }, [patient, isMiniApp]);

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
    // No URL patientId should be added; the micro-app and web flows
    // fetch appointments from cookie or server-side session respectively.
  }, [isMiniApp, patient, router]);


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
    return <AppointmentsSkeleton />;
  }

  return (
    <PageShell size="medium" className="space-y-4">
      <SearchField
        placeholder="Search by doctor, hospital or date..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <SegmentedControl options={appointmentStatuses} value={activeFilter} onChange={setActiveFilter} />
      {filteredAppointments.length > 0 ? (
        <div className="space-y-3">
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
                onActionSuccess={() => {
                toast({ title: 'Success', description: 'Your appointment has been updated.'});
                fetchData(isMiniApp);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarX2}
          title="No appointments found"
          description={`You don’t have any ${activeFilter} appointments.`}
          action={
            <Button asChild variant="brand" className={ctaClass}>
              <Link href="/user/doctors">Book an Appointment</Link>
            </Button>
          }
        />
      )}
    </PageShell>
  );
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <AppointmentsContent />
    </Suspense>
  );
}
