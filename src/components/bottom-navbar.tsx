
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Stethoscope, UserCircle, CalendarCheck, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/user', label: 'Home', icon: Home },
  { href: '/user/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/user/hospitals', label: 'Hospitals', icon: Hospital },
  { href: '/user/appointments', label: 'Bookings', icon: CalendarCheck },
  { href: '/user/profile', label: 'Profile', icon: UserCircle },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  // Hide navbar on non-user routes
  if (!pathname.startsWith('/user')) {
    return null;
  }


  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/user' && pathname.startsWith(href));
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group',
                isActive ? 'text-accent-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
