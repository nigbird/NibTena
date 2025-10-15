
'use client';

import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital } from '@/lib/definitions';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// This is a mock function, in a real scenario this would be a server action
async function getDoctorData(userId: string): Promise<{ doctor: any; doctorHospitals: any[] }> {
  // This function would fetch doctor data based on the user ID.
  // Since we are on the client, we cannot use prisma directly.
  // The session should ideally contain all necessary info or we'd call an API route.
  // For now, we'll rely on the session data passed to the provider.
  return { doctor: null, doctorHospitals: [] };
}


export default function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoginPage = pathname === '/doctor-portal/login';

  // These would be populated by a server call in a real app
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorHospitals, setDoctorHospitals] = useState<Hospital[]>([]);

  // This is a simplified client-side representation.
  // A robust app would fetch this from an API endpoint protected by the session.
  useEffect(() => {
    if (session?.user?.role === 'doctor') {
      // In a real app, you'd fetch this from an API like /api/doctor/me
      const mockDoctor = {
        id: parseInt(session.user.id, 10),
        name: session.user.name,
        // Other fields would be part of the API response
      } as Doctor;
      setDoctor(mockDoctor);
      // Similarly, hospitals would be fetched.
    }
  }, [session]);


  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
       <div className="flex min-h-screen w-full items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
     // The middleware should handle redirects, but this is a safeguard.
     // It shows the children (which should be the login page if middleware worked)
     // or a protected page which will then be redirected by middleware.
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
        </main>
    );
  }
  
  // This part is now only for authenticated users on non-login pages
  return (
    <DoctorPortalProvider
      doctor={doctor as Doctor}
      doctorHospitals={doctorHospitals as Hospital[]}
    >
      <div className="flex min-h-screen w-full">
        <DoctorPortalSidebar />
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
          <DoctorPortalHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </DoctorPortalProvider>
  );
}
