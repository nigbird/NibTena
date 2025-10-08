
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  User,
  Settings,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDoctorById } from '@/lib/data';
import type { Doctor } from '@/lib/definitions';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { href: '/doctor-portal', label: 'Dashboard', icon: LayoutGrid },
  { href: '/doctor-portal/appointments', label: 'My Appointments', icon: ClipboardList },
  { href: '/doctor-portal/schedule', label: 'My Schedule', icon: CalendarDays },
];

const MOCK_DOCTOR_ID = 1;

export default function DoctorPortalSidebar() {
  const pathname = usePathname();
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    getDoctorById(MOCK_DOCTOR_ID).then(setDoctor);
  }, []);

  const doctorImage = placeholderImages.find(p => p.id === doctor?.imageId);

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[280px] bg-background border-r fixed top-0 left-0 h-full">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 lg:p-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              (pathname === href || (href !== '/doctor-portal' && pathname.startsWith(href))) && 'bg-muted text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="h-10 w-10 border">
                        {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor?.name} />}
                        <AvatarFallback>{doctor?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                        <p className="font-semibold text-sm leading-tight truncate">{doctor?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doctor?.specialty}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/doctor-portal/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
