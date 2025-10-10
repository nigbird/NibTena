
'use server';

import { prisma } from '@/lib/prisma';

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: {
            hospitals: {
                some: { hospitalId }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });
}
