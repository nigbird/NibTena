'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Hospital, Stethoscope, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/hospitals', label: 'Hospitals', icon: Hospital },
  { href: '/search', label: 'Doctors', icon: Stethoscope },
  { href: '/doctor-dashboard', label: 'Dashboard', icon: UserCircle },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  // Hide navbar on admin routes
  if (pathname.startsWith('/hospital-admin')) {
    return null;
  }


  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
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
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
