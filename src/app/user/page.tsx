
import { placeholderImages } from '@/lib/placeholder-images';
import { prisma } from '@/lib/prisma';
import UserHomepageClient from '@/components/UserHomepageClient';

const quickActions = [
    { href: '/user/hospitals', label: 'Hospitals', icon: 'Hospital', color: 'bg-primary/20 text-primary-foreground' },
    { href: '/user/doctors', label: 'Doctors', icon: 'Stethoscope', color: 'bg-primary/20 text-primary-foreground' },
    { href: '/user/appointments', label: 'Bookings', icon: 'CalendarCheck', color: 'bg-primary/20 text-primary-foreground' },
    { href: '/user/profile', label: 'Profile', icon: 'User', color: 'bg-primary/20 text-primary-foreground' },
];

export default async function Home() {
    const [topHospitals, featuredDoctors, allDoctors, allHospitals, allSpecialties] = await Promise.all([
        prisma.hospital.findMany({
            take: 5,
        }),
        prisma.doctor.findMany({
            where: { rating: { gt: 4.7 } },
            take: 5,
        }),
        prisma.doctor.findMany(),
        prisma.hospital.findMany(),
        prisma.doctor.findMany({
            distinct: ['specialty'],
            select: { specialty: true },
        }),
    ]);

    const specialties = allSpecialties.map(s => s.specialty);
    const allData = { doctors: allDoctors, hospitals: allHospitals, specialties };

    const heroImage = placeholderImages.find(p => p.id === 'NibTena-hero');

    return (
        <UserHomepageClient
            heroImage={heroImage}
            quickActions={quickActions}
            topHospitals={topHospitals}
            featuredDoctors={featuredDoctors}
            allData={allData}
        />
    );
}
