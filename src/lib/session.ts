
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Patient } from './definitions';

type MiniAppSession = {
  isAuthenticated: boolean;
  phoneNumber: string;
  authToken: string;
};

export async function getPatientFromCookie(): Promise<Patient | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('miniapp_session');

  if (!sessionCookie) {
    console.log('getPatientFromCookie: no miniapp_session cookie present');
    return null;
  }

  try {
    console.log('getPatientFromCookie: raw cookie length:', sessionCookie.value?.length ?? 0);
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    let sessionData: MiniAppSession | null = null;
    try {
      sessionData = JSON.parse(decoded) as MiniAppSession;
    } catch (err) {
      console.error('getPatientFromCookie: failed to JSON.parse decoded cookie', err);
      return null;
    }

    // Mask auth token for logs
    const maskToken = (t?: string | null) => {
      if (!t) return null;
      if (t.length <= 8) return '****';
      return `${t.slice(0, 4)}...${t.slice(-4)}`;
    };

    console.log('getPatientFromCookie: sessionData:', {
      isAuthenticated: sessionData.isAuthenticated,
      phoneNumber: sessionData.phoneNumber,
      authToken: maskToken(sessionData.authToken),
    });

    if (sessionData && sessionData.phoneNumber) {
      const patient = await prisma.patient.findUnique({
        where: { phone: sessionData.phoneNumber },
      });
      console.log('getPatientFromCookie: patient lookup result:', patient ? `found id=${patient.id}` : 'not found');
      return patient;
    }
    return null;
  } catch (error) {
    console.error('getPatientFromCookie: Failed to parse session cookie:', error);
    return null;
  }
}
