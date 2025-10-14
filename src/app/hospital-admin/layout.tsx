
'use client';

import { usePathname } from 'next/navigation';
import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// This is a temporary solution until we have proper async context
async function getHospital(hospitalId: number) {
    // This function will not be used in the client-side rendered layout
    return null;
}

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // We assume a session object is passed from a higher-level provider in a real app
  const session = { isLoggedIn: !pathname.endsWith('/login') }; // Mock session check
  const hospital = null; // Mock hospital data

  const isLoginPage = pathname.endsWith('/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <HospitalAdminSidebar hospital={hospital} user={session} />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <Header user={session} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
