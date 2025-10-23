
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export interface MiniAppSession {
  isAuthenticated: boolean;
  phoneNumber: string;
  authToken: string;
}

export async function getMiniAppSession(req?: NextRequest): Promise<MiniAppSession | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('miniapp_session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const sessionData: MiniAppSession = JSON.parse(decodedSession);

    if (sessionData.isAuthenticated && sessionData.phoneNumber) {
      return sessionData;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}
