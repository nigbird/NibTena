
'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital } from '@/lib/definitions';
import { useEffect, useState } from 'react';

export default function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [doctorData, setDoctorData] = useState<{ doctor: Doctor | null; doctorHospitals: Hospital[] }>({ doctor: null, doctorHospitals: [] });
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      setIsLoadingData(true);
      fetch(`/api/doctor-data?id=${session.user.id}`)
        .then(res => {
            if (!res.ok) {
                // Throw an error to be caught by the catch block
                throw new Error('Failed to fetch doctor data');
            }
            return res.json();
        })
        .then(data => {
          setDoctorData(data);
          setIsLoadingData(false);
        })
        .catch(error => {
            console.error("Error fetching doctor data:", error);
            setIsLoadingData(false);
            // Optionally, handle the error state in the UI
        });
    } else if (status !== 'loading') {
      // If there's no session and not loading, we can stop loading
      setIsLoadingData(false);
    }
  }, [session, status]);

  if (pathname === '/doctor-portal/login') {
    return <>{children}</>;
  }

  if (status === 'loading' || isLoadingData) {
    return (
       <div className="flex min-h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session || !doctorData.doctor) {
    // This will protect routes if the session is gone or data fetching fails
    // The middleware should handle the redirect, but this is a safeguard.
    return (
       <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
        {children}
      </main>
    );
  }

  return (
    <DoctorPortalProvider
      doctor={doctorData.doctor}
      doctorHospitals={doctorData.doctorHospitals}
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
