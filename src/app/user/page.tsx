
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Hospital, Stethoscope, CalendarCheck, User as UserIcon, Search, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getHospitals, getDoctors } from '@/lib/data';
import type { Hospital as HospitalType, Doctor } from '@/lib/definitions';
import { placeholderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';


const quickActions = [
  { href: '/user/hospitals', label: 'Hospitals', icon: Hospital, color: 'bg-blue-100 text-blue-600' },
  { href: '/user/doctors', label: 'Doctors', icon: Stethoscope, color: 'bg-green-100 text-green-600' },
  { href: '/user/appointments', label: 'Bookings', icon: CalendarCheck, color: 'bg-violet-100 text-violet-600' },
  { href: '/user/profile', label: 'Profile', icon: UserIcon, color: 'bg-orange-100 text-orange-600' },
];


export default function Home() {
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getHospitals().then(setHospitals);
    getDoctors().then(data => setDoctors(data.slice(0, 5))); // Get top 5 for featured
  }, []);

  return (
    <div className="flex flex-col">
      <div className="p-6 space-y-8 bg-muted/20">
        
        {/* Greeting and Search Section */}
        <section className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">
                How are you feeling today?
            </h1>
             <p className="text-center text-muted-foreground">Find the best doctors and hospitals near you.</p>
            <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search doctors, hospitals, or specialties…"
                    className="w-full h-14 rounded-full bg-background pl-12 pr-4 text-base shadow-md"
                />
            </div>
        </section>

        {/* Quick Actions Section */}
        <section>
            <div className="grid grid-cols-4 gap-4">
                 {quickActions.map(({ href, label, icon: Icon, color }) => (
                    <Link href={href} key={label} className="flex flex-col items-center gap-2 group text-center">
                        <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg", color)}>
                            <div className="h-14 w-14 rounded-xl bg-white/40 flex items-center justify-center backdrop-blur-sm group-hover:shadow-inner">
                                <Icon className="h-7 w-7" />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground transition-transform group-hover:-translate-y-0.5">{label}</p>
                    </Link>
                ))}
            </div>
        </section>

      </div>
        {/* Hospital Highlights Section */}
        <section className="py-8 space-y-4">
            <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                <h2 className="font-headline text-2xl font-bold">Top Hospitals</h2>
                <Link href="/user/hospitals" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    See all <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <Carousel opts={{ align: 'start', loop: true }} className="w-full">
                <CarouselContent className="-ml-4 px-6">
                    {hospitals.map(hospital => {
                        const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);
                        return (
                            <CarouselItem key={hospital.id} className="md:basis-1/2 lg:basis-1/3">
                                <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
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
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
            </Carousel>
        </section>

        {/* Featured Doctors Section */}
        <section className="py-8 space-y-4 bg-muted/20">
             <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                <h2 className="font-headline text-2xl font-bold">Featured Doctors</h2>
                <Link href="/user/doctors" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    See all <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
                <CarouselContent className="-ml-4 px-6">
                    {doctors.map(doctor => {
                        const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
                        return (
                             <CarouselItem key={doctor.id} className="basis-2/5 sm:basis-1/3 md:basis-1/4">
                                <Card className="overflow-hidden text-center transition-transform hover:-translate-y-1 hover:shadow-lg">
                                    <div className="aspect-square relative">
                                        {doctorImage && (
                                            <Image src={doctorImage.imageUrl} alt={doctor.name} fill className="object-cover" />
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-sm truncate">{doctor.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                                        <Button asChild size="sm" className="mt-2 w-full" variant="accent">
                                            <Link href={`/user/doctors/${doctor.id}`}>Book Now</Link>
                                        </Button>
                                    </div>
                                </Card>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
            </Carousel>
        </section>
    </div>
  );
}
