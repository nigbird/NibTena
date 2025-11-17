
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { auth, signOut } from '@/../../auth';

const UserProfileSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export type UserProfileState = {
  errors?: { name?: string[]; email?: string[] };
  message?: string | null;
  success?: boolean;
};

export async function updateUserProfile(
  userId: number,
  prevState: UserProfileState,
  formData: FormData
): Promise<UserProfileState> {
  const session = await auth();
  if (!session?.user || Number(session.user.id) !== userId) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UserProfileSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
  }

  try {
    // Note: This action only updates staff users in the User table.
    // Hospital owner details are updated via the general settings page.
    await prisma.user.update({
      where: { id: userId },
      data: validatedFields.data,
    });
    revalidatePath('/hospital-admin/profile');
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

async function getHashedPasswordForUser(userId: number, userRole: string) {
    if (userRole === 'hospital') {
         const hospital = await prisma.hospital.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        return hospital?.password;
    } else {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        return user?.password;
    }
}

export async function updateUserPassword(userId: number, prevState: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
    const session = await auth();
    if (!session?.user || Number(session.user.id) !== userId) {
        return { success: false, message: 'Unauthorized.' };
    }

    const validatedFields = PasswordChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
    }
    
    const { currentPassword, newPassword } = validatedFields.data;

    try {
        const storedHash = await getHashedPasswordForUser(userId, session.user.role);
        if (!storedHash) {
             return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, storedHash);
        if (!passwordsMatch) {
            return { errors: { currentPassword: ['Incorrect current password.'] }, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (session.user.role === 'hospital') {
            await prisma.hospital.update({
                where: { id: userId },
                data: { password: newHashedPassword },
            });
        } else {
             await prisma.user.update({
                where: { id: userId },
                data: { password: newHashedPassword },
            });
        }

        // Sign out is handled on the client after success
        return { success: true, message: 'Password updated successfully. You will be logged out shortly.' };

    } catch (error) {
        console.error('Password update failed:', error);
        return { success: false, message: 'Failed to update password.' };
    }
}

    