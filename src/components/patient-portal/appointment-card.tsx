
'use client';

import { useState } from 'react';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { updateAppointment } from '@/lib/actions';
import RescheduleDrawer from '@/components/doctor-portal/reschedule-drawer';
import { format } from 'date-fns';
import { PortalCard, StatusPill, type Tone } from './ui';

type AppointmentCardProps = {
  appointment: Appointment & { doctor: Doctor };
  onActionSuccess: (message: string) => void;
};

const statusConfig: Record<string, { tone: Tone; label: string }> = {
  confirmed: { tone: 'success', label: 'Upcoming' },
  rescheduled: { tone: 'brand', label: 'Rescheduled' },
  completed: { tone: 'muted', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Canceled' },
  'pending-payment': { tone: 'warning', label: 'Awaiting payment' },
  'payment-failed': { tone: 'danger', label: 'Payment failed' },
  'payment-expired': { tone: 'muted', label: 'Payment expired' },
  'paid-slot-conflict': { tone: 'danger', label: 'Paid - contact hospital' },
};

export default function AppointmentCard({
  appointment,
  onActionSuccess,
}: AppointmentCardProps) {
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);

  const doctor = appointment.doctor;
  const status = statusConfig[appointment.status] || statusConfig.confirmed;

  const handleConfirmCancel = async () => {
    await updateAppointment(appointment.id, { status: 'cancelled' });
    onActionSuccess('Your appointment has been successfully canceled.');
    setIsCancelAlertOpen(false);
  };

  const handleRescheduleSave = async (date: string, slot: string) => {
    await updateAppointment(appointment.id, {
      appointmentDate: date,
      appointmentSlot: slot,
      status: 'rescheduled',
    });
    onActionSuccess('Your appointment has been successfully rescheduled.');
    setIsRescheduleDrawerOpen(false);
  };

  return (
    <>
      <PortalCard className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/40">
            {doctor?.imageUrl && <AvatarImage src={doctor.imageUrl} alt={doctor?.name} className="object-cover" />}
            <AvatarFallback className="bg-primary/30 font-semibold text-secondary">{doctor?.name?.charAt(0) ?? 'D'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{doctor?.name || 'Doctor'}</p>
            <p className="truncate text-sm text-muted-foreground">{doctor?.specialty}</p>
          </div>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Calendar className="h-4 w-4 shrink-0 text-secondary" />
            <span className="truncate">{format(new Date(appointment.appointmentDate), 'EEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4 shrink-0 text-secondary" />
            <span className="truncate">{appointment.appointmentSlot}</span>
          </div>
        </div>

        {appointment.symptoms && (
          <p className="mt-3 truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Concerns:</span> {appointment.symptoms}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Booked {format(new Date(appointment.createdAt), 'PP p')}</p>

        {(appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsRescheduleDrawerOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsCancelAlertOpen(true)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </PortalCard>

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your appointment with {doctor?.name}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleDrawer
        isOpen={isRescheduleDrawerOpen}
        setIsOpen={setIsRescheduleDrawerOpen}
        appointment={appointment}
        onReschedule={handleRescheduleSave}
       />
    </>
  );
}
