'use server';

import { z } from 'zod';
import { 
  addDoctor as addDoctorData, 
  updateDoctor as updateDoctorData,
  deleteDoctor as deleteDoctorData,
} from '@/lib/data';
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
  newDoctor?: Doctor;
};

export async function addDoctor(
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
      // Editing existing doctor
      const updatedDoctor = await updateDoctorData(doctorId, validatedFields.data);
      revalidatePath('/hospital-admin/doctors');
      return {
        success: true,
        message: 'Doctor updated successfully.',
        newDoctor: updatedDoctor
      };
    } else {
      // Adding new doctor
      const newDoctor = await addDoctorData({ ...validatedFields.data, hospitalId });
      revalidatePath('/hospital-admin/doctors');
      return {
        success: true,
        message: 'Doctor added successfully.',
        newDoctor,
      };
    }
  } catch (error) {
    return {
      message: 'Database Error: Failed to save doctor.',
      success: false,
    };
  }
}

export async function updateDoctorStatus(doctorId: number, status: 'active' | 'inactive') {
  try {
    await updateDoctorData(doctorId, { status });
    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: `Doctor has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update doctor status.' };
  }
}

export async function deleteDoctor(doctorId: number) {
    try {
        await deleteDoctorData(doctorId);
        revalidatePath('/hospital-admin/doctors');
        return { success: true, message: 'Doctor deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete doctor.' };
    }
}
