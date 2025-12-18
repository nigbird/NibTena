'use server';

import { cookies } from 'next/headers';

export async function getMiniAppCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const miniAppSession = cookieStore.get('miniapp_session');
  console.log('getMiniAppCookie: miniapp_session present:', !!miniAppSession?.value, 'rawLength:', miniAppSession?.value?.length ?? 0);
  return !!miniAppSession?.value;
}
