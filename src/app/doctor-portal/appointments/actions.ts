
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment } from '@/lib/definitions';
import { format } from 'date-fns';
import { getVerifiedUser } from '@/lib/permissions';

export async function getAppointmentsByDoctorIdForDoctor(doctorId: number, hospitalId: number): Promise<Appointment[]> {
  const user = await getVerifiedUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Ensure the user is a doctor and is requesting their own appointments
  if (user.role === 'doctor') {
    if (user.id !== doctorId) {
       throw new Error('Unauthorized: You can only view your own appointments');
    }
  } else {
    // If not a doctor (e.g. superadmin trying to use this action? or hospital admin?), deny for now as this is doctor-portal specific.
    // If we need to support others, we can add logic here.
    throw new Error('Unauthorized');
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctorId,
      hospitalId: hospitalId
    },
    include: {
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            imageUrl: true,
            contactEmail: true,
            contactPhone: true,
            status: true,
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            gender: true,
            age: true,
          }
        },
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
          appointmentSummary: a.symptoms,
          patientName: a.patient.name, // Flatten patient data
          patientAge: a.patient.age,
          patientGender: a.patient.gender,
          patientPhone: a.patient.phone,
        }
    });

  return processedAppointments as unknown as Appointment[];
}

    