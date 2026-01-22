
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import crypto from 'crypto';
import { sendWelcomeEmail, sendSetPasswordEmail } from '@/lib/email-actions';
import jwt from 'jsonwebtoken';

const DoctorFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  contact: z.string().email({ message: 'A valid email is required for login.'}),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  imageUrl: z.string().optional(),
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
  const session = await auth();
  if (!session?.user) return { message: 'Unauthorized', success: false };

  // require different permissions depending on whether we're creating or updating
  const isUpdate = !!doctorId;
  const requiredPerm = isUpdate ? 'Doctors:Update' : 'Doctors:Create';
  const allowed = await requireHospitalPermission(requiredPerm, hospitalId);
  if (!allowed) return { message: 'Unauthorized', success: false };

  const rawData = Object.fromEntries(formData.entries());
  
  if (doctorId && !rawData.password) {
    delete rawData.password;
  }
  
  const imageUrl = (formData.get('imageUrl') as string) || undefined;
  if (!imageUrl) delete rawData.imageUrl;

  const validatedFields = DoctorFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save doctor. Please check the fields.',
      success: false,
    };
  }

  const { password, imageUrl: validatedImageUrl, ...doctorData } = validatedFields.data;

  try {
    const dataToUpdate: any = { ...doctorData };
    
    if (validatedImageUrl) {
      dataToUpdate.imageUrl = validatedImageUrl as string;
    }
    
    if (doctorId) {
      if (password) {
        const pwCheck = await validatePasswordAsync(password);
        if (!pwCheck.valid) {
          return { message: pwCheck.errors.join(' '), success: false };
        }
        dataToUpdate.password = await bcrypt.hash(password, 10);
        dataToUpdate.mustChangePassword = true;
      }
      await prisma.doctor.update({ where: { id: doctorId }, data: dataToUpdate });
    } else {
      const dataToCreate: any = {
        ...dataToUpdate,
        mustChangePassword: true,
        rating: Math.floor(Math.random() * (5 - 3 + 1)) + 3,
        hospitals: { create: { hospitalId } },
      };

      if (password) {
        const pwCheck = await validatePasswordAsync(password);
        if (!pwCheck.valid) {
          return { message: pwCheck.errors.join(' '), success: false };
        }
        dataToCreate.password = await bcrypt.hash(password, 10);
        const newDoctor = await prisma.doctor.create({ data: dataToCreate });
        const emailResult = await sendWelcomeEmail('doctor', { name: newDoctor.name, email: newDoctor.contact! }, hospitalId);

        if (!emailResult.success) {
          // Do NOT delete the created doctor when a password was provided.
          // Email is best-effort in this flow; return success but notify caller about the email failure.
          console.error('[saveDoctor] Welcome email failed but doctor retained:', emailResult.error);
          revalidatePath('/hospital-admin/doctors');
          return { success: true, message: `Doctor added but welcome email failed: ${emailResult.error}` };
        }
      } else {
        const tempPassword = crypto.randomBytes(16).toString('hex');
        dataToCreate.password = await bcrypt.hash(tempPassword, 10);

        const newDoctor = await prisma.doctor.create({ data: dataToCreate });

        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error('AUTH_SECRET is not set.');
        
        const token = jwt.sign({ userId: newDoctor.id, userType: 'doctor', email: newDoctor.contact }, secret, { expiresIn: '24h' });
        const emailResult = await sendSetPasswordEmail(newDoctor.contact, token, hospitalId);
        
        if (!emailResult.success) {
           // Rollback: remove hospital associations before deleting doctor to satisfy FK constraints
          await prisma.doctorsOnHospitals.deleteMany({ where: { doctorId: newDoctor.id } });
          await prisma.doctor.delete({ where: { id: newDoctor.id } });
          console.error('[saveDoctor] Email failed, doctor deleted:', emailResult.error);
          return { message: `Doctor creation failed: Could not send activation email. ${emailResult.error}`, success: false };
        }
      }
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
    // ensure permission for the hospital(s) the doctor is associated with
    const doc = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { hospitals: { select: { hospitalId: true } } } });
    const hospitalId = doc?.hospitals?.[0]?.hospitalId;
    if (!hospitalId) return { success: false, message: 'Not found.' };
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Unauthorized' };
    const allowed = await requireHospitalPermission('Doctors:Update', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    await prisma.doctor.update({ where: { id: doctorId }, data: { status } });
    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: `Doctor has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update doctor status.' };
  }
}

export async function deleteDoctor(doctorId: number): Promise<{ success: boolean; message: string }> {
  try {
    const doc = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { hospitals: { select: { hospitalId: true } } } });
    const hospitalId = doc?.hospitals?.[0]?.hospitalId;
    if (!hospitalId) return { success: false, message: 'Doctor not found or not associated with a hospital.' };
    
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Unauthorized' };
    
    const allowed = await requireHospitalPermission('Doctors:Delete', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    await prisma.$transaction(async (tx) => {
        await tx.appointment.deleteMany({ where: { doctorId } });
        await tx.doctorSchedule.deleteMany({ where: { doctorId } });
        await tx.doctorsOnHospitals.deleteMany({ where: { doctorId } });
        await tx.doctor.delete({ where: { id: doctorId } });
    });

    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: 'Doctor deleted successfully.' };
  } catch (error) {
    console.error("Failed to delete doctor:", error);
    return { success: false, message: 'Database Error: Failed to delete doctor.' };
  }
}

export async function getDoctors(hospitalId: number, page: number, limit: number, query: string) {
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Doctors:View', hospitalId);
    if (!allowed) return [];

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
        select: {
            id: true, name: true, specialty: true, imageUrl: true,
            bio: true, consultationFee: true, rating: true,
            experience: true, contact: true, status: true,
            mustChangePassword: true
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
    });
}

export async function getDoctorsCount(hospitalId: number, query: string) {
  const session = await auth();
  if (!session?.user) return 0;
  const allowed = await requireHospitalPermission('Users:View', hospitalId);
  if (!allowed) return 0;

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

    
