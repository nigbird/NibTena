
'use server';

import { z } from 'zod';
import { updateDoctor } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const DoctorProfileSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
});

export type DoctorProfileState = {
  errors?: {
    name?: string[];
    specialty?: string[];
    experience?: string[];
    consultationFee?: string[];
    bio?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function updateDoctorProfile(
  doctorId: number,
  prevState: DoctorProfileState,
  formData: FormData
): Promise<DoctorProfileState> {
  const validatedFields = DoctorProfileSchema.safeParse({
    name: formData.get('name'),
    specialty: formData.get('specialty'),
    experience: formData.get('experience'),
    consultationFee: formData.get('consultationFee'),
    bio: formData.get('bio'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update profile. Please check the fields.',
      success: false,
    };
  }

  try {
    const updatedDoctor = await updateDoctor(doctorId, validatedFields.data);
    if (updatedDoctor) {
      revalidatePath('/doctor-portal/profile');
      revalidatePath(`/user/doctors/${doctorId}`); // Revalidate public profile
      return {
        success: true,
        message: 'Your profile has been updated successfully.',
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
