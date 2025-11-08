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

const bottomNavLinks: { href: string; label: string; icon: any; permissionKey?: string }[] = [
  { href: '/hospital-admin/settings', label: 'Settings', icon: Settings },
];

export default function HospitalAdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [localHospitalName, setLocalHospitalName] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);

  const hospitalName = localHospitalName ?? session?.user?.name ?? 'Hospital Admin';

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

  useEffect(() => {
    let mounted = true;

    async function fetchHospital() {
      try {
        const hid = (session as any)?.user?.hospitalId;
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

    fetchHospital();

    const handler = (e: any) => {
      try {
        const detail = e?.detail;
        const hid = (session as any)?.user?.hospitalId;
        if (!hid) return;

        // if caller provided updatedHospital data, update immediately without extra fetch
        if (detail?.hospitalId === hid && detail.updatedHospital) {
          setLocalHospitalName(detail.updatedHospital.name ?? null);
          setLocalImage(detail.updatedHospital.imageUrl ?? null);
          return;
        }

        if (!detail || detail.hospitalId === hid) {
          fetchHospital();
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('hospital-updated', handler as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('hospital-updated', handler as EventListener);
    };
  }, [session?.user?.hospitalId]);

  // decide which links to show based on session permissions
  const permissionKeys: string[] = (session as any)?.user?.permissionKeys || [];
  const role = (session as any)?.user?.role;

  const visibleNavLinks = navLinks.filter(link => {
    // superadmins see everything
    if (role === 'superadmin') return true;
    // if link has no permissionKey, show it (e.g., Dashboard)
    if (!link.permissionKey) return true;
    // hospital staff need the specific permission
    if (role === 'hospital') return permissionKeys.includes(link.permissionKey);
    // other roles default to hide
    return false;
  });

  const visibleBottomNavLinks = bottomNavLinks.filter(link => {
    if (role === 'superadmin') return true;
    if (!link.permissionKey) return true;
    if (role === 'hospital') return permissionKeys.includes(link.permissionKey);
    return false;
  });

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
      </nav>
      <div className="mt-auto p-4 space-y-2 border-t">
        <nav className="space-y-1">
            {visibleBottomNavLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  (pathname === href || pathname.startsWith(href)) && 'bg-muted text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
        </nav>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="h-10 w-10 border">
                        {(localImage ?? session.user.image) && (
                          <AvatarImage src={(localImage ?? session.user.image) ?? undefined} alt={hospitalName} />
                        )}
                        <AvatarFallback>{hospitalName.charAt(0)}</AvatarFallback>
                    </Avatar>
          <div className="text-left overflow-hidden">
            <p className="font-semibold text-sm leading-tight truncate">{hospitalName}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                   <Link href="/hospital-admin/settings"></Link>
                    <CircleUser className="mr-2 h-4 w-4" />
                    <span>Profile </span>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/hospital-admin/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
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
