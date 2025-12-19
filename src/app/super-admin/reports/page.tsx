
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getHospitalReportData } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';
import { Loader2, FileDown, LineChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
            const data = await getHospitalReportData();
            setReportData(data);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredData = useMemo(() => {
        if (!reportData) return [];
        return reportData.filter(item => {
            const regDate = startOfDay(new Date(item.registrationDate));
             return dateRange?.from && dateRange?.to && !isBefore(regDate, dateRange.from) && !isAfter(regDate, dateRange.to);
        });
    }, [reportData, dateRange]);
    
    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("NibTena Hospital Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        const dateStr = `Date Range: ${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to!, 'PPP')}`;
        doc.text(dateStr, 14, 30);

        (doc as any).autoTable({
            startY: 35,
            head: [['S.No', 'Branch', 'District', 'Hospital Name', 'Owner', 'Account', 'Phone', 'Address', 'Reg. Date', 'Registered By', 'Approved By', 'Revenue (Monthly)']],
            body: filteredData.map((item, index) => [
                index + 1,
                item.bankBranch,
                item.bankDistrict,
                item.hospitalName,
                item.ownerName,
                item.hospitalAccount,
                item.hospitalPhone,
                item.hospitalAddress,
                item.registrationDate,
                item.registeredBy,
                item.approvedBy,
                item.monthlyRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [46, 46, 46] },
        });

        doc.save(`hospital_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }

    const handleDownloadExcel = () => {
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
            'Monthly revenue': item.monthlyRevenue,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hospitals');
        
        // Auto-fit columns
        const cols = Object.keys(worksheetData[0] || {}).map(key => ({
            wch: Math.max(20, ...worksheetData.map(row => (row[key as keyof typeof row] || '').toString().length))
        }));
        worksheet['!cols'] = cols;
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `hospital_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
                        <TableHead className="text-right">Monthly Revenue</TableHead>
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
                            <TableCell className="text-right">{item.monthlyRevenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
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
                        <Button variant="outline" onClick={handleDownloadPdf} disabled={isLoading || filteredData.length === 0}>
                            <FileDown className="mr-2" /> PDF
                        </Button>
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
