import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const { dataRetentionDays } = await req.json();
    if (typeof dataRetentionDays !== 'number' || dataRetentionDays < 1) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }
    const hospital = await prisma.hospital.update({
      where: { id },
      data: { dataRetentionDays },
      select: { id: true, dataRetentionDays: true }
    });
    return NextResponse.json(hospital);
  } catch (err) {
    console.error('PATCH /api/hospitals/[id]/data-management error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
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
