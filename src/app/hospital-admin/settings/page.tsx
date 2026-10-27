import { Suspense } from 'react';
import { getVerifiedUser, requireHospitalPermission, PAYMENT_SETTINGS_PERMISSION } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
  const user = await getVerifiedUser();
  if (!user || !user.hospitalId) {
    redirect('/hospital-admin/login');
  }

  const canViewGeneral = await requireHospitalPermission('Settings:View', user.hospitalId);
  // Only the hospital's own admin or payment-settings staff; never super admins.
  const canManagePayments = user.role === 'hospital' && (user.isAdmin || user.permissions.includes(PAYMENT_SETTINGS_PERMISSION));
  if (!canViewGeneral && !canManagePayments) {
    redirect('/hospital-admin');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* client component will fetch and manage specialties via server actions */}
      <SettingsPageClient hospitalId={user.hospitalId} canViewGeneral={canViewGeneral} canManagePayments={canManagePayments} />
    </Suspense>
  );
}

