
'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital } from '@/lib/definitions';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [doctorData, setDoctorData] = useState<{ doctor: Doctor | null; doctorHospitals: Hospital[] }>({ doctor: null, doctorHospitals: [] });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Redirect to login if session is unauthenticated
  useEffect(() => {
    if (pathname !== '/doctor-portal/login' && status === 'unauthenticated') {
      router.push('/doctor-portal/login');
    }
  }, [pathname, status, router]);

  // Redirect if session exists but doctor data load finished with no doctor
  useEffect(() => {
    if (status === 'authenticated' && !isLoadingData && !doctorData.doctor && pathname !== '/doctor-portal/login') {
      router.push('/doctor-portal/login');
    }
  }, [status, isLoadingData, doctorData, pathname, router]);

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
    // Client-side redirect to login when session ends or doctor data missing
    useEffect(() => {
      if (status !== 'loading' && pathname !== '/doctor-portal/login') {
        router.push('/doctor-portal/login');
      }
    }, [status, pathname, router]);

    return null;
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
