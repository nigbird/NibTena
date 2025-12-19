
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendSetPasswordEmail } from '@/lib/email-actions';
import { auth } from '../../../../auth';
import { Prisma } from '@prisma/client';

const HospitalFormSchema = z.object({
  name: z.string().min(2, { message: 'Hospital name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  city: z.string().min(2, 'City is required.'),
  address: z.string().optional(),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  contactPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  bankDistrict: z.string().optional(),
  bankBranch: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  accountNumber: z.string().min(1, 'Account number is required.'),
  imageUrl: z.string().optional(),
});

export type HospitalFormState = {
  errors?: {
    name?: string[];
    description?: string[];
    city?: string[];
    address?: string[];
    contactEmail?: string[];
    contactPhone?: string[];
    ownerName?: string[];
    ownerPhone?: string[];
    bankDistrict?: string[];
    bankBranch?: string[];
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
  const session = (await auth()) as any;
  if (!session?.user || session.user.role !== 'superadmin') {
    return {
      message: 'Unauthorized: only super admins can manage hospitals.',
      success: false,
    };
  }
  const superAdminRole = (session.user as any).superAdminRole || 'maker';
  const canMake = superAdminRole === 'maker' || superAdminRole === 'both';
  if (!canMake) {
    return {
      message: 'Only maker super admins can create or edit hospitals.',
      success: false,
    };
  }
  const actingSuperAdminId = Number(session.user.id);

  const rawData = Object.fromEntries(formData.entries());

  if (hospitalId && !rawData.password) {
    delete rawData.password;
  }
  const imageUrl = (formData.get('imageUrl') as string) || undefined;
  if (!imageUrl) delete rawData.imageUrl;

  const validatedFields = HospitalFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }

  const { password, imageUrl: validatedImageUrl, ...hospitalData } = validatedFields.data;

  const dataToSave: any = {
    ...hospitalData,
    status: formData.get('status') === 'on' ? 'active' : 'inactive',
    approvalStatus: hospitalId ? undefined : 'pending',
    createdBySuperAdminId: hospitalId ? undefined : actingSuperAdminId,
  };

  try {
    if (validatedImageUrl) {
      dataToSave.imageUrl = validatedImageUrl as string;
    }

    if (hospitalId) {
      if (password) {
        dataToSave.password = await bcrypt.hash(password, 10);
        dataToSave.mustChangePassword = true; // Force password change if manually set
      }
      await prisma.hospital.update({ where: { id: hospitalId }, data: dataToSave });
    } else {
       // If admin provided a password, hash it and force change on first login.
      if (password) {
        dataToSave.password = await bcrypt.hash(password, 10);
        dataToSave.mustChangePassword = true;
        dataToSave.status = 'inactive'; // keep inactive until approved
        
        const created = await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30 } });
        await sendWelcomeEmail('hospital', { name: created.name, email: created.contactEmail });

      } else {
        // If no password was provided, create with a temp hash and send a "set password" link.
        const tempPassword = crypto.randomBytes(16).toString('hex');
        dataToSave.password = await bcrypt.hash(tempPassword, 10);
        dataToSave.mustChangePassword = true;
        dataToSave.status = 'inactive'; // keep inactive until approved

        const created = await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30 } });
        
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error('AUTH_SECRET is not set.');
        const token = jwt.sign({ userId: created.id, userType: 'hospital', email: created.contactEmail }, secret, { expiresIn: '24h' });
        await sendSetPasswordEmail(created.contactEmail, token);
      }
      
      // Create the Owner role for the new hospital regardless of password flow
      const hospitalRecord = await prisma.hospital.findFirst({ where: { contactEmail: dataToSave.contactEmail }});
      if (hospitalRecord) {
        try {
            const ownerRole = await prisma.role.create({ data: { name: 'Owner', hospitalId: hospitalRecord.id, isAdmin: true } });
            const allPerms = await prisma.permission.findMany({ select: { id: true } });
            if (allPerms.length > 0) {
            const rp = allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id, allowed: true }));
            await prisma.rolePermission.createMany({ data: rp });
            }
        } catch (err) {
            console.error('[create hospital owner role] error', err);
        }
      }
    }

    revalidatePath('/super-admin/hospitals');
    revalidatePath('/super-admin/hospital-approvals');
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
    revalidatePath('/super-admin/hospital-approvals');
    return { success: true, message: `Hospital has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update hospital status.' };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const doctorsInHospital = await tx.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
        select: { id: true, _count: { select: { hospitals: true } } },
      });

      const doctorsToDelete = doctorsInHospital
        .filter(d => d._count.hospitals === 1)
        .map(d => d.id);

      await tx.appointment.deleteMany({ where: { hospitalId } });
      await tx.doctorSchedule.deleteMany({ where: { hospitalId } });
      await tx.rolePermission.deleteMany({ where: { role: { hospitalId } } });
      await tx.role.deleteMany({ where: { hospitalId } });
      await tx.user.deleteMany({ where: { hospitalId } });
      await tx.specialty.deleteMany({ where: { hospitalId } });
      await tx.emailSettings.deleteMany({ where: { hospitalId } });
      
      await tx.doctorsOnHospitals.deleteMany({ where: { hospitalId } });

      if (doctorsToDelete.length > 0) {
        await tx.doctor.deleteMany({ where: { id: { in: doctorsToDelete } } });
      }

      await tx.hospital.delete({ where: { id: hospitalId } });
    });

    revalidatePath('/super-admin/hospitals');
    return { success: true, message: 'Hospital and all associated data deleted successfully.' };
  } catch (error) {
    console.error("Failed to delete hospital:", error);
    return { success: false, message: 'Database Error: Failed to delete hospital.' };
  }
}

export async function getHospitals(page: number, limit: number, query: string) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { city: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }
    : {};
  const results = await prisma.hospital.findMany({
    where: where as any,
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      address: true,
      ownerName: true,
      ownerPhone: true,
      bankDistrict: true,
      bankBranch: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      approvalStatus: true as any,
      createdBySuperAdminId: true as any,
      approvedBySuperAdminId: true as any,
      approvedAt: true as any,
      imageUrl: true,
      accountNumber: true,
      mustChangePassword: true,
    } as any,
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
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { city: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }
    : {};
  return await prisma.hospital.count({ where: where as any });
}

export async function getPendingHospitals() {
  return prisma.hospital.findMany({
    where: { approvalStatus: 'pending' } as any,
    include: {
      createdBySuperAdmin: { select: { id: true, name: true, email: true } } as any,
    } as any,
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewHospital(hospitalId: number, decision: 'approved' | 'rejected') {
  const session = (await auth()) as any;
  if (!session?.user || session.user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized: only super admins can review hospitals.' };
  }

  const actingSuperAdminId = Number(session.user.id);
  const superAdminRole = (session.user as any).superAdminRole || 'maker';

  const canCheck = superAdminRole === 'checker' || superAdminRole === 'both';
  if (!canCheck) {
    return { success: false, message: 'Only checker super admins can approve or reject hospitals.' };
  }

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { createdBySuperAdminId: true as any, approvalStatus: true as any } as any }) as any;
  if (!hospital) return { success: false, message: 'Hospital not found.' };
  if (hospital.approvalStatus !== 'pending') {
    return { success: false, message: 'Hospital has already been reviewed.' };
  }
  if (hospital.createdBySuperAdminId && hospital.createdBySuperAdminId === actingSuperAdminId) {
    return { success: false, message: 'Makers cannot approve their own hospital creations.' };
  }

  await prisma.hospital.update({
    where: { id: hospitalId },
    data: {
      approvalStatus: decision as any,
      approvedBySuperAdminId: actingSuperAdminId as any,
      approvedAt: new Date() as any,
      status: decision === 'approved' ? 'active' : 'inactive',
    } as any,
  });

  revalidatePath('/super-admin/hospitals');
  revalidatePath('/super-admin/hospital-approvals');
  return { success: true, message: `Hospital ${decision}.` };
}
