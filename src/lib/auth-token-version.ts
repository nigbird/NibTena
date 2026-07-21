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
        dbRecord = await prisma.superAdmin.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
        break;
      case 'hospital':
        // For hospital role, it could be a main hospital account or a staff member.
        // We use the `isStaff` flag in the token to distinguish.
        if (token.isStaff) {
          dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
        } else {
          // Default to Hospital table
          dbRecord = await prisma.hospital.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
          
          // Fallback: If not found in Hospital and isStaff is undefined (legacy token), try User
          if (!dbRecord && token.isStaff === undefined) {
             dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
          }
        }
        break;
      case 'doctor':
        dbRecord = await prisma.doctor.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
        break;
      default:
        // staff user
        dbRecord = await prisma.user.findUnique({ where: { id: uid }, select: { tokenVersion: true, activeSessionId: true } });
        break;
    }

    if (!dbRecord) {
      console.warn('[auth-token-version] no DB record found for', { role, id: uid });
      return false;
    }
    const dbVersion = (dbRecord as any).tokenVersion ?? 0;
    const tokenVersion = token.tokenVersion ?? 0;

    // Strict session concurrency:
    // - If DB has no activeSessionId, treat all tokens as invalid (forces login).
    // - If token has no sessionId (legacy token), treat as invalid (forces login once).
    const dbSessionId = (dbRecord as any).activeSessionId ?? null;
    const tokenSessionId = (token as any).sessionId ?? null;
    if (!dbSessionId || !tokenSessionId) return false;
    if (String(dbSessionId) !== String(tokenSessionId)) return false;

    return Number(dbVersion) === Number(tokenVersion);
  } catch (e) {
    console.error('[auth-token-version] check failed', e);
    return false;
  }
}

export async function incrementTokenVersionForRole(role: string, id: number, isStaff?: boolean) {
  switch (role) {
    case 'superadmin':
      return prisma.superAdmin.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
    case 'hospital':
      // For hospital role, check both tables - try Hospital first, then User
      // If isStaff is explicitly provided, we know which table to target.
      if (isStaff === true) {
        return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
      }
      if (isStaff === false) {
         return prisma.hospital.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
      }

      // If isStaff is undefined (legacy call), we have to guess or try both?
      // Try Hospital first, then User. This is risky for collisions but preserves old behavior.
      try {
        const hospital = await prisma.hospital.findUnique({ where: { id }, select: { id: true } });
        if (hospital) {
          return prisma.hospital.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
        }
        // Not in Hospital table, must be a staff member in User table
        return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
      } catch (e) {
        console.error('[auth-token-version] increment failed for hospital role', e);
        throw e;
      }
    case 'doctor':
      return prisma.doctor.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
    default:
      return prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 }, activeSessionId: null } });
  }
}

export async function setActiveSessionIdForRole(role: string, id: number, sessionId: string, isStaff?: boolean) {
  switch (role) {
    case 'superadmin':
      return prisma.superAdmin.update({ where: { id }, data: { activeSessionId: sessionId } });
    case 'hospital':
      if (isStaff === true) {
        return prisma.user.update({ where: { id }, data: { activeSessionId: sessionId } });
      }
      if (isStaff === false) {
        return prisma.hospital.update({ where: { id }, data: { activeSessionId: sessionId } });
      }

      // legacy fallback: try Hospital first, then User
      try {
        const hospital = await prisma.hospital.findUnique({ where: { id }, select: { id: true } });
        if (hospital) {
          return prisma.hospital.update({ where: { id }, data: { activeSessionId: sessionId } });
        }
        return prisma.user.update({ where: { id }, data: { activeSessionId: sessionId } });
      } catch (e) {
        console.error('[auth-token-version] setActiveSessionId failed for hospital role', e);
        throw e;
      }
    case 'doctor':
      return prisma.doctor.update({ where: { id }, data: { activeSessionId: sessionId } });
    default:
      return prisma.user.update({ where: { id }, data: { activeSessionId: sessionId } });
  }
}

export default ensureTokenVersionValid;
