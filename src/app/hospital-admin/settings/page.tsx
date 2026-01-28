import { Suspense } from 'react';
import { getVerifiedUser, requireHospitalPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
  const user = await getVerifiedUser();
  if (!user || !user.hospitalId) {
    redirect('/hospital-admin/login');
  }

  const allowed = await requireHospitalPermission('Settings:View', user.hospitalId);
  if (!allowed) {
    redirect('/hospital-admin');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* client component will fetch and manage specialties via server actions */}
      <SettingsPageClient hospitalId={user.hospitalId} />
    </Suspense>
  );
}

