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

  // If a mini app session cookie exists it was stored as base64(JSON(sessionData)).
  // Decode it here and pass only the auth token to the client-side provider.
  let initialSuperAppToken: string | undefined = undefined;
  try {
    if (miniappCookie?.value) {
      const decoded = Buffer.from(miniappCookie.value, 'base64').toString('utf-8');
      const session = JSON.parse(decoded);
      initialSuperAppToken = session?.authToken || undefined;
    }
  } catch (err) {
    console.error('UserLayout: failed to decode miniapp_session cookie for initial token:', err);
  }

  const masked = (t?: string) => (t ? (t.length <= 8 ? '****' : `${t.slice(0,4)}...${t.slice(-4)}`) : null);
  console.log('UserLayout: hasMiniAppSession:', hasMiniAppSession, 'cookieLength:', miniappCookie?.value?.length ?? 0);
  console.log('UserLayout: patient present:', !!patient, patient ? `id=${patient.id}` : null);
  console.log('UserLayout: initialSuperAppToken (masked):', masked(initialSuperAppToken));


  return (
    <PatientProvider initialPatient={patient} initialSuperAppToken={initialSuperAppToken}>
      <UserLayoutClient hasMiniAppSession={hasMiniAppSession}>
        {children}
      </UserLayoutClient>
    </PatientProvider>
  );
}
