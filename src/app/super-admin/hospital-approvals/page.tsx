import { getPendingHospitals, getPendingHospitalRequests } from '@/app/super-admin/hospitals/actions';
import HospitalApprovalsClient from './HospitalApprovalsClient';
import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function HospitalApprovalsPage() {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin' || !(['checker','both'] as const).includes((user.superAdminRole as any))) {
    redirect('/super-admin');
  }
  const [pendingHospitals, pendingRequests] = await Promise.all([
    getPendingHospitals(),
    getPendingHospitalRequests(),
  ]);
  return <HospitalApprovalsClient initialHospitals={pendingHospitals} initialRequests={pendingRequests} />;
}

