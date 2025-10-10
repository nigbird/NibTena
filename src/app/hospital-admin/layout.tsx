import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';

// In a real app, this would come from an authentication session
const LOGGED_IN_HOSPITAL_ID = 1;

async function getHospital() {
    const hospital = await prisma.hospital.findUnique({
        where: { id: LOGGED_IN_HOSPITAL_ID },
    });
    return hospital;
}

export default async function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hospital = await getHospital();
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
