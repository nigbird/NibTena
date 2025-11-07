
import { Suspense } from 'react';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import RolesPageClient from './RolesPageClient';

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user?.hospitalId) {
    redirect('/hospital-admin/login');
  }

  return (
    <Suspense fallback={<div>Loading roles...</div>}>
      <RolesPageClient hospitalId={session.user.hospitalId} />
    </Suspense>
  );
}
