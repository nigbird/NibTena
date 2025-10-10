'use client';

import { useState } from 'react';
import type { Appointment, Doctor } from '@/lib/definitions';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  RefreshCw,
  X,
} from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';
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
import { updateAppointment } from '@/app/user/appointments/actions';
import RescheduleDrawer from '@/components/doctor-portal/reschedule-drawer';
import { format } from 'date-fns';

type AppointmentCardProps = {
  appointment: Appointment;
  doctor?: Doctor;
  onActionSuccess: (message: string) => void;
};

const statusConfig = {
  confirmed: { variant: 'default', label: 'Upcoming' },
  rescheduled: { variant: 'secondary', label: 'Rescheduled' },
  completed: { variant: 'outline', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Canceled' },
} as const;

export default function AppointmentCard({
  appointment,
  doctor,
  onActionSuccess,
}: AppointmentCardProps) {
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);

  const doctorImage = placeholderImages.find(p => p.id === doctor?.imageId);
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
      <Card className="p-4 space-y-4 shadow-md">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border">
                    {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor?.name} />}
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold">{doctor?.name || 'Doctor'}</p>
                    <p className="text-sm text-muted-foreground">{doctor?.specialty}</p>
                </div>
            </div>
            <Badge variant={status.variant as any}>{status.label}</Badge>
        </div>

        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
             <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(appointment.appointmentDate), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{appointment.appointmentSlot}</span>
            </div>
        </div>
        
        {(appointment.status === 'confirmed' || appointment.status === 'rescheduled') && (
            <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsRescheduleDrawerOpen(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reschedule
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsCancelAlertOpen(true)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                </Button>
            </div>
        )}
      </Card>

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
