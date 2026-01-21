
import { Suspense } from 'react';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';
import { requireHospitalPermission } from '@/lib/permissions';

export default async function SettingsPage() {
  const session = await auth();
  const hid = session?.user?.hospitalId ? Number(session.user.hospitalId) : null;
  if (!hid) {
    redirect('/hospital-admin/login');
  }

  const allowed = await requireHospitalPermission('Settings:View', hid as number);
  if (!allowed) {
    redirect('/hospital-admin');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* client component will fetch and manage specialties via server actions */}
      <SettingsPageClient hospitalId={hid as number} />
    </Suspense>
  );
}

    