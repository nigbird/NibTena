
'use server';

import { prisma } from '@/lib/prisma';

export async function getMyAppointments(patientName: string) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        patientName: patientName,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return appointments;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    // In a real app, you'd want more robust error handling
    return [];
  }
}

export async function getDoctors() {
    try {
        const doctors = await prisma.doctor.findMany();
        return doctors;
    } catch (error) {
        console.error('Failed to fetch doctors:', error);
        return [];
    }
}
