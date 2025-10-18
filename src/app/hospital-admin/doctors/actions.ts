
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Doctor } from '@/lib/definitions';
import { placeholderImages } from '@/lib/placeholder-images';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

const DoctorFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  contact: z.string().email({ message: 'A valid email is required for login.'}),
  password: z.string().min(8, 'Password must be at least 8 characters.').or(z.literal('')),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
});

export type DoctorFormState = {
  errors?: {
    name?: string[];
    contact?: string[];
    password?: string[];
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
  doctorId: number | null,
  prevState: DoctorFormState, 
  formData: FormData
): Promise<DoctorFormState> {
  const rawData = Object.fromEntries(formData.entries());
  
  if (doctorId && !rawData.password) {
    delete rawData.password;
  }

  const validatedFields = DoctorFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save doctor. Please check the fields.',
      success: false,
    };
  }

  const { password, ...doctorData } = validatedFields.data;

  try {
    if (doctorId) {
      const dataToUpdate: any = { ...doctorData };
      if (password) {
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }
      await prisma.doctor.update({ where: { id: doctorId }, data: dataToUpdate });
    } else {
      if (!password) {
        return { message: 'Password is required for new doctors.', success: false };
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const imageId = placeholderImages[Math.floor(Math.random() * placeholderImages.length)].id;
      await prisma.doctor.create({
        data: {
          ...doctorData,
          password: hashedPassword,
          imageId,
          rating: Math.floor(Math.random() * (5 - 3 + 1)) + 3,
          hospitals: { create: { hospitalId } },
        },
      });
    }
    revalidatePath('/hospital-admin/doctors');
    return {
      success: true,
      message: `Doctor ${doctorId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error) {
    console.error('[saveDoctor] caught error', error);
    if ((error as any)?.code === 'P2002') {
      return { message: `A doctor with this contact email already exists.`, success: false };
    }
    return { message: `Database Error: Failed to save doctor. ${(error as any)?.message ?? ''}`, success: false };
  }
}

export async function updateDoctorStatus(doctorId: number, status: 'active' | 'inactive') {
  try {
    await prisma.doctor.update({ where: { id: doctorId }, data: { status } });
    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: `Doctor has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update doctor status.' };
  }
}

export async function deleteDoctor(doctorId: number) {
    try {
        await prisma.doctorsOnHospitals.deleteMany({ where: { doctorId } });
        await prisma.appointment.deleteMany({ where: { doctorId } });
        await prisma.doctor.delete({ where: { id: doctorId } });
        revalidatePath('/hospital-admin/doctors');
        return { success: true, message: 'Doctor deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete doctor.' };
    }
}

export async function getDoctors(hospitalId: number, page: number, limit: number, query: string) {
    const where = {
        hospitals: { some: { hospitalId } },
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { specialty: { contains: query, mode: 'insensitive' } },
          ],
        }),
    };

    return await prisma.doctor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
    });
}

export async function getDoctorsCount(hospitalId: number, query: string) {
  const where = {
        hospitals: { some: { hospitalId } },
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { specialty: { contains: query, mode: 'insensitive' } },
          ],
        }),
    };
  return await prisma.doctor.count({ where });
}
