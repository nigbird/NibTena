
import { Suspense } from 'react';
import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import AppointmentsPageContent from './AppointmentsPageContent';


export default async function AppointmentsPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AppointmentsPageContent hospitalId={user.hospitalId} />
        </Suspense>
    )
}

    