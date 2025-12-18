import { cookies } from 'next/headers';
import UserLayoutClient from './UserLayoutClient';
import { PatientProvider } from '@/context/PatientContext';
import { getPatientFromCookie } from '@/lib/session';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const miniappCookie = cookieStore.get('miniapp_session');
  const hasMiniAppSession = !!miniappCookie;

  const patient = await getPatientFromCookie();

  console.log('UserLayout: hasMiniAppSession:', hasMiniAppSession, 'cookieLength:', miniappCookie?.value?.length ?? 0);
  console.log('UserLayout: patient present:', !!patient, patient ? `id=${patient.id}` : null);


  return (
    <PatientProvider initialPatient={patient} initialSuperAppToken={miniappCookie?.value}>
      <UserLayoutClient hasMiniAppSession={hasMiniAppSession}>
        {children}
      </UserLayoutClient>
    </PatientProvider>
  );
}
