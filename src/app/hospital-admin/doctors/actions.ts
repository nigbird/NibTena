
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Doctor } from '@/lib/definitions';

const DoctorFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
});

export type DoctorFormState = {
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

export async function saveDoctor(
  hospitalId: number, 
  doctorId: number | null, // null for add, number for edit
  prevState: DoctorFormState, 
  formData: FormData
): Promise<DoctorFormState> {
  const validatedFields = DoctorFormSchema.safeParse({
    name: formData.get('name'),
    specialty: formData.get('specialty'),
    experience: formData.get('experience'),
    consultationFee: formData.get('consultationFee'),
    bio: formData.get('bio'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save doctor. Please check the fields.',
      success: false,
    };
  }

  try {
    if (doctorId) {
        await prisma.doctor.update({
            where: { id: doctorId },
            data: validatedFields.data
        });
    } else {
        await prisma.doctor.create({
            data: {
                ...validatedFields.data,
                rating: Math.floor(Math.random() * (50 - 45) + 45) / 10,
                imageId: `doctor-${Math.floor(Math.random() * 7) + 1}`, // Placeholder
                status: 'active',
                hospitals: {
                    create: [
                        {
                            hospital: {
                                connect: { id: hospitalId }
                            }
                        }
                    ]
                }
            }
        });
    }
    revalidatePath('/hospital-admin/doctors');
    revalidatePath('/user/doctors');
    return {
      success: true,
      message: `Doctor ${doctorId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error) {
    return {
      message: 'Database Error: Failed to save doctor.',
      success: false,
    };
  }
}

export async function updateDoctorStatus(doctorId: number, status: 'active' | 'inactive') {
  try {
    await prisma.doctor.update({
        where: { id: doctorId },
        data: { status }
    });
    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: `Doctor has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update doctor status.' };
  }
}

export async function deleteDoctor(doctorId: number) {
    try {
        await prisma.doctorsOnHospitals.deleteMany({ where: { doctorId: doctorId } });
        await prisma.doctor.delete({ where: { id: doctorId } });
        revalidatePath('/hospital-admin/doctors');
        return { success: true, message: 'Doctor deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete doctor.' };
    }
}
