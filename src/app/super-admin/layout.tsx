
'use client';

import SuperAdminSidebar from '@/components/super-admin-sidebar';
import SuperAdminHeader from '@/components/super-admin-header';
// layout for super-admin
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/super-admin/login';
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if session is unauthenticated (client-side safeguard)
  useEffect(() => {
    if (!isLoginPage && status === 'unauthenticated') {
      router.push('/super-admin/login');
    }
  }, [isLoginPage, status, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen w-full">
      <SuperAdminSidebar />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <SuperAdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
