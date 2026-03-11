

"use server";

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendSetPasswordEmail } from '@/lib/email-actions';
import { createAuditLog } from '@/lib/audit';
import { verifyCsrfToken } from '@/lib/csrf';

const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(), // array of permission ids
  isAdmin: z.boolean().optional(),
});

const UpdateRoleSchema = z.object({
  id: z.coerce.number(),
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.number()).optional(),
  isAdmin: z.boolean().optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  phone: z.string().optional(),
  roleId: z.coerce.number().optional().nullable(),
});

const UpdateUserSchema = CreateUserSchema.extend({
    id: z.coerce.number(),
});

export async function getAllPermissions() {
  const user = await getVerifiedUser();
  if (!user) return [];
  return await prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
}

export async function getRolesByHospitalId(hospitalId: number) {
  const user = await getVerifiedUser();
  if (!user) return [];
  
  // Ensure user has access to this hospital's roles
  const allowed = await requireHospitalPermission('Roles:View', hospitalId) || await requireHospitalPermission('Users:View', hospitalId);
  if (!allowed) return [];

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
  const user = await getVerifiedUser();
  if (!user) return null;

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } }, users: true },
  });

  if (role) {
    const allowed = await requireHospitalPermission('Roles:View', role.hospitalId) || await requireHospitalPermission('Users:View', role.hospitalId);
    if (!allowed) return null;
  }

  return role;
}

export async function createRole(hospitalId: number, formData: FormData) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const allowed = await requireHospitalPermission('Roles:Create', hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

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

    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'CREATE_ROLE',
      targetId: role.id,
      targetType: 'Role',
      changes: { name, isAdmin, permissions }
    });

    revalidatePath('/hospital-admin/roles');
    return { success: true, role };
  } catch (error) {
    console.error('[createRole] error', error);
    return { success: false, message: 'Failed to create role.' };
  }
}

export async function updateRole(formData: FormData) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const raw = Object.fromEntries(formData.entries());
  const roleId = Number(raw.id);
  // require permission in the hospital the role belongs to (lookup role)
  const roleRec = await prisma.role.findUnique({ where: { id: roleId }, select: { hospitalId: true } });
  const allowed = roleRec ? await requireHospitalPermission('Roles:Update', roleRec.hospitalId) : false;
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const parsed = UpdateRoleSchema.safeParse({
    id: roleId,
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

    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_ROLE',
      targetId: id,
      targetType: 'Role',
      changes: { name, isAdmin, permissions }
    });

    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[updateRole] error', error);
    return { success: false, message: 'Failed to update role.' };
  }
}

export async function deleteRole(roleId: number) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const roleRec = await prisma.role.findUnique({ where: { id: roleId }, select: { hospitalId: true } });
  const allowed = roleRec ? await requireHospitalPermission('Roles:Delete', roleRec.hospitalId) : false;
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  try {
    await prisma.user.updateMany({ where: { roleId }, data: { roleId: null } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.role.delete({ where: { id: roleId } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'DELETE_ROLE',
      targetId: roleId,
      targetType: 'Role'
    });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[deleteRole] error', error);
    return { success: false, message: 'Failed to delete role.' };
  }
}

export async function getUsersByHospitalId(hospitalId: number) {
  const user = await getVerifiedUser();
  if (!user) return [];
  const allowed = await requireHospitalPermission('Users:View', hospitalId);
  if (!allowed) return [];

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { contactEmail: true },
  });
  if (!hospital) return [];

  return await prisma.user.findMany({
    where: {
      hospitalId,
      email: {
        not: hospital.contactEmail,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      roleId: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { name: 'asc' },
  });
}

export async function createUser(hospitalId: number, formData: FormData) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const allowed = await requireHospitalPermission('Users:Create', hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };
  
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const raw = Object.fromEntries(formData.entries());
  
  const parsed = CreateUserSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, message: parsed.error.flatten().fieldErrors.toString() };
  }

  const { name, email, password, phone, roleId } = parsed.data;

  try {
    const dataToCreate: any = {
      name,
      email,
      phone,
      roleId: roleId || null,
      hospitalId,
      mustChangePassword: true,
    };
    
    // If admin provided a password, validate and hash it.
    if (password) {
      const pwCheck = await validatePasswordAsync(password);
      if (!pwCheck.valid) {
        return { success: false, message: pwCheck.errors.join(' ') };
      }
      dataToCreate.password = await bcrypt.hash(password, 10);
      const userRec = await prisma.user.create({ data: dataToCreate });
      
      try {
        const role = roleId ? await prisma.role.findUnique({ where: {id: roleId}}) : null;
        
        // Send email asynchronously
        sendWelcomeEmail('staff', { name, email, role: role?.name }, hospitalId)
            .then(result => {
                if (!result.success) console.error('[createUser] Welcome email failed:', result.error);
            })
            .catch(err => console.error('[createUser] Welcome email error:', err));
      } catch (emailError: any) {
        // If sendWelcomeEmail threw an unexpected error, log and continue as best-effort
        console.error('[createUser] Welcome email error (non-fatal):', emailError);
      }

      await createAuditLog({
        actorId: user.id,
        actorType: 'User',
        action: 'CREATE_USER',
        targetId: userRec.id,
        targetType: 'User',
        changes: { name, email, roleId }
      });
      
      revalidatePath('/hospital-admin/roles');
      return { success: true, user: userRec };

    } else {
        // If no password, create user with a temporary password to satisfy DB constraints
        const tempPassword = crypto.randomBytes(16).toString('hex');
        dataToCreate.password = await bcrypt.hash(tempPassword, 10);

        const userRec = await prisma.user.create({ data: dataToCreate });

        try {
            // Now send the "set password" link.
            const secret = process.env.AUTH_SECRET;
            if (!secret) throw new Error('AUTH_SECRET is not set.');
            
            const token = jwt.sign({ userId: userRec.id, userType: 'user', email: userRec.email }, secret, { expiresIn: '1h' });
            try {
              const { createResetTokenRecord } = await import('@/lib/reset-token');
              await createResetTokenRecord(token, userRec.id, 'user', 60 * 60);
            } catch (e) {
              console.error('Failed to persist set-password token for user', e);
            }

            // Send email asynchronously
            sendSetPasswordEmail(userRec.email, token, hospitalId)
                .then(result => {
                    if (!result.success) console.error('[createUser] Set password email failed:', result.error);
                })
                .catch(err => console.error('[createUser] Set password email error:', err));
        } catch (emailError: any) {
            // Rollback: Delete the user if JWT/Setup fails (Email failure is async and won't trigger this)
            await prisma.user.delete({ where: { id: userRec.id } });
            console.error('[createUser] Setup failed, user deleted:', emailError);
            return { success: false, message: `User creation failed: ${emailError.message}` };
        }

        await createAuditLog({
            actorId: user.id,
            actorType: 'User',
            action: 'CREATE_USER',
            targetId: userRec.id,
            targetType: 'User',
            changes: { name, email, roleId }
        });
        
        revalidatePath('/hospital-admin/roles');
        return { success: true, user: userRec };
    }

  } catch (error) {
    console.error('[createUser] error', error);
    if ((error as any)?.code === 'P2002') {
      return { success: false, message: 'A user with this email already exists.' };
    }
    return { success: false, message: 'Failed to create user.' };
  }
}

export async function updateUser(userId: number, formData: FormData) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  // Ensure user belongs to same hospital
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { hospitalId: true } });
  const allowed = target ? await requireHospitalPermission('Users:Update', target.hospitalId) : false;
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const raw = Object.fromEntries(formData.entries()) as any;
  if (raw.password === '') {
    delete raw.password;
  }
  
  const parsed = UpdateUserSchema.safeParse({ ...raw, id: userId, roleId: raw.roleId ? Number(raw.roleId) : null });

  if (!parsed.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  const { id, name, email, password, roleId } = parsed.data;

  try {
    const dataToUpdate: any = {
      name,
      email,
      roleId: roleId || null,
    };
    
    if (password) {
      const pwCheck = await validatePasswordAsync(password);
      if (!pwCheck.valid) {
        return { success: false, message: pwCheck.errors.join(' ') };
      }
      dataToUpdate.password = await bcrypt.hash(password, 10);
      dataToUpdate.mustChangePassword = true;
    }
    
    await prisma.user.update({ where: { id }, data: dataToUpdate });

    // Revoke existing sessions for this user (defense-in-depth)
    // We treat staff users as role='hospital' with isStaff=true
    await incrementTokenVersionForRole('hospital', id, true);

    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_USER',
      targetId: id,
      targetType: 'User',
      changes: { name, email, roleId, passwordChanged: !!password }
    });

    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[updateUser] error', error);
    if ((error as any)?.code === 'P2002') {
      return { success: false, message: 'A user with this email already exists.' };
    }
    return { success: false, message: 'Failed to update user.' };
  }
}

export async function deleteUser(userId: number) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { hospitalId: true } });
  const allowed = target ? await requireHospitalPermission('Users:Delete', target.hospitalId) : false;
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.user.delete({ where: { id: userId } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'DELETE_USER',
      targetId: userId,
      targetType: 'User'
    });
    revalidatePath('/hospital-admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[deleteUser] error', error);
    return { success: false, message: 'Failed to delete user.' };
  }
}

