
import { redirect } from 'next/navigation';
import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

async function getHospital(hospitalId: number) {
    if (!hospitalId) return null;
    return await prisma.hospital.findUnique({
        where: { id: hospitalId }
    });
}

export default async function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn || session.role !== 'hospital' || !session.hospitalId) {
    redirect('/hospital-admin/login');
  }
  
  const hospital = await getHospital(session.hospitalId);

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
