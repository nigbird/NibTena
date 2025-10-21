
'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

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

export async function generateAndSendOtp(phone: string): Promise<{ success: boolean; message: string; otp?: string }> {
    if (!phone || phone.length !== 9) {
        return { success: false, message: 'Invalid 9-digit phone number.' };
    }
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

        // Upsert OTP for the phone number
        await prisma.otp.upsert({
            where: { phone },
            update: { code, expiresAt },
            create: { phone, code, expiresAt },
        });

        console.log(`OTP for ${phone} is: ${code}`); // For testing purposes.
        return { success: true, message: `An OTP has been sent.`, otp: code };
    } catch (error) {
        console.error("OTP generation failed:", error);
        return { success: false, message: "Could not send OTP. Please try again." };
    }
}
