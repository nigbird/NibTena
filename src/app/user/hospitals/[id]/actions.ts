
'use server';

import { prisma } from '@/lib/prisma';

export async function getHospitalData(hospitalId: number) {
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
            id: true,
            name: true,
            description: true,
            city: true,
            address: true,
            latitude: true,
            longitude: true,
            mapDisplayAddress: true,
            contactEmail: true,
            contactPhone: true,
            imageUrl: true,
        },
    });

    if (!hospital) return { hospital: null, doctors: [], specialties: [] };

    const doctors = await prisma.doctor.findMany({
        where: { 
            hospitals: { some: { hospitalId } },
            status: 'active',
        }
    });

    const specialties = Array.from(new Set(doctors.map(d => d.specialty)));

    return { hospital, doctors, specialties };
}

