
'use server';

import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function getHospitalReportData() {
    const hospitals = await prisma.hospital.findMany({
        include: {
            createdBy: true,
            approvedBy: true,
            appointments: {
                where: {
                    status: 'completed',
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
    
    return hospitals.map(hospital => {
        const monthlyRevenue = hospital.appointments.reduce((sum, appt) => {
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
            registeredBy: hospital.createdBy?.name || 'System',
            approvedBy: hospital.approvedBy?.name || 'N/A',
            monthlyRevenue: monthlyRevenue,
        };
    });
}
