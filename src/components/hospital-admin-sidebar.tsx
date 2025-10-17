
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
import { signOut, useSession } from 'next-auth/react';
import { Skeleton } from './ui/skeleton';

const navLinks = [
  { href: '/hospital-admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/hospital-admin/doctors', label: 'Doctors', icon: Users },
  { href: '/hospital-admin/appointments', label: 'Appointments', icon: ClipboardPlus },
  { href: '/hospital-admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/hospital-admin/queue', label: 'Queue', icon: ListOrdered },
  { href: '/hospital-admin/reports', label: 'Reports', icon: LineChart },
];

const bottomNavLinks = [
    { href: '/hospital-admin/settings', label: 'Settings', icon: Settings },
];

export default function HospitalAdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // As hospital data is not passed down, we use session name as a placeholder.
  // A better solution would involve a global state or context provider for hospital data.
  const hospitalName = session?.user?.name || 'Hospital Admin';
  const hospitalImage = placeholderImages.find(p => p.id === 'hospital-1'); // Placeholder image

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
        {navLinks.map(({ href, label, icon: Icon }) => (
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
            {bottomNavLinks.map(({ href, label, icon: Icon }) => (
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
                        {hospitalImage && <AvatarImage src={hospitalImage.imageUrl} alt={hospitalName} />}
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
                    <CircleUser className="mr-2 h-4 w-4" />
                    <span>Profile</span>
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
