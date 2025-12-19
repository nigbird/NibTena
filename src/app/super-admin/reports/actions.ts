
'use server';

import { prisma } from '@/lib/prisma';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export async function getHospitalReportData(dateRange?: DateRange) {
    const whereAppointments = {
        status: 'completed' as const,
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
                where: whereAppointments,
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
        const revenue = hospital.appointments.reduce((sum: number, appt: any) => {
            // Fix: Check if appt.doctor exists before accessing consultationFee
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
