import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUser } from '@/lib/permissions';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    // Secure this endpoint to prevent IDOR / Context Switching
    const user = await getVerifiedUser();
    
    // If not authenticated, or if authenticated as hospital staff but requesting a different hospital
    if (!user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'hospital' && user.hospitalId !== id) {
       return NextResponse.json({ error: 'Forbidden: Access denied to this hospital context' }, { status: 403 });
    }

    // Superadmins can access any hospital, Hospital admins/staff can only access their own.

    const hospital = await prisma.hospital.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, description: true, city: true },
    });

    if (!hospital) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(hospital);
  } catch (err) {
    console.error('GET /api/hospital/[id] error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
