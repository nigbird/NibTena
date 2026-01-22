
'use server';

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { startOfDay, endOfDay } from 'date-fns';

export async function getAppointmentsByHospitalId(hospitalId: number, page: number = 1, limit: number = 100) {
    const user = await getVerifiedUser();
    if (!user) return [];
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
            status: { in: ['confirmed', 'checked-in', 'in-progress'] },
        },
        include: {
            patient: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    gender: true,
                    age: true,
                    createdAt: true,
                    updatedAt: true,
                }
            },
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
    const user = await getVerifiedUser();
    if (!user) return 0;
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
            status: { in: ['confirmed', 'checked-in', 'in-progress'] },
        },
    });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    const user = await getVerifiedUser();
    if (!user) return [];
    const allowed = await requireHospitalPermission('Doctors:View', hospitalId);
    if (!allowed) return [];

    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
        select: {
            id: true,
            name: true,
            specialty: true,
            imageUrl: true,
            status: true,
        }
    });
}
