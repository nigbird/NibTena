
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';

export async function getAppointmentsByHospitalId(hospitalId: number) {
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Queue:View', hospitalId);
    if (!allowed) return [];

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
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Doctors:View', hospitalId);
    if (!allowed) return [];

    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}
