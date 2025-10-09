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
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Appointment } from '@/lib/definitions';
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
import RescheduleDrawer from './reschedule-drawer';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type DoctorAppointmentListProps = {
  appointments: Appointment[];
  onActionSuccess: () => void;
};

async function updateAppointment(id: string, updatedData: Partial<Omit<Appointment, 'id'>>) {
    const dataToUpdate: any = { ...updatedData };
    if (updatedData.appointmentDate) {
        dataToUpdate.appointmentDate = new Date(updatedData.appointmentDate);
    }
     if (updatedData.status) {
        dataToUpdate.status = updatedData.status as any;
    }
    const updated = await prisma.appointment.update({
        where: { id },
        data: dataToUpdate,
    });

    revalidatePath('/doctor-portal/appointments');
    revalidatePath('/hospital-admin/appointments');
    revalidatePath('/user/appointments');
    
    if (!updated) return undefined;
    return updated;
}


export default function DoctorAppointmentList({ appointments, onActionSuccess }: DoctorAppointmentListProps) {
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsCancelAlertOpen(true);
  };

  const handleRescheduleClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsRescheduleDrawerOpen(true);
  };
  
  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    await updateAppointment(selectedAppointment.id, { status: 'cancelled' });
    onActionSuccess();
    setIsCancelAlertOpen(false);
    setSelectedAppointment(null);
  };
  
  const handleRescheduleSave = async (date: string, slot: string) => {
    if (!selectedAppointment) return;
    await updateAppointment(selectedAppointment.id, { appointmentDate: date, appointmentSlot: slot, status: 'rescheduled' });
    onActionSuccess();
    setIsRescheduleDrawerOpen(false);
    setSelectedAppointment(null);
  };


  const statusBadgeVariant = {
    confirmed: 'default',
    completed: 'accent',
    cancelled: 'destructive',
    rescheduled: 'secondary'
  } as const;

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
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
                  <div className="font-medium">{appointment.patientName}</div>
                  <div className="text-sm text-muted-foreground">{appointment.patientPhone}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {appointment.appointmentDate}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {appointment.appointmentSlot}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant[appointment.status] as any}>{appointment.status}</Badge>
                </TableCell>
                <TableCell>
                   {appointment.status === 'confirmed' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRescheduleClick(appointment)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCancelClick(appointment)} className="text-destructive">
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                   )}
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
                      <p className="font-semibold">{appointment.patientName}</p>
                      <p className="text-sm text-muted-foreground">{appointment.patientPhone}</p>
                  </div>
                  <Badge variant={statusBadgeVariant[appointment.status] as any} className="capitalize">{appointment.status}</Badge>
              </div>
               <div>
                  <p className="text-sm text-muted-foreground">
                    {appointment.appointmentDate} at {appointment.appointmentSlot}
                  </p>
              </div>
              {appointment.status === 'confirmed' && (
                <div className="flex justify-end gap-2 border-t pt-3 mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleRescheduleClick(appointment)}>Reschedule</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleCancelClick(appointment)}>Cancel</Button>
                </div>
              )}
          </div>
        ))}
      </div>

       <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel the appointment for {selectedAppointment?.patientName}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {selectedAppointment && (
        <RescheduleDrawer
            isOpen={isRescheduleDrawerOpen}
            setIsOpen={setIsRescheduleDrawerOpen}
            appointment={selectedAppointment}
            onReschedule={handleRescheduleSave}
        />
      )}
    </>
  );
}
