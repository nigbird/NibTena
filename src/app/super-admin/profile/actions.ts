'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import { getVerifiedUser } from '@/lib/permissions';
import { verifyCsrfToken } from '@/lib/csrf';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';

const ProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export type ProfileState = {
  errors?: { name?: string[]; email?: string[] };
  message?: string | null;
  success?: boolean;
};

export async function updateSuperAdminProfile(userId: number, prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getVerifiedUser();
  if (!user || user.id !== userId || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const validatedFields = ProfileSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
  }

  try {
    const admin = await prisma.superAdmin.findUnique({ where: { id: userId }, select: { email: true } });
    if (!admin) return { success: false, message: 'User not found.' };

    const emailChanged = admin.email !== validatedFields.data.email;

    await prisma.superAdmin.update({
      where: { id: userId },
      data: validatedFields.data,
    });

    if (emailChanged) {
      await incrementTokenVersionForRole('superadmin', userId);
      return { success: true, message: 'Profile updated. Since your email changed, you will be logged out to sign in again.' };
    }

    revalidatePath('/super-admin/profile');
    return { success: true, message: 'Your profile has been updated.' };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, message: 'An account with this email already exists.' };
    }
    return { success: false, message: 'Failed to update profile.' };
  }
}

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match.',
  path: ['confirmPassword'],
});

export type PasswordChangeState = {
  errors?: { currentPassword?: string[]; newPassword?: string[]; confirmPassword?: string[]; };
  message?: string | null;
  success?: boolean;
};

export async function updateSuperAdminPassword(userId: number, prevState: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
    const user = await getVerifiedUser();
    if (!user || user.id !== userId || user.role !== 'superadmin') {
        return { success: false, message: 'Unauthorized.' };
    }

    const _csrf = formData.get('_csrf') as string | null;
    if (!(await verifyCsrfToken(_csrf))) {
      return { success: false, message: 'Invalid or missing CSRF token.' };
    }

    const validatedFields = PasswordChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
    }
    
    const { currentPassword, newPassword } = validatedFields.data;

    const pwCheck = await validatePasswordAsync(newPassword);
    if (!pwCheck.valid) {
      return { errors: { newPassword: [pwCheck.errors.join(' ')] }, message: pwCheck.errors.join(' ') };
    }

    try {
        const admin = await prisma.superAdmin.findUnique({ where: { id: userId }, select: { password: true } });
        if (!admin) {
             return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!passwordsMatch) {
            return { errors: { currentPassword: ['Incorrect current password.'] }, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.superAdmin.update({
            where: { id: userId },
            data: { password: newHashedPassword, mustChangePassword: false },
        });

        await incrementTokenVersionForRole('superadmin', userId);

        return { success: true, message: 'Password updated successfully. You will be logged out shortly to sign in again.' };

    } catch (error) {
        console.error('Password update failed:', error);
        return { success: false, message: 'Failed to update password.' };
    }
}
