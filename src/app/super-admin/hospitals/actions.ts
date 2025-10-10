
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
  try {
    const statusValue = formData.get('status') === 'on' ? 'active' : 'inactive';

    const validatedFields = HospitalFormSchema.safeParse({
      name: formData.get('name')?.toString() || '',
      description: formData.get('description')?.toString() || '',
      city: formData.get('city')?.toString() || '',
      contactEmail: formData.get('contactEmail')?.toString() || '',
      contactPhone: formData.get('contactPhone')?.toString() || '',
      accountNumber: formData.get('accountNumber')?.toString() || '',
      status: statusValue,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Failed to save hospital. Please check the fields.',
        success: false,
      };
    }
    const data = validatedFields.data;

    if (hospitalId) {
      // Editing existing hospital
      await prisma.hospital.update({ where: { id: hospitalId }, data });
    } else {
      // Adding new hospital
      const imageId = placeholderImages[Math.floor(Math.random() * placeholderImages.length)].id;
      await prisma.hospital.create({ data: { ...data, imageId } });
    }
    
    revalidatePath('/super-admin/hospitals');
    return {
      success: true,
      message: `Hospital ${hospitalId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error) {
    console.error("Save hospital error:", error)
    return {
      message: 'Database Error: Failed to save hospital.',
      success: false,
    };
  }
}
export async function getHospitalById(hospitalId: number) {
  return await prisma.hospital.findUnique({
    where: { id: hospitalId },
  });
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

export async function getHospitals() {
    return await prisma.hospital.findMany({
        orderBy: { name: 'asc' },
    });
}
