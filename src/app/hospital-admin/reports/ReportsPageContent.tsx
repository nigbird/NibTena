
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LineChart, Filter, FileDown } from "lucide-react";
import { getReportData } from './actions';
import type { Appointment, Doctor, Patient } from '@/lib/definitions';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as UiTableFooter } from '@/components/ui/table';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ReportsPageContent({ hospitalId }: { hospitalId: number }) {
  const [reportData, setReportData] = useState<{
    appointments: (Appointment & { patient: Patient, doctor: Doctor | null })[],
    doctors: Doctor[],
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, dateRange, selectedDoctorId, patientName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const totalRevenue = useMemo(() => {
    if (!reportData) return 0;
    return reportData.appointments.reduce((sum, appt) => {
      // Ensure doctor exists and status is not pending before adding to revenue
      if (appt.doctor && appt.status !== 'pending-payment') {
        return sum + (appt.doctor.consultationFee || 0);
      }
      return sum;
    }, 0);
  }, [reportData]);

  const handleDownloadExcel = async () => {
    if (!reportData) return;

    // 1. Doctors Report Data
    const doctorsReportData = reportData.doctors.map((doctor, index) => {
      const doctorAppointments = reportData.appointments.filter(a => a.doctorId === doctor.id);
      const patientCount = new Set(doctorAppointments.map(a => a.patientId)).size;
      const revenue = doctorAppointments
        .filter(a => a.status !== 'pending-payment')
        .reduce((sum, a) => sum + (doctor.consultationFee || 0), 0);
      
      return {
        'S.No': index + 1,
        'Doctor Name': doctor.name,
        'Doctor Speciality': doctor.specialty,
        'Registration Date': format(new Date(), 'yyyy-MM-dd'),
        'number of patient': patientCount,
        'Patient appointment fee': revenue,
      };
    });

    // 2. Patient Report Data
    const patientReportData = reportData.appointments.map((appt, index) => {
      return {
        'S.No': index + 1,
        'patient Name': appt.patient.name,
        'Appointment registration Date': format(new Date(appt.createdAt), 'yyyy-MM-dd'),
        'patient status': appt.status,
        'patient appointment fee': appt.doctor?.consultationFee || 0,
      };
    });

    // 3. Create workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();

    const wsDoctors = workbook.addWorksheet('Doctors Report');
    const doctorKeys = Object.keys(doctorsReportData[0] || {});
    wsDoctors.columns = doctorKeys.map(key => ({ header: key, key, width: Math.max(15, ...doctorsReportData.map(r => String(r[key as keyof typeof r] || '').length)) }));
    doctorsReportData.forEach(r => wsDoctors.addRow(r as Record<string, any>));

    const wsPatients = workbook.addWorksheet('Patient Report');
    const patientKeys = Object.keys(patientReportData[0] || {});
    wsPatients.columns = patientKeys.map(key => ({ header: key, key, width: Math.max(15, ...patientReportData.map(r => String(r[key as keyof typeof r] || '').length)) }));
    patientReportData.forEach(r => wsPatients.addRow(r as Record<string, any>));

    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `hospital_reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };


  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className="h-[300px]" />;
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
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Fee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.appointments.map(appt => (
            <TableRow key={appt.id}>
              <TableCell>{appt.patient.name}</TableCell>
              <TableCell>{appt.doctor?.name}</TableCell>
              <TableCell>{format(new Date(appt.appointmentDate), 'PPP')}</TableCell>
              <TableCell>{appt.status}</TableCell>
              <TableCell className="text-right">{appt.doctor?.consultationFee || 0} ETB</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <UiTableFooter>
            <TableRow>
                <TableCell colSpan={4} className="font-bold text-right">Total Revenue</TableCell>
                <TableCell className="text-right font-bold">
                    {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                </TableCell>
            </TableRow>
        </UiTableFooter>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports & Analytics</h1>
        <p className="text-lg text-muted-foreground">View insights into your hospital's performance.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Filter className="h-5 w-5" /> Filter Report</CardTitle>
            <CardDescription>Select a date range, doctor, or patient to refine the report.</CardDescription>
        </CardHeader>
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
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownloadExcel} disabled={isLoading || !reportData || reportData.appointments.length === 0}>
                <FileDown className="mr-2" /> Excel
            </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Filtered Appointment Data</CardTitle>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>

    </div>
  );
}
