'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart as BarChartIcon, Users, BriefcaseMedical, XCircle, DollarSign, RefreshCw, Filter } from "lucide-react";
import { getReportData } from './actions';
import type { Appointment, Doctor } from '@/lib/definitions';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#FF8042', '#00C49F'];

export default function ReportsPageContent({ hospitalId }: { hospitalId: number }) {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -29)),
    to: startOfDay(new Date()),
  });
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReportData(hospitalId);
      setReportData(data);
      setDoctors(data.doctors || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredData = useMemo(() => {
    if (!reportData) return null;

    const filteredAppointments = reportData.appointments.filter((appt: Appointment) => {
        const apptDate = startOfDay(new Date(appt.appointmentDate));
        return dateRange?.from && dateRange?.to && !isBefore(apptDate, dateRange.from) && !isAfter(apptDate, dateRange.to);
    });

    const totalRevenue = filteredAppointments
        .filter((a: Appointment) => a.status === 'confirmed')
        .reduce((sum: number, a: Appointment) => {
            const doctor = reportData.doctors.find((d: Doctor) => d.id === a.doctorId);
            return sum + (doctor?.consultationFee || 0);
        }, 0);

    const appointmentsTrendData = (() => {
        if (!dateRange?.from || !dateRange?.to) return [];
        const trendData: { [key: string]: number } = {};
        let currentDate = new Date(dateRange.from);
        while (currentDate <= dateRange.to) {
            trendData[format(currentDate, 'yyyy-MM-dd')] = 0;
            currentDate = addDays(currentDate, 1);
        }
        filteredAppointments.forEach((appt: Appointment) => {
            const dateStr = format(new Date(appt.appointmentDate), 'yyyy-MM-dd');
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
            .filter((a: Appointment) => a.status === 'confirmed')
            .forEach((appt: Appointment) => {
                if (revenueByDoctor[appt.doctorId]) {
                    const doctor = reportData.doctors.find((d: Doctor) => d.id === appt.doctorId);
                    revenueByDoctor[appt.doctorId].revenue += doctor?.consultationFee || 0;
                    revenueByDoctor[appt.doctorId].appointments++;
                }
            });
        return Object.values(revenueByDoctor).filter(r => r.revenue > 0).sort((a,b) => b.revenue - a.revenue);
    })();
    
    const appointmentStatusData = [
      { name: 'Upcoming', value: filteredAppointments.filter((a: Appointment) => a.status === 'confirmed' || a.status === 'rescheduled').length },
      { name: 'Completed', value: filteredAppointments.filter((a: Appointment) => a.status === 'completed').length },
      { name: 'Cancelled', value: filteredAppointments.filter((a: Appointment) => a.status === 'cancelled').length },
    ].filter(item => item.value > 0);
    
    return {
        totalAppointments: filteredAppointments.length,
        cancelledAppointments: filteredAppointments.filter((a: Appointment) => a.status === 'cancelled').length,
        rescheduledAppointments: filteredAppointments.filter((a: Appointment) => a.status === 'rescheduled').length,
        totalRevenue: totalRevenue,
        appointmentsTrendData,
        doctorRevenueData,
        appointmentStatusData,
        hasData: filteredAppointments.length > 0
    };

  }, [reportData, dateRange]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      );
    }

    if (!reportData || reportData.appointments.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-10">
            <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">There is no appointment data to generate reports.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
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
              <p className="text-xs text-muted-foreground">from confirmed appointments</p>
            </CardContent>
          </Card>
        </div>

        {!filteredData?.hasData ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-10">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Data For Filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">No appointments match the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><LineChart className="h-5 w-5" /> Appointments Trend</CardTitle>
                        <CardDescription>Number of appointments created over the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                        <RechartsLineChart data={filteredData.appointmentsTrendData}>
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
                    <CardTitle className="font-headline flex items-center gap-2"><BarChartIcon className="h-5 w-5" /> Doctor Revenue</CardTitle>
                    <CardDescription>Revenue generated by each doctor from confirmed appointments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={filteredData.doctorRevenueData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports & Analytics</h1>
        <p className="text-lg text-muted-foreground">View insights into your hospital's performance.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:w-auto">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
           <div className="flex items-center gap-2 text-sm text-muted-foreground w-full md:w-auto justify-end">
             {lastUpdated && <span>Updated: {format(lastUpdated, 'p')}</span>}
             <button onClick={fetchData} className="p-1 hover:bg-muted rounded-full" disabled={isLoading}>
                 <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
             </button>
           </div>
        </CardContent>
      </Card>
      
      {renderContent()}

    </div>
  );
}
