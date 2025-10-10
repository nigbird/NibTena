
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
  hospitalId: number | null,
  formData: FormData
): Promise<HospitalFormState> {

  const validatedFields = HospitalFormSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }
  const data = {
    ...validatedFields.data,
    status: formData.get('status') === 'on' ? 'active' : ('inactive' as 'active' | 'inactive'),
  };

  try {
    if (hospitalId) {
      await prisma.hospital.update({ where: { id: hospitalId }, data });
    } else {
      const imageId = placeholderImages[Math.floor(Math.random() * placeholderImages.length)].id;
      await prisma.hospital.create({ data: { ...data, imageId } });
    }
    
    revalidatePath('/super-admin/hospitals');
    
    return {
      success: true,
      message: `Hospital ${hospitalId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error: any) {
    console.error('[saveHospital] caught error', error);
    if (error?.code === 'P2002') {
      return {
        message: `A hospital with the same unique information already exists.`,
        success: false,
      };
    }
    return {
      message: `Database Error: Failed to save hospital.`,
      success: false,
    };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean, message: string }> {
    try {
        await prisma.doctorsOnHospitals.deleteMany({ where: { hospitalId } });
        await prisma.appointment.deleteMany({ where: { hospitalId } });
        await prisma.hospital.delete({ where: { id: hospitalId } });
        revalidatePath('/super-admin/hospitals');
        return { success: true, message: 'Hospital deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete hospital.' };
    }
}

export async function getHospitals(page: number, limit: number) {
  const results = await prisma.hospital.findMany({
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return results;
}

export async function getHospitalsCount() {
    return await prisma.hospital.count();
}
