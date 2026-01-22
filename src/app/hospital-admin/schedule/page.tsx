import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import ScheduleSettingsPageContent from './ScheduleSettingsPageContent';

export default async function ScheduleSettingsPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    return <ScheduleSettingsPageContent hospitalId={user.hospitalId} />;
}
