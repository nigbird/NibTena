import { Suspense } from 'react';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import AppointmentsPageContent from './AppointmentsPageContent';


export default async function AppointmentsPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AppointmentsPageContent hospitalId={session.user.hospitalId} />
        </Suspense>
    )
}
