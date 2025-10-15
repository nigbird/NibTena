
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from './actions';
import type { Appointment, Doctor } from '@/lib/definitions';
import { format } from 'date-fns';
import { Stethoscope, User, Users } from 'lucide-react';
import type { QueueItem } from '../page';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

import { getSession } from '@/lib/session';

export default function QueueProjectionPage({ hospitalId }: { hospitalId: number }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const fetchAndFilterQueue = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [allAppointments, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(hospitalId),
        getDoctorsByHospitalId(hospitalId),
      ]);

      const todaysAppointments = allAppointments
        .filter(app => format(new Date(app.appointmentDate), 'yyyy-MM-dd') === todayStr && (app.status === 'confirmed' || app.status === 'rescheduled'))
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
  }, [hospitalId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentTime(new Date());
    }

    fetchAndFilterQueue();
    const interval = setInterval(fetchAndFilterQueue, 5000);
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
  
  const inProgressPatients = useMemo(() => queue.filter(p => p.queueStatus === 'In Progress'), [queue]);
  
  const nowServingPatient = useMemo(() => {
    // The patient to be served is the first one who is 'Checked-in'
    return queue.find(p => p.queueStatus === 'Checked-in');
  }, [queue]);

  const upNextPatients = useMemo(() => {
    // All patients who are 'Waiting' or 'Checked-in' but not the one currently being served
    const waitingList = queue.filter(p => p.queueStatus === 'Waiting' || p.queueStatus === 'Checked-in');
    if (nowServingPatient) {
      return waitingList.filter(p => p.id !== nowServingPatient.id).slice(0, 5); // Limit to next 5
    }
    return waitingList.slice(0, 5);
  }, [queue, nowServingPatient]);


  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col p-6 lg:p-8">
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

      <main className="flex-1 grid md:grid-cols-3 gap-8 pt-8">
        {/* Main "Now Serving" Area */}
        <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
            {isLoading ? (
                <Skeleton className="h-80 w-full" />
            ) : nowServingPatient ? (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={nowServingPatient.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="w-full"
                    >
                        <Card className="w-full bg-primary/10 border-2 border-primary/30 shadow-2xl animate-pulse-slow">
                            <CardHeader>
                                <CardTitle className="text-4xl lg:text-5xl font-bold text-primary-foreground font-headline tracking-wide">
                                    Now Serving
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-8 lg:py-12">
                                <h1 className="text-6xl lg:text-8xl font-extrabold text-foreground tracking-tighter">
                                    {nowServingPatient.patientName}
                                </h1>
                                <div className="mt-6 flex items-center justify-center gap-4 text-xl lg:text-2xl text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope />
                                        <span>{getDoctorName(nowServingPatient.doctorId)}</span>
                                    </div>
                                    <span>&bull;</span>
                                    <span>Consultation Room 3</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Users className="h-24 w-24" />
                    <h2 className="mt-6 text-3xl font-bold">No patients currently checked in.</h2>
                    <p className="mt-2 text-lg">The waiting queue is empty.</p>
                </div>
            )}
        </div>

        {/* "Up Next" Sidebar */}
        <div className="md:col-span-1">
             <Card className="h-full bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Up Next</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : upNextPatients.length > 0 ? (
                        <ul className="space-y-3">
                            {upNextPatients.map((patient, index) => (
                                <motion.li 
                                    key={patient.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="bg-background/50 p-4 rounded-lg border flex items-center gap-4">
                                        <div className="flex-shrink-0 h-10 w-10 bg-primary/20 text-primary-foreground font-bold rounded-full flex items-center justify-center text-lg">{index + 1}</div>
                                        <div>
                                            <p className="font-semibold text-lg">{patient.patientName}</p>
                                            <p className="text-sm text-muted-foreground">{getDoctorName(patient.doctorId)}</p>
                                        </div>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-muted-foreground pt-8">
                             <p>The queue is clear.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>

       {inProgressPatients.length > 0 && (
          <footer className="mt-auto pt-6 border-t-2 border-muted/50">
            <h3 className="text-center font-headline text-xl text-muted-foreground font-bold mb-4">Consultations in Progress</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {inProgressPatients.map(patient => (
                <div key={patient.id} className="bg-green-100/50 dark:bg-green-900/30 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
                  <p className="font-semibold text-lg">{patient.patientName}</p>
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Stethoscope className="h-4 w-4" />
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

export async function QueueProjectionPageWrapper() {
    const session = await getSession();
    if (!session.isLoggedIn || !session.hospitalId) {
        // This page is meant to be public-facing on a display, 
        // but it still needs a hospital context.
        // In a real app, you might use a URL parameter with a secret key
        // or have a different way to associate a projection screen with a hospital.
        // For now, we'll just block it if no session is found.
        return <div className="p-8 text-center text-red-500">Error: No hospital context found. Cannot display queue.</div>
    }
    return <QueueProjectionPage hospitalId={session.hospitalId} />;
}
