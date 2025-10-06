'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered, User, Clock, Check, Play, CheckCircle2 } from "lucide-react";
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from '@/lib/data';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

type QueueStatus = 'Waiting' | 'Checked-in' | 'In Progress' | 'Completed';

type QueueItem = Appointment & {
  queueStatus: QueueStatus;
};

const statusConfig: Record<QueueStatus, { icon: React.ElementType, color: string, nextAction?: { label: string; status: QueueStatus, icon: React.ElementType } }> = {
  'Waiting': { icon: Clock, color: 'bg-yellow-500', nextAction: { label: 'Check In', status: 'Checked-in', icon: Check } },
  'Checked-in': { icon: User, color: 'bg-blue-500', nextAction: { label: 'Start Consultation', status: 'In Progress', icon: Play } },
  'In Progress': { icon: Play, color: 'bg-green-500', nextAction: { label: 'Mark as Completed', status: 'Completed', icon: CheckCircle2 } },
  'Completed': { icon: CheckCircle2, color: 'bg-gray-400' },
};


export default function QueueManagementPage() {
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
        getAppointmentsByHospitalId(MOCK_HOSPITAL_ID),
        getDoctorsByHospitalId(MOCK_HOSPITAL_ID),
      ]);

      const todaysAppointments = allAppointments
        .filter(app => format(parseISO(app.appointmentDate), 'yyyy-MM-dd') === todayStr && app.status === 'confirmed')
        .map(app => ({
          ...app,
          // This state is ephemeral and resets on reload.
          // In a real app, this would be persisted.
          queueStatus: 'Waiting' as QueueStatus, 
        }))
        .sort((a, b) => a.appointmentSlot.localeCompare(b.appointmentSlot));

      setQueue(todaysAppointments);
      setDoctors(doctorsData);
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
  }, [toast]);

  useEffect(() => {
    fetchTodaysAppointments();
  }, [fetchTodaysAppointments]);

  const handleStatusUpdate = (appointmentId: string, newStatus: QueueStatus) => {
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

    if (filteredQueue.length > 0) {
       return (
          <div className="space-y-4">
            {filteredQueue.map((item) => {
              const config = statusConfig[item.queueStatus];
              const Icon = config.icon;
              return (
                <Card key={item.id} className="shadow-sm">
                  <div className="flex items-center p-4">
                    <div className={`mr-4 h-12 w-12 rounded-full flex items-center justify-center text-white ${config.color}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <p className="font-semibold">{item.patientName}</p>
                          <p className="text-sm text-muted-foreground">{getDoctorName(item.doctorId)}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline">{item.appointmentSlot}</Badge>
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
                </Card>
              )
            })}
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Queue Management</h1>
        <p className="text-lg text-muted-foreground">Manage the daily patient queue for today's appointments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Queue ({format(new Date(), 'PPP')})</CardTitle>
          <CardDescription>Live view of patients waiting and being served.</CardDescription>
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
