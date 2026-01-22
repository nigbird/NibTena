import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/permissions';
import { incrementTokenVersionForRole } from '@/lib/auth-token-version';
import { validateOrigin } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    // CSRF Protection: Validate Origin
    if (!validateOrigin(req)) {
      return NextResponse.json({ ok: false, message: 'Invalid Origin' }, { status: 403 });
    }

    // Use getVerifiedUser to ensure we are revoking the actual user's token
    const user = await getVerifiedUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Determine isStaff based on entityType
    let isStaff: boolean | undefined = undefined;
    if (user.entityType === 'user') isStaff = true;
    if (user.entityType === 'hospital') isStaff = false;

    await incrementTokenVersionForRole(user.role, user.id, isStaff);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/auth/revoke] error', err);
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 });
  }
}
