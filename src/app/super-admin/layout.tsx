
import SuperAdminSidebar from '@/components/super-admin-sidebar';
import SuperAdminHeader from '@/components/super-admin-header';
import { getSession } from '@/lib/session';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  return (
    <div className="flex min-h-screen w-full">
      <SuperAdminSidebar user={session} />
      <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
        <SuperAdminHeader user={session} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
