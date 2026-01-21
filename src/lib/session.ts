
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Patient } from './definitions';

type MiniAppSession = {
  isAuthenticated: boolean;
  phoneNumber: string;
  authToken: string;
};

type StandaloneSession = {
  patient: Patient;
  expiry: number;
};

export async function getPatientFromCookie(): Promise<Patient | null> {
  const cookieStore = cookies();
  
  // 1. Prioritize standalone patient session
  const standaloneSessionCookie = cookieStore.get('nib-tena-patient-session')?.value;
  if (standaloneSessionCookie) {
    try {
      const session: StandaloneSession = JSON.parse(standaloneSessionCookie);
      if (Date.now() < session.expiry && session.patient) {
        console.log('getPatientFromCookie: found valid standalone session for patient id:', session.patient.id);
        return session.patient;
      }
    } catch (error) {
      console.error('getPatientFromCookie: Failed to parse standalone session cookie:', error);
    }
  }

  // 2. Fallback to mini-app session
  const miniappSessionCookie = cookieStore.get('miniapp_session')?.value;
  if (!miniappSessionCookie) {
    console.log('getPatientFromCookie: no session cookie found.');
    return null;
  }

  try {
    const decoded = Buffer.from(miniappSessionCookie, 'base64').toString('utf-8');
    let sessionData: MiniAppSession | null = null;
    try {
      sessionData = JSON.parse(decoded) as MiniAppSession;
    } catch (err) {
      console.error('getPatientFromCookie: failed to JSON.parse decoded mini-app cookie', err);
      return null;
    }

    if (sessionData && sessionData.phoneNumber) {
      const rawPhone = String(sessionData.phoneNumber).trim();
      const candidates = new Set<string>();
      candidates.add(rawPhone);
      if (!rawPhone.startsWith('+')) candidates.add(`+${rawPhone}`);
      if (rawPhone.startsWith('+')) candidates.add(rawPhone.replace(/^\+/, ''));
      if (rawPhone.startsWith('0')) candidates.add(rawPhone.replace(/^0+/, ''));
      if (!rawPhone.startsWith('0')) candidates.add(`0${rawPhone}`);
      if (rawPhone.startsWith('251')) candidates.add(`+${rawPhone}`);
      if (rawPhone.startsWith('+251')) candidates.add(rawPhone.slice(1));
      
      const whereOr = Array.from(candidates).map(p => ({ phone: p }));

      const patient = await prisma.patient.findFirst({
        where: { OR: whereOr },
      });

      console.log('getPatientFromCookie: mini-app patient lookup result:', patient ? `found id=${patient.id}` : `not found`);
      return patient;
    }
    return null;
  } catch (error) {
    console.error('getPatientFromCookie: Failed to parse mini-app session cookie:', error);
    return null;
  }
}
