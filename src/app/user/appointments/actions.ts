'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

/**
 * Fetch all appointments for a given patient.
 */
export async function getMyAppointments(patientId: number) {
  if (!patientId) return [];

  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: { doctor: true, hospital: true },
      orderBy: { appointmentDate: 'desc' },
    });
    return appointments;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    return [];
  }
}

/**
 * Generate and store OTP for login via browser.
 */
export async function generateAndSendOtp(phone: string): Promise<{ success: boolean; message: string; otp?: string }> {
  if (!phone || phone.length !== 9) {
    return { success: false, message: 'Invalid 9-digit phone number.' };
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutes(new Date(), 10);

    await prisma.otp.create({
      data: { phone, code, expiresAt },
    });

    console.log(`OTP for ${phone}: ${code}`);
    return { success: true, message: 'An OTP has been sent.', otp: code };
  } catch (error) {
    console.error('OTP generation failed:', error);
    return { success: false, message: 'Could not send OTP. Please try again.' };
  }
}

/**
 * Verify OTP and return or create patient.
 */
export async function verifyOtpAndGetPatient(phone: string, code: string) {
  if (!phone || phone.length !== 9) {
    return { success: false, message: 'Invalid phone number format for verification.' };
  }

  try {
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }

    await prisma.otp.delete({ where: { id: otpRecord.id } });

    let patient = await prisma.patient.findUnique({ where: { phone } });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          phone,
          name: `Patient ${phone.substring(0, 4)}`,
        },
      });
    }

    return { success: true, patient };
  } catch (error) {
    console.error('OTP verification failed:', error);
    return { success: false, message: 'An error occurred during verification.' };
  }
}

/**
 * Retrieve the patient info for a Super App user.
 * Adjust this to your Super App's authentication data.
 */
export async function getSuperAppPatient(authHeader?: string) {
  if (!authHeader) return null;

  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // Example lookup: adapt for your Super App logic
    const patient = await prisma.patient.findFirst({
      where: { superAppToken: token }, 
    });

    return patient;
  } catch (error) {
    console.error('Failed to get Super App patient:', error);
    return null;
  }
}
