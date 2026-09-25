
'use server';

import { prisma } from '@/lib/prisma';
import { hasValidMiniAppSession } from '@/lib/session';

export async function getHospitalsAndCities() {
    // Server actions are callable directly via POST; require a verified session.
    if (!(await hasValidMiniAppSession())) return { hospitals: [], cities: [] };

    const hospitals = await prisma.hospital.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            city: true,
            imageUrl: true,
        }
    });

    const cities = Array.from(new Set(hospitals.map(h => h.city).filter(Boolean))).sort();

    return { hospitals, cities };
}

export async function getHospitalData(hospitalId: number) {
    if (!(await hasValidMiniAppSession())) return { hospital: null, doctors: [], specialties: [] };

    const hospital = await prisma.hospital.findFirst({
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
        where: { hospitals: { some: { hospitalId } }, status: 'active' },
        select: {
            id: true,
            name: true,
            specialty: true,
            imageUrl: true,
        }
    });

    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).filter(Boolean);

    return { hospital, doctors, specialties };
}
