
'use client';

import { useEffect, useState } from 'react';
import prisma from '@/lib/prisma';
import type { Appointment, Doctor, Hospital } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Hospital as HospitalIcon, Users, BriefcaseMedical, LineChart, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';

async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await prisma.hospital.findMany();
  return hospitals.map(h => ({ ...h, status: h.status as 'active' | 'inactive'}));
}

async function getDoctors(): Promise<(Doctor & { hospitalIds: number[] })[]> {
    const doctors = await prisma.doctor.findMany({ 
        include: { hospitals: { include: { hospital: true } } }
    });
    return doctors.map(d => ({
        ...d,
        status: d.status as any,
        hospitalIds: d.hospitals.map(h => h.hospitalId),
    }));
}

async function getAppointmentsByHospitalId(hospitalId: number): Promise<Appointment[]> {
    const appointments = await prisma.appointment.findMany({ where: { hospitalId } });
    return appointments.map(a => ({
        ...a,
        appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
        status: a.status as any,
        patientGender: a.patientGender as any,
    }));
}


const COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--destructive))'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function SuperAdminDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [appointmentStatusData, setAppointmentStatusData] = useState<{name: string, value: number}[]>([]);

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

      const statusCounts = {
        'Confirmed': flattenedAppointments.filter(a => a.status === 'confirmed' || a.status === 'rescheduled').length,
        'Completed': flattenedAppointments.filter(a => a.status === 'completed').length,
        'Cancelled': flattenedAppointments.filter(a => a.status === 'cancelled').length,
      };
      
      setAppointmentStatusData([
          { name: 'Confirmed', value: statusCounts['Confirmed'] },
          { name: 'Completed', value: statusCounts['Completed'] },
          { name: 'Cancelled', value: statusCounts['Cancelled'] },
      ]);

    }
    fetchData();
  }, []);

  const chartData = hospitals.map(hospital => ({
    name: hospital.name.split(' ')[0],
    doctors: doctors.filter(d => d.hospitalIds.includes(hospital.id)).length,
    appointments: appointments.filter(a => doctors.some(d => d.id === a.doctorId && d.hospitalIds.includes(hospital.id))).length
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
        <Link href="/super-admin/hospitals">
          <Card className="shadow-md hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
              <HospitalIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hospitals.length}</div>
              <p className="text-xs text-muted-foreground">hospitals on the platform</p>
            </CardContent>
          </Card>
        </Link>
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
      <div className="grid gap-4 md:grid-cols-2">
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
        <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Overall Appointment Status
              </CardTitle>
              <CardDescription>A platform-wide breakdown of all appointment statuses. "Confirmed" includes rescheduled bookings.</CardDescription>
          </CardHeader>
          <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={appointmentStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                        >
                            {appointmentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                          <Tooltip
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                            }}
                            />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                    </PieChart>
                </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
