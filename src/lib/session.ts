
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
    return null;
  }

  try {
    const sessionData: MiniAppSession = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );
    
    if (sessionData && sessionData.phoneNumber) {
      const patient = await prisma.patient.findUnique({
        where: { phone: sessionData.phoneNumber },
      });
      return patient;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}
