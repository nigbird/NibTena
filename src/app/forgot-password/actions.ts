
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from '@/lib/email-actions';

const RequestResetSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export type RequestResetState = {
  success: boolean;
  message: string | null;
};

type UserIdentity = {
  id: number;
  type: 'superadmin' | 'hospital' | 'user' | 'doctor';
  email: string;
  hospitalId?: number | null;
};

export async function requestPasswordReset(
  prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const validatedFields = RequestResetSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: validatedFields.error.flatten().fieldErrors.email?.[0] || 'Invalid email format.',
    };
  }

  const { email } = validatedFields.data;

  try {
    let user: UserIdentity | null = null;

    const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
    if (superAdmin) {
      user = { id: superAdmin.id, type: 'superadmin', email: superAdmin.email, hospitalId: null };
    }

    if (!user) {
      const hospital = await prisma.hospital.findUnique({ where: { contactEmail: email } });
      if (hospital) {
        user = { id: hospital.id, type: 'hospital', email: hospital.contactEmail, hospitalId: hospital.id };
      }
    }

    if (!user) {
      const staffUser = await prisma.user.findUnique({ where: { email } });
      if (staffUser) {
        user = { id: staffUser.id, type: 'user', email: staffUser.email, hospitalId: staffUser.hospitalId ?? null };
      }
    }
    
    if (!user) {
      const doctor = await prisma.doctor.findUnique({ where: { contact: email } });
      if (doctor) {
        // Try to pick a hospital associated with the doctor (if any)
        const docHospital = await prisma.doctorsOnHospitals.findFirst({ where: { doctorId: doctor.id } });
        user = { id: doctor.id, type: 'doctor', email: doctor.contact, hospitalId: docHospital?.hospitalId ?? null };
      }
    }
    
    if (!user) {
      return { success: false, message: 'No account found with that email address.' };
    }

    // User found, create JWT
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('AUTH_SECRET is not set.');
    }

    const token = jwt.sign(
      { userId: user.id, userType: user.type, email: user.email },
      secret,
      { expiresIn: '15m' } // Token is valid for 15 minutes
    );

    // Send email with reset link
    const emailResult = await sendPasswordResetEmail(user.email, token, user.hospitalId ?? undefined);

    if (emailResult.success) {
      return {
        success: true,
        message: `If an account exists for ${email}, a password reset link has been sent.`,
      };
    } else {
      return {
        success: false,
        message: 'Could not send reset email. Please try again later.',
      };
    }

  } catch (error) {
    console.error('Error during password reset request:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
