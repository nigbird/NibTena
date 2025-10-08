
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ClipboardPlus,
  Hospital,
  LayoutGrid,
  LineChart,
  ListOrdered,
  Users,
  Settings,
  CircleUser,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getHospitalById } from '@/lib/data';
import type { Hospital as HospitalType } from '@/lib/definitions';

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
  { href: '/hospital-admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/hospital-admin/doctors', label: 'Doctors', icon: Users },
  { href: '/hospital-admin/appointments', label: 'Appointments', icon: ClipboardPlus },
  { href: '/hospital-admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/hospital-admin/queue', label: 'Queue', icon: ListOrdered },
  { href: '/hospital-admin/reports', label: 'Reports', icon: LineChart },
];

// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

export default function HospitalAdminSidebar() {
  const pathname = usePathname();
  const [hospital, setHospital] = useState<HospitalType | null>(null);

  useEffect(() => {
    getHospitalById(MOCK_HOSPITAL_ID).then(setHospital);
  }, []);

  const hospitalImage = placeholderImages.find(p => p.id === hospital?.imageId);

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[280px] bg-background border-r fixed top-0 left-0 h-full">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
        <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 lg:p-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              (pathname === href || (href !== '/hospital-admin' && pathname.startsWith(href))) && 'bg-muted text-primary'
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
                        {hospitalImage && <AvatarImage src={hospitalImage.imageUrl} alt={hospital?.name} />}
                        <AvatarFallback>{hospital?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                        <p className="font-semibold text-sm leading-tight truncate">{hospital?.name}</p>
                        <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <CircleUser className="mr-2 h-4 w-4" />
                    <span>Profile</span>
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
