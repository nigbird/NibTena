
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Doctor, Hospital } from '@/lib/definitions';
import { addDays, format, startOfToday } from 'date-fns';
import { Hospital as HospitalIcon, Clock, Loader2, Calendar } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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
    // Ensure booking window defaults to a reasonable number if not set
    const hospital = doctorHospitals.find(h => h.id === getInitialHospitalId());
    const bookingWindow = hospital?.bookingWindow ?? 14;
    const today = startOfToday(); // Use startOfToday to avoid time-related issues
    for (let i = 0; i < bookingWindow; i++) {
        dates.push(addDays(today, i));
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
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {timeWindows.map((window, i) => (
            <button
                key={i}
                onClick={() => setSelectedSlot(window)}
                className={cn(
                    'px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105',
                    selectedSlot === window
                    ? 'bg-primary text-secondary'
                    : 'bg-background text-foreground'
                )}
            >
                {window}
            </button>
        ))}
        </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
        <div>
            {doctorHospitals.length > 1 && (
                 <div className="space-y-3">
                    <h3 className="font-medium text-lg text-foreground/80 flex items-center gap-2">
                        <HospitalIcon className="h-5 w-5" />
                        Select Hospital
                    </h3>
                    <Carousel opts={{align: 'start', dragFree: true}} className="w-full">
                      <CarouselContent className="-ml-2">
                        {doctorHospitals.map((hospital) => (
                          <CarouselItem key={hospital.id} className="basis-auto pl-2">
                            <button
                              onClick={() => setSelectedHospitalId(hospital.id)}
                              className={cn(
                                'px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors',
                                selectedHospitalId === hospital.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card hover:bg-muted/50 border-border'
                              )}
                            >
                              {hospital.name}
                            </button>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                </div>
            )}
        </div>

        <div>
            <h3 className="font-medium text-lg text-foreground/80 mb-3">Select Date</h3>
            <Carousel opts={{align: 'start'}} className="w-full">
              <CarouselContent className="-ml-2">
                {dates.map((date, index) => (
                  <CarouselItem key={index} className="basis-[22%] sm:basis-[18%] md:basis-[15%] pl-2">
                    <button
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                        'flex flex-col items-center justify-center p-2 md:p-3 rounded-lg border-2 w-full h-24 transition-colors',
                        selectedDate.toDateString() === date.toDateString()
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-muted/50 border-border'
                        )}
                    >
                        <span className="text-xs md:text-sm font-semibold">{format(date, 'EEE')}</span>
                        <span className="text-xl md:text-2xl font-bold">{format(date, 'd')}</span>
                        <span className="text-[10px] md:text-xs">{format(date, 'MMM')}</span>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-[-10px] hidden sm:flex" />
              <CarouselNext className="right-[-10px] hidden sm:flex"/>
            </Carousel>
        </div>
      
        <div>
            <h3 className="font-medium text-lg text-foreground/80 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5"/>
                Available Windows for {format(selectedDate, 'MMMM d')}
            </h3>
             {renderTimeSelection()}
        </div>
      
      <Button
        size="lg"
        className="w-full font-bold text-base md:text-lg h-12"
        onClick={handleBookNow}
        disabled={!selectedHospitalId || !selectedDate || !selectedSlot}
        variant="accent"
      >
        Book Appointment
      </Button>
    </div>
  );
}
