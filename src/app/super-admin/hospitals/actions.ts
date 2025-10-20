
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { saveImage } from '@/lib/image-upload';

const HospitalFormSchema = z.object({
  name: z.string().min(2, { message: 'Hospital name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  city: z.string().min(2, 'City is required.'),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  contactPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }).or(z.literal('')),
  image: z.instanceof(File).optional(),
});

export type HospitalFormState = {
  errors?: {
    name?: string[];
    description?: string[];
    city?: string[];
    contactEmail?: string[];
    contactPhone?: string[];
    password?: string[];
    image?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function saveHospital(
  hospitalId: number | null,
  prevState: HospitalFormState,
  formData: FormData
): Promise<HospitalFormState> {

  const rawData = Object.fromEntries(formData.entries());

  if (hospitalId && !rawData.password) {
      delete rawData.password;
  }
   // Handle file upload
  const imageFile = formData.get('image') as File | null;
  if (!imageFile || imageFile.size === 0) {
    delete rawData.image;
  }

  const validatedFields = HospitalFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }
  
  const { password, image, ...hospitalData } = validatedFields.data;

  const dataToSave: any = {
    ...hospitalData,
    status: formData.get('status') === 'on' ? 'active' : 'inactive',
  };
  
  if (password) {
      dataToSave.password = await bcrypt.hash(password, 10);
  }

  try {
     if (image) {
      dataToSave.imageUrl = await saveImage(image);
    }
    
    if (hospitalId) {
      await prisma.hospital.update({ where: { id: hospitalId }, data: dataToSave });
    } else {
      if (!password) {
          return { success: false, message: 'Password is required for new hospitals.' };
      }
      await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30, accountNumber: `ACCT-NEW-${Date.now()}` } });
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

export async function updateHospitalStatus(hospitalId: number, status: 'active' | 'inactive') {
  try {
    await prisma.hospital.update({ where: { id: hospitalId }, data: { status } });
    revalidatePath('/super-admin/hospitals');
    return { success: true, message: `Hospital has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update hospital status.' };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean; message: string }> {
  try {
    // This will cascade delete related DoctorsOnHospitals, Appointments, and DoctorSchedules due to schema relations
    await prisma.hospital.delete({ where: { id: hospitalId } });
    revalidatePath('/super-admin/hospitals');
    return { success: true, message: 'Hospital deleted successfully.' };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to delete hospital.' };
  }
}


export async function getHospitals(page: number, limit: number, query: string) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {};

  const results = await prisma.hospital.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return results;
}

export async function getHospitalsCount(query: string) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {};
  return await prisma.hospital.count({ where });
}
