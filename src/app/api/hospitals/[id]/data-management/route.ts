import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { validateOrigin } from '@/lib/csrf';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF Protection: Validate Origin
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Invalid Origin' }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const allowed = await requireHospitalPermission('Settings:Update', id);
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const { dataRetentionDays } = await req.json();
    if (typeof dataRetentionDays !== 'number' || dataRetentionDays < 1) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }
    const hospital = await prisma.hospital.update({
      where: { id },
      data: { dataRetentionDays },
      select: { id: true, dataRetentionDays: true }
    });

    try {
      const actor = await getVerifiedUser();
      await createAuditLog({
        actorId: actor?.id ?? 'system',
        actorType: actor?.role === 'superadmin' ? 'SuperAdmin' : 'User',
        action: 'UPDATE_DATA_RETENTION_DAYS',
        targetId: hospital.id,
        targetType: 'Hospital',
        changes: { dataRetentionDays }
      });
    } catch (err) {
      console.error('[audit] failed to log data retention change', err);
    }
    return NextResponse.json(hospital);
  } catch (err) {
    console.error('PATCH /api/hospitals/[id]/data-management error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const allowed = await requireHospitalPermission('Settings:View', id);
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      select: { id: true, dataRetentionDays: true }
    });
    if (!hospital) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(hospital);
  } catch (err) {
    console.error('GET /api/hospitals/[id]/data-management error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
