
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment } from '@/lib/definitions';
import { format } from 'date-fns';
import { summarizeSymptoms } from '@/ai/flows/summarize-symptoms-flow';

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
  
  // Format Date objects to strings and generate AI summary
  const processedAppointments = await Promise.all(
    appointments.map(async (a) => {
        let summary = a.symptoms;
        if (a.symptoms) {
            try {
                const result = await summarizeSymptoms({ symptoms: a.symptoms });
                summary = result.summary;
            } catch (error) {
                console.error("Failed to summarize symptoms:", error);
                // Fallback to original symptoms if AI fails
            }
        }

        return {
          ...a,
          appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
          createdAt: a.createdAt.toISOString(),
          appointmentSummary: summary,
        }
    })
  );

  return processedAppointments as unknown as Appointment[];
}
