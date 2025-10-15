import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import ReportsPageContent from './ReportsPageContent';

export default async function ReportsPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <ReportsPageContent hospitalId={session.user.hospitalId} />;
}
