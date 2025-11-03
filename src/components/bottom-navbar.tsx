
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Stethoscope, UserCircle, CalendarCheck, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavLinks = [
  { href: '/user', label: 'Home', icon: Home },
  { href: '/user/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/user/hospitals', label: 'Hospitals', icon: Hospital },
  { href: '/user/appointments', label: 'Bookings', icon: CalendarCheck },
  { href: '/user/profile', label: 'Profile', icon: UserCircle },
];

export default function BottomNavbar({ hasMiniAppSession }: { hasMiniAppSession: boolean }) {
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
  // Track whether we're on a mobile-sized viewport and only enable keyboard hiding there.
  const checkIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);

  // Use VisualViewport API when available to detect on-screen keyboard on mobile.
    const vv = typeof window !== 'undefined' ? (window as any).visualViewport : null;

    const threshold = 150; // px: if viewport shrinks more than this, treat as keyboard open

    const update = () => {
      try {
        if (vv) {
          const vh = vv.height;
          const ih = window.innerHeight;
          setKeyboardOpen(vh < ih - threshold);
        }
      } catch (e) {
        // ignore
      }
    };

    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      // initial check
      update();
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
        window.removeEventListener('resize', checkIsMobile);
      };
    }

    // Fallback: listen to focusin/out events for inputs
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (target.getAttribute && target.getAttribute('contenteditable') === 'true')) {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => setKeyboardOpen(false);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Hide navbar on non-user routes
  if (!pathname.startsWith('/user')) {
    return null;
  }

  const navLinks = hasMiniAppSession
    ? allNavLinks.filter(link => link.label !== 'Profile')
    : allNavLinks;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t pb-[env(safe-area-inset-bottom)] transition-transform duration-200',
        isMobile && keyboardOpen ? 'translate-y-full' : 'translate-y-0'
      )}
      aria-hidden={isMobile && keyboardOpen}
    >
      <div className={cn("grid h-full max-w-lg mx-auto font-medium", hasMiniAppSession ? "grid-cols-4" : "grid-cols-5")}>
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = (href === '/user' && pathname === '/user') || (href !== '/user' && pathname.startsWith(href));
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group transition-colors duration-200',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <div className={cn("flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300", isActive ? 'bg-accent/10' : '')}>
                 <Icon className={cn("w-6 h-6 mb-1 transition-transform duration-300", isActive && 'scale-110 text-secondary')} />
              </div>
              <span className={cn("text-xs text-center transition-transform", isActive && 'font-semibold text-accent-foreground')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
