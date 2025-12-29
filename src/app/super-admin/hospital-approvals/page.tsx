import { getPendingHospitals, getPendingHospitalRequests } from '@/app/super-admin/hospitals/actions';
import HospitalApprovalsClient from './HospitalApprovalsClient';

export default async function HospitalApprovalsPage() {
  const [pendingHospitals, pendingRequests] = await Promise.all([
    getPendingHospitals(),
    getPendingHospitalRequests(),
  ]);
  return <HospitalApprovalsClient initialHospitals={pendingHospitals} initialRequests={pendingRequests} />;
}

