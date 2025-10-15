
'use client';

import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoginPage = pathname === '/hospital-admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
       <div className="flex min-h-screen w-full items-center justify-center">
        {/* You can replace this with a more sophisticated skeleton loader */}
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // The middleware should handle redirects, but this is a client-side safeguard.
    return (
       <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <HospitalAdminSidebar />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
