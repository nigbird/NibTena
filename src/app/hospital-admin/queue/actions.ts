
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';
import { startOfDay, endOfDay } from 'date-fns';

export async function getAppointmentsByHospitalId(hospitalId: number, page: number, limit: number) {
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Queue:View', hospitalId);
    if (!allowed) return [];

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    return await prisma.appointment.findMany({
        where: { 
            hospitalId,
            appointmentDate: {
                gte: todayStart,
                lte: todayEnd,
            },
            status: 'confirmed',
        },
        include: {
            patient: true,
        },
        orderBy: [
            { appointmentSlot: 'asc' },
            { createdAt: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
    });
}

export async function getTodaysAppointmentsCount(hospitalId: number) {
    const session = await auth();
    if (!session?.user) return 0;
    const allowed = await requireHospitalPermission('Queue:View', hospitalId);
    if (!allowed) return 0;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    return await prisma.appointment.count({
        where: {
            hospitalId,
            appointmentDate: {
                gte: todayStart,
                lte: todayEnd,
            },
            status: 'confirmed',
        },
    });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Doctors:View', hospitalId);
    if (!allowed) return [];

    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}
