
'use client';

import SuperAdminSidebar from '@/components/super-admin-sidebar';
import SuperAdminHeader from '@/components/super-admin-header';
import { type SessionData } from '@/lib/definitions';
import { usePathname } from 'next/navigation';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/super-admin/login';
  
  // This is a mock session for layout purposes on non-login pages.
  // The actual session is handled by middleware.
  const mockSession: SessionData = { isLoggedIn: !isLoginPage };
  
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen w-full">
      <SuperAdminSidebar user={mockSession} />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <SuperAdminHeader user={mockSession} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
