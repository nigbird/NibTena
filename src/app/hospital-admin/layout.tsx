
import { auth } from '../../../auth';
import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'hospital') {
    redirect('/hospital-admin/login');
  }

  const hospital = await prisma.hospital.findUnique({
    where: { id: session.user.hospitalId! },
  });

  if (!hospital) {
    // This can happen if the hospital is deleted but the session is still active.
    // Log out the user and redirect to login.
    redirect('/api/auth/signout');
  }
  
  const isLoginPage = false; // This layout won't be used for login page

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <HospitalAdminSidebar hospital={hospital} />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
