import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';

export default function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <DoctorPortalSidebar />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <DoctorPortalHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
