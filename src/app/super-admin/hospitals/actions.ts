
'use server';

import { z } from 'zod';
import { 
  addHospital as addHospitalData, 
  updateHospital as updateHospitalData,
  deleteHospital as deleteHospitalData,
} from '@/lib/data';
import { revalidatePath } from 'next/cache';

const HospitalFormSchema = z.object({
  name: z.string().min(2, { message: 'Hospital name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  city: z.string().min(2, 'City is required.'),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  contactPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  accountNumber: z.string().min(10, { message: 'Please enter a valid account number.' }),
  status: z.enum(['active', 'inactive']),
});

export type HospitalFormState = {
  errors?: {
    name?: string[];
    description?: string[];
    city?: string[];
    contactEmail?: string[];
    contactPhone?: string[];
    accountNumber?: string[];
    status?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function saveHospital(
  hospitalId: number | null, // null for add, number for edit
  prevState: HospitalFormState, 
  formData: FormData
): Promise<HospitalFormState> {
  const validatedFields = HospitalFormSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    city: formData.get('city'),
    contactEmail: formData.get('contactEmail'),
    contactPhone: formData.get('contactPhone'),
    accountNumber: formData.get('accountNumber'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }

  try {
    if (hospitalId) {
      await updateHospitalData(hospitalId, validatedFields.data);
    } else {
      await addHospitalData(validatedFields.data);
    }
    
    revalidatePath('/super-admin/hospitals');
    revalidatePath('/user/hospitals');
    return {
      success: true,
      message: `Hospital ${hospitalId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error) {
    return {
      message: 'Database Error: Failed to save hospital.',
      success: false,
    };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean, message: string }> {
    try {
        await deleteHospitalData(hospitalId);
        revalidatePath('/super-admin/hospitals');
        return { success: true, message: 'Hospital deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete hospital.' };
    }
}
