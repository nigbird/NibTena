
'use server';

import { prisma } from '@/lib/prisma';

export async function getAppointmentsByHospitalId(hospitalId: number) {
    return await prisma.appointment.findMany({
        where: { hospitalId },
        include: {
            patient: true,
        }
    });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}

    