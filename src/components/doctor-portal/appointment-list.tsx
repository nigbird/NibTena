
'use client';

import { MoreHorizontal, Calendar, Clock, MessageSquare, Hospital } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Appointment, Hospital as HospitalType } from '@/lib/definitions';
import { format as formatDate, parseISO } from 'date-fns';
import { Card } from '../ui/card';

type DoctorAppointmentListProps = {
  appointments: Appointment[];
  onActionSuccess: () => void;
  onCardClick: (appointment: Appointment) => void;
};

export default function DoctorAppointmentList({ appointments, onActionSuccess, onCardClick }: DoctorAppointmentListProps) {

  const statusBadgeVariant = {
    confirmed: 'default',
    completed: 'accent',
    cancelled: 'destructive',
    rescheduled: 'secondary'
  } as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {appointments.map((appointment) => (
        <Card 
          key={appointment.id} 
          className="p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onCardClick(appointment)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{appointment.patientName}</p>
              <p className="text-sm text-muted-foreground">Age: {appointment.patientAge}</p>
            </div>
            <Badge variant={statusBadgeVariant[appointment.status] as any}>{appointment.status}</Badge>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2 border-t pt-3">
              <div className="flex items-center gap-2 font-medium text-foreground/90">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(parseISO(appointment.appointmentDate as unknown as string), 'PPP')}</span>
              </div>
              <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{appointment.appointmentSlot}</span>
              </div>
          </div>

          <div className="border-t pt-3">
             <h4 className="text-sm font-semibold mb-1">Concerns</h4>
             <p className="text-xs text-muted-foreground italic truncate">
              {appointment.symptoms || "No concerns listed."}
             </p>
          </div>
          
          <div className="flex justify-end">
            <button className="text-xs font-semibold text-primary hover:underline">View Details</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
