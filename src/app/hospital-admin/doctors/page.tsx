import { Suspense } from 'react';
import { getVerifiedUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import DoctorsPageContent from './DoctorsPageContent';

export default async function DoctorsPage() {
    const user = await getVerifiedUser();
    if (!user || !user.hospitalId) {
        redirect('/hospital-admin/login');
    }
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DoctorsPageContent hospitalId={user.hospitalId} />
        </Suspense>
    )
}
