import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import QueueProjectionPageContent from './QueueProjectionPageContent';

export default async function QueueProjectionPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <QueueProjectionPageContent hospitalId={session.user.hospitalId} />;
}
