
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { auth, signOut } from '@/../../auth';
import type { User as AuthUser } from 'next-auth';

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
  const session = await auth();
  if (!session?.user || Number(session.user.id) !== userId) {
    return { success: false, message: 'Unauthorized' };
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

async function getHashedPasswordForUser(user: AuthUser) {
    const userId = Number(user.id);
    const userSession = await auth();
    const isHospitalOwner = userSession?.user?.hospitalId === userId;


    // The main hospital account's credentials are in the Hospital table.
    // We check if the user's ID matches their hospitalId in the session.
    if (isHospitalOwner) {
         const hospital = await prisma.hospital.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        return hospital?.password;
    } else {
        // All other staff users are in the User table.
        const staffUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        return staffUser?.password;
    }
}

export async function updateUserPassword(userId: number, prevState: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
    const session = await auth();
    if (!session?.user || Number(session.user.id) !== userId) {
        return { success: false, message: 'Unauthorized.' };
    }
     const isHospitalOwner = session?.user?.hospitalId === userId;

    const validatedFields = PasswordChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data.' };
    }
    
    const { currentPassword, newPassword } = validatedFields.data;

    try {
        const storedHash = await getHashedPasswordForUser(session.user);
        if (!storedHash) {
             return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, storedHash);
        if (!passwordsMatch) {
            return { errors: { currentPassword: ['Incorrect current password.'] }, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the correct table based on whether it's the main hospital account
        if (isHospitalOwner) {
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
