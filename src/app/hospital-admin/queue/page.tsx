import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import QueueManagementPageContent from './QueueManagementPageContent';

export default async function QueueManagementPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <QueueManagementPageContent hospitalId={session.user.hospitalId} />;
}
