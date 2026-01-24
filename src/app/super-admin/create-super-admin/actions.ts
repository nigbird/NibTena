'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit';
import { getVerifiedUser } from '@/lib/permissions';
import { verifyCsrfToken } from '@/lib/csrf';

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
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  const _csrf = formData.get('_csrf') as string | null;
  if (!verifyCsrfToken(_csrf)) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const parsed = SuperAdminSchema.safeParse({
    name: String(formData.get('name') || ''),
    email: String(formData.get('email') || ''),
    // Normalize password: FormData.get may return null if the field wasn't set
    // (e.g., when editing and left blank). Use empty string to satisfy the
    // schema's allowance for an empty literal and make password optional.
    password: String(formData.get('password') || ''),
    role: String(formData.get('role') || ''),
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

  const pwCheck = await validatePasswordAsync(password);
  if (!pwCheck.valid) {
    return { success: false, message: pwCheck.errors.join(' ') };
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    const newAdmin = await prisma.superAdmin.create({
      data: { name, email: email.toLowerCase(), password: hashed, role } as any,
    } as any);

    await createAuditLog({
      actorId: user.id,
      actorType: 'SuperAdmin',
      action: 'CREATE_SUPER_ADMIN',
      targetId: newAdmin.id,
      targetType: 'SuperAdmin',
      changes: { name, email, role }
    });

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
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  const _csrf = formData.get('_csrf') as string | null;
  if (!verifyCsrfToken(_csrf)) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const parsed = SuperAdminSchema.safeParse({
    name: String(formData.get('name') || ''),
    email: String(formData.get('email') || ''),
    // Normalize password so that null becomes an empty string and does not
    // fail validation; update logic will treat empty string as "no change".
    password: String(formData.get('password') || ''),
    role: String(formData.get('role') || ''),
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
    const pwCheck = await validatePasswordAsync(password);
    if (!pwCheck.valid) {
      return { success: false, message: pwCheck.errors.join(' ') };
    }
    dataToUpdate.password = await bcrypt.hash(password, 10);
  }

  try {
    await prisma.superAdmin.update({ where: { id }, data: dataToUpdate as any });

    await createAuditLog({
      actorId: user.id,
      actorType: 'SuperAdmin',
      action: 'UPDATE_SUPER_ADMIN',
      targetId: id,
      targetType: 'SuperAdmin',
      changes: { ...dataToUpdate, password: dataToUpdate.password ? '***' : undefined }
    });

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
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized' };
  }

  // Prevent self-deletion
  if (user.id === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await prisma.superAdmin.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      actorType: 'SuperAdmin',
      action: 'DELETE_SUPER_ADMIN',
      targetId: id,
      targetType: 'SuperAdmin'
    });

    revalidatePath('/super-admin/create-super-admin');
    return { success: true, message: 'Super admin deleted.' };
  } catch (error) {
    return { success: false, message: 'Failed to delete super admin.' };
  }
}
