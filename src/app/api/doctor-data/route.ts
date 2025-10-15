
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
  }

  const doctorId = parseInt(id, 10);
  if (isNaN(doctorId)) {
    return NextResponse.json({ error: 'Invalid Doctor ID' }, { status: 400 });
  }

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        hospitals: {
          include: {
            hospital: true,
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const doctorHospitals = doctor.hospitals.map(h => h.hospital);

    return NextResponse.json({ doctor, doctorHospitals });

  } catch (error) {
    console.error('Failed to fetch doctor data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
