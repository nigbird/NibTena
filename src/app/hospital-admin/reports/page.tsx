'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart as BarChartIcon, Users, BriefcaseMedical, XCircle, DollarSign, RefreshCw, Filter } from "lucide-react";
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from './actions';
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

// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#FF8042', '#00C49F'];

export default function ReportsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -29)),
    to: startOfDay(new Date()),
  });
  const [doctorFilter, setDoctorFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appointmentsData, doctorsData] = await Promise.all([
        getAppointmentsByHospitalId(MOCK_HOSPITAL_ID),
        getDoctorsByHospitalId(MOCK_HOSPITAL_ID)
      ]);
      setAppointments(appointmentsData);
      setDoctors(doctorsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const apptDate = startOfDay(parseISO(appt.appointmentDate));
      const isDateInRange = dateRange?.from && dateRange?.to && !isBefore(apptDate, dateRange.from) && !isAfter(apptDate, dateRange.to);
      const isDoctorMatch = doctorFilter === 'all' || appt.doctorId === Number(doctorFilter);
      return isDateInRange && isDoctorMatch;
    });
  }, [appointments, dateRange, doctorFilter]);
  
  const { totalAppointments, completedAppointments, cancelledAppointments, totalRevenue } = useMemo(() => {
    if (!filteredAppointments || !doctors) {
      return { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, totalRevenue: 0 };
    }
    const completed = filteredAppointments.filter(a => a.status === 'completed');
    const revenue = completed.reduce((sum, appt) => {
        const doctor = doctors.find(d => d.id === appt.doctorId);
        return sum + (doctor?.consultationFee || 0);
    }, 0);

    return {
        totalAppointments: filteredAppointments.length,
        completedAppointments: completed.length,
        cancelledAppointments: filteredAppointments.filter(a => a.status === 'cancelled').length,
        totalRevenue: revenue,
    };
  }, [filteredAppointments, doctors]);


  const appointmentsTrendData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    
    const trendData: { [key: string]: number } = {};
    let currentDate = new Date(dateRange.from);

    while (currentDate <= dateRange.to) {
        trendData[format(currentDate, 'yyyy-MM-dd')] = 0;
        currentDate = addDays(currentDate, 1);
    }

    filteredAppointments.forEach(appt => {
        const dateStr = format(parseISO(appt.appointmentDate), 'yyyy-MM-dd');
        if (trendData[dateStr] !== undefined) {
            trendData[dateStr]++;
        }
    });

    return Object.entries(trendData).map(([date, count]) => ({ date: format(parseISO(date), 'MMM d'), count }));
  }, [filteredAppointments, dateRange]);


  const doctorUtilizationData = useMemo(() => {
    const utilization = doctors.map(doctor => ({
      name: doctor.name.replace('Dr. ', ''),
      appointments: filteredAppointments.filter(a => a.doctorId === doctor.id).length
    }));
    return utilization.filter(u => u.appointments > 0).sort((a,b) => b.appointments - a.appointments);
  }, [filteredAppointments, doctors]);

  const revenueBreakdownData = useMemo(() => {
    const revenueByDoctor: { [key: string]: { name: string; value: number } } = {};
    doctors.forEach(doc => {
      revenueByDoctor[doc.id] = { name: doc.name, value: 0 };
    });

    filteredAppointments.forEach(appt => {
      if (appt.status === 'completed') {
        const doctor = doctors.find(d => d.id === appt.doctorId);
        if (doctor && revenueByDoctor[doctor.id]) {
          revenueByDoctor[doctor.id].value += doctor.consultationFee;
        }
      }
    });
    return Object.values(revenueByDoctor).filter(r => r.value > 0);
  }, [filteredAppointments, doctors]);

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
           <Skeleton className="h-[300px]" />
        </div>
      );
    }

    if (appointments.length === 0) {
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
              <div className="text-2xl font-bold">{totalAppointments}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-green-50 dark:bg-green-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <BriefcaseMedical className="h-5 w-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAppointments}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-red-50 dark:bg-red-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cancelledAppointments}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-yellow-50 dark:bg-yellow-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-10">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Data For Filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">No appointments match the selected filters. Try adjusting the date range or doctor.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Charts Section */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><LineChart className="h-5 w-5" /> Appointments Trend</CardTitle>
                <CardDescription>Number of appointments over the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={appointmentsTrendData}>
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
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> Doctor Utilization</CardTitle>
                  <CardDescription>Appointments handled by each doctor.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={doctorUtilizationData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" fontSize={12} width={80} interval={0} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                      <Bar dataKey="appointments" name="Total Appointments" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2"><DollarSign className="h-5 w-5" /> Revenue Breakdown</CardTitle>
                  <CardDescription>Share of total revenue per doctor.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie data={revenueBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                              {`${(percent * 100).toFixed(0)}%`}
                              </text>
                          );
                      }}>
                          {revenueBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} formatter={(value: number) => `$${value.toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: '14px' }} />
                    </RechartsPieChart>
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
           <div className="w-full md:w-auto md:min-w-[200px]">
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by doctor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.id.toString()}>{doc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
