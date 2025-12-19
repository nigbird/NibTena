
'use server';

import { prisma } from '@/lib/prisma';
import { format, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export async function getHospitalReportData(dateRange?: DateRange) {
    const whereClause = {
        ...(dateRange?.from && dateRange?.to && {
            appointmentDate: {
                gte: startOfDay(dateRange.from),
                lte: endOfDay(dateRange.to),
            }
        })
    };

    const hospitals = await prisma.hospital.findMany({
        include: {
            createdBySuperAdmin: true,
            approvedBySuperAdmin: true,
            appointments: {
                where: {
                    status: { not: 'pending-payment' }
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
        // Filter appointments by date range client-side on the returned data
        const appointmentsInRange = hospital.appointments.filter((appt: any) => {
             if (!dateRange?.from || !dateRange?.to) return true; // if no date range, include all
             const apptDate = startOfDay(new Date(appt.appointmentDate));
             return !isBefore(apptDate, dateRange.from) && !isAfter(apptDate, dateRange.to);
        });

        const revenue = appointmentsInRange.reduce((sum: number, appt: any) => {
            // FIX: Check if appt.doctor exists before accessing consultationFee
            return sum + (appt.doctor?.consultationFee || 0);
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
