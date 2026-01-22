import { prisma } from '@/lib/prisma';
import { validateTokenStructure } from '@/lib/token-validation';

export async function ensureTokenVersionValid(token: any) {
  const validToken = validateTokenStructure(token);
  if (!validToken) return false;

  const role = validToken.role;
  const id = validToken.id;


  try {
    const uid = Number(id);
    if (isNaN(uid)) return false;

    let dbRecord: any = null;
    switch (role) {
      case 'superadmin':
        dbRecord = await prisma.superAdmin.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        break;
      case 'hospital':
        // For hospital role, it could be a main hospital account or a staff member.
        // We use the `isStaff` flag in the token to distinguish.
        if (token.isStaff) {
          dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        } else {
          // Default to Hospital table
          dbRecord = await prisma.hospital.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
          
          // Fallback: If not found in Hospital and isStaff is undefined (legacy token), try User
          if (!dbRecord && token.isStaff === undefined) {
             dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
          }
        }
        break;
      case 'doctor':
        dbRecord = await prisma.doctor.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        break;
      default:
        // staff user
        dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        break;
    }

    if (!dbRecord) {
      console.warn('[auth-token-version] no DB record found for', { role, id: uid });
      return false;
    }
    const dbVersion = (dbRecord as any).tokenVersion ?? 0;
    const tokenVersion = token.tokenVersion ?? 0;
    // Debug log to help trace mismatches during development
    console.log('[auth-token-version] compare', { role, id: uid, dbVersion: Number(dbVersion), tokenVersion: Number(tokenVersion) });
    return Number(dbVersion) === Number(tokenVersion);
  } catch (e) {
    console.error('[auth-token-version] check failed', e);
    return false;
  }
}

export async function incrementTokenVersionForRole(role: string, id: number, isStaff?: boolean) {
  switch (role) {
    case 'superadmin':
      return prisma.superAdmin.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    case 'hospital':
      // For hospital role, check both tables - try Hospital first, then User
      // If isStaff is explicitly provided, we know which table to target.
      if (isStaff === true) {
        return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
      }
      if (isStaff === false) {
         return prisma.hospital.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
      }

      // If isStaff is undefined (legacy call), we have to guess or try both?
      // Try Hospital first, then User. This is risky for collisions but preserves old behavior.
      try {
        const hospital = await prisma.hospital.findUnique({ where: { id }, select: { id: true } });
        if (hospital) {
          return prisma.hospital.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
        }
        // Not in Hospital table, must be a staff member in User table
        return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
      } catch (e) {
        console.error('[auth-token-version] increment failed for hospital role', e);
        throw e;
      }
    case 'doctor':
      return prisma.doctor.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    default:
      return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  }
}

export default ensureTokenVersionValid;
