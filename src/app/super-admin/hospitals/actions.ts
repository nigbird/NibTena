
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { placeholderImages } from '@/lib/placeholder-images';

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
  console.debug('[saveHospital] start', { hospitalId });

  const validatedFields = HospitalFormSchema.safeParse({
    name: formData.get('name')?.toString() || '',
    description: formData.get('description')?.toString() || '',
    city: formData.get('city')?.toString() || '',
    contactEmail: formData.get('contactEmail')?.toString() || '',
    contactPhone: formData.get('contactPhone')?.toString() || '',
    accountNumber: formData.get('accountNumber')?.toString() || '',
    status: formData.get('status')?.toString() || 'inactive',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }
  const data = validatedFields.data;

  try {
    if (hospitalId) {
      // Editing existing hospital
      console.debug('[saveHospital] updating hospital', { hospitalId, data });
      await prisma.hospital.update({ where: { id: hospitalId }, data });
      console.debug('[saveHospital] update complete', { hospitalId });
    } else {
      // Adding new hospital
      // pick a random placeholder image (use full range of array)
      const imageId = placeholderImages[Math.floor(Math.random() * placeholderImages.length)].id;
      console.debug('[saveHospital] creating hospital, imageId=', imageId, 'data=', data);
      await prisma.hospital.create({ data: { ...data, imageId } });
      console.debug('[saveHospital] create complete');
    }
    
  // Client will refetch hospitals after action success; avoid server-side revalidation here
  console.debug('[saveHospital] skipping revalidatePath (client will refresh)');
    return {
      success: true,
      message: `Hospital ${hospitalId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error: any) {
    // Log full error so we can see Prisma details (code/meta) in server logs
    console.error('[saveHospital] caught error', error);
    if (error?.code === 'P2002') {
      console.error('[saveHospital] Unique constraint failed:', error.meta);
    }
    return {
      message: `Database Error: Failed to save hospital. ${error?.message ?? ''}`,
      success: false,
    };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean, message: string }> {
    try {
        await prisma.doctorsOnHospitals.deleteMany({ where: { hospitalId } });
        await prisma.appointment.deleteMany({ where: { hospitalId } });
  await prisma.hospital.delete({ where: { id: hospitalId } });
  // Client will refresh list; avoid server revalidation which can cause dev loop
  console.debug('[deleteHospital] skipped revalidatePath');
        return { success: true, message: 'Hospital deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete hospital.' };
    }
}

export async function getHospitals() {
  console.debug('[getHospitals] fetching hospitals');
  const results = await prisma.hospital.findMany({ orderBy: { name: 'asc' } });
  console.debug('[getHospitals] fetched', results.length, 'hospitals');
  return results;
}
