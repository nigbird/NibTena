
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListOrdered, User, Clock, Check, Play, CheckCircle2, MonitorPlay, Users, Stethoscope } from "lucide-react";
import { getAppointmentsByHospitalId, getDoctorsByHospitalId, getTodaysAppointmentsCount } from './actions';
import { updateAppointmentStatus } from '@/app/hospital-admin/appointments/actions';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PaginationControls from '@/components/PaginationControls';

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


export default function QueueManagementPageContent({ hospitalId }: { hospitalId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = searchParams.get('page') ?? '1';
  const perPage = searchParams.get('per_page') ?? '10';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
  const { toast } = useToast();

  const mapDbStatusToQueueStatus = (status: string): QueueStatus => {
    if (status === 'checked-in') return 'Checked-in';
    if (status === 'in-progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    return 'Waiting';
  };

  const fetchTodaysAppointments = useCallback(async () => {
    setIsLoading(true);
    const pageAsNumber = Number(page);
    const perPageAsNumber = Number(perPage);
    try {
      const [allAppointments, count, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(hospitalId, pageAsNumber, perPageAsNumber),
        getTodaysAppointmentsCount(hospitalId),
        getDoctorsByHospitalId(hospitalId),
      ]);

       const todaysAppointments = allAppointments
        .map((app, index) => {
           return {
            ...app,
            queueStatus: mapDbStatusToQueueStatus((app as any).status),
           }
        });

      setQueue(todaysAppointments as unknown as QueueItem[]);
      setTotalAppointments(count);
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
  }, [toast, hospitalId, page, perPage]);
  
  useEffect(() => {
    fetchTodaysAppointments();
    // No localStorage sync anymore — DB is single source of truth
    // rely on revalidation and re-fetch after server action calls
    return () => {};

  }, [fetchTodaysAppointments]);


  const handleStatusUpdate = async (appointmentId: string, newStatus: QueueStatus) => {
    // map UI queue statuses to DB status strings
    const mapQueueToDb = (qs: QueueStatus) => {
      switch (qs) {
        case 'Checked-in':
          return 'checked-in';
        case 'In Progress':
          return 'in-progress';
        case 'Completed':
          return 'completed';
        case 'Waiting':
        default:
          return 'confirmed';
      }
    };

    const dbStatus = mapQueueToDb(newStatus);
    try {
      const result = await updateAppointmentStatus(appointmentId, dbStatus as any);
      if (result?.success) {
        // refresh the list from server
        fetchTodaysAppointments();
        toast({ title: 'Queue Updated', description: `Patient status set to "${newStatus}".` });
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: result?.message || 'Could not update status.' });
      }
    } catch (err) {
      console.error('Status update error', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update status.' });
    }
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
                                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="bg-green-100/50 dark:bg-green-900/20 p-2 rounded-lg flex items-center gap-2 border border-green-500/20">
                                            <User className="h-5 w-5 text-green-700 dark:text-green-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Patient</p>
                                                <p className="font-semibold text-sm truncate">{(item as any).patient?.name ?? (item as any).patientName ?? 'Unknown Patient'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-blue-100/50 dark:bg-blue-900/20 p-2 rounded-lg flex items-center gap-2 border border-blue-500/20">
                                            <Stethoscope className="h-5 w-5 text-blue-700 dark:text-blue-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Doctor</p>
                                                <p className="font-semibold text-sm truncate">{getDoctorName(item.doctorId)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-4">
                                        <Badge variant={item.queueStatus === 'Waiting' ? 'default' : 'secondary'} className="capitalize">{item.queueStatus}</Badge>
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
        <CardFooter className="border-t p-4">
            <PaginationControls totalCount={totalAppointments} resourceName="appointments" />
        </CardFooter>
      </Card>
    </div>
  );
}
