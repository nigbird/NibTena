"use server";

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(), // array of permission ids
});

const UpdateRoleSchema = z.object({
  id: z.number(),
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  roleId: z.number().optional(),
});

export async function getAllPermissions() {
  return await prisma.permission.findMany({ orderBy: { id: 'asc' } });
}

export async function getRolesByHospitalId(hospitalId: number) {
  return await prisma.role.findMany({
    where: { hospitalId },
    include: {
      permissions: { include: { permission: true } },
      users: true,
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
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateRoleSchema.safeParse({
    name: String(raw.name || ''),
    permissions: raw.permissions ? JSON.parse(String(raw.permissions)) : undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { name, permissions } = parsed.data;

  try {
    // prevent duplicate names per hospital: unique constraint exists but handle gracefully
    const existing = await prisma.role.findFirst({ where: { hospitalId, name } });
    if (existing) {
      return { success: false, message: 'A role with this name already exists.' };
    }

    const role = await prisma.role.create({ data: { name, hospitalId } });

    if (permissions && permissions.length > 0) {
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
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateRoleSchema.safeParse({
    id: Number(raw.id),
    name: String(raw.name || ''),
    permissions: raw.permissions ? JSON.parse(String(raw.permissions)) : undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, permissions } = parsed.data;

  try {
    await prisma.role.update({ where: { id }, data: { name } });

    if (permissions) {
      // simple approach: delete existing rolePermissions and recreate
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
  try {
    // disassociate users first
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
  return await prisma.user.findMany({ where: { hospitalId }, include: { role: true }, orderBy: { name: 'asc' } });
}

export async function createUser(hospitalId: number, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateUserSchema.safeParse({
    name: String(raw.name || ''),
    email: String(raw.email || ''),
    password: String(raw.password || ''),
    phone: raw.phone ? String(raw.phone) : undefined,
    roleId: raw.roleId ? Number(raw.roleId) : undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, phone, roleId } = parsed.data;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed, phone, roleId, hospitalId } });
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
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[deleteUser] error', error);
    return { success: false, message: 'Failed to delete user.' };
  }
}
