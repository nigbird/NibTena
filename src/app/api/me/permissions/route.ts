import { NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import { cookies } from 'next/headers';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function GET(req: Request) {
  try {
    // Use auth() helper directly which works in App Router, or getServerSession with proper context
    const session = await auth();

    // enforce tokenVersion validity for this request
    const { tokenVersionIsValidForRequest } = await Promise.resolve(require('@/lib/validate-token-version') as any);
    const valid = await tokenVersionIsValidForRequest(req);
    if (!valid) {
      return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null }, { status: 401 });
    }

    let permissionKeys: string[] = [];
    let isAdmin = false;
    let role: string | null = null;
    let hospitalId: number | null = null;

    if (session && (session as any).user) {
      const s: any = session;
      role = s?.user?.role ?? null;
      hospitalId = s?.user?.hospitalId ?? null;
      const sid = s?.user?.id || s?.user?.sub;
      isAdmin = s?.user?.isAdmin === true;

      // Superadmin -> has implicit access to everything
      if (role === 'superadmin') {
        isAdmin = true;
        const all = await prisma.permission.findMany({ select: { key: true } });
        return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
      }

      const uid = sid ? Number(sid) : NaN;
      if (!isNaN(uid)) {
        // First, check if this is a staff user (in User table)
        // Staff users can have role='hospital' but are in User table, not Hospital table
        const staffUser = await prisma.user.findUnique({ 
          where: { id: uid }, 
          select: { id: true, hospitalId: true, role: { include: { permissions: { include: { permission: true } } } }, },
        });
        
        if (staffUser) {
          // This is a staff user (could be hospital staff or other)
          if (staffUser.role) {
            if (staffUser.role.isAdmin) {
              isAdmin = true;
              const all = await prisma.permission.findMany({ select: { key: true } });
              return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: staffUser.hospitalId });
            }
            permissionKeys = staffUser.role.permissions?.map((rp: any) => rp.permission.key) || [];
            return NextResponse.json({ permissionKeys, isAdmin, role, hospitalId: staffUser.hospitalId });
          }
          // Staff user exists but has no role - return empty permissions
          return NextResponse.json({ permissionKeys: [], isAdmin: false, role, hospitalId: staffUser.hospitalId });
        }

        // If not a staff user and role is 'hospital', check if it's a main hospital account
        if (role === 'hospital') {
          const hid = Number(hospitalId ?? uid);
          if (!isNaN(hid)) {
            // Check if this ID exists in Hospital table (main hospital account)
            const hospital = await prisma.hospital.findUnique({ where: { id: hid }, select: { id: true } });
            if (hospital) {
              // Main hospital account is admin by default (checked via isAdmin flag)
              if (isAdmin) {
                const all = await prisma.permission.findMany({ select: { key: true } });
                return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
              }
              // Fallback: check for Owner role in database (legacy check)
              const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
              if (owner) {
                isAdmin = true;
                const all = await prisma.permission.findMany({ select: { key: true } });
                return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
              }
            }
          }
        }
      }
    }

    // Token / cookie fallback (server contexts where getServerSession may not work)
    let token: any = null;
    try {
      token = await (getToken as any)({ secret: process.env.AUTH_SECRET });
    } catch (e) {
      // ignore
    }
    if (!token) {
      try {
        const ck: any = cookies();
        const cookieHeader = typeof ck.getAll === 'function' ? ck.getAll().map((c: any) => `${c.name}=${c.value}`).join('; ') : '';
        if (cookieHeader) {
          token = await (getToken as any)({ req: { headers: { cookie: cookieHeader } }, secret: process.env.AUTH_SECRET });
        }
      } catch (e) {
        // ignore
      }
    }

    if (token) {
      const uid = token.id || token.sub;
      role = token.role ?? role;
      hospitalId = token.hospitalId ?? hospitalId;
      isAdmin = token.isAdmin === true || isAdmin;

      if (role === 'superadmin') {
        isAdmin = true;
        const all = await prisma.permission.findMany({ select: { key: true } });
        return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
      }

      // First, check if this is a staff user (in User table)
      if (uid) {
        const userIdNum = Number(uid);
        if (!isNaN(userIdNum)) {
          const staffUser = await prisma.user.findUnique({ 
            where: { id: userIdNum }, 
            select: { id: true, hospitalId: true, role: { include: { permissions: { include: { permission: true } } } }, },
          });
          
          if (staffUser) {
            // This is a staff user (could be hospital staff or other)
            if (staffUser.role) {
              if (staffUser.role.isAdmin) {
                isAdmin = true;
                const all = await prisma.permission.findMany({ select: { key: true } });
                return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: staffUser.hospitalId });
              }
              permissionKeys = staffUser.role.permissions?.map((rp: any) => rp.permission.key) || [];
              return NextResponse.json({ permissionKeys, isAdmin, role, hospitalId: staffUser.hospitalId });
            }
            // Staff user exists but has no role - return empty permissions
            return NextResponse.json({ permissionKeys: [], isAdmin: false, role, hospitalId: staffUser.hospitalId });
          }
        }
      }

      // If not a staff user and role is 'hospital', check if it's a main hospital account
      if (role === 'hospital') {
        const hid = Number(hospitalId ?? uid);
        if (!isNaN(hid)) {
          // Check if this ID exists in Hospital table (main hospital account)
          const hospital = await prisma.hospital.findUnique({ where: { id: hid }, select: { id: true } });
          if (hospital) {
            // Main hospital account is admin by default (checked via isAdmin flag)
            if (isAdmin) {
              const all = await prisma.permission.findMany({ select: { key: true } });
              return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
            }
            // Fallback: check for Owner role in database (legacy check)
            const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
            if (owner) {
              isAdmin = true;
              const all = await prisma.permission.findMany({ select: { key: true } });
              return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
            }
          }
        }
      }
    }

    return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null });
  } catch (err) {
    console.error('[/api/me/permissions] error', err);
    return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null }, { status: 500 });
  }
}
