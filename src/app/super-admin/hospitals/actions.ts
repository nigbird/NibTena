
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { saveImage } from '@/lib/image-upload';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email-actions';

const HospitalFormSchema = z.object({
  name: z.string().min(2, { message: 'Hospital name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  city: z.string().min(2, 'City is required.'),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  contactPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  accountNumber: z.string().min(1, 'Account number is required.'),
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
    accountNumber?: string[];
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
  let rawPassword = password;

  const dataToSave: any = {
    ...hospitalData,
    status: formData.get('status') === 'on' ? 'active' : 'inactive',
  };

  try {
    if (image) {
      dataToSave.imageUrl = await saveImage(image);
    }

    if (hospitalId) {
      if (password) {
        dataToSave.password = await bcrypt.hash(password, 10);
      }
      await prisma.hospital.update({ where: { id: hospitalId }, data: dataToSave });
    } else {
      if (!password) {
        // Generate a random password for new hospitals
        rawPassword = crypto.randomBytes(8).toString('hex');
      }
      dataToSave.password = await bcrypt.hash(rawPassword!, 10);

      const created = await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30 } });
      
      // Send welcome email
      await sendWelcomeEmail('hospital', { name: created.name, email: created.contactEmail, rawPassword });

      try {
        const ownerRole = await prisma.role.create({ data: { name: 'Owner', hospitalId: created.id, isAdmin: true } });
        const allPerms = await prisma.permission.findMany({ select: { id: true } });
        if (allPerms.length > 0) {
          const rp = allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id, allowed: true }));
          await prisma.rolePermission.createMany({ data: rp });
        }
        const existingUser = await prisma.user.findUnique({ where: { email: created.contactEmail } });
        if (existingUser) {
          await prisma.user.update({ where: { id: existingUser.id }, data: { roleId: ownerRole.id } });
        }
      } catch (err) {
        console.error('[create hospital owner role] error', err);
      }
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
