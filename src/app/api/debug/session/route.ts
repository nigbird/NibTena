import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auth } from '../../../../../auth';

export async function GET(req: Request) {
  try {
    // server-side session (uses auth helper)
    const session = await auth();

    // raw token (inspect cookies/headers)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });

    return NextResponse.json({ ok: true, session: session ?? null, token: token ?? null });
  } catch (err) {
    console.error('/api/debug/session error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
