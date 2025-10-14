
'use client';

import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital, SessionData } from '@/lib/definitions';
import { usePathname } from 'next/navigation';

export default function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
  doctor: Doctor | null;
  doctorHospitals: Hospital[];
  session: SessionData;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/doctor-portal/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <DoctorPortalProvider doctor={null} doctorHospitals={[]}>
      <div className="flex min-h-screen w-full">
        <DoctorPortalSidebar />
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
          <DoctorPortalHeader user={{ isLoggedIn: false }} />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </DoctorPortalProvider>
  );
}
