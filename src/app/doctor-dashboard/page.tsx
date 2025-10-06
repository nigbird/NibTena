
'use client';

import { useEffect, useState } from 'react';
import { getAppointmentsByDoctorId, getDoctorById } from '@/lib/data';
import type { Appointment, Doctor } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mocking a logged-in doctor with ID 1
const MOCK_DOCTOR_ID = 1;

export default function DoctorDashboardPage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    async function fetchData() {
      const doctorData = await getDoctorById(MOCK_DOCTOR_ID);
      const appointmentsData = await getAppointmentsByDoctorId(MOCK_DOCTOR_ID);
      setDoctor(doctorData || null);
      setAppointments(appointmentsData);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome, {doctor?.name}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Here are your upcoming appointments.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/doctor-dashboard/profile">
            Edit Profile
          </Link>
        </Button>
      </div>

      {appointments.length > 0 ? (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="shadow-md overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 bg-muted/50">
                <div>
                    <CardTitle className="text-lg font-headline">{appointment.patientName}</CardTitle>
                    <CardDescription>Age: {appointment.patientAge}, Gender: {appointment.patientGender}</CardDescription>
                </div>
                <Badge variant={appointment.status === 'confirmed' ? 'accent' : 'destructive'}>
                    {appointment.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" /> 
                        <span>{appointment.appointmentDate}</span>
                        <span className="mx-2">|</span>
                        <Clock className="mr-2 h-4 w-4" /> 
                        <span>{appointment.appointmentSlot}</span>
                    </div>
                     <div className="space-y-2 pt-2">
                        <h4 className="font-semibold text-foreground">Patient's Stated Symptoms</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md border">{appointment.symptoms}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No appointments scheduled</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your schedule is clear. Enjoy your day!</p>
        </div>
      )}
    </div>
  );
}
