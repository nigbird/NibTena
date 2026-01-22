import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import QueueManagementPageContent from './QueueManagementPageContent';

export default async function QueueManagementPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <QueueManagementPageContent hospitalId={user.hospitalId} />;
}
