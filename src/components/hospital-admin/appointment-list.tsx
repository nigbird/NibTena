
'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2, Edit, Calendar, Clock, User, X, Check, ClipboardCheck, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Appointment, Doctor, Patient } from '@/lib/definitions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAppointment, updateAppointmentStatus } from '@/app/hospital-admin/appointments/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type EnrichedAppointment = Appointment & { patient: Patient };

type AppointmentListProps = {
  appointments: EnrichedAppointment[];
  doctors: Doctor[];
  onEdit: (appointment: EnrichedAppointment) => void;
  onActionSuccess: () => void;
};

export default function AppointmentList({ appointments, doctors, onEdit, onActionSuccess }: AppointmentListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<EnrichedAppointment | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (appointment: EnrichedAppointment) => {
    setSelectedAppointment(appointment);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
    const result = await deleteAppointment(selectedAppointment.id);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      onActionSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setIsAlertOpen(false);
    setSelectedAppointment(null);
  };

  const handleStatusChange = async (appointment: EnrichedAppointment, status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled') => {
    const result = await updateAppointmentStatus(appointment.id, status);
     if (result.success) {
      toast({ title: "Success", description: result.message });
      onActionSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
  };

  const getDoctorName = (doctorId: number) => {
    return doctors.find(d => d.id === doctorId)?.name || 'Unknown Doctor';
  };

  const statusBadgeVariant = {
    confirmed: 'default',
    completed: 'accent',
    cancelled: 'destructive',
    rescheduled: 'secondary',
  } as const;

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>
                  <div className="font-medium">{appointment.patient.name}</div>
                  <div className="text-sm text-muted-foreground">{appointment.patient.phone}</div>
                </TableCell>
                <TableCell>{getDoctorName(appointment.doctorId)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(appointment.appointmentDate), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {appointment.appointmentSlot}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant[appointment.status]}>{appointment.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(appointment)}>
                        <Edit className="mr-2 h-4 w-4" /> Reschedule/Edit
                      </DropdownMenuItem>
                       <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            <span>Update Status</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleStatusChange(appointment, 'confirmed')}>
                                <Check className="mr-2 h-4 w-4" /> Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(appointment, 'rescheduled')}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Rescheduled
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(appointment, 'completed')}>
                                <ClipboardCheck className="mr-2 h-4 w-4" /> Completed
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleStatusChange(appointment, 'cancelled')} className="text-destructive">
                                <X className="mr-2 h-4 w-4" /> Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteClick(appointment)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {appointments.map(appointment => (
          <div key={appointment.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="font-semibold">{appointment.patient.name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.patient.phone}</p>
                  </div>
                  <Badge variant={statusBadgeVariant[appointment.status]} className="capitalize">{appointment.status}</Badge>
              </div>
               <div>
                  <p className="font-medium text-sm">{getDoctorName(appointment.doctorId)}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(appointment.appointmentDate), 'PPP')} at {appointment.appointmentSlot}
                  </p>
              </div>
              <div className="flex justify-end gap-2 border-t pt-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(appointment)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(appointment)}>Delete</Button>
              </div>
          </div>
        ))}
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment for {selectedAppointment?.patient.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    