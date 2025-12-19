
'use server';

import { prisma } from '@/lib/prisma';
import { format, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export async function getHospitalReportData(dateRange?: DateRange) {
    // Define the date range for the database query.
    // If no date range is provided, it will not filter by date.
    const createdAtDateFilter = dateRange?.from && dateRange?.to 
        ? {
            gte: startOfDay(dateRange.from),
            lte: endOfDay(dateRange.to),
          }
        : undefined;

    const hospitals = await prisma.hospital.findMany({
        include: {
            createdBySuperAdmin: true,
            approvedBySuperAdmin: true,
            // Include appointments directly filtered by date range and payment status in the query
            appointments: {
                where: {
                    status: { not: 'pending-payment' },
                    ...(createdAtDateFilter && { createdAt: createdAtDateFilter }),
                },
                include: {
                    doctor: true
                }
            },
        },
        orderBy: {
            createdAt: 'desc',
        }
    });
    
    return hospitals.map((hospital: any) => {
        // The appointments are now pre-filtered by the database query.
        // We can directly calculate the revenue from this filtered list.
        const revenue = hospital.appointments.reduce((sum: number, appt: any) => {
            // The null check for appt.doctor is still important for data integrity.
            if (!appt.doctor) {
                return sum;
            }
            return sum + (appt.doctor.consultationFee || 0);
        }, 0);
        
        return {
            hospitalId: hospital.id,
            bankBranch: hospital.bankBranch || 'N/A',
            bankDistrict: hospital.bankDistrict || 'N/A',
            hospitalName: hospital.name,
            ownerName: hospital.ownerName || 'N/A',
            hospitalAccount: hospital.accountNumber,
            hospitalPhone: hospital.contactPhone,
            hospitalAddress: hospital.address || hospital.city,
            registrationDate: format(hospital.createdAt, 'yyyy-MM-dd'),
            registeredBy: hospital.createdBySuperAdmin?.name || 'System',
            approvedBy: hospital.approvedBySuperAdmin?.name || 'N/A',
            revenue: revenue,
        };
    });
}
