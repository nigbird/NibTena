
'use server';

import { prisma } from './prisma';

export async function getSpecialties() {
  const distinctSpecialties = await prisma.doctor.findMany({
    select: {
        specialty: true,
    },
    distinct: ['specialty'],
  });
  return distinctSpecialties.map(d => d.specialty);
}

export async function updateAppointment(appointmentId: string, data: { status?: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled', appointmentDate?: string, appointmentSlot?: string }) {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: data,
    });
    return updatedAppointment;
  } catch (error) {
    console.error('Failed to update appointment:', error);
    throw new Error('Failed to update appointment.');
  }
}
