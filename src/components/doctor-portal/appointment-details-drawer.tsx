
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, User, Phone, Stethoscope, MessageSquare, Hospital, X, RefreshCw, Check, NotebookText, Star } from 'lucide-react';
import type { Appointment, Hospital as HospitalType } from '@/lib/definitions';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { updateAppointment } from '@/lib/actions';
import RescheduleDrawer from './reschedule-drawer';
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
import { Separator } from '../ui/separator';

type AppointmentDetailsDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  appointment: Appointment;
  onActionSuccess: () => void;
};

export default function AppointmentDetailsDrawer({ isOpen, setIsOpen, appointment, onActionSuccess }: AppointmentDetailsDrawerProps) {
  const { toast } = useToast();
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);

  const statusBadgeVariant = {
    confirmed: 'default',
    completed: 'accent',
    cancelled: 'destructive',
    rescheduled: 'secondary'
  } as const;
  
  const handleConfirmCancel = async () => {
    await updateAppointment(appointment.id, { status: 'cancelled' });
    onActionSuccess();
    setIsCancelAlertOpen(false);
  };

  const handleRescheduleSave = async (date: string, slot: string) => {
    await updateAppointment(appointment.id, { appointmentDate: date, appointmentSlot: slot, status: 'rescheduled' });
    onActionSuccess();
    setIsRescheduleDrawerOpen(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-lg w-full flex flex-col">
          <SheetHeader className="pr-10">
            <SheetTitle>Appointment Details</SheetTitle>
            <SheetDescription>
              Full details for the appointment on {format(parseISO(appointment.appointmentDate as unknown as string), 'PPP')}.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-6">
              <div className="space-y-4 rounded-lg border bg-card p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="font-bold text-xl">{appointment.patientName}</p>
                        <p className="text-sm text-muted-foreground">Age: {appointment.patientAge} | Gender: {appointment.patientGender}</p>
                    </div>
                     <Badge variant={statusBadgeVariant[appointment.status]} className="capitalize text-sm">{appointment.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> <span>{appointment.patientPhone}</span>
                  </div>
              </div>

             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <NotebookText className="h-5 w-5 text-primary" />
                        AI-Generated Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground italic">
                        {appointment.appointmentSummary}
                    </p>
                </CardContent>
             </Card>

              <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-medium">{format(parseISO(appointment.appointmentDate as unknown as string), 'PPPP')} at {appointment.appointmentSlot}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Hospital className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-xs text-muted-foreground">Hospital</p>
                        <p className="font-medium">{(appointment as any).hospital.name}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                        <p className="text-xs text-muted-foreground">Patient's Full Symptoms</p>
                        <p className="font-medium whitespace-pre-wrap">{appointment.symptoms}</p>
                    </div>
                </div>
              </div>
              
              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Patient History</h4>
                <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg">No previous appointments found.</div>
              </div>
          </div>
          <SheetFooter className="mt-auto pt-4 border-t -mx-6 px-6 bg-background">
             {appointment.status === 'confirmed' && (
                <div className="flex w-full justify-between gap-2">
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
               {appointment.status === 'completed' && (
                <div className="flex w-full justify-center gap-2">
                    <Button variant="accent">
                        <Star className="mr-2 h-4 w-4" />
                        View Follow-up Notes
                    </Button>
                </div>
              )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel the appointment for {appointment?.patientName}. This cannot be undone.
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
      
      {appointment && (
        <RescheduleDrawer
            isOpen={isRescheduleDrawerOpen}
            setIsOpen={setIsRescheduleDrawerOpen}
            appointment={appointment}
            onReschedule={handleRescheduleSave}
        />
      )}
    </>
  );
}
