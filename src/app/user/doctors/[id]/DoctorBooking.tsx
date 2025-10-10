
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Doctor, Hospital } from '@/lib/definitions';
import { addDays, format } from 'date-fns';
import { Hospital as HospitalIcon } from 'lucide-react';

const availableSlots = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
];

type DoctorBookingProps = {
  doctor: Doctor;
  doctorHospitals: Hospital[];
  initialHospitalId: number | null;
};

export default function DoctorBooking({
  doctor,
  doctorHospitals,
  initialHospitalId,
}: DoctorBookingProps) {
  const router = useRouter();
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | undefined>(
    initialHospitalId?.toString()
  );
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleBookNow = () => {
    if (selectedHospitalId && date && selectedSlot) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        hospitalId: selectedHospitalId,
        date: formattedDate,
        slot: selectedSlot,
      });
      router.push(`/user/book/${doctor.id}?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-6">
      {doctorHospitals.length > 1 && (
         <div className="space-y-2">
            <Label className="font-semibold text-lg flex items-center gap-2">
                <HospitalIcon className="h-5 w-5" />
                Select Hospital
            </Label>
            <Select
              value={selectedHospitalId}
              onValueChange={setSelectedHospitalId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a hospital" />
              </SelectTrigger>
              <SelectContent>
                {doctorHospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={String(hospital.id)}>
                    {hospital.name} - {hospital.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-semibold text-lg">Select Date</Label>
          <Card>
            <CardContent className="p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < addDays(new Date(), -1)}
                  className="rounded-md"
                />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-lg">Select Time</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableSlots.map((slot) => (
              <Button
                key={slot}
                variant="outline"
                className={cn(
                  'w-full',
                  selectedSlot === slot && 'bg-accent text-accent-foreground'
                )}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <Button
        size="lg"
        className="w-full font-bold text-lg"
        onClick={handleBookNow}
        disabled={!selectedHospitalId || !date || !selectedSlot}
        variant="accent"
      >
        Book Now
      </Button>
    </div>
  );
}
