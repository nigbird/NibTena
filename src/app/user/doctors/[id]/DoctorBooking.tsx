
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Doctor, Hospital } from '@/lib/definitions';
import { addDays, format, startOfToday } from 'date-fns';
import { Hospital as HospitalIcon, Clock, Loader2, Calendar, CalendarDays } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { FilterChip, brandFill, ctaClass } from '@/components/patient-portal/ui';

import { getAvailableTimeWindows } from './actions';

type DoctorBookingProps = {
  doctor: Pick<Doctor, 'id'>;
  doctorHospitals: (Pick<Hospital, 'id' | 'name'> & { bookingWindow?: number | null })[];
  searchParams?: { [key: string]: string | string[] | undefined };
};

function StepLabel({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-secondary" />
      {children}
    </h3>
  );
}

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
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Finding available times...</p>
            </div>
        );
    }
    if (timeWindows.length === 0) {
        return (
             <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">No available times</p>
                <p className="text-sm text-muted-foreground">Please select another date.</p>
            </div>
        );
    }

    return (
       <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {timeWindows.map((window, i) => (
            <button
                key={i}
                type="button"
                onClick={() => setSelectedSlot(window)}
                className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    selectedSlot === window
                    ? cn('border-transparent shadow-sm', brandFill)
                    : 'bg-card hover:border-secondary/40 hover:bg-secondary/5'
                )}
            >
                {window}
            </button>
        ))}
        </div>
    )
  }

  return (
    <div className="space-y-6">
        {doctorHospitals.length > 1 && (
            <div>
                <StepLabel icon={HospitalIcon}>Select hospital</StepLabel>
                <Carousel opts={{align: 'start', dragFree: true}} className="w-full">
                  <CarouselContent className="-ml-2">
                    {doctorHospitals.map((hospital) => (
                      <CarouselItem key={hospital.id} className="basis-auto pl-2">
                        <FilterChip
                          active={selectedHospitalId === hospital.id}
                          onClick={() => setSelectedHospitalId(hospital.id)}
                        >
                          {hospital.name}
                        </FilterChip>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
            </div>
        )}

        <div>
            <StepLabel icon={CalendarDays}>Select date</StepLabel>
            <Carousel opts={{align: 'start'}} className="w-full sm:px-8">
              <CarouselContent className="-ml-2">
                {dates.map((date, index) => {
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  return (
                    <CarouselItem key={index} className="basis-[22%] pl-2 sm:basis-[18%] md:basis-[15%]">
                      <button
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                          'flex h-20 w-full flex-col items-center justify-center rounded-xl border transition-colors',
                          isSelected
                              ? cn('border-transparent shadow-sm', brandFill)
                              : 'bg-card hover:border-secondary/40 hover:bg-secondary/5'
                          )}
                      >
                          <span className={cn('text-xs font-medium', !isSelected && 'text-muted-foreground')}>{format(date, 'EEE')}</span>
                          <span className="text-xl font-bold">{format(date, 'd')}</span>
                          <span className={cn('text-[11px]', !isSelected && 'text-muted-foreground')}>{format(date, 'MMM')}</span>
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious variant="brandOutline" className="-left-1 hidden h-8 w-8 sm:flex" />
              <CarouselNext variant="brandOutline" className="-right-1 hidden h-8 w-8 sm:flex" />
            </Carousel>
        </div>

        <div>
            <StepLabel icon={Clock}>Available times for {format(selectedDate, 'MMMM d')}</StepLabel>
            {renderTimeSelection()}
        </div>

      <Button
        className={cn(ctaClass, 'w-full text-base')}
        onClick={handleBookNow}
        disabled={!selectedHospitalId || !selectedDate || !selectedSlot}
        variant="brand"
      >
        Book Appointment
      </Button>
    </div>
  );
}
