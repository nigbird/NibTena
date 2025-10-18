
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { saveImage } from '@/lib/image-upload';

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
};

export async function updateDoctorProfile(
  doctorId: number,
  prevState: DoctorProfileState,
  formData: FormData
): Promise<DoctorProfileState> {

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
    });
    
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
    });
}
