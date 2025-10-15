
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Hospital as HospitalIcon, Users, BriefcaseMedical } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SuperAdminDashboardClient from './SuperAdminDashboardClient';

export default async function SuperAdminDashboard() {
  const [hospitals, doctors, appointments, patients] = await Promise.all([
    prisma.hospital.findMany({
      include: {
        _count: {
          select: { doctors: true },
        },
      },
    }),
    prisma.doctor.count(),
    prisma.appointment.findMany(),
    prisma.patient.count(),
  ]);
  
  const totalUsers = patients + doctors + hospitals.length;

  const chartData = hospitals.map(hospital => {
    const hospitalAppointments = appointments.filter(a => a.hospitalId === hospital.id);
    return {
      name: hospital.name.split(' ')[0],
      doctors: hospital._count.doctors,
      appointments: hospitalAppointments.length,
    };
  });

  const statusCounts = {
    'Confirmed': appointments.filter(a => a.status === 'confirmed' || a.status === 'rescheduled').length,
    'Completed': appointments.filter(a => a.status === 'completed').length,
    'Cancelled': appointments.filter(a => a.status === 'cancelled').length,
  };
  
  const appointmentStatusData = [
      { name: 'Confirmed', value: statusCounts['Confirmed'] },
      { name: 'Completed', value: statusCounts['Completed'] },
      { name: 'Cancelled', value: statusCounts['Cancelled'] },
  ];

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
            <div className="text-2xl font-bold">{doctors}</div>
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
      
      <SuperAdminDashboardClient chartData={chartData} appointmentStatusData={appointmentStatusData} />
    </>
  );
}

    