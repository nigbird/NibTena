
'use client';

import Link from 'next/link';
import { Hospital, Stethoscope, CalendarCheck, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const quickActions = [
  { href: '/user/hospitals', label: 'Hospitals', icon: Hospital },
  { href: '/user/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/user/appointments', label: 'Bookings', icon: CalendarCheck },
  { href: '/user/profile', label: 'Profile', icon: User },
];


export default function Home() {
  return (
    <div className="flex flex-col">
      <div className="p-6 space-y-8 bg-muted/20">
        
        {/* Greeting and Search Section */}
        <section className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                How are you feeling right now today?
            </h1>
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
                 {quickActions.map(({ href, label, icon: Icon }) => (
                    <Link href={href} key={label} className="flex flex-col items-center gap-2 group">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-md transition-transform group-hover:-translate-y-1">
                            <Icon className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    </Link>
                ))}
            </div>
        </section>

      </div>
    </div>
  );
}
