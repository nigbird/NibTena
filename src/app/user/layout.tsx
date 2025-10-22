'use client';

import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { User, LogIn } from 'lucide-react';
import BottomNavbar from '@/components/bottom-navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PatientContext } from '@/components/patient-portal/patient-context';

const pageTitles: { [key: string]: string } = {
  '/user': 'Home',
  '/user/doctors': 'Doctors',
  '/user/hospitals': 'Hospitals',
  '/user/appointments': 'My Appointments',
  '/user/profile': 'My Profile',
};

const getTitleForPath = (path: string) => {
  if (pageTitles[path]) return pageTitles[path];
  if (path.startsWith('/user/doctors/')) return 'Doctor Profile';
  if (path.startsWith('/user/hospitals/')) return 'Hospital Details';
  if (path.startsWith('/user/book/')) return 'Book Appointment';
  if (path.startsWith('/user/search')) return 'Search Results';
  if (path.startsWith('/user/confirmation')) return 'Confirmation';
  return 'nibappointment';
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { patientId: superAppPatientId } = useContext(PatientContext);

  const [isSuperApp, setIsSuperApp] = useState(false);

  // ✅ Read "superapp" cookie on the client
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)superapp=([^;]*)/);
    const cookieValue = match ? decodeURIComponent(match[1]) : '0';
    setIsSuperApp(cookieValue === '1');
  }, []);

  const isHomePage = pathname === '/user';
  const pageTitle = getTitleForPath(pathname);
  const isLoggedIn = !!session || !!superAppPatientId;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ✅ Hide header entirely if inside Super App */}
      {!isSuperApp && (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
          <div className="container flex h-16 items-center">
            {isHomePage ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  {session?.user?.image ? (
                    <AvatarImage
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                    />
                  ) : null}
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Hi, Welcome!</p>
                  <p className="font-semibold text-foreground">
                    {session?.user?.name || 'Guest'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 group"
                  onClick={() => router.back()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6 fill-secondary transition-colors duration-200 group-hover:fill-primary"
                    aria-hidden="true"
                  >
                    <path d="M10.78 19.03a.75.75 0 0 1-1.06 0l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 1 1 1.06 1.06L4.81 11.5h14.44a.75.75 0 0 1 0 1.5H4.81l5.97 5.97a.75.75 0 0 1 0 1.06Z" />
                  </svg>
                  <span className="sr-only">Back</span>
                </Button>
                <h1 className="font-headline text-xl font-bold text-foreground">
                  {pageTitle}
                </h1>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {!isLoggedIn && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/user/appointments">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 pb-24">{children}</main>
      <BottomNavbar />
    </div>
  );
}
