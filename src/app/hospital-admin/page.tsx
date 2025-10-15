import { auth } from '../../../auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Calendar, BriefcaseMedical } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { HospitalAdminDashboardClient } from '@/components/hospital-admin/HospitalAdminDashboardClient';
import { redirect } from 'next/navigation';


export default async function HospitalAdminDashboard() {
  const session = await auth();
  if (!session?.user?.hospitalId) {
    redirect('/hospital-admin/login');
  }
  
  const hospitalId = session.user.hospitalId;

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
  });

  if (!hospital) {
    return <div>Hospital not found</div>;
  }

  const doctors = await prisma.doctor.findMany({
    where: {
      hospitals: {
        some: { hospitalId }
      }
    }
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      hospitalId: hospitalId,
    }
  });

  const today = new Date();
  const todaysAppointments = appointments.filter(
    (appointment) => format(new Date(appointment.appointmentDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  );

  const chartData = doctors.map(doctor => ({
    name: doctor.name.replace('Dr. ', ''),
    appointments: appointments.filter(a => a.doctorId === doctor.id).length
  }));

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
          Dashboard
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          An overview of {hospital?.name}.
        </p>
      </div>

       {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Link href="/hospital-admin/doctors">
          <Card className="shadow-md hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{doctors.length}</div>
              <p className="text-xs text-muted-foreground">doctors currently active</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hospital-admin/appointments">
          <Card className="shadow-md hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <BriefcaseMedical className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">upcoming and past</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hospital-admin/queue">
          <Card className="shadow-md hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysAppointments.length}</div>
             <p className="text-xs text-muted-foreground">scheduled for today</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <HospitalAdminDashboardClient
        chartData={chartData}
        appointmentStatusData={appointmentStatusData}
      />
    </>
  );
}
