

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User } from 'lucide-react';
import BottomNavbar from '@/components/bottom-navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useContext } from 'react';
import { PatientContext } from '@/context/PatientContext';
import Link from 'next/link';

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
  if (path.startsWith('/user/verify/otp')) return 'Verify Account';
  if (path.startsWith('/user/profile/setup')) return 'Edit Profile';
  return 'NibAppointment';
};

export default function UserLayoutClient({
  children,
  hasMiniAppSession,
}: {
  children: React.ReactNode;
  hasMiniAppSession: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { patient } = useContext(PatientContext);
  const isHomePage = pathname === '/user';
  const pageTitle = getTitleForPath(pathname);

  // Determine if the user is authenticated either via NextAuth or our patient context
  const isAuthenticated = !!session?.user || !!patient;
  
  // The login button should only show for standalone web users who are not logged in.
  const showLoginButton = !hasMiniAppSession && !isAuthenticated && isHomePage;


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          {isHomePage ? (
              // Mini App session present
              <div className="flex items-center gap-3">
                 {hasMiniAppSession ? (
                    <>
                      <Avatar className="h-10 w-10 border">
                         {patient?.name && <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>}
                      </Avatar>
                      <div>
                        <p className="text-xs text-muted-foreground">Hi, Welcome!</p>
                        <p className="font-semibold text-foreground">{patient?.name || ''}</p>
                      </div>
                    </>
                 ) : (
                    <>
                    <Avatar className="h-10 w-10 border">
                        {session?.user?.image ? (
                        <AvatarImage
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                        />
                        ) : null}
                        <AvatarFallback>
                          {patient?.name ? patient.name.charAt(0) : <User />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xs text-muted-foreground">Hi, Welcome!</p>
                        <p className="font-semibold text-foreground">{patient?.name || session?.user?.name || ''}</p>
                    </div>
                    </>
                 )}
              </div>
          ) : (
            <div className="flex items-center gap-2">
              {!hasMiniAppSession ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group"
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
                </>
              ) : null}

              <h1 className="font-headline text-xl font-bold text-foreground">
                {pageTitle}
              </h1>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            
            {showLoginButton && (
              <Button asChild variant="accent" size="sm">
                <Link href="/user/profile">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNavbar hasMiniAppSession={hasMiniAppSession} />
    </div>
  );
}
