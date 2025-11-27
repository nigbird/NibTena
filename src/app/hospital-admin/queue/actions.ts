
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
            patient: true,
        }
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

    