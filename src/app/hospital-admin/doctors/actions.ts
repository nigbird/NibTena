
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { saveImage } from '@/lib/image-upload';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email-actions';

const DoctorFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  contact: z.string().email({ message: 'A valid email is required for login.'}),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  image: z.instanceof(File).optional(),
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
    image?: string[];
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
  
  // If editing and password is blank, don't validate or update it
  if (doctorId && !rawData.password) {
    delete rawData.password;
  }
  
  // Handle file upload
  const imageFile = formData.get('image') as File | null;
  if (!imageFile || imageFile.size === 0) {
    delete rawData.image;
  }

  const validatedFields = DoctorFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save doctor. Please check the fields.',
      success: false,
    };
  }

  const { password, image, ...doctorData } = validatedFields.data;
  let rawPassword = password; // Capture manually entered password

  try {
    const dataToUpdate: any = { ...doctorData };
    
    if (image) {
      dataToUpdate.imageUrl = await saveImage(image);
    }
    
    if (doctorId) {
      if (password) {
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }
      await prisma.doctor.update({ where: { id: doctorId }, data: dataToUpdate });
    } else {
      // If password was not manually entered for a new doctor, generate one.
      if (!rawPassword) {
        rawPassword = crypto.randomBytes(8).toString('hex');
      }
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      
      const newDoctor = await prisma.doctor.create({
        data: {
          ...dataToUpdate,
          password: hashedPassword,
          rating: Math.floor(Math.random() * (5 - 3 + 1)) + 3,
          hospitals: { create: { hospitalId } },
        },
      });

      // Send welcome email with the plain-text password
      await sendWelcomeEmail('doctor', { name: newDoctor.name, email: newDoctor.contact!, rawPassword }, hospitalId);
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
