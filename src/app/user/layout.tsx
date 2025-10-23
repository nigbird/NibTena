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


  return (
    <PatientProvider initialPatient={patient} initialSuperAppToken={miniappCookie?.value}>
      <UserLayoutClient hasMiniAppSession={hasMiniAppSession}>
        {children}
      </UserLayoutClient>
    </PatientProvider>
  );
}
