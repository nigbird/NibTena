
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Patient } from '@/lib/definitions';

const ProfileSetupSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(13, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
});

export type ProfileSetupState = {
  errors?: {
    name?: string[];
    phone?: string[];
    age?: string[];
    gender?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function updatePatientProfile(
  patientId: number,
  prevState: ProfileSetupState,
  formData: FormData
): Promise<ProfileSetupState> {

  const validatedFields = ProfileSetupSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    age: formData.get('age'),
    gender: formData.get('gender'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update profile. Please check the fields.',
      success: false,
    };
  }

  const { name, phone, age, gender } = validatedFields.data;

  try {
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        name,
        phone,
        age,
        gender,
      },
    });
    
    if (updatedPatient) {
      revalidatePath('/user/profile');
      revalidatePath('/user/profile/setup');
      return {
        success: true,
        message: 'Your profile has been updated successfully.',
      };
    } else {
      return {
        success: false,
        message: 'Failed to find patient to update.',
      };
    }
  } catch (error) {
    console.error('Profile update failed:', error);
    return {
      message: 'An error occurred while updating your profile.',
      success: false,
    };
  }
}
