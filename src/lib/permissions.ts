import getServerSession from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
// auth.ts lives at project root; import relative from src/lib
import { auth } from '../../auth';
import { prisma } from '@/lib/prisma';

export function checkPermission(session: any, key: string) {
  if (!session || !session.user) return false;
  if ((session.user as any).isAdmin) return true;
  const perms: string[] = (session.user as any).permissionKeys || [];
  return perms.includes(key);
}


export async function requirePermission(key: string) {
  // helper to use in server actions: get current session and return boolean
  try {
    // getServerSession expects the NextAuth handler (auth)
  const session = await getServerSession(auth as any);
    if (session) {
        // Prefer authoritative DB-driven permission checks even when a session exists.
        // This ensures changes to roles/permissions take effect immediately without requiring re-login.
        const s: any = session;
        const sid = s?.user?.id || s?.user?.sub;
        const roleName = s?.user?.role;
        const hospitalIdFromSession = s?.user?.hospitalId;
        const uid = sid ? Number(sid) : NaN;
      // If superadmin role, allow
      if (roleName === 'superadmin') return true;
      // If we have a valid numeric id, check DB for role/permissions
      if (!isNaN(uid)) {
        // If this session represents a Hospital account, check for an Owner (isAdmin) role on that hospital
        if (roleName === 'hospital') {
          const hid = Number(hospitalIdFromSession ?? uid);
          if (!isNaN(hid)) {
            const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
            if (owner) return true;
          }
        }

        // check staff user's role and permissions
        const user = await prisma.user.findUnique({ where: { id: uid }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
        if (user && user.role) {
          if (user.role.isAdmin) return true;
          const rolePerms = user.role.permissions?.map(rp => rp.permission.key) || [];
          if (rolePerms.includes(key)) return true;
        }
      }
      return false;
    }

    // fallback: try to read the JWT token directly (some server contexts may not provide the full session)
    console.warn('[requirePermission] no session found via getServerSession, attempting token fallback for', key);
  // Attempt to read token in several ways: normal getToken (may work in API routes),
  // or by constructing a cookie header from next/headers() when running in server actions.
  let token: any = null;
  try {
    token = await (getToken as any)({ secret: process.env.AUTH_SECRET });
  } catch (e) {
    // ignore and try cookie-based approach below
  }

  if (!token) {
    try {
      const ck: any = cookies();
      const cookieHeader = typeof ck.getAll === 'function' ? ck.getAll().map((c: any) => `${c.name}=${c.value}`).join('; ') : '';
      if (cookieHeader) {
        token = await (getToken as any)({ req: { headers: { cookie: cookieHeader } }, secret: process.env.AUTH_SECRET });
      }
    } catch (e) {
      console.warn('[requirePermission] cookie-based getToken failed', e);
    }
  }

  if (!token) {
    console.warn('[requirePermission] no token found when checking', key);
    // As a last resort, fall back to DB only if we can infer a session via cookies (handled above).
    return false;
  }
    // Prefer DB-driven checks: resolve user identity from token and then verify permissions from DB
    const uid = (token as any).id || (token as any).sub; // token may use id or sub
    const roleNameOr = (token as any).role;
    const hospitalIdFromToken = (token as any).hospitalId;
    // If superadmin token, allow
    if (roleNameOr === 'superadmin') return true;

    // If token indicates a hospital and a hospital owner role may exist, check that
    try {
      if (uid) {
        const userIdNum = Number(uid);
        // If role is hospital, check owner role for the hospital
        if (roleNameOr === 'hospital') {
          const hid = Number(hospitalIdFromToken ?? uid);
          if (!isNaN(hid)) {
            const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
            if (owner) return true;
          }
        }

        if (!isNaN(userIdNum)) {
          const user = await prisma.user.findUnique({ where: { id: userIdNum }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
          if (user && user.role) {
            if (user.role.isAdmin) return true;
            const rolePerms = user.role.permissions?.map(rp => rp.permission.key) || [];
            if (rolePerms.includes(key)) return true;
          }
        }
      }
    } catch (dbErr) {
      console.error('[requirePermission] DB fallback error', dbErr);
    }

    return false;
  } catch (err) {
    console.error('[requirePermission] error', err);
    return false;
  }
}

/**
 * Check whether the current caller has ANY of the provided permission keys.
 * This is handy for actions that can be allowed via multiple related permissions
 * (e.g. SCHEDULE_CREATE or SCHEDULE_EDIT or full SCHEDULE_MANAGE).
 */
export async function requireAnyPermission(keys: string[]) {
  for (const k of keys) {
    try {
      const ok = await requirePermission(k);
      if (ok) return true;
    } catch (e) {
      // ignore and continue checking other keys
    }
  }
  return false;
}

/**
 * Check whether the current caller is the Owner (isAdmin) for the given hospitalId.
 * This is used as a fallback in server actions when requirePermission returns false but
 * the hospital account itself should have full access.
 */
export async function isHospitalOwnerFor(hospitalId: number) {
  try {
    const session = await getServerSession(auth as any);
    let sid: any = null;
    let roleName: any = null;
    let hid: any = null;
    if (session) {
      const s: any = session;
      sid = s?.user?.id || s?.user?.sub;
      roleName = s?.user?.role;
      hid = s?.user?.hospitalId ?? null;
    }

    // token fallback
    if (!sid) {
      let token: any = null;
      try {
        token = await (getToken as any)({ secret: process.env.AUTH_SECRET });
      } catch (e) {}
      if (!token) {
        try {
          const ck: any = cookies();
          const cookieHeader = typeof ck.getAll === 'function' ? ck.getAll().map((c: any) => `${c.name}=${c.value}`).join('; ') : '';
          if (cookieHeader) {
            token = await (getToken as any)({ req: { headers: { cookie: cookieHeader } }, secret: process.env.AUTH_SECRET });
          }
        } catch (e) {}
      }
      if (token) {
        sid = sid || (token as any).id || (token as any).sub;
        roleName = roleName || (token as any).role;
        hid = hid || (token as any).hospitalId || null;
      }
    }

    // If the caller is a hospital account, check whether an Owner role exists for that hospital
    if ((roleName === 'hospital' || roleName === 'hospital') ) {
      const resolvedHospitalId = Number(hid ?? sid);
      if (!isNaN(resolvedHospitalId) && resolvedHospitalId === Number(hospitalId)) {
        const owner = await prisma.role.findFirst({ where: { hospitalId: resolvedHospitalId, isAdmin: true } });
        return !!owner;
      }
    }

    return false;
  } catch (err) {
    console.error('[isHospitalOwnerFor] error', err);
    return false;
  }
}
