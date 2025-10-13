
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment } from '@/lib/definitions';
import { format } from 'date-fns';

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
  
  // Format Date objects to strings
  return appointments.map(a => ({
    ...a,
    appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
    createdAt: a.createdAt.toISOString(),
  })) as unknown as Appointment[];
}
