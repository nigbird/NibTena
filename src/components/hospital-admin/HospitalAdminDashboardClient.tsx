
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, PieChart as PieChartIcon, DollarSign, XCircle, RefreshCw, BriefcaseMedical } from 'lucide-react';
import type { Appointment, Doctor, Patient } from '@/lib/definitions';
import { useMemo, useState } from 'react';
import { addDays, format, parseISO, startOfDay } from 'date-fns';

const COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--destructive))'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface HospitalAdminDashboardClientProps {
    initialReportData: {
        appointments: (Appointment & { patient: Patient, doctor: Doctor | null })[],
        doctors: Doctor[],
    };
    chartData: { name: string; appointments: number }[];
    appointmentStatusData: { name: string; value: number }[];
}

export function HospitalAdminDashboardClient({ initialReportData, chartData, appointmentStatusData }: HospitalAdminDashboardClientProps) {
    
    const [reportData] = useState(initialReportData);

    const filteredData = useMemo(() => {
        if (!reportData) return null;
        
        const filteredAppointments = reportData.appointments;

        const totalRevenue = filteredAppointments
            .filter((a) => a.status !== 'pending-payment' && a.doctor)
            .reduce((sum, a) => {
                return sum + (a.doctor!.consultationFee || 0);
            }, 0);

        const appointmentsTrendData = (() => {
            const dateRange = {
                from: startOfDay(addDays(new Date(), -29)),
                to: startOfDay(new Date()),
            };
            const trendData: { [key: string]: number } = {};
            let currentDate = new Date(dateRange.from);
            while (currentDate <= dateRange.to) {
                trendData[format(currentDate, 'yyyy-MM-dd')] = 0;
                currentDate = addDays(currentDate, 1);
            }
            filteredAppointments.forEach((appt) => {
                const dateStr = format(new Date(appt.createdAt), 'yyyy-MM-dd');
                if (trendData[dateStr] !== undefined) trendData[dateStr]++;
            });
            return Object.entries(trendData).map(([date, count]) => ({ date: format(parseISO(date), 'MMM d'), count }));
        })();

        const doctorRevenueData = (() => {
            const revenueByDoctor: { [key: number]: { name: string, revenue: number, appointments: number } } = {};
             reportData.doctors.forEach((doc: Doctor) => {
              revenueByDoctor[doc.id] = { name: doc.name.replace('Dr. ', ''), revenue: 0, appointments: 0 };
            });
            filteredAppointments
                .filter((a) => a.status !== 'pending-payment' && a.doctor)
                .forEach((appt) => {
                    if (revenueByDoctor[appt.doctorId]) {
                        revenueByDoctor[appt.doctorId].revenue += appt.doctor!.consultationFee || 0;
                        revenueByDoctor[appt.doctorId].appointments++;
                    }
                });
            return Object.values(revenueByDoctor).filter(r => r.revenue > 0).sort((a,b) => b.revenue - a.revenue);
        })();
        
        return {
            totalAppointments: filteredAppointments.length,
            cancelledAppointments: filteredAppointments.filter((a) => a.status === 'cancelled').length,
            rescheduledAppointments: filteredAppointments.filter((a) => a.status === 'rescheduled').length,
            totalRevenue: totalRevenue,
            appointmentsTrendData,
            doctorRevenueData,
        };

  }, [reportData]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm bg-blue-50 dark:bg-blue-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                  <BriefcaseMedical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredData?.totalAppointments}</div>
                   <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-orange-50 dark:bg-orange-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rescheduled</CardTitle>
                  <RefreshCw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredData?.rescheduledAppointments}</div>
                   <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-red-50 dark:bg-red-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredData?.cancelledAppointments}</div>
                   <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-green-50 dark:bg-green-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-700 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredData?.totalRevenue.toLocaleString()} ETB</div>
                  <p className="text-xs text-muted-foreground">from paid appointments</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><LineChart className="h-5 w-5" /> Appointments Trend</CardTitle>
                        <CardDescription>Number of appointments created over the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                        <RechartsLineChart data={filteredData?.appointmentsTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                            <Legend wrapperStyle={{ fontSize: '14px' }} />
                            <Line type="monotone" dataKey="count" name="Appointments" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </RechartsLineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="shadow-lg">
                    <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><BarChart className="h-5 w-5" /> Doctor Revenue</CardTitle>
                    <CardDescription>Revenue generated by each doctor from paid appointments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={filteredData?.doctorRevenueData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" fontSize={12} width={80} interval={0} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} formatter={(value: number) => `${value.toLocaleString()} ETB`} />
                        <Bar dataKey="revenue" name="Total Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Appointment Status
                    </CardTitle>
                    <CardDescription>A breakdown of all appointment statuses. "Confirmed" includes rescheduled bookings.</CardDescription>
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
    );
}
