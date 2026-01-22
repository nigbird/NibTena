import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // enforce tokenVersion validity for this request
    const { tokenVersionIsValidForRequest } = await Promise.resolve(require('@/lib/validate-token-version') as any);
    const valid = await tokenVersionIsValidForRequest(req);
    if (!valid) {
      return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null }, { status: 401 });
    }

    // Use the authoritative verification helper to get user details
    // This ignores session.user.permissionKeys/isAdmin and fetches fresh from DB
    const user = await getVerifiedUser();

    if (!user) {
      return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null });
    }

    let permissionKeys = user.permissions;
    
    // If admin, they have all permissions (implicit)
    // The API needs to return the list of ALL keys so the UI can enable all features
    if (user.isAdmin) {
      const all = await prisma.permission.findMany({ select: { key: true } });
      permissionKeys = all.map(p => p.key);
    }

    return NextResponse.json({ 
      permissionKeys, 
      isAdmin: user.isAdmin, 
      role: user.role, 
      hospitalId: user.hospitalId 
    });
    
  } catch (err) {
    console.error('[/api/me/permissions] error', err);
    return NextResponse.json({ permissionKeys: [], isAdmin: false, role: null, hospitalId: null }, { status: 500 });
  }
}
