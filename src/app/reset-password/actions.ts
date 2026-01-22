
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';

const ResetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export type ResetPasswordState = {
  success: boolean;
  message: string | null;
  errors?: {
    newPassword?: string[];
    confirmPassword?: string[];
  };
  redirectUrl?: string;
};

type DecodedToken = {
  userId: number;
  userType: 'superadmin' | 'hospital' | 'user' | 'doctor';
  email: string;
  iat: number;
  exp: number;
};

export async function resetPassword(
  token: string,
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  // ✅ Add server-side validation for the token
  if (!token) {
    return { success: false, message: 'Invalid or missing reset token.' };
  }
  
  const validatedFields = ResetPasswordSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error('AUTH_SECRET is not set.');
    return { success: false, message: 'Server configuration error.' };
  }

  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;

    const { userId, userType } = decoded;
    const { newPassword } = validatedFields.data;

    // Enforce password policy including breach check
    const pwCheck = await validatePasswordAsync(newPassword);
    if (!pwCheck.valid) {
      return { success: false, message: pwCheck.errors.join(' '), errors: { newPassword: [pwCheck.errors.join(' ')] } };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let redirectUrl = '/';

    switch (userType) {
      case 'superadmin':
        await prisma.superAdmin.update({
          where: { id: userId },
          data: { password: hashedPassword, mustChangePassword: false },
        });
        redirectUrl = '/super-admin/login';
        break;
      case 'hospital':
         await prisma.hospital.update({
          where: { id: userId },
          data: { password: hashedPassword, mustChangePassword: false },
        });
        redirectUrl = '/hospital-admin/login';
        break;
      case 'user':
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword, mustChangePassword: false },
        });
         redirectUrl = '/hospital-admin/login';
        break;
      case 'doctor':
        await prisma.doctor.update({
          where: { id: userId },
          data: { password: hashedPassword, mustChangePassword: false },
        });
        redirectUrl = '/doctor-portal/login';
        break;
      default:
        throw new Error('Invalid user type in token.');
    }

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.',
      redirectUrl: redirectUrl,
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { success: false, message: 'Your password reset link has expired. Please request a new one.' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { success: false, message: 'Invalid reset link. Please try again.' };
    }
    console.error('Error resetting password:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
