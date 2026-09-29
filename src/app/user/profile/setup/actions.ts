'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyCsrfToken } from '@/lib/csrf';
import { getPatientFromCookie } from '@/lib/session';

// ✅ Zod schema for validation
const ProfileSetupSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
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
// The patient is always taken from the signed session cookie; the patientId
// argument from the client is only checked against it, never trusted.
export async function updatePatientProfile(
  patientId: number,
  formData: FormData
): Promise<ProfileSetupState> {
  const sessionPatient = await getPatientFromCookie();
  if (!sessionPatient || sessionPatient.id !== patientId) {
    return { success: false, message: 'Unauthorized: You can only update your own profile.' };
  }

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  try {
    // Phone is the login identity and cannot be changed here.
    const validatedFields = ProfileSetupSchema.safeParse({
      name: formData.get('name'),
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

    const { name, age, gender } = validatedFields.data;

    // ✅ Update patient info in DB
    const updatedPatient = await prisma.patient.update({
      where: { id: sessionPatient.id },
      data: {
        name,
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
