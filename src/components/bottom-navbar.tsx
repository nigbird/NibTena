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
    // ✅ Detect if device is mobile
    const checkIsMobile = () =>
      setIsMobile(
        typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(max-width: 768px)').matches
      );
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    // ✅ Use VisualViewport to detect keyboard open/close
    const vv = typeof window !== 'undefined' ? (window as any).visualViewport : null;
    const threshold = 120; // pixels of viewport shrinkage to detect keyboard

    const detectKeyboard = () => {
      if (!vv) return;
      const diff = window.innerHeight - vv.height;
      setKeyboardOpen(diff > threshold);
    };

    if (vv) {
      vv.addEventListener('resize', detectKeyboard);
      vv.addEventListener('scroll', detectKeyboard);
      detectKeyboard();
    }

    // ✅ Fallback for browsers without visualViewport
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => setKeyboardOpen(false);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
      if (vv) {
        vv.removeEventListener('resize', detectKeyboard);
        vv.removeEventListener('scroll', detectKeyboard);
      }
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // ✅ Hide navbar outside of /user routes
  if (!pathname.startsWith('/user')) {
    return null;
  }

  const navLinks = hasMiniAppSession
    ? allNavLinks.filter(link => link.label !== 'Profile')
    : allNavLinks;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 z-50 w-full h-20 bg-card/95 backdrop-blur border-t shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-in-out',
        isMobile && keyboardOpen ? 'translate-y-[120%]' : 'translate-y-0'
      )}
      aria-hidden={isMobile && keyboardOpen}
    >
      <div
        className={cn(
          'grid h-full max-w-lg mx-auto font-medium',
          hasMiniAppSession ? 'grid-cols-4' : 'grid-cols-5'
        )}
      >
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            (href === '/user' && pathname === '/user') ||
            (href !== '/user' && pathname.startsWith(href));
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'inline-flex flex-col items-center justify-center gap-1 px-2 group transition-colors duration-200',
                isActive ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300',
                  isActive ? 'bg-secondary/10' : 'group-hover:bg-muted'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  'text-xs text-center',
                  isActive && 'font-semibold'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
