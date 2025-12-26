
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getHospitalReportData } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as UiTableFooter } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';
import { Loader2, FileDown, LineChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


type HospitalReportData = Awaited<ReturnType<typeof getHospitalReportData>>;

export default function SuperAdminReportsPage() {
    const [reportData, setReportData] = useState<HospitalReportData>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfDay(addDays(new Date(), -29)),
        to: startOfDay(new Date()),
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getHospitalReportData(dateRange);
            setReportData(data);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // The data is now pre-filtered by the server action based on dateRange for appointments.
    // The client-side filter is now only for the registration date.
    const filteredData = useMemo(() => {
        if (!reportData) return [];
        return reportData.filter(item => {
            const regDate = startOfDay(new Date(item.registrationDate));
             return dateRange?.from && dateRange?.to && !isBefore(regDate, dateRange.from) && !isAfter(regDate, dateRange.to);
        });
    }, [reportData, dateRange]);

    const totalRevenue = useMemo(() => {
        return filteredData.reduce((sum, item) => sum + item.revenue, 0);
    }, [filteredData]);
    
    // PDF export removed — use Excel export only

    const handleDownloadExcel = async () => {
        const worksheetData = filteredData.map((item, index) => ({
            'S.No': index + 1,
            'Branch': item.bankBranch,
            'District': item.bankDistrict,
            'Hospital Name': item.hospitalName,
            'Hospital Owner Name': item.ownerName,
            'Hospital Account': item.hospitalAccount,
            'Hospital Phone': item.hospitalPhone,
            'Hospital Address': item.hospitalAddress,
            'Registration Date': item.registrationDate,
            'Registered by': item.registeredBy,
            'Approved by': item.approvedBy,
            'Revenue': item.revenue,
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Hospitals');

        const keys = Object.keys(worksheetData[0] || {});
        worksheet.columns = keys.map((key) => ({ header: key, key, width: Math.max(20, ...worksheetData.map(row => String(row[key as keyof typeof row] || '').length)) }));

        worksheetData.forEach(row => {
            // ExcelJS will map properties by key names
            worksheet.addRow(row as Record<string, any>);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `hospital_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }

    const renderTable = () => {
        if (isLoading) {
            return <Skeleton className="h-[300px]" />;
        }
        
        if (filteredData.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold font-headline">No Data Available</h3>
                    <p className="mt-2 text-sm text-muted-foreground">There is no hospital data matching the selected date range.</p>
                </div>
            )
        }
        
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Approved by</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((item, index) => (
                        <TableRow key={item.hospitalId}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.bankBranch}</TableCell>
                            <TableCell>{item.bankDistrict}</TableCell>
                            <TableCell>
                                <div className="font-medium">{item.hospitalName}</div>
                                <div className="text-xs text-muted-foreground">{item.hospitalAddress}</div>
                            </TableCell>
                            <TableCell>{item.ownerName}</TableCell>
                            <TableCell>{item.hospitalAccount}</TableCell>
                            <TableCell>
                                <div>{item.registeredBy}</div>
                                <div className="text-xs text-muted-foreground">{item.registrationDate}</div>
                            </TableCell>
                            <TableCell>{item.approvedBy}</TableCell>
                            <TableCell className="text-right">{item.revenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 <UiTableFooter>
                    <TableRow>
                        <TableCell colSpan={8} className="font-bold text-right">Total Revenue</TableCell>
                        <TableCell className="text-right font-bold">
                            {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                        </TableCell>
                    </TableRow>
                </UiTableFooter>
            </Table>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Hospital Reports</h1>
                <p className="text-lg text-muted-foreground">Generate and download reports on hospital activity.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Hospital Data</CardTitle>
                    <CardDescription>View and export hospital registration and revenue data.</CardDescription>
                     <div className="flex flex-col md:flex-row gap-4 pt-4">
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                        <div className="flex-1" />
                        <Button variant="accent" onClick={handleDownloadExcel} disabled={isLoading || filteredData.length === 0}>
                            <FileDown className="mr-2" /> Excel
                        </Button>
                     </div>
                </CardHeader>
                <CardContent>
                    {renderTable()}
                </CardContent>
            </Card>
        </div>
    )
}
