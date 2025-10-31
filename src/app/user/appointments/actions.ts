
'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import { cookies } from 'next/headers';
import type { Patient } from '@/lib/definitions';

// Normalize incoming phone to +251XXXXXXXXX format
function normalizePhoneNumber(input?: string | null) {
  if (!input) return '';
  let s = String(input).trim();
  s = s.replace(/\s+/g, '');
  if (!s.startsWith('251')) s = '251' + s;
  return `+${s}`;
}

export async function getMyAppointments(patientId: number) {
  if (!patientId) return [];

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        doctor: true,
        hospital: true,
      },
      orderBy: {
        appointmentDate: 'desc',
      },
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
      include: { doctor: true, hospital: true },
      orderBy: { appointmentDate: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch appointments by phone:', error);
    return [];
  }
}

async function getPhoneNumberFromCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('miniapp_session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    // Decode base64 if it was encoded before storing
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);

    return session.phoneNumber || null;
  } catch (err) {
    console.error("Failed to parse miniapp_session cookie:", err);
    return null;
  }
}

export async function getMyAppointmentsForMiniApp() {
  const phoneFromCookie = await getPhoneNumberFromCookie();
  
  if (!phoneFromCookie) {
    return [];
  }

  return await getMyAppointmentsByPhone(phoneFromCookie);
}

export async function generateAndSendOtp(phone: string): Promise<{ success: boolean; message: string; otp?: string }> {
  if (!phone) {
    return { success: false, message: 'Invalid phone number.' };
  }
  const fullPhone = normalizePhoneNumber(phone);
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = addMinutes(new Date(), 2);

    // Upsert OTP record so repeated sends update existing record
    await prisma.otp.upsert({
      where: { phone: fullPhone },
      update: { code, expiresAt },
      create: { phone: fullPhone, code, expiresAt },
    });

        console.log(`OTP for ${fullPhone} is: ${code}`); // For testing purposes.
        return { success: true, message: `An OTP has been sent.`, otp: code };
    } catch (error) {
        console.error("OTP generation failed:", error);
        return { success: false, message: "Could not send OTP. Please try again." };
    }
}

export async function verifyOtpAndGetPatient(phone: string, code: string): Promise<{ success: boolean; message: string; patient?: Patient | null;}> {
  if (!phone) {
    return { success: false, message: 'Invalid phone number format for verification.' };
  }
  const fullPhone = normalizePhoneNumber(phone);
    try {
        const otpRecord = await prisma.otp.findFirst({
            where: {
                phone: fullPhone,
                code,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!otpRecord) {
            return { success: false, message: 'Invalid or expired OTP.' };
        }

        await prisma.otp.delete({ where: { id: otpRecord.id } });
        
        let patient = await prisma.patient.findUnique({
            where: { phone: fullPhone }
        });
        
        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    phone: fullPhone,
                    name: `Patient ${phone.substring(5)}`, // Default name using last 4 digits
                }
            });
        }
        
        // Map patient to the expected Patient type (normalize gender to typed union)
        const mappedPatient = patient
            ? ({
                ...patient,
                gender: patient.gender === 'male' ? 'male' : patient.gender === 'female' ? 'female' : null,
              } as Patient)
            : null;

        return { success: true, message: "Verification successful.", patient: mappedPatient };

    } catch (error) {
        console.error("OTP verification failed:", error);
        return { success: false, message: "An error occurred during verification." };
    }
}
