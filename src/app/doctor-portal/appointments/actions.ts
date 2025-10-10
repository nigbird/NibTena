
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment } from '@/lib/definitions';

export async function getAppointmentsByDoctorIdForDoctor(doctorId: number, hospitalId: number): Promise<Appointment[]> {
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctorId,
      hospitalId: hospitalId
    },
    orderBy: {
      appointmentDate: 'asc',
    },
  });
  return appointments;
}
