
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered, User, Clock, Check, Play, CheckCircle2, MonitorPlay, Users } from "lucide-react";
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from './actions';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type QueueStatus = 'Waiting' | 'Checked-in' | 'In Progress' | 'Completed';

export type QueueItem = Appointment & {
  queueStatus: QueueStatus;
};

const statusConfig: Record<QueueStatus, { icon: React.ElementType, color: string, nextAction?: { label: string; status: QueueStatus, icon: React.ElementType } }> = {
  'Waiting': { icon: Clock, color: 'bg-yellow-500 dark:bg-yellow-800', nextAction: { label: 'Check In', status: 'Checked-in', icon: Check } },
  'Checked-in': { icon: User, color: 'bg-blue-500 dark:bg-blue-800', nextAction: { label: 'Start Consultation', status: 'In Progress', icon: Play } },
  'In Progress': { icon: Play, color: 'bg-green-500 dark:bg-green-800', nextAction: { label: 'Mark as Completed', status: 'Completed', icon: CheckCircle2 } },
  'Completed': { icon: CheckCircle2, color: 'bg-gray-400 dark:bg-gray-600' },
};

import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';


export default function QueueManagementPage({ hospitalId }: { hospitalId: number }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
  const { toast } = useToast();

  const fetchTodaysAppointments = useCallback(async () => {
    setIsLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [allAppointments, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(hospitalId),
        getDoctorsByHospitalId(hospitalId),
      ]);

       const todaysAppointments = allAppointments
        .filter(app => format(new Date(app.appointmentDate), 'yyyy-MM-dd') === todayStr && app.status === 'confirmed')
        .map((app, index) => {
           const storedStatus = localStorage.getItem(`queue-status-${app.id}`) as QueueStatus | null;
           return {
            ...app,
            queueStatus: storedStatus || 'Waiting',
           }
        })
        .sort((a, b) => {
            if (a.appointmentSlot < b.appointmentSlot) return -1;
            if (a.appointmentSlot > b.appointmentSlot) return 1;
            // If slots are same, sort by booking time
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      setQueue(todaysAppointments);
      setDoctors(doctorsData as Doctor[]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load today's appointments.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, hospitalId]);
  
  useEffect(() => {
    fetchTodaysAppointments();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('queue-status-')) {
        fetchTodaysAppointments();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

  }, [fetchTodaysAppointments]);


  const handleStatusUpdate = (appointmentId: string, newStatus: QueueStatus) => {
    localStorage.setItem(`queue-status-${appointmentId}`, newStatus);

    setQueue(currentQueue => currentQueue.map(item =>
      item.id === appointmentId ? { ...item, queueStatus: newStatus } : item
    ));
    toast({
      title: 'Queue Updated',
      description: `Patient status set to "${newStatus}".`,
    });
  };

  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      const doctorMatch = doctorFilter === 'all' || item.doctorId === Number(doctorFilter);
      const statusMatch = statusFilter === 'all' || item.queueStatus === statusFilter;
      return doctorMatch && statusMatch;
    });
  }, [queue, doctorFilter, statusFilter]);

  const groupedBySlot = useMemo(() => {
    return filteredQueue.reduce((acc, item) => {
        const slot = item.appointmentSlot;
        if (!acc[slot]) {
            acc[slot] = [];
        }
        acc[slot].push(item);
        return acc;
    }, {} as Record<string, QueueItem[]>);
  }, [filteredQueue]);

  const getDoctorName = (doctorId: number) => {
    return doctors.find(d => d.id === doctorId)?.name || 'Unknown Doctor';
  }

  const renderQueueContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
             <div key={i} className="flex items-center p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full mr-4" />
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <div className="flex justify-end">
                    <Skeleton className="h-9 w-32" />
                  </div>
                </div>
            </div>
          ))}
        </div>
      );
    }

    if (Object.keys(groupedBySlot).length > 0) {
       return (
          <div className="space-y-6">
            {Object.entries(groupedBySlot).map(([slot, items]) => (
                <Card key={slot}>
                    <CardHeader className="bg-muted/50 p-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Time Window: {slot}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                        {items.map((item, index) => {
                          const config = statusConfig[item.queueStatus];
                          const Icon = config.icon;
                          return (
                            <div key={item.id} className="flex items-center p-4 gap-4">
                                <div className="font-bold text-lg text-muted-foreground w-8 text-center">{index + 1}</div>
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white ${config.color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>
                                      <p className="font-semibold">{item.patientName}</p>
                                      <p className="text-sm text-muted-foreground">{getDoctorName(item.doctorId)}</p>
                                    </div>
                                    <div className="text-sm">
                                      <Badge variant={item.queueStatus === 'Waiting' ? 'default' : 'secondary'} className="capitalize">{item.queueStatus}</Badge>
                                    </div>
                                    <div className="flex justify-end">
                                      {config.nextAction ? (
                                          <Button
                                              variant="accent"
                                              size="sm"
                                              onClick={() => handleStatusUpdate(item.id, config.nextAction!.status)}
                                          >
                                              <config.nextAction.icon className="mr-2 h-4 w-4" />
                                              {config.nextAction.label}
                                          </Button>
                                      ) : (
                                          <Button variant="outline" size="sm" disabled>Completed</Button>
                                      )}
                                    </div>
                                </div>
                            </div>
                          )
                        })}
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Appointments Match Filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">Either there are no confirmed appointments for today, or none match your filter criteria.</p>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Queue Management</h1>
            <p className="text-lg text-muted-foreground">Manage the daily patient queue for today's appointments.</p>
        </div>
         <Button asChild variant="outline">
            <Link href="/hospital-admin/queue/projection" target="_blank">
                <MonitorPlay className="mr-2 h-4 w-4" />
                Start Projection
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Queue ({format(new Date(), 'PPP')})</CardTitle>
          <CardDescription>Live view of patients waiting and being served within their time windows.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by doctor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.id.toString()}>{doc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as QueueStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(statusConfig).map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {renderQueueContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export async function QueuePage() {
    const session = await getSession();
    if (!session.isLoggedIn || !session.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <QueueManagementPage hospitalId={session.hospitalId} />;
}
