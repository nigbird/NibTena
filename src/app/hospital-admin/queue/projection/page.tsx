
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from '@/lib/data';
import type { Appointment, Doctor } from '@/lib/definitions';
import { format, parseISO } from 'date-fns';
import { Clock, Play } from 'lucide-react';
import type { QueueItem } from '../page';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

const MOCK_HOSPITAL_ID = 1;

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
        .filter(app => app.queueStatus === 'Checked-in' || app.queueStatus === 'In Progress')
        .sort((a, b) => {
            // 'In Progress' comes before 'Checked-in'
            if (a.queueStatus === 'In Progress' && b.queueStatus === 'Checked-in') return -1;
            if (a.queueStatus === 'Checked-in' && b.queueStatus === 'In Progress') return 1;
            // Otherwise, sort by time
            return a.appointmentSlot.localeCompare(b.appointmentSlot);
        });

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
    setCurrentTime(new Date());

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

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col p-8">
      <header className="flex justify-between items-center pb-4 border-b-2 border-primary/20">
        <Logo />
        <div className="text-right">
            {currentTime ? (
              <>
                <p className="font-headline font-bold text-4xl">{format(currentTime, 'h:mm:ss a')}</p>
                <p className="text-lg text-muted-foreground">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
              </>
            ) : (
              <>
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-6 w-64" />
              </>
            )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-3 gap-8 pt-8">
        <div className="col-span-2">
            <h2 className="font-headline text-4xl font-bold mb-6 pb-2 border-b-2 border-muted">Now Serving</h2>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                </div>
            ) : inProgressPatients.length > 0 ? (
                <div className="space-y-4">
                {inProgressPatients.map(patient => (
                    <div key={patient.id} className="bg-primary/10 border-2 border-primary rounded-lg p-6 flex items-center justify-between animate-pulse">
                        <div>
                            <p className="font-bold text-5xl text-primary-foreground tracking-wide">{patient.patientName}</p>
                            <p className="text-2xl text-muted-foreground mt-2">{getDoctorName(patient.doctorId)}</p>
                        </div>
                        <div className="flex items-center gap-4 text-green-600">
                             <Play className="h-12 w-12 fill-current" />
                             <span className="text-3xl font-semibold">In Progress</span>
                        </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground text-2xl pt-16">No patients are currently being served.</div>
            )}
        </div>
        <div className="col-span-1 border-l-2 border-muted pl-8">
            <h2 className="font-headline text-4xl font-bold mb-6 pb-2 border-b-2 border-muted">Waiting</h2>
            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
            ) : checkedInPatients.length > 0 ? (
                 <div className="space-y-3">
                    {checkedInPatients.map(patient => (
                        <div key={patient.id} className="bg-muted/50 rounded-lg p-4">
                            <p className="font-semibold text-2xl text-foreground">{patient.patientName}</p>
                            <p className="text-lg text-muted-foreground">{getDoctorName(patient.doctorId)}</p>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="text-center text-muted-foreground text-xl pt-16">The waiting queue is currently empty.</div>
            )}
        </div>
      </main>
    </div>
  );
}
