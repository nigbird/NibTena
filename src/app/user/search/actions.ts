
'use server';

import { prisma } from '@/lib/prisma';

export async function getDoctorsAndHospitalsByQuery(query: string) {
    if (!query) {
        return { doctors: [], hospitals: [] };
    }

    const lowercasedQuery = query.toLowerCase();

    // Only fields the search page renders; never return contact or status fields.
    const [doctors, hospitals] = await Promise.all([
        prisma.doctor.findMany({
            where: {
                status: 'active',
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
            }
        }),
        prisma.hospital.findMany({
            where: {
                status: 'active',
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
            }
        }),
    ]);

    return { doctors, hospitals };
}
