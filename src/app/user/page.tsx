
import Link from 'next/link';
import Image from 'next/image';
import { Stethoscope, ArrowRight, Building, Heart, Brain, Bone, Baby, Smile, Sparkles, Search, Hospital, CalendarCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { prisma } from '@/lib/prisma';
import type { Hospital as HospitalType, Doctor } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import UserHomepageClient from '@/components/UserHomepageClient';


const quickActions = [
    { href: '/user/hospitals', label: 'Hospitals', icon: 'Hospital', color: 'bg-blue-100 text-blue-600' },
    { href: '/user/doctors', label: 'Doctors', icon: 'Stethoscope', color: 'bg-green-100 text-green-600' },
    { href: '/user/appointments', label: 'Bookings', icon: 'CalendarCheck', color: 'bg-violet-100 text-violet-600' },
    { href: '/user/profile', label: 'Profile', icon: 'User', color: 'bg-orange-100 text-orange-600' },
];

const actionIcons: { [key: string]: React.ElementType } = {
  Hospital: Hospital,
  Stethoscope: Stethoscope,
  CalendarCheck: CalendarCheck,
  User: UserIcon,
}

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

    const heroImage = placeholderImages.find(p => p.id === 'mediverse-hero');

    return (
        <div className="flex flex-col">
            <div className="relative">
                {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1080}
                    height={720}
                    className="object-cover w-full h-[400px] md:h-[500px]"
                    data-ai-hint={heroImage.imageHint}
                    priority
                />
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-background/10 to-black/60" />
                <div className="absolute inset-0 p-6 flex flex-col justify-center items-center text-center space-y-4 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-shadow-lg">
                        How are you feeling today?
                    </h1>
                    <p className="text-white/90 max-w-lg text-shadow">Find the best doctors and hospitals near you.</p>
                   <UserHomepageClient allData={allData} />
                </div>
            </div>
            
            <div className="-mt-16 relative pb-4 z-20">
                <section className="container mx-auto max-w-md">
                    <div className="flex justify-around items-center bg-background p-4 rounded-2xl shadow-lg">
                        {quickActions.map(({ href, label, icon, color }) => {
                            const Icon = actionIcons[icon] || Stethoscope;
                            return (
                            <Link href={href} key={label} className="flex flex-col items-center gap-2 group text-center p-2">
                                <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg border-2 border-primary/20 hover:border-primary/60", color)}>
                                    <Icon className="h-8 w-8 z-10" />
                                </div>
                                <p className="text-xs font-semibold text-foreground transition-transform group-hover:-translate-y-0.5">{label}</p>
                            </Link>
                        )})}
                    </div>
                </section>
            </div>

             <section className="py-8 space-y-4">
                <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                    <h2 className="font-headline text-2xl font-bold">Top Hospitals</h2>
                    <Link href="/user/hospitals" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                        See all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                 <div className="px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topHospitals.slice(0,3).map(hospital => {
                            const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);
                            return (
                                <Card key={hospital.id} className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl group">
                                    {hospitalImage && (
                                        <div className="aspect-video relative overflow-hidden">
                                            <Image
                                                src={hospitalImage.imageUrl}
                                                alt={hospital.name}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                    )}
                                    <CardContent className="p-4">
                                        <h3 className="font-bold font-headline">{hospital.name}</h3>
                                        <p className="text-sm text-muted-foreground">{hospital.city} | Multi-Specialty Care</p>
                                        <Button asChild variant="link" className="p-0 h-auto mt-2">
                                            <Link href={`/user/hospitals/${hospital.id}`}>
                                                View Details <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                 </div>
            </section>

             <section className="py-8 space-y-4 bg-muted/20">
                    <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                    <h2 className="font-headline text-2xl font-bold">Featured Doctors</h2>
                    <Link href="/user/doctors" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                        See all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <div className="px-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {featuredDoctors.map(doctor => {
                            const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
                            return (
                                    <Card key={doctor.id} className="overflow-hidden text-center transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col items-center p-4 h-full">
                                        <Avatar className="h-24 w-24 mb-4 border-2 shadow-md" style={{ borderColor: 'hsl(var(--accent))' }}>
                                            {doctorImage && (
                                                <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} />
                                            )}
                                            <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="p-3 pt-0 flex flex-col flex-grow justify-between">
                                            <div>
                                            <h3 className="font-bold text-sm truncate">{doctor.name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                                            </div>
                                            <Button asChild size="sm" className="mt-4 w-full transition-transform hover:scale-105" variant="accent">
                                                <Link href={`/user/doctors/${doctor.id}`}>Book Now</Link>
                                            </Button>
                                        </div>
                                    </Card>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
