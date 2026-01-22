
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { saveImage } from '@/lib/image-upload';
import bcrypt from 'bcryptjs';
import { auth } from '@/../../auth';
import { validatePasswordAsync } from '@/lib/password-policy';
import { createAuditLog } from '@/lib/audit';
import { getVerifiedUser } from '@/lib/permissions';

const DoctorProfileSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  image: z.instanceof(File).optional(),
});

export type DoctorProfileState = {
  errors?: {
    name?: string[];
    specialty?: string[];
    experience?: string[];
    consultationFee?: string[];
    bio?: string[];
    image?: string[];
  };
  message?: string | null;
  success?: boolean;
  updatedDoctor?: {
    name: string;
    imageUrl?: string | null;
  }
};

export async function updateDoctorProfile(
  doctorId: number,
  prevState: DoctorProfileState,
  formData: FormData
): Promise<DoctorProfileState> {
  const user = await getVerifiedUser();
  if (!user || user.id !== doctorId || user.role !== 'doctor') {
    return { success: false, message: 'Unauthorized: You can only update your own profile.' };
  }

  const rawData = Object.fromEntries(formData.entries());
  const imageFile = formData.get('image') as File | null;
  if (!imageFile || imageFile.size === 0) {
    delete rawData.image;
  }

  const validatedFields = DoctorProfileSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update profile. Please check the fields.',
      success: false,
    };
  }

  const { image, ...doctorData } = validatedFields.data;

  try {
    const dataToUpdate: any = doctorData;

    if (image) {
      dataToUpdate.imageUrl = await saveImage(image);
    }
    
    const updatedDoctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: dataToUpdate,
      select: { name: true, imageUrl: true }
    });
    
    if (updatedDoctor) {
      await createAuditLog({
        actorId: doctorId,
        actorType: 'Doctor',
        action: 'UPDATE_OWN_PROFILE',
        targetId: doctorId,
        targetType: 'Doctor',
        changes: dataToUpdate
      });

      revalidatePath('/doctor-portal/profile');
      revalidatePath(`/user/doctors/${doctorId}`); // Revalidate public profile
      return {
        success: true,
        message: 'Your profile has been updated successfully.',
        updatedDoctor: {
            name: updatedDoctor.name,
            imageUrl: updatedDoctor.imageUrl
        }
      };
    } else {
        return {
            success: false,
            message: 'Failed to find doctor to update.'
        }
    }
  } catch (error) {
    console.error('Profile update failed:', error);
    return {
      message: 'An error occurred while updating your profile. Please try again.',
      success: false,
    };
  }
}

export async function getSpecialties() {
  const distinctSpecialties = await prisma.doctor.findMany({
      select: {
          specialty: true,
      },
      distinct: ['specialty'],
  });
  return distinctSpecialties.map(d => d.specialty);
}

export async function getDoctorById(id: number) {
    return await prisma.doctor.findUnique({
        where: { id },
        select: {
            id: true, name: true, specialty: true, imageUrl: true,
            bio: true, consultationFee: true, rating: true,
            experience: true, contact: true, status: true,
            mustChangePassword: true
        }
    });
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

async function getHashedPasswordForDoctor(doctorId: number) {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { password: true }
    });
    return doctor?.password;
}

export async function updateDoctorPassword(doctorId: number, prevState: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
    const user = await getVerifiedUser();
    if (!user || user.id !== doctorId || user.role !== 'doctor') {
        return { success: false, message: 'Unauthorized.' };
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
        const storedHash = await getHashedPasswordForDoctor(doctorId);
        if (!storedHash) {
             return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, storedHash);
        if (!passwordsMatch) {
            return { errors: { currentPassword: ['Incorrect current password.'] }, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.doctor.update({
          where: { id: doctorId },
          data: { 
            password: newHashedPassword,
            mustChangePassword: false,
          },
          select: { id: true }
        });

        // Revoke all sessions (including current one)
        await incrementTokenVersionForRole('doctor', doctorId);

        await createAuditLog({
          actorId: doctorId,
          actorType: 'Doctor',
          action: 'UPDATE_OWN_PASSWORD',
          targetId: doctorId,
          targetType: 'Doctor'
        });

        // Sign out is handled on the client after success
        return { success: true, message: 'Password updated successfully. You will be logged out shortly.' };

    } catch (error) {
        return { success: false, message: 'Failed to update password.' };
    }
}

    