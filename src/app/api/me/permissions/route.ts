import { NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import { cookies } from 'next/headers';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function GET() {
  try {
    const session = await getServerSession(auth as any);

    let permissionKeys: string[] = [];
    let isAdmin = false;
    let role: string | null = null;
    let hospitalId: number | null = null;

    if (session) {
      const s: any = session;
      role = s?.user?.role ?? null;
      hospitalId = s?.user?.hospitalId ?? null;
      const sid = s?.user?.id || s?.user?.sub;

      // Superadmin -> has implicit access to everything
      if (role === 'superadmin') {
        isAdmin = true;
        const all = await prisma.permission.findMany({ select: { key: true } });
        return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
      }

      const uid = sid ? Number(sid) : NaN;
      if (!isNaN(uid)) {
        // If hospital account, check whether an Owner role exists (isAdmin)
        if (role === 'hospital') {
          const hid = Number(hospitalId ?? uid);
          if (!isNaN(hid)) {
            const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
            if (owner) {
              isAdmin = true;
              const all = await prisma.permission.findMany({ select: { key: true } });
              return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
            }
          }
        }

        // For staff users, resolve their role and permissions from DB
        const user = await prisma.user.findUnique({ where: { id: uid }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
        if (user && user.role) {
          if (user.role.isAdmin) {
            isAdmin = true;
            const all = await prisma.permission.findMany({ select: { key: true } });
            return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
          }
          permissionKeys = user.role.permissions?.map((rp: any) => rp.permission.key) || [];
          return NextResponse.json({ permissionKeys, isAdmin, role, hospitalId });
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

      if (role === 'superadmin') {
        isAdmin = true;
        const all = await prisma.permission.findMany({ select: { key: true } });
        return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
      }

      if (role === 'hospital') {
        const hid = Number(hospitalId ?? uid);
        if (!isNaN(hid)) {
          const owner = await prisma.role.findFirst({ where: { hospitalId: hid, isAdmin: true } });
          if (owner) {
            isAdmin = true;
            const all = await prisma.permission.findMany({ select: { key: true } });
            return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId: hid });
          }
        }
      }

      if (uid) {
        const userIdNum = Number(uid);
        if (!isNaN(userIdNum)) {
          const user = await prisma.user.findUnique({ where: { id: userIdNum }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
          if (user && user.role) {
            if (user.role.isAdmin) {
              isAdmin = true;
              const all = await prisma.permission.findMany({ select: { key: true } });
              return NextResponse.json({ permissionKeys: all.map(p => p.key), isAdmin, role, hospitalId });
            }
            permissionKeys = user.role.permissions?.map((rp: any) => rp.permission.key) || [];
            return NextResponse.json({ permissionKeys, isAdmin, role, hospitalId });
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
