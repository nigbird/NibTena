import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import ReportsPageContent from './ReportsPageContent';

export default async function ReportsPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <ReportsPageContent hospitalId={user.hospitalId} />;
}
