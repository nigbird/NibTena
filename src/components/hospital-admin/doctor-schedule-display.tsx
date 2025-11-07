
'use client';

import { useState, useEffect } from 'react';
import { getDoctorSchedules } from '@/app/hospital-admin/schedule/actions';
import type { DoctorSchedule, TimeSlot } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, Coffee, Sparkles } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

type DoctorScheduleDisplayProps = {
  doctorId: number;
  hospitalId: number;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorScheduleDisplay({ doctorId, hospitalId }: DoctorScheduleDisplayProps) {
  const [schedule, setSchedule] = useState<DoctorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getDoctorSchedules(doctorId, hospitalId)
      .then((data) => {
        // Ensure the schedule is sorted by a consistent day order
        const sortedData = data.sort((a, b) => weekDays.indexOf(a.dayOfWeek) - weekDays.indexOf(b.dayOfWeek));
        setSchedule(sortedData as DoctorSchedule[]);
      })
      .finally(() => setIsLoading(false));
  }, [doctorId, hospitalId]);

  const renderTimeSlots = (slots: TimeSlot[]) => {
    if (!slots || slots.length === 0) {
      return <Badge variant="outline">Not set</Badge>;
    }
    return slots.map((slot, index) => (
      <Badge key={index} variant="secondary">
        {slot.startTime} - {slot.endTime}
      </Badge>
    ));
  };
  
  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
        <div className="p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto h-8 w-8 mb-2" />
            No schedule has been set for this doctor yet.
        </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
        <h3 className="font-semibold text-md text-foreground">Weekly Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {schedule.map((daySchedule) => (
            <Card key={daySchedule.dayOfWeek} className="shadow-sm">
                <CardHeader className="p-3 pb-2 border-b">
                    <CardTitle className="text-sm font-medium">{daySchedule.dayOfWeek}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                            <span className="font-medium mr-1">Work:</span>
                            {renderTimeSlots(daySchedule.workingHours as TimeSlot[])}
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Coffee className="h-4 w-4 mt-0.5 text-orange-600 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                             <span className="font-medium mr-1">Break:</span>
                            {renderTimeSlots(daySchedule.breakHours as TimeSlot[])}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}
