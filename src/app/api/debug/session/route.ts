import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auth } from '../../../../../auth';

export async function GET(req: Request) {
  try {
    // server-side session (uses auth helper)
    const session = await auth();

    // raw token (inspect cookies/headers)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });

    // Sanitize session and token before returning to avoid leaking sensitive fields
    const safeSession = session ? JSON.parse(JSON.stringify(session)) : null;
    if (safeSession && safeSession.user) delete safeSession.user.password;
    const safeToken = token ? JSON.parse(JSON.stringify(token)) : null;
    if (safeToken) delete safeToken.password;
    return NextResponse.json({ ok: true, session: safeSession ?? null, token: safeToken ?? null });
  } catch (err) {
    console.error('/api/debug/session error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
