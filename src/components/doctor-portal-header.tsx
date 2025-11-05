
'use client';

import Link from 'next/link';
import {
  CircleUser,
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  Menu,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Logo } from './icons';
import HospitalSwitcher from './doctor-portal/hospital-switcher';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function DoctorPortalHeader() {
    const { data: session } = useSession();
    const pathname = usePathname();

    if (pathname === '/doctor-portal/login') {
      return null;
    }

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Logo />
                </Link>
              </div>
                <nav className="grid gap-2 text-lg font-medium p-2">
                    <Link
                        href="/doctor-portal"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <LayoutGrid className="h-5 w-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/doctor-portal/appointments"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <ClipboardList className="h-5 w-5" />
                        My Appointments
                    </Link>
                    <Link
                        href="/doctor-portal/schedule"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <CalendarDays className="h-5 w-5" />
                        My Schedule
                    </Link>
                     <Link
                        href="/doctor-portal/profile"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <User className="h-5 w-5" />
                        Profile
                    </Link>
                </nav>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1" />
          
          <HospitalSwitcher />
        </header>
    )
}
