
import { placeholderImages } from '@/lib/placeholder-images';
import { prisma } from '@/lib/prisma';
import UserHomepageClient from '@/components/UserHomepageClient';
import { cookies } from 'next/headers';
import type { Hospital, Doctor } from '@prisma/client';

const allQuickActions = [
    { href: '/user/hospitals', label: 'Hospitals', icon: 'Hospital', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/doctors', label: 'Doctors', icon: 'Stethoscope', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/appointments', label: 'Bookings', icon: 'CalendarCheck', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/profile', label: 'Profile', icon: 'User', color: 'bg-primary/40 text-primary-foreground' },
];

export default async function Home() {
    const cookieStore = cookies();
    const hasMiniAppSession = !!cookieStore.get('miniapp_session');

    const quickActions = hasMiniAppSession
        ? allQuickActions.filter(action => action.label !== 'Profile')
        : allQuickActions;

    const allHospitalsWithCounts = await prisma.hospital.findMany({
        include: {
            _count: {
                select: { appointments: true, doctors: true },
            },
        },
    });

    const topHospitals = allHospitalsWithCounts
        .map(hospital => ({
            ...hospital,
            popularityScore: (hospital._count.appointments * 2) + hospital._count.doctors,
        }))
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 5);

    const topHospitalIds = topHospitals.map(h => h.id);

    let featuredDoctors = await prisma.doctor.findMany({
        where: {
            hospitals: {
                some: {
                    hospitalId: { in: topHospitalIds },
                },
            },
        },
        take: 10,
    });
    
    if (featuredDoctors.length < 5) {
        const fallbackDoctors = await prisma.doctor.findMany({
            where: {
                rating: { gt: 4.5 },
                id: { notIn: featuredDoctors.map(d => d.id) }
            },
            take: 5 - featuredDoctors.length
        });
        featuredDoctors = [...featuredDoctors, ...fallbackDoctors];
    }
    
    featuredDoctors = featuredDoctors.slice(0, 5);


    const [allDoctors, allSpecialties] = await Promise.all([
        prisma.doctor.findMany(),
        prisma.doctor.findMany({
            distinct: ['specialty'],
            select: { specialty: true },
        }),
    ]);

    const specialties = allSpecialties.map(s => s.specialty);
    const allData = { doctors: allDoctors, hospitals: allHospitalsWithCounts, specialties };

    const heroImage = placeholderImages.find(p => p.id === 'NibAppointment-hero');

    return (
        <UserHomepageClient
            heroImage={heroImage}
            quickActions={quickActions}
            topHospitals={topHospitals}
            featuredDoctors={featuredDoctors}
            allData={allData}
            hasMiniAppSession={hasMiniAppSession}
        />
    );
}
