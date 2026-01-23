

'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import { cookies } from 'next/headers';
import type { Patient } from '@/lib/definitions';
import { createAndStoreOtp, verifyAndConsumeOtp } from '@/lib/otp';
import { createPatientSessionToken, verifyPatientSessionCookie } from '@/lib/session';
import { getVerifiedUser } from '@/lib/permissions';

// Normalize incoming phone to canonical 251XXXXXXXXX format (no leading '+')
function normalizePhoneNumber(input?: string | null) {
  if (!input) return '';
  let s = String(input).trim();
  s = s.replace(/\s+/g, '');
  if (!s.startsWith('251')) s = '251' + s;
  // Return canonical storage format without a leading '+' (e.g. 251908279572)
  return s;
}

export async function getMyAppointments(patientId: number) {
  if (!patientId) return [];

  let isAuthorized = false;

  // 1. Check NextAuth session
  const user = await getVerifiedUser();
  if (user) {
    if (user.role === 'patient') {
       if (user.id === patientId) {
          isAuthorized = true;
       } else {
          console.error('[getMyAppointments] Unauthorized access attempt', { userId: user.id, requestedId: patientId });
       }
    }
  } 
  
  // 2. Check Standalone Patient Session (nib-tena-patient-session)
  if (!isAuthorized) {
     const cookieStore = await cookies();
     const patientSession = cookieStore.get('nib-tena-patient-session')?.value;
     if (patientSession) {
         const verified = verifyPatientSessionCookie(patientSession);
         if (verified && verified.patient && verified.patient.id === patientId) {
             isAuthorized = true;
         }
     }
  }

  if (!isAuthorized) {
     // No session? Maybe it's the MiniApp flow which doesn't use standard NextAuth session but cookies?
     // If so, this function shouldn't be called directly without auth, or it should rely on the caller to verify?
     // But wait, this is a server action. If called from client, we need verification.
     // The "MiniApp" flow uses `getMyAppointmentsForMiniApp` which verifies cookie.
     // The "Web" flow uses `getMyAppointments` and SHOULD have a session.
     // If no session is found, we should probably deny access to protect data.
     return [];
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: patientId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            contact: true,
            specialty: true,
            imageUrl: true,
            bio: true,
            consultationFee: true,
            rating: true,
            experience: true,
            status: true,
          }
        },
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            imageUrl: true,
            contactEmail: true,
            contactPhone: true,
            status: true,
          }
        }
      },
      orderBy: { appointmentDate: 'desc' },
    });
    return appointments;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    return [];
  }
}

export async function getMyAppointmentsByPhone(phone: string) {
  if (!phone) return [];

  const normalized = normalizePhoneNumber(phone);

  try {
    // findFirst lets us check multiple possible formats
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: phone },        // e.g. "0912345678"
          { phone: normalized },   // e.g. "+251912345678"
        ],
      },
    });

    if (!patient) return [];

    return prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            contact: true,
            specialty: true,
            imageUrl: true,
            bio: true,
            consultationFee: true,
            rating: true,
            experience: true,
            status: true,
          }
        },
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            imageUrl: true,
            contactEmail: true,
            contactPhone: true,
            status: true,
          }
        }
      },
      orderBy: { appointmentDate: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch appointments by phone:', error);
    return [];
  }
}

async function getPhoneNumberFromCookie() {
  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll('miniapp_session');

  if (sessionCookies.length === 0) {
    return null;
  }

  // Iterate over all cookies to find a valid one
  for (const cookie of sessionCookies) {
    if (!cookie.value) continue;
    try {
      const { parseMiniAppSessionCookie } = await import('@/lib/session');
      const session = parseMiniAppSessionCookie(cookie.value);
      
      if (!session) {
         continue;
      }

      console.log('appointments.getPhoneNumberFromCookie: phoneNumber:', session.phoneNumber || null);
      return session.phoneNumber || null;
    } catch (err) {
      console.warn("Failed to parse one of the miniapp_session cookies:", err);
    }
  }
  return null;
}

export async function getMyAppointmentsForMiniApp() {
  const phoneFromCookie = await getPhoneNumberFromCookie();
  
  if (!phoneFromCookie) {
    return [];
  }
  console.log('getMyAppointmentsForMiniApp: phoneFromCookie:', phoneFromCookie);
  const appointments = await getMyAppointmentsByPhone(phoneFromCookie);
  if (!appointments) {
    return [];
  }
  return appointments;
}

export async function generateAndSendOtp(phone: string): Promise<{ success: boolean; message: string; otp?: string }> {
  if (!phone) {
    return { success: false, message: 'Invalid phone number.' };
  }
  const fullPhone = normalizePhoneNumber(phone);
  try {
    const code = await createAndStoreOtp(fullPhone);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`OTP for ${fullPhone} is: ${code}`);
    } else {
      console.log(`OTP generated for ${fullPhone}`);
    }
    return { success: true, message: `An OTP has been sent.`, otp: code };
  } catch (error) {
    console.error('OTP generation failed:', error);
    return { success: false, message: 'Could not send OTP. Please try again.' };
  }
}

export async function verifyOtpAndGetPatient(phone: string, code: string): Promise<{ success: boolean; message: string; patient?: Patient | null;}> {
  if (!phone) {
    return { success: false, message: 'Invalid phone number format for verification.' };
  }
  const fullPhone = normalizePhoneNumber(phone);
  try {
    const result = await verifyAndConsumeOtp(fullPhone, code);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    let patient = await prisma.patient.findUnique({ where: { phone: fullPhone } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { phone: fullPhone, name: `Patient ${phone.substring(5)}` } });
    }

    const mappedPatient = patient
      ? ({ ...patient, gender: patient.gender === 'male' ? 'male' : patient.gender === 'female' ? 'female' : null } as Patient)
      : null;

    if (mappedPatient) {
        const sessionToken = createPatientSessionToken(mappedPatient);
        const cookieStore = await cookies();
        cookieStore.set('nib-tena-patient-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60 // 15 minutes
        });
    }

    return { success: true, message: 'Verification successful.', patient: mappedPatient };
  } catch (error) {
    console.error('OTP verification failed:', error);
    return { success: false, message: 'An error occurred during verification.' };
  }
}

export async function logoutPatient() {
  const cookieStore = await cookies();
  cookieStore.delete('nib-tena-patient-session');
  return { success: true };
}
