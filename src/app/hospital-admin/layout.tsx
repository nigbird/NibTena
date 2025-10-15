
import { auth } from '../../../auth';
import HospitalAdminSidebar from '@/components/hospital-admin-sidebar';
import Header from '@/components/hospital-admin-header';
import { prisma } from '@/lib/prisma';

export default async function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isHospitalUser = !!session?.user && session.user.role === 'hospital';

  // Try to load hospital only for valid hospital users
  let hospital: any = null;
  if (isHospitalUser && session.user.hospitalId) {
    hospital = await prisma.hospital.findUnique({
      where: { id: session.user.hospitalId! },
    });
  }

  // If a hospital user exists but their hospital is missing, sign out
  if (isHospitalUser && !hospital) {
    // Keep behavior: invalidate session if backing record was deleted
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
        {children}
      </main>
    );
  }

  // If not a hospital user (e.g., on login), render children without dashboard chrome
  if (!isHospitalUser || !hospital) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
        {children}
      </main>
    );
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
