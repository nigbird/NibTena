
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
