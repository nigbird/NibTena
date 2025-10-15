import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import ScheduleSettingsPageContent from './ScheduleSettingsPageContent';

export default async function ScheduleSettingsPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <ScheduleSettingsPageContent hospitalId={session.user.hospitalId} />;
}
