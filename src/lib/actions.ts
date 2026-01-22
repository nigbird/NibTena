
'use server';

import { prisma } from './prisma';
import { getAvailableTimeWindows } from '@/app/user/doctors/[id]/actions';
import { parse as parseTime, format as formatTime, parseISO, startOfDay } from 'date-fns';
import { getPatientFromCookie } from './session';

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

import { validateAppointmentUpdateLogic } from './validation-utils';

export async function updateAppointment(
  appointmentId: string,
  data: {
    status?: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
    appointmentDate?: string;
    appointmentSlot?: string;
  }
) {
  try {
    // 1. Get authenticated patient from session
    const patient = await getPatientFromCookie();
    if (!patient) {
      throw new Error('Authentication required. Please log in.');
    }

    // 2. Find the appointment to ensure it exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error('Appointment not found.');
    }

    const dataToUpdate = validateAppointmentUpdateLogic(appointment, patient, data);

    // 5. If rescheduling, validate the new slot and date
    if (dataToUpdate.status === 'rescheduled' || (data.appointmentDate && data.appointmentSlot)) {
      if (!data.appointmentDate || !data.appointmentSlot) {
        throw new Error('New date and time slot are required for rescheduling.');
      }
      
      const availableWindows = await getAvailableTimeWindows(
        appointment.doctorId,
        data.appointmentDate,
        appointment.hospitalId
      );

      const [startTimeStr] = data.appointmentSlot.split(' - ');
      const dateObj = parseTime(startTimeStr, 'hh:mm a', new Date());
      const formattedSlotStart = formatTime(dateObj, 'hh:mm a');
      
      const isSlotAvailable = availableWindows.some(window => window.startsWith(formattedSlotStart));
      
      if (!isSlotAvailable) {
        throw new Error("The selected reschedule time is not available.");
      }

      dataToUpdate.appointmentDate = startOfDay(parseISO(data.appointmentDate));
      dataToUpdate.appointmentSlot = data.appointmentSlot;
    }
    
    // Check if there are any valid fields to update
    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('No valid changes requested.');
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: dataToUpdate,
    });
    
    return updatedAppointment;

  } catch (error) {
    console.error('Failed to update appointment:', error);
    // Rethrow with the specific error message, which is now safe for client consumption.
    const errorMessage = error instanceof Error ? error.message : String(error) || 'An unexpected error occurred.';
    throw new Error(errorMessage);
  }
}

