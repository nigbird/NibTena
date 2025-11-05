import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

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
