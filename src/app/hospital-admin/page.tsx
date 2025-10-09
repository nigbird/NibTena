
'use client';

import { useEffect, useState }from 'react';
import { getAppointmentsByDoctorId, getDoctorsByHospitalId, getHospitalById } from '@/lib/data';
import type { Appointment, Doctor, Hospital } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Calendar, BriefcaseMedical, LineChart, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';


// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

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


export default function HospitalAdminDashboard() {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<{name: string, value: number}[]>([]);


  useEffect(() => {
    async function fetchData() {
      const hospitalData = await getHospitalById(MOCK_HOSPITAL_ID);
      setHospital(hospitalData || null);

      if (hospitalData) {
        const doctorsData = await getDoctorsByHospitalId(hospitalData.id);
        setDoctors(doctorsData);

        const allAppointments = await Promise.all(
          doctorsData.map(doctor => getAppointmentsByDoctorId(doctor.id))
        );
        const flatAppointments = allAppointments.flat();
        setAppointments(flatAppointments);

        const statusCounts = {
          'Confirmed': flatAppointments.filter(a => a.status === 'confirmed' || a.status === 'rescheduled').length,
          'Completed': flatAppointments.filter(a => a.status === 'completed').length,
          'Cancelled': flatAppointments.filter(a => a.status === 'cancelled').length,
        };
        
        setAppointmentStatusData([
          { name: 'Confirmed', value: statusCounts['Confirmed'] },
          { name: 'Completed', value: statusCounts['Completed'] },
          { name: 'Cancelled', value: statusCounts['Cancelled'] },
        ]);
      }
    }
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString();
  const todaysAppointments = appointments.filter(
    (appointment) => new Date(appointment.appointmentDate).toLocaleDateString() === today
  );

  const chartData = doctors.map(doctor => ({
    name: doctor.name.replace('Dr. ', ''),
    appointments: appointments.filter(a => a.doctorId === doctor.id).length
  }));

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
      
      {/* Chart Section */}
       <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <LineChart className="h-5 w-5" />
                        Appointments per Doctor
                    </CardTitle>
                    <CardDescription>A summary of total appointments for each doctor.</CardDescription>
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
                            <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Total Appointments" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Appointment Status
                    </CardTitle>
                    <CardDescription>A breakdown of all appointment statuses. "Confirmed" includes rescheduled appointments.</CardDescription>
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
