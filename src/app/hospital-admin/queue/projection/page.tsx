
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from './actions';
import type { Appointment, Doctor } from '@/lib/definitions';
import { format } from 'date-fns';
import { Clock, Play, User, Users } from 'lucide-react';
import type { QueueItem } from '../page';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// In a real app, this would come from an authentication session
const LOGGED_IN_HOSPITAL_ID = 1;

export default function QueueProjectionPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const fetchAndFilterQueue = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [allAppointments, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(LOGGED_IN_HOSPITAL_ID),
        getDoctorsByHospitalId(LOGGED_IN_HOSPITAL_ID),
      ]);

      const todaysAppointments = allAppointments
        .filter(app => format(new Date(app.appointmentDate), 'yyyy-MM-dd') === todayStr && app.status === 'confirmed')
        .map(app => {
          const storedStatus = localStorage.getItem(`queue-status-${app.id}`) as QueueItem['queueStatus'] | null;
          return {
            ...app,
            queueStatus: storedStatus || 'Waiting',
          };
        })
        .sort((a, b) => {
             if (a.appointmentSlot < b.appointmentSlot) return -1;
             if (a.appointmentSlot > b.appointmentSlot) return 1;
             return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      setQueue(todaysAppointments);
      setDoctors(doctorsData as Doctor[]);
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentTime(new Date());
    }

    fetchAndFilterQueue();
    const interval = setInterval(fetchAndFilterQueue, 15000);
    
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

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
  const checkedInPatients = queue.filter(p => p.queueStatus === 'Checked-in' || p.queueStatus === 'Waiting');
  
  const groupedBySlot = checkedInPatients.reduce((acc, item) => {
      const slot = item.appointmentSlot;
      if (!acc[slot]) {
          acc[slot] = [];
      }
      acc[slot].push(item);
      return acc;
  }, {} as Record<string, QueueItem[]>);

  const sortedSlots = Object.keys(groupedBySlot).sort();
  
  // Find the first slot that has patients who are not 'In Progress'
  const nowServingSlotKey = sortedSlots.find(slot => 
    groupedBySlot[slot].some(p => p.queueStatus === 'Checked-in' || p.queueStatus === 'Waiting')
  );

  const nowServingSlot = nowServingSlotKey ? groupedBySlot[nowServingSlotKey] : [];
  
  // The next patient is the first one in the "now serving" slot who isn't already 'In Progress'
  const nextPatient = nowServingSlot.find(p => p.queueStatus === 'Checked-in' || p.queueStatus === 'Waiting');

  // Find the next slot with patients
  const nextSlotKey = sortedSlots.find(slot => slot > (nowServingSlotKey || ''));
  const nextSlotPatients = nextSlotKey ? groupedBySlot[nextSlotKey] : [];


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

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 pt-8">
        {isLoading ? (
          <div className="w-full max-w-4xl space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : nowServingSlot.length > 0 || inProgressPatients.length > 0 ? (
          <>
            {/* Now Serving Section */}
            <div className="w-full md:w-2/3 text-center">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-muted-foreground mb-4">Now Serving Window</h2>
              <Card className="bg-primary/10 border-2 border-primary rounded-xl p-6 md:p-10 shadow-2xl animate-fade-in">
                <CardContent className="p-0">
                    <p className="font-bold text-5xl md:text-7xl text-primary-foreground tracking-tight">{nowServingSlotKey}</p>
                    <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-x-8 gap-y-2 text-2xl md:text-3xl text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <Users className="h-8 w-8" />
                            <span>{nowServingSlot.length} Patient(s) in Queue</span>
                        </div>
                    </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Next Up Section */}
            <div className="w-full md:w-1/3">
              {nextSlotPatients.length > 0 && (
                <div className="animate-fade-in-delay">
                  <h3 className="font-headline text-2xl md:text-3xl font-bold text-muted-foreground mb-3 text-center">Next Window</h3>
                  <Card className="bg-muted/50 border rounded-lg p-6 max-w-md mx-auto">
                     <p className="font-semibold text-3xl md:text-4xl text-foreground text-center mb-2">{nextSlotKey}</p>
                     <div className="text-xl text-muted-foreground flex items-center justify-center gap-3">
                          <Users className="h-6 w-6" />
                          <span>{nextSlotPatients.length} Patient(s)</span>
                      </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : (
            <div className="text-center">
                <Users className="h-24 w-24 mx-auto text-muted-foreground/50" />
                <h2 className="font-headline text-4xl md:text-5xl font-bold text-muted-foreground mt-8">Queue is currently empty.</h2>
                <p className="mt-2 text-lg text-muted-foreground">No confirmed appointments for today.</p>
            </div>
        )}
      </main>

       {inProgressPatients.length > 0 && (
          <footer className="mt-auto pt-6 border-t-2 border-muted">
            <h3 className="text-center font-headline text-xl text-muted-foreground font-bold mb-3">Consultations in Progress</h3>
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
