
'use client';

import { useEffect, useState } from 'react';
import { getHospitals, getDoctors, getAppointmentsByHospitalId } from '@/lib/data';
import type { Appointment, Doctor, Hospital } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Hospital as HospitalIcon, Users, BriefcaseMedical, LineChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SuperAdminDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const hospitalsData = await getHospitals();
      setHospitals(hospitalsData);

      const doctorsData = await getDoctors();
      setDoctors(doctorsData);
      
      const allAppointments = await Promise.all(
          hospitalsData.map(async (hospital) => getAppointmentsByHospitalId(hospital.id))
      );
      const flattenedAppointments = allAppointments.flat();
      setAppointments(flattenedAppointments);

      const uniquePatients = new Set(flattenedAppointments.map(a => a.patientName));
      setTotalUsers(uniquePatients.size + doctorsData.length + hospitalsData.length);
    }
    fetchData();
  }, []);

  const chartData = hospitals.map(hospital => ({
    name: hospital.name.split(' ')[0],
    doctors: doctors.filter(d => d.hospitalId === hospital.id).length,
    appointments: appointments.filter(a => doctors.some(d => d.id === a.doctorId && d.hospitalId === hospital.id)).length
  }));

  return (
    <>
       <div className="mb-4">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Global overview of the Mediverse platform.
        </p>
      </div>

       {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <HospitalIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hospitals.length}</div>
            <p className="text-xs text-muted-foreground">hospitals on the platform</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors.length}</div>
            <p className="text-xs text-muted-foreground">doctors registered</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <BriefcaseMedical className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
             <p className="text-xs text-muted-foreground">booked system-wide</p>
          </CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
             <p className="text-xs text-muted-foreground">patients, doctors, & admins</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Section */}
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Hospital Activity
            </CardTitle>
            <CardDescription>A summary of doctors and appointments per hospital.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))'
                      }}
                     />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="doctors" fill="hsl(var(--secondary))" name="Doctors" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Appointments" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
