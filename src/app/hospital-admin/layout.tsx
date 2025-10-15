
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
  
  if (!session?.user || session.user.role !== 'hospital' || !session.user.hospitalId) {
    // This will handle users who are not hospital admins or somehow lack a hospitalId.
    // The middleware should already handle non-logged-in users, but this is a safeguard.
    return (
       <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
        {children}
      </main>
    );
  }

  const hospital = await prisma.hospital.findUnique({
    where: { id: session.user.hospitalId },
  });

  if (!hospital) {
    // This case might happen if a hospital is deleted but the session is still active.
    // The middleware should handle redirecting to login, but we can be explicit.
    redirect('/hospital-admin/login');
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
