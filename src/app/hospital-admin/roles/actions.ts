
"use server";

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission, isHospitalOwnerFor, requireAnyPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email-actions';

const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(), // array of permission ids
  isAdmin: z.boolean().optional(),
});

const UpdateRoleSchema = z.object({
  id: z.number(),
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(),
  isAdmin: z.boolean().optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  phone: z.string().optional(),
  roleId: z.coerce.number().optional(),
});

export async function getAllPermissions() {
  return await prisma.permission.findMany({ orderBy: { id: 'asc' } });
}

export async function getRolesByHospitalId(hospitalId: number) {
  return await prisma.role.findMany({
    where: { hospitalId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getRoleById(roleId: number) {
  return await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } }, users: true },
  });
}

export async function createRole(hospitalId: number, formData: FormData) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateRoleSchema.safeParse({
    name: String(raw.name || ''),
    permissions: raw.permissions ? JSON.parse(String(raw.permissions)) : undefined,
    isAdmin: raw.isAdmin === 'true' || raw.isAdmin === true,
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { name, permissions, isAdmin } = parsed.data;

  try {
    const existing = await prisma.role.findFirst({ where: { hospitalId, name } });
    if (existing) {
      return { success: false, message: 'A role with this name already exists.' };
    }

    const role = await prisma.role.create({ data: { name, hospitalId, isAdmin: !!isAdmin } });

    if (!isAdmin && permissions && permissions.length > 0) {
      const rp = permissions.map((pid) => ({ roleId: role.id, permissionId: pid, allowed: true }));
      await prisma.rolePermission.createMany({ data: rp });
    }

    revalidatePath('/hospital-admin/roles');
    return { success: true, role };
  } catch (error) {
    console.error('[createRole] error', error);
    return { success: false, message: 'Failed to create role.' };
  }
}

export async function updateRole(formData: FormData) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateRoleSchema.safeParse({
    id: Number(raw.id),
    name: String(raw.name || ''),
    permissions: raw.permissions ? JSON.parse(String(raw.permissions)) : undefined,
    isAdmin: raw.isAdmin === 'true' || raw.isAdmin === true,
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, permissions, isAdmin } = parsed.data;

  try {
    await prisma.role.update({ where: { id }, data: { name, isAdmin: !!isAdmin } });

    if (isAdmin) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    } else if (permissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length > 0) {
        const rp = permissions.map((pid) => ({ roleId: id, permissionId: pid, allowed: true }));
        await prisma.rolePermission.createMany({ data: rp });
      }
    }

    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[updateRole] error', error);
    return { success: false, message: 'Failed to update role.' };
  }
}

export async function deleteRole(roleId: number) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  try {
    await prisma.user.updateMany({ where: { roleId }, data: { roleId: null } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.role.delete({ where: { id: roleId } });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[deleteRole] error', error);
    return { success: false, message: 'Failed to delete role.' };
  }
}

export async function getUsersByHospitalId(hospitalId: number) {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { contactEmail: true },
  });
  if (!hospital) return [];

  // Fetch users and specifically exclude the main hospital admin account by email
  return await prisma.user.findMany({
    where: {
      hospitalId,
      email: {
        not: hospital.contactEmail,
      },
    },
    include: {
      role: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createUser(hospitalId: number, formData: FormData) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  const raw = Object.fromEntries(formData.entries());
  if (raw.password === '') {
    delete raw.password;
  }
  const parsed = CreateUserSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, message: parsed.error.flatten().fieldErrors.toString() };
  }

  const { name, email, phone, roleId } = parsed.data;

  try {
    const rawPassword = crypto.randomBytes(8).toString('hex');
    const hashed = await bcrypt.hash(rawPassword, 10);
    
    const user = await prisma.user.create({ data: { name, email, password: hashed, phone, roleId, hospitalId } });
    
    const role = roleId ? await prisma.role.findUnique({ where: {id: roleId}}) : null;

    await sendWelcomeEmail('staff', { name, email, rawPassword, role: role?.name }, hospitalId);
    
    revalidatePath('/hospital-admin/roles');
    return { success: true, user };
  } catch (error) {
    console.error('[createUser] error', error);
    if ((error as any)?.code === 'P2002') {
      return { success: false, message: 'A user with this email already exists.' };
    }
    return { success: false, message: 'Failed to create user.' };
  }
}

export async function updateUserRole(userId: number, roleId: number | null) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.user.update({ where: { id: userId }, data: { roleId } });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[updateUserRole] error', error);
    return { success: false, message: 'Failed to update user role.' };
  }
}

export async function deleteUser(userId: number) {
  const allowed = await requirePermission('USER_MANAGE');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[deleteUser] error', error);
    return { success: false, message: 'Failed to delete user.' };
  }
}

    