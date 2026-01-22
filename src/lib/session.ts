
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Patient } from './definitions';
import jwt from 'jsonwebtoken';

export type MiniAppSession = {
  isAuthenticated: boolean;
  phoneNumber: string;
  authToken: string;
};

type StandaloneSession = {
  patient: Patient;
  expiry: number;
};

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export function parseMiniAppSessionCookie(cookieValue?: string): MiniAppSession | null {
  if (!cookieValue) return null;
  if (!AUTH_SECRET) {
      console.error('AUTH_SECRET not set, cannot verify mini-app session');
      return null;
  }

  try {
    // Attempt to verify as JWT first
    const decoded = jwt.verify(cookieValue, AUTH_SECRET) as MiniAppSession;
    return decoded;
  } catch (jwtError) {
    // If JWT verification fails, try legacy base64 for backward compatibility (during migration)
    // OR decide to reject it. For security, we should reject it, but if we want to avoid breaking active sessions immediately:
    // However, since we are mitigating a vulnerability, we should probably enforce JWT.
    // Let's try legacy but log a warning, OR just reject.
    // Given the user wants "100% mitigated", we should REJECT unsigned cookies.
    // But if the previous code wrote base64, all current users will be logged out. That is acceptable for a security fix.
    
    // Fallback: check if it's the legacy base64 format just to be sure we don't crash on garbage
    // But we won't return it as valid.
    // Actually, let's just return null.
    console.warn('parseMiniAppSessionCookie: JWT verification failed', jwtError);
    return null;
  }
}

export function createMiniAppSessionCookieValue(session: MiniAppSession): string {
    if (!AUTH_SECRET) {
        throw new Error('AUTH_SECRET not set');
    }
    return jwt.sign(session, AUTH_SECRET, { expiresIn: '7d' });
}

export function verifyPatientSessionCookie(token: string): StandaloneSession | null {
  if (!AUTH_SECRET) return null;
  try {
    return jwt.verify(token, AUTH_SECRET) as StandaloneSession;
  } catch (e) {
    return null;
  }
}

export function createPatientSessionToken(patient: Patient): string {
    if (!AUTH_SECRET) {
        throw new Error('AUTH_SECRET not set');
    }
    const session: StandaloneSession = {
        patient,
        expiry: Date.now() + 15 * 60 * 1000 // 15 mins
    };
    return jwt.sign(session, AUTH_SECRET, { expiresIn: '15m' });
}

export async function getPatientFromCookie(): Promise<Patient | null> {
  const cookieStore = cookies();
  
  // 1. Prioritize standalone patient session
  const standaloneSessionCookie = cookieStore.get('nib-tena-patient-session')?.value;
  if (standaloneSessionCookie) {
    const verified = verifyPatientSessionCookie(standaloneSessionCookie);
    if (verified && verified.patient) {
        console.log('getPatientFromCookie: found valid standalone session for patient id:', verified.patient.id);
        return verified.patient;
    }
  }

  // 2. Fallback to mini-app session
  const miniappSessionCookie = cookieStore.get('miniapp_session')?.value;
  if (!miniappSessionCookie) {
    console.log('getPatientFromCookie: no session cookie found.');
    return null;
  }

  const sessionData = parseMiniAppSessionCookie(miniappSessionCookie);
  if (!sessionData) {
      return null;
  }

  try {
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
