import { Suspense } from 'react';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import DoctorsPageContent from './DoctorsPageContent';

export default async function DoctorsPage() {
    const session = await auth();
    if (!session?.user?.hospitalId) {
        redirect('/hospital-admin/login');
    }
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DoctorsPageContent hospitalId={session.user.hospitalId} />
        </Suspense>
    )
}
