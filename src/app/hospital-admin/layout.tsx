
import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

async function getHospital(hospitalId: number) {
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
    });
    return hospital;
}

export default async function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const hospital = session.userId ? await getHospital(session.userId) : null;
  
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
