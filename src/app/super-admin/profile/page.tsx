import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SuperAdminProfilePageClient from './SuperAdminProfilePageClient';

export default async function SuperAdminProfilePage() {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    redirect('/super-admin/login');
  }

  const admin = await prisma.superAdmin.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true },
  });

  if (!admin) {
    redirect('/super-admin/login');
  }

  return <SuperAdminProfilePageClient admin={admin} />;
}
