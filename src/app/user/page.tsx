
import { placeholderImages } from '@/lib/placeholder-images';
import { prisma } from '@/lib/prisma';
import UserHomepageClient from '@/components/UserHomepageClient';
import { hasValidMiniAppSession } from '@/lib/session';

const allQuickActions = [
    { href: '/user/hospitals', label: 'Hospitals', icon: 'Hospital', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/doctors', label: 'Doctors', icon: 'Stethoscope', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/appointments', label: 'Bookings', icon: 'CalendarCheck', color: 'bg-primary/40 text-primary-foreground' },
    { href: '/user/profile', label: 'Profile', icon: 'User', color: 'bg-primary/40 text-primary-foreground' },
];

// Only the fields the homepage UI renders. Everything returned here is
// serialized into the RSC payload, so never add contact, bank or status fields.
const publicDoctorSelect = {
    id: true,
    name: true,
    specialty: true,
    imageUrl: true,
} as const;

const publicHospitalSelect = {
    id: true,
    name: true,
    city: true,
    imageUrl: true,
} as const;


export default async function Home() {
    const hasMiniAppSession = await hasValidMiniAppSession();

    // The layout renders RestrictedAccess without a session; don't query or
    // serialize any data for those visitors.
    if (!hasMiniAppSession) return null;

    const quickActions = allQuickActions.filter(action => action.label !== 'Profile');

    const allHospitalsWithCounts = await prisma.hospital.findMany({
        where: { status: 'active' },
        select: {
            ...publicHospitalSelect,
            _count: {
                select: { appointments: true, doctors: true },
            },
        },
    });

    const toPublicHospital = ({ _count, ...hospital }: typeof allHospitalsWithCounts[number]) => hospital;

    const topHospitalsRanked = allHospitalsWithCounts
        .map(hospital => ({
            hospital,
            popularityScore: (hospital._count.appointments * 2) + hospital._count.doctors,
        }))
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 5)
        .map(({ hospital }) => hospital);

    const topHospitalIds = topHospitalsRanked.map(h => h.id);
    const topHospitals = topHospitalsRanked.map(toPublicHospital);
    const hospitals = allHospitalsWithCounts.map(toPublicHospital);

    let featuredDoctors = await prisma.doctor.findMany({
        where: {
            status: 'active',
            hospitals: {
                some: {
                    hospitalId: { in: topHospitalIds },
                },
            },
        },
        select: publicDoctorSelect,
        take: 10,
    });

    if (featuredDoctors.length < 5) {
        const fallbackDoctors = await prisma.doctor.findMany({
            where: {
                status: 'active',
                rating: { gt: 4.5 },
                id: { notIn: featuredDoctors.map(d => d.id) }
            },
            select: publicDoctorSelect,
            take: 5 - featuredDoctors.length
        });
        featuredDoctors = [...featuredDoctors, ...fallbackDoctors];
    }

    featuredDoctors = featuredDoctors.slice(0, 5);


    const [allDoctors, allSpecialties] = await Promise.all([
        prisma.doctor.findMany({ where: { status: 'active' }, select: publicDoctorSelect }),
        prisma.doctor.findMany({
            where: { status: 'active' },
            distinct: ['specialty'],
            select: { specialty: true },
        }),
    ]);

    const specialties = allSpecialties.map(s => s.specialty);
    const allData = { doctors: allDoctors, hospitals, specialties };

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
