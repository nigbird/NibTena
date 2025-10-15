
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, CalendarCheck2 } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export default async function DoctorPortalPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'doctor') {
        redirect('/doctor-portal/login');
    }
    const doctorId = parseInt(session.user.id, 10);

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  const allAppointments = await prisma.appointment.findMany({
    where: { doctorId: doctorId },
    orderBy: {
      appointmentDate: 'asc',
    }
  });

  const upcomingAppointments = allAppointments.filter(a => a.status === 'confirmed' || a.status === 'rescheduled');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const todaysAppointments = upcomingAppointments.filter(a => {
    const appointmentDate = new Date(a.appointmentDate);
    return format(appointmentDate, 'yyyy-MM-dd') === todayStr;
  });

  const uniquePatients = new Set(allAppointments.map(a => a.patientName));

  const stats = {
    upcoming: upcomingAppointments.length,
    todays: todaysAppointments.length,
    totalPatients: uniquePatients.size
  };
  
  const todaysUpcomingAppointments = allAppointments
    .filter(a => {
        const appointmentDate = new Date(a.appointmentDate);
        return format(appointmentDate, 'yyyy-MM-dd') === todayStr && (a.status === 'confirmed' || a.status === 'rescheduled');
    })
    .sort((a,b) => a.appointmentSlot.localeCompare(b.appointmentSlot));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome, {doctor?.name}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Here's a summary of your day.
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/doctor-portal/appointments">
          <Card className="shadow-md hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todays}</div>
              <p className="text-xs text-muted-foreground">appointments scheduled for today</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/doctor-portal/appointments">
          <Card className="shadow-md hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Upcoming</CardTitle>
              <CalendarCheck2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">confirmed & rescheduled</p>
            </CardContent>
          </Card>
        </Link>
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">in your appointment history</p>
          </CardContent>
        </Card>
      </div>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Today's Schedule</CardTitle>
                <CardDescription>Your upcoming appointments for today.</CardDescription>
            </CardHeader>
            <CardContent>
                 {todaysUpcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                    {todaysUpcomingAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                             <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-background w-20">
                                    <span className="text-lg font-bold">{appointment.appointmentSlot.split(' ')[0]}</span>
                                    <span className="text-xs text-muted-foreground">{appointment.appointmentSlot.split(' ')[1]}</span>
                                </div>
                                <div>
                                    <p className="font-semibold">{appointment.patientName}</p>
                                    <p className="text-sm text-muted-foreground">Age: {appointment.patientAge}, {appointment.patientGender}</p>
                                </div>
                             </div>
                             <Badge variant={appointment.status === 'rescheduled' ? 'secondary' : 'default'}>{appointment.status}</Badge>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold font-headline">No appointments scheduled for today</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Your schedule is clear. Enjoy your day!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
