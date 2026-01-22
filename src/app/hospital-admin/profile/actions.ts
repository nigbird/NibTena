
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import { signOut } from '@/../../auth';
import { getVerifiedUser, VerifiedUser } from '@/lib/permissions';

const UserProfileSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export type UserProfileState = {
  errors?: { name?: string[]; email?: string[] };
  message?: string | null;
  success?: boolean;
  updatedUser?: {
    name: string;
    email: string;
  }
};

export async function updateUserProfile(
  userId: number,
  prevState: UserProfileState,
  formData: FormData
): Promise<UserProfileState> {
  const user = await getVerifiedUser();
  if (!user || user.id !== userId) {
    return { success: false, message: 'Unauthorized' };
  }

  // This action is specifically for the User table.
  // Hospital entities manage their details in Settings.
  if (user.entityType !== 'user') {
      return { success: false, message: 'This action is only for staff users.' };
  }

  const validatedFields = UserProfileSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedFields.data,
      select: { name: true, email: true }
    });
    revalidatePath('/hospital-admin/profile');
    return { 
        success: true, 
        message: 'Your profile has been updated.',
        updatedUser: {
            name: updatedUser.name,
            email: updatedUser.email
        }
    };
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

async function getHashedPasswordForUser(user: VerifiedUser) {
    if (user.entityType === 'hospital') {
         const hospital = await prisma.hospital.findUnique({
            where: { id: user.id },
            select: { password: true }
        });
        return hospital?.password;
    } else {
        // Assumes entityType === 'user' (staff)
        const staffUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { password: true }
        });
        return staffUser?.password;
    }
}

export async function updateUserPassword(userId: number, prevState: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
    const user = await getVerifiedUser();
    if (!user || user.id !== userId) {
        return { success: false, message: 'Unauthorized.' };
    }
    
    const validatedFields = PasswordChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
    }
    
    const { currentPassword, newPassword } = validatedFields.data;

    // Enforce strong password policy on the new password (including breach check)
    const pwCheck = await validatePasswordAsync(newPassword);
    if (!pwCheck.valid) {
      return { errors: { newPassword: [pwCheck.errors.join(' ')] }, message: pwCheck.errors.join(' ') };
    }

    try {
        const storedHash = await getHashedPasswordForUser(user);
        if (!storedHash) {
             return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, storedHash);
        if (!passwordsMatch) {
            return { errors: { currentPassword: ['Incorrect current password.'] }, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the correct table based on entityType
        if (user.entityType === 'hospital') {
            await prisma.hospital.update({
                where: { id: userId },
                data: { 
                    password: newHashedPassword,
                    mustChangePassword: false,
                },
            });
        } else {
             await prisma.user.update({
                where: { id: userId },
                data: { 
                    password: newHashedPassword,
                    mustChangePassword: false,
                },
            });
        }

        // Sign out is handled on the client after success
        return { success: true, message: 'Password updated successfully. You will be logged out shortly.' };

    } catch (error) {
        console.error('Password update failed:', error);
        return { success: false, message: 'Failed to update password.' };
    }
}
