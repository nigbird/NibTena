
'use client';

import { useState, useEffect, useCallback } from 'react';
import prisma from '@/lib/prisma';
import type { Appointment, Doctor } from '@/lib/definitions';
import { format, parseISO } from 'date-fns';
import { Clock, Play, User, Users } from 'lucide-react';
import type { QueueItem } from '../page';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const MOCK_HOSPITAL_ID = 1;

async function getAppointmentsByHospitalId(hospitalId: number): Promise<Appointment[]> {
  const appointments = await prisma.appointment.findMany({ where: { hospitalId } });
  return appointments.map(a => ({
        ...a,
        appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
        status: a.status as any,
        patientGender: a.patientGender as any,
    }));
}

async function getDoctorsByHospitalId(hospitalId: number): Promise<Doctor[]> {
  const doctorsOnHospitals = await prisma.doctorsOnHospitals.findMany({
    where: { hospitalId },
    include: { doctor: true }
  });
  return doctorsOnHospitals.map(doh => ({
    ...doh.doctor,
    hospitalIds: [hospitalId], // context specific
    status: doh.doctor.status as any,
  }));
}

export default function QueueProjectionPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const fetchAndFilterQueue = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [allAppointments, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(MOCK_HOSPITAL_ID),
        getDoctorsByHospitalId(MOCK_HOSPITAL_ID),
      ]);

      const todaysAppointments = allAppointments
        .filter(app => format(parseISO(app.appointmentDate), 'yyyy-MM-dd') === todayStr && app.status === 'confirmed')
        .map(app => {
          const storedStatus = localStorage.getItem(`queue-status-${app.id}`) as QueueItem['queueStatus'] | null;
          return {
            ...app,
            queueStatus: storedStatus || 'Waiting',
          };
        })
        .sort((a, b) => a.appointmentSlot.localeCompare(b.appointmentSlot));

      setQueue(todaysAppointments);
      setDoctors(doctorsData);
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set initial time on client
    if (typeof window !== 'undefined') {
      setCurrentTime(new Date());
    }

    fetchAndFilterQueue();
    // Refresh data every 15 seconds
    const interval = setInterval(fetchAndFilterQueue, 15000);
    
    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Listen for storage changes to update UI in real-time
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('queue-status-')) {
        fetchAndFilterQueue();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAndFilterQueue]);

  const getDoctorName = (doctorId: number) => {
    return doctors.find(d => d.id === doctorId)?.name || 'Unknown Doctor';
  };
  
  const inProgressPatients = queue.filter(p => p.queueStatus === 'In Progress');
  const checkedInPatients = queue.filter(p => p.queueStatus === 'Checked-in');
  
  const nextPatient = checkedInPatients[0];
  const comingUpPatient = checkedInPatients[1];

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col p-8 lg:p-12">
      <header className="flex justify-between items-center pb-4 border-b-2 border-primary/20">
        <Logo />
        <div className="text-right">
            {currentTime ? (
              <>
                <p className="font-headline font-bold text-3xl md:text-4xl">{format(currentTime, 'h:mm:ss a')}</p>
                <p className="text-md md:text-lg text-muted-foreground">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
              </>
            ) : (
              <>
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-6 w-64" />
              </>
            )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pt-8">
        {isLoading ? (
          <div className="w-full max-w-4xl space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : nextPatient ? (
          <div className="w-full max-w-5xl text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-muted-foreground mb-4">Next Patient</h2>
            <Card className="bg-primary/10 border-2 border-primary rounded-xl p-6 md:p-10 shadow-2xl animate-fade-in">
              <CardContent className="p-0">
                  <p className="font-bold text-5xl md:text-7xl text-primary-foreground tracking-tight">{nextPatient.patientName}</p>
                  <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-x-8 gap-y-2 text-2xl md:text-3xl text-muted-foreground">
                      <div className="flex items-center gap-3">
                          <User className="h-8 w-8" />
                          <span>with {getDoctorName(nextPatient.doctorId)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8" />
                          <span>at {nextPatient.appointmentSlot}</span>
                      </div>
                  </div>
              </CardContent>
            </Card>

            {comingUpPatient && (
               <div className="mt-12 animate-fade-in-delay">
                <h3 className="font-headline text-2xl md:text-3xl font-bold text-muted-foreground mb-3">Coming Up Next</h3>
                 <Card className="bg-muted/50 border rounded-lg p-4 max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="font-semibold text-3xl md:text-4xl text-foreground">{comingUpPatient.patientName}</p>
                        <div className="text-xl text-muted-foreground flex items-center gap-3">
                            <User className="h-6 w-6" />
                            <span>{getDoctorName(comingUpPatient.doctorId)}</span>
                        </div>
                    </div>
                </Card>
            </div>
            )}
          </div>
        ) : (
            <div className="text-center">
                <Users className="h-24 w-24 mx-auto text-muted-foreground/50" />
                <h2 className="font-headline text-4xl md:text-5xl font-bold text-muted-foreground mt-8">Waiting queue is currently empty.</h2>
            </div>
        )}
      </main>

       {inProgressPatients.length > 0 && (
          <footer className="mt-auto pt-6 border-t-2 border-muted">
            <h3 className="text-center font-headline text-xl text-muted-foreground font-bold mb-3">Now Serving</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressPatients.map(patient => (
                <div key={patient.id} className="bg-green-100/50 dark:bg-green-900/30 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
                  <p className="font-semibold text-lg">{patient.patientName}</p>
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Play className="h-4 w-4 fill-current" />
                    <span>{getDoctorName(patient.doctorId)}</span>
                  </div>
                </div>
              ))}
            </div>
          </footer>
       )}
    </div>
  );
}
