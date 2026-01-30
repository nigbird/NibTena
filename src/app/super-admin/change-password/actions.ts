'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import { getVerifiedUser } from '@/lib/permissions';
import { verifyCsrfToken } from '@/lib/csrf';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';
import { createAuditLog } from '@/lib/audit';

const PasswordChangeSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match.',
  path: ['confirmPassword'],
});

export type PasswordChangeState = {
  errors?: { newPassword?: string[]; confirmPassword?: string[]; };
  message?: string | null;
  success?: boolean;
};

export async function updateSuperAdminPassword(
  userId: number,
  prevState: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const user = await getVerifiedUser();
  if (!user || user.id !== userId || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized.' };
  }

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const rawData = {
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validatedFields = PasswordChangeSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    // Construct a more descriptive error message from the field errors
    const errorMessages = Object.values(fieldErrors).flat().join(', ');
    return { errors: fieldErrors, message: errorMessages || 'Invalid data.' };
  }
    
  const { newPassword } = validatedFields.data;

  // Enforce strong password policy on the new password (including breach check)
  const pwCheck = await validatePasswordAsync(newPassword);
  if (!pwCheck.valid) {
    return { errors: { newPassword: [pwCheck.errors.join(' ')] }, message: pwCheck.errors.join(' ') };
  }

  try {
    const admin = await prisma.superAdmin.findUnique({
      where: { id: userId },
      select: { password: true, mustChangePassword: true }
    });
    
    if (!admin) {
        return { success: false, message: 'User not found.' };
    }

    if (!admin.mustChangePassword) {
         return { success: false, message: 'Password change not required.' };
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.superAdmin.update({
      where: { id: userId },
      data: { 
        password: newHashedPassword,
        mustChangePassword: false,
      },
    });

    // Revoke all sessions (including current one)
    await incrementTokenVersionForRole('superadmin', userId);

    await createAuditLog({
      actorId: userId,
      actorType: 'SuperAdmin',
      action: 'UPDATE_OWN_PASSWORD',
      targetId: userId,
      targetType: 'SuperAdmin',
      changes: { passwordChanged: true }
    });

    // Sign out is handled on the client after success
    return { success: true, message: 'Password updated successfully. You will be logged out shortly.' };

  } catch (error) {
    console.error('Error updating super admin password:', error);
    return { success: false, message: 'Failed to update password.' };
  }
}
