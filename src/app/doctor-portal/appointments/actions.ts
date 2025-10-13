
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
    include: {
        hospital: true,
    },
    orderBy: {
      appointmentDate: 'asc',
    },
  });
  
  // Format Date objects to strings
  const processedAppointments = appointments.map(a => {
        return {
          ...a,
          appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
          createdAt: a.createdAt.toISOString(),
          appointmentSummary: a.symptoms, // Removed AI summary, just pass symptoms
        }
    });

  return processedAppointments as unknown as Appointment[];
}
