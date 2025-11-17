
 'use client';

import React, { useEffect, useState } from 'react';
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
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut, useSession } from 'next-auth/react';
import { Skeleton } from './ui/skeleton';

const navLinks: { href: string; label: string; icon: any; permissionKey?: string }[] = [
  { href: '/hospital-admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/hospital-admin/doctors', label: 'Doctors', icon: Users, permissionKey: 'DOCTOR_MANAGE' },
  { href: '/hospital-admin/appointments', label: 'Appointments', icon: ClipboardPlus, permissionKey: 'APPOINTMENT_MANAGE' },
  { href: '/hospital-admin/schedule', label: 'Schedule', icon: CalendarDays, permissionKey: 'SCHEDULE_MANAGE' },
  { href: '/hospital-admin/queue', label: 'Queue', icon: ListOrdered, permissionKey: 'QUEUE_MANAGE' },
  { href: '/hospital-admin/reports', label: 'Reports', icon: LineChart, permissionKey: 'REPORTS_VIEW' },
  { href: '/hospital-admin/roles', label: 'Roles', icon: Shield, permissionKey: 'USER_MANAGE' },
];

// The main settings link, only for admins
const settingsLink = { href: '/hospital-admin/settings', label: 'Settings', icon: Settings, permissionKey: 'SETTINGS_MANAGE' };

export default function HospitalAdminSidebar() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const [localHospitalName, setLocalHospitalName] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  
  const user = (session as any)?.user;
  const isAdmin = user?.isAdmin === true;
  const permissionKeys = user?.permissionKeys || [];

  const hospitalName = localHospitalName ?? user?.name ?? 'Hospital Admin';
  const roleName = user?.roleName;

  useEffect(() => {
    let mounted = true;

    async function fetchHospital() {
      try {
        const hid = user?.hospitalId;
        if (!hid) return;
        const res = await fetch(`/api/hospital/${hid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setLocalHospitalName(data?.name ?? null);
        setLocalImage(data?.imageUrl ?? null);
      } catch (err) {
        // ignore
      }
    }

    if (user?.hospitalId) {
      fetchHospital();
    }
    
    // Listen for custom event to refetch data when hospital details change
    const handleHospitalUpdate = () => {
      if (user?.hospitalId) {
        fetchHospital();
      }
    };
    window.addEventListener('hospital-updated', handleHospitalUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('hospital-updated', handleHospitalUpdate);
    };
  }, [user?.hospitalId]);
  
   // Filter navigation links based on permissions
  const visibleNavLinks = navLinks.filter(link => {
    if (isAdmin) return true; // Admins see everything
    if (!link.permissionKey) return true; // Links without a key are public
    return permissionKeys.includes(link.permissionKey);
  });
  
  // The main settings link is only visible to admins
  const canSeeSettings = isAdmin || permissionKeys.includes('SETTINGS_MANAGE');

  if (!session) {
    return (
       <aside className="hidden md:flex flex-col w-[220px] lg:w-[280px] bg-background border-r fixed top-0 left-0 h-full p-4">
        <Skeleton className="h-[60px] w-full mb-4" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-12 w-full mt-auto" />
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[280px] bg-background border-r fixed top-0 left-0 h-full">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 lg:p-4">
        {visibleNavLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-secondary hover:bg-muted/50',
              (pathname === href || (href !== '/hospital-admin' && pathname.startsWith(href))) && 'bg-primary text-secondary font-bold'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
         {canSeeSettings && (
            <Link
                key={settingsLink.label}
                href={settingsLink.href}
                className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-secondary hover:bg-muted/50',
                pathname.startsWith(settingsLink.href) && 'bg-primary text-secondary font-bold'
                )}
            >
                <Settings className="h-4 w-4" />
                {settingsLink.label}
            </Link>
        )}
      </nav>
      <div className="mt-auto p-4 space-y-2 border-t">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="h-10 w-10 border">
                        {(localImage ?? user.image) && (
                          <AvatarImage src={(localImage ?? user.image) ?? undefined} alt={hospitalName} />
                        )}
                        <AvatarFallback>{hospitalName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                        <p className="font-semibold text-sm leading-tight truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : roleName || 'Staff'}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuLabel>{hospitalName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/hospital-admin/profile">
                      <CircleUser className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/hospital-admin/login' })}>
                  Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

    