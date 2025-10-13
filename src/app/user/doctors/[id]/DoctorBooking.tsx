'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Doctor, Hospital } from '@/lib/definitions';
import { addDays, format } from 'date-fns';
import { Hospital as HospitalIcon, Clock, Loader2, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAvailableTimeWindows } from './actions';

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
  const [timeWindows, setTimeWindows] = useState<string[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  useEffect(() => {
    if (selectedHospitalId && selectedDate) {
        setIsLoadingSchedule(true);
        setSelectedSlot(null); // Reset selected slot when date or hospital changes
        getAvailableTimeWindows(doctor.id, format(selectedDate, 'yyyy-MM-dd'), selectedHospitalId)
            .then(windows => setTimeWindows(windows))
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
  
  const renderTimeSelection = () => {
    if (isLoadingSchedule) {
        return (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Finding available windows...</p>
            </div>
        );
    }
    if (timeWindows.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-center p-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 font-semibold">No available slots</p>
                <p className="text-sm text-muted-foreground">There are no bookable time windows for this day. Please select another date.</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {timeWindows.map((window, i) => (
                <Button
                    key={i}
                    variant={selectedSlot === window ? 'accent' : 'outline'}
                    className="h-12 text-base"
                    onClick={() => setSelectedSlot(window)}
                >
                    {window}
                </Button>
            ))}
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
                Available Windows for {format(selectedDate, 'MMMM d')}
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
