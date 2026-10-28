

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, User } from 'lucide-react';
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
  if (path.startsWith('/user/pay/')) return 'Payment';
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
      <header className={cn(
        "sticky top-0 z-40 w-full backdrop-blur-sm",
        isHomePage ? "bg-[hsl(var(--primary-foreground))] text-white" : "border-b bg-card/95"
      )}>
        <div className="flex h-16 items-center">
          {isHomePage ? (
              // Mini App session present
              <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4">
                 {hasMiniAppSession ? (
                    <>
                      <Avatar className="h-10 w-10 ring-2 ring-white/25">
                         {patient?.name && <AvatarFallback className="bg-white/15 text-white font-semibold">{patient.name.charAt(0)}</AvatarFallback>}
                      </Avatar>
                      <div>
                        <p className="text-xs text-white/70">Hi, Welcome!</p>
                        <p className="font-semibold text-white">{patient?.name || ''}</p>
                      </div>
                    </>
                 ) : (
                    <>
                    <Avatar className="h-10 w-10 ring-2 ring-white/25">
                        {session?.user?.image ? (
                        <AvatarImage
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                        />
                        ) : null}
                        <AvatarFallback className="bg-white/15 text-white font-semibold">
                          {patient?.name ? patient.name.charAt(0) : <User className="h-5 w-5" />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xs text-white/70">Hi, Welcome!</p>
                        <p className="font-semibold text-white">{patient?.name || session?.user?.name || ''}</p>
                    </div>
                    </>
                 )}
                 <div className="ml-auto flex items-center gap-2">
                   {showLoginButton && (
                     <Button asChild size="sm" className="rounded-full bg-white px-5 font-semibold text-secondary hover:bg-white/90">
                       <Link href="/user/profile">Login</Link>
                     </Button>
                   )}
                 </div>
              </div>
          ) : (
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4">
              {!hasMiniAppSession && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 h-9 w-9 shrink-0 rounded-full text-secondary hover:bg-secondary/10 hover:text-secondary"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back</span>
                </Button>
              )}
              <h1 className="truncate font-headline text-lg font-bold tracking-tight text-foreground">
                {pageTitle}
              </h1>
              <div className="ml-auto flex items-center gap-2">
                {showLoginButton && (
                  <Button asChild variant="brand" size="sm" className="rounded-full px-5 font-semibold">
                    <Link href="/user/profile">Login</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNavbar hasMiniAppSession={hasMiniAppSession} />
    </div>
  );
}
