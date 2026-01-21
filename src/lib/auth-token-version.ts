import { prisma } from '@/lib/prisma';

export async function ensureTokenVersionValid(token: any) {
  if (!token) return false;
  const role = token.role;
  const id = token.id || token.sub;
  if (!role || !id) return false;

  try {
    const uid = Number(id);
    if (isNaN(uid)) return false;

    let dbRecord: any = null;
    switch (role) {
      case 'superadmin':
        dbRecord = await prisma.superAdmin.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        break;
      case 'hospital':
        // For hospital role, it could be:
        // 1. Main hospital account (in Hospital table)
        // 2. Staff member (in User table, but role='hospital')
        // Try Hospital table first, then User table if not found
        dbRecord = await prisma.hospital.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
        if (!dbRecord) {
          // Not in Hospital table, try User table (staff member)
          dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true } });
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

export async function incrementTokenVersionForRole(role: string, id: number) {
  switch (role) {
    case 'superadmin':
      return prisma.superAdmin.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    case 'hospital':
      // For hospital role, check both tables - try Hospital first, then User
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
