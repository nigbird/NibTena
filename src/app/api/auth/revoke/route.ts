import { NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { auth } from '../../../../../auth';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';

export async function POST(req: Request) {
  try {
    // Use auth() helper directly which works in App Router
    const session: any = await auth();

    let role: string | null = null;
    let id: number | null = null;
    let isStaff: boolean | undefined = undefined;

    if (session && session.user) {
      role = session.user.role ?? null;
      const idRaw = session.user.id ?? session.user.sub;
      id = Number(idRaw);
      isStaff = session.user.isStaff;
    } else {
      // Fallback: try to read JWT from the request
      try {
        const token: any = await (getToken as any)({ req, secret: process.env.AUTH_SECRET });
        if (token) {
          role = token.role ?? null;
          const idRaw = token.id ?? token.sub;
          id = Number(idRaw);
          isStaff = token.isStaff;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!role || !id || isNaN(id)) return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });

    await incrementTokenVersionForRole(role, id, isStaff);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/auth/revoke] error', err);
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 });
  }
}
