
'use server';

import { prisma } from '@/lib/prisma';
import type { Doctor, Hospital } from '@/lib/definitions';

export async function getDoctorsAndHospitalsByQuery(query: string): Promise<{ doctors: Doctor[], hospitals: Hospital[] }> {
    if (!query) {
        return { doctors: [], hospitals: [] };
    }

    const lowercasedQuery = query.toLowerCase();

    const [doctors, hospitals] = await Promise.all([
        prisma.doctor.findMany({
            where: {
                OR: [
                    { name: { contains: lowercasedQuery, mode: 'insensitive' } },
                    { specialty: { contains: lowercasedQuery, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                specialty: true,
                imageUrl: true,
                contact: true,
                status: true,
                rating: true,
                experience: true,
                consultationFee: true,
            }
        }),
        prisma.hospital.findMany({
            where: {
                OR: [
                    { name: { contains: lowercasedQuery, mode: 'insensitive' } },
                    { city: { contains: lowercasedQuery, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                city: true,
                imageUrl: true,
                contactPhone: true,
                contactEmail: true,
                address: true,
                status: true,
            }
        }),
    ]);

    return { doctors, hospitals };
}
