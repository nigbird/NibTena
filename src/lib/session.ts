
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
      const rawPhone = String(sessionData.phoneNumber).trim();

      // Build a set of candidate phone formats to increase chance of matching
      const candidates = new Set<string>();
      candidates.add(rawPhone);
      if (!rawPhone.startsWith('+')) candidates.add(`+${rawPhone}`);
      if (rawPhone.startsWith('+')) candidates.add(rawPhone.replace(/^\+/, ''));
      if (rawPhone.startsWith('0')) candidates.add(rawPhone.replace(/^0+/, ''));
      if (!rawPhone.startsWith('0')) candidates.add(`0${rawPhone}`);

      const whereOr = Array.from(candidates).map(p => ({ phone: p }));

      const patient = await prisma.patient.findFirst({
        where: {
          OR: whereOr,
        },
      });

      console.log('getPatientFromCookie: patient lookup result:', patient ? `found id=${patient.id}` : `not found (tried: ${Array.from(candidates).join(', ')})`);
      return patient;
    }
    return null;
  } catch (error) {
    console.error('getPatientFromCookie: Failed to parse session cookie:', error);
    return null;
  }
}
