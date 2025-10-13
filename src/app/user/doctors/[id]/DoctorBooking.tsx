
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Doctor, Hospital, DoctorSchedule, TimeSlot } from '@/lib/definitions';
import { addDays, format } from 'date-fns';
import { Hospital as HospitalIcon, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDoctorScheduleForDate } from '@/app/hospital-admin/appointments/actions';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function formatTime(timeStr: string) {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const formattedHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${String(formattedHour).padStart(2, '0')}:${minute} ${ampm}`;
}


type DoctorBookingProps = {
  doctor: Doctor;
  doctorHospitals: Hospital[];
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function DoctorBooking({
  doctor,
  doctorHospitals,
  searchParams,
}: DoctorBookingProps) {
  const router = useRouter();

  const getInitialHospitalId = () => {
    const hospitalIdParam = searchParams?.hospitalId;
    return hospitalIdParam 
      ? Number(hospitalIdParam)
      : (doctorHospitals[0]?.id);
  }

  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(
    getInitialHospitalId()
  );
  const [dates] = useState(() => {
    const dates = [];
    const bookingWindow = doctorHospitals.find(h => h.id === getInitialHospitalId())?.bookingWindow || 14;
    for (let i = 0; i < bookingWindow; i++) {
        dates.push(addDays(new Date(), i));
    }
    return dates;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorSchedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  useEffect(() => {
    if (selectedHospitalId && selectedDate) {
        setIsLoadingSchedule(true);
        getDoctorScheduleForDate(doctor.id, format(selectedDate, 'yyyy-MM-dd'), selectedHospitalId)
            .then(schedule => setDoctorSchedule(schedule as DoctorSchedule | null))
            .finally(() => setIsLoadingSchedule(false));
    }
  }, [doctor.id, selectedHospitalId, selectedDate]);


  const handleBookNow = () => {
    if (selectedHospitalId && selectedDate && selectedSlot) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        hospitalId: String(selectedHospitalId),
        date: formattedDate,
        slot: selectedSlot,
      });
      router.push(`/user/book/${doctor.id}?${params.toString()}`);
    }
  };
  
  const selectedHospital = doctorHospitals.find(h => h.id === selectedHospitalId);

  const renderTimeSelection = () => {
    if (isLoadingSchedule) {
        return <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin" /></div>;
    }
    if (!doctorSchedule || doctorSchedule.workingHours.length === 0) {
        return <p className="text-center text-muted-foreground p-4 border rounded-md">No available slots for this day.</p>
    }
    const workingHours = doctorSchedule.workingHours as TimeSlot[];

    return (
        <div className="space-y-3">
            {workingHours.map((slot, i) => (
                 <div key={i} className="text-sm">
                    <Badge variant="secondary" >{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</Badge>
                </div>
            ))}
            <div className="space-y-2 pt-2">
                <Label htmlFor="appointment-time" className="font-semibold">Choose a time</Label>
                <Input
                    id="appointment-time"
                    type="time"
                    value={selectedSlot || ""}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    min={workingHours[0].startTime}
                    max={workingHours[workingHours.length - 1].endTime}
                    className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Select a time within the available ranges.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
        <div>
            {doctorHospitals.length > 0 && (
                 <div className="space-y-2">
                    <Label className="font-semibold text-lg flex items-center gap-2">
                        <HospitalIcon className="h-5 w-5" />
                        Select Hospital
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {doctorHospitals.map((hospital) => (
                        <Button
                          key={hospital.id}
                          variant={selectedHospitalId === hospital.id ? 'accent' : 'outline'}
                          onClick={() => setSelectedHospitalId(hospital.id)}
                        >
                          {hospital.name}
                        </Button>
                      ))}
                    </div>
                </div>
            )}
        </div>

        <div>
            <h3 className="font-semibold mb-3 text-lg">Select Date</h3>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex pb-2 space-x-2">
                    {dates.map((date, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg border-2 w-20 h-24 transition-colors',
                        selectedDate.toDateString() === date.toDateString()
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-muted'
                        )}
                    >
                        <span className="text-sm font-semibold">{format(date, 'EEE')}</span>
                        <span className="text-2xl font-bold">{format(date, 'd')}</span>
                        <span className="text-xs">{format(date, 'MMM')}</span>
                    </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
      
        <div>
            <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                <Clock className="h-5 w-5"/>
                Available Slots for {format(selectedDate, 'MMMM d')}
            </h3>
             {renderTimeSelection()}
        </div>
      
      <Button
        size="lg"
        className="w-full font-bold text-lg"
        onClick={handleBookNow}
        disabled={!selectedHospitalId || !selectedDate || !selectedSlot}
        variant="accent"
      >
        Book Appointment
      </Button>
    </div>
  );
}
