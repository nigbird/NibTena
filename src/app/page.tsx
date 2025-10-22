'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PatientContext } from '@/components/patient-portal/patient-context';

export default function RootPage() {
  const router = useRouter();
  const { patientId } = useContext(PatientContext);

  useEffect(() => {
    // If we have a patientId from the SuperApp, go straight to appointments
    if (patientId) {
      router.replace(`/user/appointments?patientId=${patientId}`);
    } else {
      // Otherwise, go to the standard user home page
      router.replace('/user');
    }
  }, [router, patientId]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}
