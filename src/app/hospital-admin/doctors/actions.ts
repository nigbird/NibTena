
'use server';

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import { verifyCsrfToken } from '@/lib/csrf';
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
  const user = await getVerifiedUser();
  if (!user) return { message: 'Unauthorized', success: false };

  // require different permissions depending on whether we're creating or updating
  const isUpdate = !!doctorId;
  const requiredPerm = isUpdate ? 'Doctors:Update' : 'Doctors:Create';
  const allowed = await requireHospitalPermission(requiredPerm, hospitalId);
  if (!allowed) return { message: 'Unauthorized', success: false };

  const rawData = Object.fromEntries(formData.entries());
  // Validate CSRF double-submit token
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { message: 'Invalid or missing CSRF token.', success: false };
  }
  
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

      await createAuditLog({
        actorId: user.id,
        actorType: 'User',
        action: 'UPDATE_DOCTOR_PROFILE',
        targetId: doctorId,
        targetType: 'Doctor',
        changes: { ...dataToUpdate, password: dataToUpdate.password ? '***' : undefined }
      });
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

        await createAuditLog({
          actorId: user.id,
          actorType: 'User',
          action: 'CREATE_DOCTOR',
          targetId: newDoctor.id,
          targetType: 'Doctor',
          changes: { ...dataToCreate, password: '***' }
        });

        // Send email asynchronously
        sendWelcomeEmail('doctor', { name: newDoctor.name, email: newDoctor.contact! }, hospitalId)
          .then(result => {
             if (!result.success) console.error('[saveDoctor] Welcome email failed:', result.error);
          })
          .catch(err => console.error('[saveDoctor] Welcome email error:', err));
      } else {
        const tempPassword = crypto.randomBytes(16).toString('hex');
        dataToCreate.password = await bcrypt.hash(tempPassword, 10);

        const newDoctor = await prisma.doctor.create({ data: dataToCreate });

        await createAuditLog({
          actorId: user.id,
          actorType: 'User',
          action: 'CREATE_DOCTOR',
          targetId: newDoctor.id,
          targetType: 'Doctor',
          changes: { ...dataToCreate, password: '***' }
        });

        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error('AUTH_SECRET is not set.');
        
        const token = jwt.sign({ userId: newDoctor.id, userType: 'doctor', email: newDoctor.contact }, secret, { expiresIn: '1h' });
        
        // Send email asynchronously
        sendSetPasswordEmail(newDoctor.contact, token, hospitalId)
          .then(result => {
             if (!result.success) console.error('[saveDoctor] Set password email failed:', result.error);
          })
          .catch(err => console.error('[saveDoctor] Set password email error:', err));
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
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'Unauthorized' };
    const allowed = await requireHospitalPermission('Doctors:Update', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    await prisma.doctor.update({ where: { id: doctorId }, data: { status } });
    
    // Revoke sessions if doctor is deactivated
    if (status === 'inactive') {
        await incrementTokenVersionForRole('doctor', doctorId);
    }

    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_DOCTOR_STATUS',
      targetId: doctorId,
      targetType: 'Doctor',
      changes: { status }
    });

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
    
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'Unauthorized' };
    
    const allowed = await requireHospitalPermission('Doctors:Delete', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    await prisma.$transaction(async (tx) => {
        await tx.appointment.deleteMany({ where: { doctorId } });
        await tx.doctorSchedule.deleteMany({ where: { doctorId } });
        await tx.doctorsOnHospitals.deleteMany({ where: { doctorId } });
        await tx.doctor.delete({ where: { id: doctorId } });
    });

    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'DELETE_DOCTOR',
      targetId: doctorId,
      targetType: 'Doctor'
    });

    revalidatePath('/hospital-admin/doctors');
    return { success: true, message: 'Doctor deleted successfully.' };
  } catch (error) {
    console.error("Failed to delete doctor:", error);
    return { success: false, message: 'Database Error: Failed to delete doctor.' };
  }
}

export async function getDoctors(hospitalId: number, page: number, limit: number, query: string) {
    const user = await getVerifiedUser();
    if (!user) return [];
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
  const user = await getVerifiedUser();
  if (!user) return 0;
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

    
