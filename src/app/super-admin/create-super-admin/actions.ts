'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '../../../../auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

const SuperAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['maker', 'checker', 'both']),
});

export async function getSuperAdmins() {
  return prisma.superAdmin.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true as any, createdAt: true } as any,
  });
}

export async function createSuperAdmin(formData: FormData) {
  const session = (await auth()) as any;
  if (!session?.user || session.user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  const parsed = SuperAdminSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors.map(e => e.message).join(', '),
    };
  }

  const { name, email, password, role } = parsed.data;

  if (!password) {
    return { success: false, message: 'Password is required for new admins.' };
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    await prisma.superAdmin.create({
      data: { name, email: email.toLowerCase(), password: hashed, role } as any,
    } as any);
    revalidatePath('/super-admin/create-super-admin');
    return { success: true, message: 'Super admin created.' };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, message: 'A super admin with this email already exists.' };
    }
    return { success: false, message: 'Failed to create super admin.' };
  }
}

export async function updateSuperAdmin(id: number, formData: FormData) {
  const session = (await auth()) as any;
  if (!session?.user || session.user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  const parsed = SuperAdminSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors.map(e => e.message).join(', '),
    };
  }
  
  const { name, email, password, role } = parsed.data;
  const dataToUpdate: { name: string; email: string; role: 'maker' | 'checker' | 'both'; password?: string } = {
    name,
    email: email.toLowerCase(),
    role,
  };

  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, 10);
  }

  try {
    await prisma.superAdmin.update({ where: { id }, data: dataToUpdate as any });
    revalidatePath('/super-admin/create-super-admin');
    return { success: true, message: 'Super admin updated.' };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, message: 'A super admin with this email already exists.' };
    }
    return { success: false, message: 'Failed to update super admin.' };
  }
}

export async function deleteSuperAdmin(id: number) {
  const session = (await auth()) as any;
  if (!session?.user || session.user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  // Prevent self-deletion
  if (Number(session.user.id) === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await prisma.superAdmin.delete({ where: { id } });
    revalidatePath('/super-admin/create-super-admin');
    return { success: true, message: 'Super admin deleted.' };
  } catch (error) {
    return { success: false, message: 'Failed to delete super admin.' };
  }
}
