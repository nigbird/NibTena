
'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital } from '@/lib/definitions';
import { useEffect, useState } from 'react';

async function getDoctorData(userId: string): Promise<{ doctor: Doctor | null; doctorHospitals: Hospital[] }> {
  if (!userId) return { doctor: null, doctorHospitals: [] };

  const doctorId = parseInt(userId, 10);
  if (isNaN(doctorId)) return { doctor: null, doctorHospitals: [] };

  // This function will be called from the client, so we need to fetch
  const res = await fetch(`/api/doctor-data?id=${doctorId}`);
  if (!res.ok) {
    return { doctor: null, doctorHospitals: [] };
  }
  const data = await res.json();
  return data;
}

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
        .then(res => res.json())
        .then(data => {
          setDoctorData(data);
          setIsLoadingData(false);
        });
    } else {
      setIsLoadingData(false);
    }
  }, [session]);

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
