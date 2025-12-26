
'use server';

import { prisma } from './prisma';
import { getAvailableTimeWindows } from '@/app/user/doctors/[id]/actions';
import { parse as parseTime, format as formatTime } from 'date-fns';

// Return specialties. If hospitalId provided, prefer Specialty model entries (active ones). Otherwise fallback
// to distinct specialties derived from existing doctors (backwards compatibility).
export async function getSpecialties(hospitalId?: number) {
  if (typeof hospitalId === 'number') {
    const specs = await prisma.specialty.findMany({
      where: { hospitalId, active: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return specs.map(s => s.name);
  }

  // Fallback: return distinct specialties from doctors
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
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new Error('Appointment not found.');
    }

    // If rescheduling, validate the new slot
    if (data.status === 'rescheduled' && data.appointmentDate && data.appointmentSlot) {
        const availableWindows = await getAvailableTimeWindows(
            appointment.doctorId,
            data.appointmentDate,
            appointment.hospitalId
        );
        
        // Normalize slot to check against available windows
        const [startTimeStr] = data.appointmentSlot.split(' - ');
        const dateObj = parseTime(startTimeStr, 'hh:mm a', new Date());
        const formattedSlotStart = formatTime(dateObj, 'hh:mm a');
        
        const isSlotAvailable = availableWindows.some(window => window.startsWith(formattedSlotStart));
        
        if (!isSlotAvailable) {
            throw new Error("The selected reschedule time is not available.");
        }
    }

    const dataToUpdate: any = { ...data };
    if (data.appointmentDate) {
      dataToUpdate.appointmentDate = new Date(data.appointmentDate);
    }
    
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: dataToUpdate,
    });
    return updatedAppointment;
  } catch (error) {
    console.error('Failed to update appointment:', error);
    throw new Error((error as Error).message || 'Failed to update appointment.');
  }
}
