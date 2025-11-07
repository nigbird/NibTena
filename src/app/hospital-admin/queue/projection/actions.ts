
'use server';

import { prisma } from '@/lib/prisma';

export async function getAppointmentsByHospitalId(hospitalId: number) {
    return await prisma.appointment.findMany({
        where: { hospitalId },
        include: {
            // include related records so the client can show both patient and doctor names
            patient: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, name: true } },
        },
    });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}
