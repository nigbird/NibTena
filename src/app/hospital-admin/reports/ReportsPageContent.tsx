
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LineChart, Filter, FileDown, Users, BriefcaseMedical } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const doctorsToShow = useMemo(() => {
    if (!reportData) return [];
    return selectedDoctorId === 'all'
      ? reportData.doctors
      : reportData.doctors.filter(d => d.id === Number(selectedDoctorId));
  }, [reportData, selectedDoctorId]);

  const doctorReportData = useMemo(() => {
    if (!reportData) return [];
    return doctorsToShow.map(doctor => {
      const doctorAppointments = reportData.appointments.filter(a => a.doctorId === doctor.id);
      const patientCount = new Set(doctorAppointments.map(a => a.patientId)).size;
      const revenue = doctorAppointments
        .filter(a => a.status !== 'pending-payment')
        .reduce((sum, a) => sum + (doctor.consultationFee || 0), 0);

      return {
        ...doctor,
        patientCount,
        revenue,
      };
    });
  }, [reportData, doctorsToShow]);

  const patientReportData = useMemo(() => {
    if (!reportData) return [];
    return reportData.appointments;
  }, [reportData]);
  
  const totalDoctorRevenue = useMemo(() => {
    return doctorReportData.reduce((sum, doc) => sum + doc.revenue, 0);
  }, [doctorReportData]);

  const totalPatientRevenue = useMemo(() => {
    if (!reportData) return 0;
    return reportData.appointments.reduce((sum, appt) => {
      if (appt.doctor && appt.status !== 'pending-payment') {
        return sum + (appt.doctor.consultationFee || 0);
      }
      return sum;
    }, 0);
  }, [reportData]);


  const handleDownloadExcel = async () => {
    if (!reportData) return;

    const workbook = new ExcelJS.Workbook();
    
    // Doctor Report Sheet
    const wsDoctors = workbook.addWorksheet('Doctor Report');
    const doctorExcelData = doctorReportData.map((doc, index) => ({
      'S.No': index + 1,
      'Doctor Name': doc.name,
      'Specialty': doc.specialty,
      'Total Patients': doc.patientCount,
      'Total Revenue (ETB)': doc.revenue,
    }));
    const doctorKeys = Object.keys(doctorExcelData[0] || {});
    wsDoctors.columns = doctorKeys.map(key => ({ header: key, key, width: Math.max(15, key.length + 2) }));
    doctorExcelData.forEach(r => wsDoctors.addRow(r as Record<string, any>));

    // Patient Report Sheet
    const wsPatients = workbook.addWorksheet('Patient Report');
    const patientExcelData = patientReportData.map((appt, index) => ({
      'S.No': index + 1,
      'Patient Name': appt.patient.name,
      'Appointment Date': format(new Date(appt.appointmentDate), 'yyyy-MM-dd'),
      'Doctor Name': appt.doctor?.name || 'N/A',
      'Status': appt.status,
      'Fee (ETB)': appt.doctor?.consultationFee || 0,
    }));
    const patientKeys = Object.keys(patientExcelData[0] || {});
    wsPatients.columns = patientKeys.map(key => ({ header: key, key, width: Math.max(15, key.length + 2) }));
    patientExcelData.forEach(r => wsPatients.addRow(r as Record<string, any>));

    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `hospital_reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
            <Button variant="outline" onClick={handleDownloadExcel} disabled={isLoading || !reportData}>
                <FileDown className="mr-2" /> Excel
            </Button>
        </CardFooter>
      </Card>
      
      <Tabs defaultValue="doctor-report">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="doctor-report"><Users className="mr-2 h-4 w-4"/>Doctor Report</TabsTrigger>
            <TabsTrigger value="patient-report"><BriefcaseMedical className="mr-2 h-4 w-4"/>Patient Report</TabsTrigger>
        </TabsList>
        <TabsContent value="doctor-report">
            <Card>
                <CardHeader>
                    <CardTitle>Doctor Performance Report</CardTitle>
                    <CardDescription>Summary of patient count and revenue per doctor.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-[300px]" /> : doctorReportData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Specialty</TableHead>
                          <TableHead>Patient Count</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctorReportData.map(doc => (
                          <TableRow key={doc.id}>
                            <TableCell>{doc.name}</TableCell>
                            <TableCell>{doc.specialty}</TableCell>
                            <TableCell>{doc.patientCount}</TableCell>
                            <TableCell className="text-right">{doc.revenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <UiTableFooter>
                          <TableRow>
                              <TableCell colSpan={3} className="font-bold text-right">Total Revenue</TableCell>
                              <TableCell className="text-right font-bold">
                                  {totalDoctorRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                              </TableCell>
                          </TableRow>
                      </UiTableFooter>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No doctor data for selected filters.</div>
                  )}
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="patient-report">
            <Card>
                <CardHeader>
                    <CardTitle>Patient Appointment Report</CardTitle>
                    <CardDescription>Detailed list of all patient appointments in the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-[300px]" /> : patientReportData.length > 0 ? (
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
                        {patientReportData.map(appt => (
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
                                  {totalPatientRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                              </TableCell>
                          </TableRow>
                      </UiTableFooter>
                    </Table>
                   ) : (
                    <div className="text-center py-12 text-muted-foreground">No patient appointment data for selected filters.</div>
                  )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
