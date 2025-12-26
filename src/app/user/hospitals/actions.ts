
'use server';

import { prisma } from '@/lib/prisma';

export async function getHospitalsAndCities() {
    const hospitals = await prisma.hospital.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
    });

    const cities = Array.from(new Set(hospitals.map(h => h.city).filter(Boolean))).sort();

    return { hospitals, cities };
}

export async function getHospitalData(hospitalId: number) {
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId, status: 'active' },
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

    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).filter(Boolean);

    return { hospital, doctors, specialties };
}
