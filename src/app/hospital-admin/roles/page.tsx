
import { Suspense } from 'react';
import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import RolesPageClient from './RolesPageClient';

export default async function RolesPage() {
  const user = await getVerifiedUser();
  if (!user || !user.hospitalId) {
    redirect('/hospital-admin/login');
  }

  return (
    <Suspense fallback={<div>Loading roles...</div>}>
      <RolesPageClient hospitalId={user.hospitalId} />
    </Suspense>
  );
}
