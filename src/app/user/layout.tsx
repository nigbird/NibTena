import { cookies } from 'next/headers';
import UserLayoutClient from './UserLayoutClient';
import { PatientProvider } from '@/context/PatientContext';
import { getPatientFromCookie, parseMiniAppSessionCookie } from '@/lib/session';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const miniappCookies = cookieStore.getAll('miniapp_session');
  
  // Verify the session cookie properly
  let miniAppSession: ReturnType<typeof parseMiniAppSessionCookie> = null;
  let miniappCookieValue: string | undefined = undefined;

  for (const cookie of miniappCookies) {
      if (!cookie.value) continue;
      const session = parseMiniAppSessionCookie(cookie.value);
      if (session) {
          miniAppSession = session;
          miniappCookieValue = cookie.value;
          break; // Found a valid one
      }
  }

  const hasMiniAppSession = !!miniAppSession;

  const patient = await getPatientFromCookie();

  // If a mini app session cookie exists it was stored as base64(JSON(sessionData)).
  // Decode it here and pass only the auth token to the client-side provider.
  let initialSuperAppToken: string | undefined = undefined;
  
  if (miniAppSession) {
      initialSuperAppToken = miniAppSession.authToken;
  }

  const masked = (t?: string) => (t ? (t.length <= 8 ? '****' : `${t.slice(0,4)}...${t.slice(-4)}`) : null);
  console.log('UserLayout: hasMiniAppSession:', hasMiniAppSession, 'cookieLength:', miniappCookieValue?.length ?? 0);
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
