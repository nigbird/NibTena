
import { Suspense } from 'react';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.hospitalId) {
    redirect('/hospital-admin/login');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* client component will fetch and manage specialties via server actions */}
      <SettingsPageClient hospitalId={session.user.hospitalId} />
    </Suspense>
  );
}

    