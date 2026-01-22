'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyCsrfToken } from '@/lib/csrf';

// ✅ Zod schema for validation
const ProfileSetupSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(13, { message: 'Please enter a valid phone number (include +251).' }),
  age: z
    .union([z.coerce.number().gt(0, { message: 'Please enter a valid age.' }), z.nan()])
    .optional()
    .nullable(),
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

// ✅ Update patient profile with validation and revalidation
export async function updatePatientProfile(
  patientId: number,
  formData: FormData
): Promise<ProfileSetupState> {
  const _csrf = formData.get('_csrf') as string | null;
  if (!verifyCsrfToken(_csrf)) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  try {
    const validatedFields = ProfileSetupSchema.safeParse({
      name: formData.get('name'),
      phone: formData.get('phone'),
      age: formData.get('age'),
      gender: formData.get('gender'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Please correct the highlighted errors.',
        success: false,
      };
    }

    const { name, phone, age, gender } = validatedFields.data;

    // ✅ Update patient info in DB
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        name,
        phone,
        age: isNaN(Number(age)) ? null : Number(age),
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
        message: 'Failed to update profile. Patient not found.',
      };
    }
  } catch (error) {
    console.error('❌ Profile update failed:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while updating your profile.',
    };
  }
}
