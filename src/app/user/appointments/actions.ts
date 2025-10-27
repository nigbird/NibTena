
'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import { cookies } from 'next/headers';

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

  try {
    // First find the patient by phone number
    const patient = await prisma.patient.findUnique({
      where: { phone }
    });

    if (!patient) {
      return [];
    }

    // Then get appointments for that patient
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
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
    if (!phone || phone.length !== 9) {
        return { success: false, message: 'Invalid 9-digit phone number.' };
    }
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

        await prisma.otp.create({
            data: { phone, code, expiresAt },
        });

        console.log(`OTP for ${phone} is: ${code}`); // For testing purposes.
        return { success: true, message: `An OTP has been sent.`, otp: code };
    } catch (error) {
        console.error("OTP generation failed:", error);
        return { success: false, message: "Could not send OTP. Please try again." };
    }
}

export async function verifyOtpAndGetPatient(phone: string, code: string) {
    if (!phone || phone.length !== 9) {
        return { success: false, message: 'Invalid phone number format for verification.' };
    }
    try {
        const otpRecord = await prisma.otp.findFirst({
            where: {
                phone,
                code,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!otpRecord) {
            return { success: false, message: 'Invalid or expired OTP.' };
        }

        // OTP is valid, delete it so it can't be reused
        await prisma.otp.delete({ where: { id: otpRecord.id } });
        
        const patient = await prisma.patient.findUnique({
            where: { phone }
        });
        
        if (!patient) {
            // If patient doesn't exist, create one. This is for users who want to see appointments but haven't booked one yet.
            const newPatient = await prisma.patient.create({
                data: {
                    phone,
                    name: `Patient ${phone.substring(0,4)}`, // Default name
                }
            });
             return { success: true, patient: newPatient };
        }
        
        return { success: true, patient };

    } catch (error) {
        console.error("OTP verification failed:", error);
        return { success: false, message: "An error occurred during verification." };
    }
}
