import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import QueueProjectionPageContent from './QueueProjectionPageContent';

export default async function QueueProjectionPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <QueueProjectionPageContent hospitalId={user.hospitalId} />;
}
