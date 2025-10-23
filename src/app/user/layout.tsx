import { cookies } from 'next/headers';
import UserLayoutClient from './UserLayoutClient';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const miniappCookie = cookieStore.get('miniapp_session');
  const hasMiniAppSession = !!miniappCookie;

  return (
    <UserLayoutClient hasMiniAppSession={hasMiniAppSession}>
      {children}
    </UserLayoutClient>
  );
}
