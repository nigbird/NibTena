'use server';

import { cookies } from 'next/headers';

export async function getMiniAppCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const miniAppSession = cookieStore.get('superapp') || cookieStore.get('miniapp_session');
  return !!miniAppSession?.value;
}
