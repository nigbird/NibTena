
'use client';

import { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarClock } from 'lucide-react';
import { DoctorPortalContext } from '@/components/doctor-portal/doctor-portal-context';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorSchedulePage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { activeHospitalId } = useContext(DoctorPortalContext);

  // In a real app, this state would be fetched and updated via server actions
  const [schedule, setSchedule] = useState({
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '12:30',
    breakEnd: '13:30',
    bookingWindow: 14,
  });

  const handleDayToggle = (day: string, checked: boolean | 'indeterminate') => {
    setSchedule(prev => {
      const workingDays = checked
        ? [...prev.workingDays, day]
        : prev.workingDays.filter(d => d !== day);
      return { ...prev, workingDays };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchedule(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeHospitalId) {
        toast({
            variant: "destructive",
            title: "No Hospital Selected",
            description: "Please select a hospital to update the schedule.",
        });
        return;
    }
    setIsLoading(true);
    // Mock saving the schedule for the specific hospital
    console.log(`Saving schedule for hospital ${activeHospitalId}`, schedule);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Schedule Updated",
      description: "Your availability has been saved successfully for the selected hospital.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Schedule</h1>
        <p className="text-lg text-muted-foreground">Manage your weekly availability and booking settings.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Weekly Availability
            </CardTitle>
            <CardDescription>
              Set your standard working days and hours. This schedule is specific to the currently selected hospital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Available Days */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Available Days</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 rounded-lg border p-4">
                {weekDays.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={schedule.workingDays.includes(day)}
                      onCheckedChange={(checked) => handleDayToggle(day, checked)}
                    />
                    <Label htmlFor={`day-${day}`} className="font-normal cursor-pointer">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-3">
               <Label className="text-base font-semibold">Working Hours</Label>
               <div className="grid sm:grid-cols-2 gap-6 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input id="startTime" name="startTime" type="time" value={schedule.startTime} onChange={handleInputChange} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input id="endTime" name="endTime" type="time" value={schedule.endTime} onChange={handleInputChange} />
                  </div>
               </div>
            </div>
            
             {/* Break Hours */}
            <div className="space-y-3">
               <Label className="text-base font-semibold">Break Time</Label>
               <div className="grid sm:grid-cols-2 gap-6 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="breakStart">Break Start</Label>
                    <Input id="breakStart" name="breakStart" type="time" value={schedule.breakStart} onChange={handleInputChange} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="breakEnd">Break End</Label>
                    <Input id="breakEnd" name="breakEnd" type="time" value={schedule.breakEnd} onChange={handleInputChange} />
                  </div>
               </div>
            </div>

            {/* Booking Window */}
            <div className="space-y-2">
              <Label htmlFor="bookingWindow" className="text-base font-semibold">Booking Window (Days)</Label>
              <Input 
                id="bookingWindow"
                name="bookingWindow"
                type="number"
                value={schedule.bookingWindow}
                onChange={handleInputChange}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Set how many days in advance patients can book an appointment with you.
              </p>
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isLoading} variant="accent">
              {isLoading ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
