import { getPendingHospitals } from '@/app/super-admin/hospitals/actions';
import HospitalApprovalsClient from './HospitalApprovalsClient';

export default async function HospitalApprovalsPage() {
  const pending = await getPendingHospitals();
  return <HospitalApprovalsClient initialHospitals={pending} />;
}

