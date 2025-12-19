
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LineChart, BarChart as BarChartIcon, Users, BriefcaseMedical, XCircle, DollarSign, RefreshCw, Filter, FileDown, PieChart as PieChartIcon } from "lucide-react";
import { getReportData } from './actions';
import type { Appointment, Doctor, Patient } from '@/lib/definitions';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#FF8042', '#00C49F'];

export default function ReportsPageContent({ hospitalId }: { hospitalId: number }) {
  const [reportData, setReportData] = useState<{
    appointments: (Appointment & { patient: Patient, doctor: Doctor | null })[],
    doctors: Doctor[],
    stats: any,
    doctorRevenueBreakdown: any[]
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -29)),
    to: startOfDay(new Date()),
  });
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [patientName, setPatientName] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const doctorId = selectedDoctorId === 'all' ? undefined : Number(selectedDoctorId);
      const data = await getReportData(hospitalId, dateRange, doctorId, patientName);
      setReportData(data);
      setDoctors(data.doctors || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, dateRange, selectedDoctorId, patientName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredData = useMemo(() => {
    if (!reportData) return null;
    
    // Server-side filtering is now primary, this memo is for client-side display transformation
    const filteredAppointments = reportData.appointments;

    const totalRevenue = filteredAppointments
        .filter((a) => a.status !== 'pending-payment')
        .reduce((sum, a) => {
            return sum + (a.doctor?.consultationFee || 0);
        }, 0);

    const appointmentsTrendData = (() => {
        if (!dateRange?.from || !dateRange?.to) return [];
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
            .filter((a) => a.status !== 'pending-payment')
            .forEach((appt) => {
                if (appt.doctor && revenueByDoctor[appt.doctorId]) {
                    revenueByDoctor[appt.doctorId].revenue += appt.doctor?.consultationFee || 0;
                    revenueByDoctor[appt.doctorId].appointments++;
                }
            });
        return Object.values(revenueByDoctor).filter(r => r.revenue > 0).sort((a,b) => b.revenue - a.revenue);
    })();
    
    const appointmentStatusData = [
      { name: 'Upcoming', value: filteredAppointments.filter((a) => a.status === 'confirmed' || a.status === 'rescheduled').length },
      { name: 'Completed', value: filteredAppointments.filter((a) => a.status === 'completed').length },
      { name: 'Cancelled', value: filteredAppointments.filter((a) => a.status === 'cancelled').length },
    ].filter(item => item.value > 0);
    
    return {
        totalAppointments: filteredAppointments.length,
        cancelledAppointments: filteredAppointments.filter((a) => a.status === 'cancelled').length,
        rescheduledAppointments: filteredAppointments.filter((a) => a.status === 'rescheduled').length,
        totalRevenue: totalRevenue,
        appointmentsTrendData,
        doctorRevenueData,
        appointmentStatusData,
        hasData: filteredAppointments.length > 0,
        filteredAppointments,
    };

  }, [reportData, dateRange]);

   const handleDownloadExcel = () => {
    if (!reportData || !filteredData) return;

    // 1. Doctors Report Data
    const doctorsReportData = reportData.doctors.map((doctor, index) => {
      const doctorAppointments = filteredData.filteredAppointments.filter(a => a.doctorId === doctor.id);
      const patientCount = new Set(doctorAppointments.map(a => a.patientId)).size;
      const revenue = doctorAppointments
        .filter(a => a.status !== 'pending-payment')
        .reduce((sum, a) => sum + (doctor.consultationFee || 0), 0);
      
      return {
        'S.No': index + 1,
        'Doctor Name': doctor.name,
        'Doctor Speciality': doctor.specialty,
        'Registration Date': format(new Date(), 'yyyy-MM-dd'), // Placeholder, doctor model has no registration date
        'number of patient': patientCount,
        'Patient appointment fee': revenue,
      };
    });

    // 2. Patient Report Data
    const patientReportData = filteredData.filteredAppointments.map((appt, index) => {
      return {
        'S.No': index + 1,
        'patient Name': appt.patient.name,
        'Appointment registration Date': format(new Date(appt.createdAt), 'yyyy-MM-dd'),
        'patient status': appt.status,
        'patient appointment fee': appt.doctor?.consultationFee || 0,
      };
    });

    // 3. Create Workbook and Worksheets
    const wb = XLSX.utils.book_new();
    const wsDoctors = XLSX.utils.json_to_sheet(doctorsReportData);
    const wsPatients = XLSX.utils.json_to_sheet(patientReportData);

    XLSX.utils.book_append_sheet(wb, wsDoctors, "Doctors Report");
    XLSX.utils.book_append_sheet(wb, wsPatients, "Patient Report");

    // 4. Save file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `hospital_reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };


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
            <p className="mt-2 text-sm text-muted-foreground">There is no appointment data matching your filters.</p>
        </div>
      );
    }
    
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
              <p className="text-xs text-muted-foreground">from paid appointments</p>
            </CardContent>
          </Card>
        </div>

        {!filteredData?.hasData ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-10">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Data For Filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">No appointments match the selected filters.</p>
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
                    <CardDescription>Revenue generated by each doctor from paid appointments.</CardDescription>
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
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Appointment Status
                    </CardTitle>
                    <CardDescription>A breakdown of all appointment statuses. "Upcoming" includes rescheduled bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                       <RechartsPieChart>
                            <Pie
                                data={filteredData.appointmentStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {filteredData.appointmentStatusData.map((entry, index) => (
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
                        </RechartsPieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
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
          <div className="flex-1 w-full md:w-auto">
             <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
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
           <div className="flex-1 w-full md:w-auto">
              <Input 
                placeholder="Filter by patient name..."
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2 text-sm text-muted-foreground w-full md:w-auto justify-end">
             {lastUpdated && <span>Updated: {format(lastUpdated, 'p')}</span>}
             <button onClick={fetchData} className="p-1 hover:bg-muted rounded-full" disabled={isLoading}>
                 <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
             </button>
           </div>
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownloadExcel} disabled={isLoading || !filteredData || filteredData.filteredAppointments.length === 0}>
                <FileDown className="mr-2" /> Excel
            </Button>
        </CardFooter>
      </Card>
      
      {renderContent()}

    </div>
  );
}
