
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { decryptSessionPayload } from './sessionCrypto';

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
    const decryptedPayload = await decryptSessionPayload(sessionCookie.value);
    if (!decryptedPayload) {
      return null;
    }
    
    const sessionData = JSON.parse(decryptedPayload);

    if (sessionData.phoneNumber && sessionData.accessToken) {
      return {
          isAuthenticated: true,
          phoneNumber: sessionData.phoneNumber,
          authToken: sessionData.accessToken,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}
