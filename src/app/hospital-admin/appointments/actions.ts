
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Appointment } from '@/lib/definitions';
import { format, parseISO, getDay, parse as parseTime } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { isTimeInRanges, isBefore, isEqual, isAfter } from '@/lib/time-utils';

const AppointmentFormSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name must be at least 2 characters.' }),
  patientPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  patientAge: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  patientGender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  doctorId: z.coerce.number({required_error: 'Please select a doctor.'}),
  appointmentDate: z.string({ required_error: 'Please select a date.' }).min(1, 'Date is required.'),
  appointmentSlot: z.string({ required_error: 'Please select a time slot.' }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:mm."),
  symptoms: z.string().optional(),
});

export type AppointmentFormState = {
  errors?: {
    patientName?: string[];
    patientPhone?: string[];
    patientAge?: string[];
    patientGender?: string[];
    doctorId?: string[];
    appointmentDate?: string[];
    appointmentSlot?: string[];
    symptoms?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function saveAppointment(
  hospitalId: number,
  appointmentId: string | null, // null for add, string for edit
  prevState: AppointmentFormState, 
  formData: FormData
): Promise<AppointmentFormState> {
  const validatedFields = AppointmentFormSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save appointment. Please check the fields.',
      success: false,
    };
  }
  
  const { appointmentDate, doctorId, appointmentSlot, ...rest } = validatedFields.data;
  
  const appointmentDay = getDay(new Date(appointmentDate)); // Sunday - 0, Monday - 1, etc.
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = weekDays[appointmentDay];

  try {
    const doctorSchedule = await prisma.doctorSchedule.findUnique({
      where: {
        doctorId_hospitalId_dayOfWeek: {
          doctorId,
          hospitalId,
          dayOfWeek,
        },
      },
    });

    if (doctorSchedule) {
      const workingHours = doctorSchedule.workingHours as { startTime: string, endTime: string }[];
      const breakHours = doctorSchedule.breakHours as { startTime: string, endTime: string }[];
      
      const appointmentTime = parseTime(appointmentSlot, 'HH:mm', new Date());

      const isInWorkingHours = isTimeInRanges(appointmentTime, workingHours);
      const isInBreakHours = isTimeInRanges(appointmentTime, breakHours);
      
      if (!isInWorkingHours || isInBreakHours) {
        return {
          success: false,
          message: `The selected time ${appointmentSlot} is outside the doctor's available hours for that day.`
        }
      }
    } else {
        // If no specific schedule, you might fall back to hospital hours or deny
        return { success: false, message: "This doctor does not have a schedule for the selected day." };
    }


    const dataToSave = {
      ...rest,
      doctorId,
      appointmentSlot,
      hospitalId,
      appointmentDate: new Date(appointmentDate),
      symptoms: validatedFields.data.symptoms || '',
    };

    if (appointmentId) {
      await prisma.appointment.update({ where: { id: appointmentId }, data: dataToSave });
    } else {
      await prisma.appointment.create({ data: { ...dataToSave, status: 'confirmed' } });
    }
    revalidatePath('/hospital-admin/appointments');
    return {
      success: true,
      message: `Appointment ${appointmentId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error) {
    console.error('Save appointment error:', error);
    return {
      message: 'Database Error: Failed to save appointment.',
      success: false,
    };
  }
}

export async function updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled') {
  try {
    const updatedAppointment = await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
    revalidatePath('/hospital-admin/appointments');
    revalidatePath(`/doctor-portal/appointments`);
    return { success: true, message: `Appointment status updated to ${status}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update appointment status.' };
  }
}

export async function deleteAppointment(appointmentId: string) {
    try {
        await prisma.appointment.delete({ where: { id: appointmentId } });
        revalidatePath('/hospital-admin/appointments');
        return { success: true, message: 'Appointment deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete appointment.' };
    }
}

export async function getAppointments(hospitalId: number, page: number, limit: number, query: string) {
    const where = {
        hospitalId,
        ...(query && {
          OR: [
            { patientName: { contains: query, mode: 'insensitive' } },
            { doctor: { name: { contains: query, mode: 'insensitive' } } },
          ],
        }),
    };

    const appointments = await prisma.appointment.findMany({
        where,
        include: { doctor: true },
        orderBy: { appointmentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
    });
    return appointments.map(a => ({...a, appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd')}));
}

export async function getAppointmentsCount(hospitalId: number, query: string) {
    const where = {
        hospitalId,
        ...(query && {
          OR: [
            { patientName: { contains: query, mode: 'insensitive' } },
            { doctor: { name: { contains: query, mode: 'insensitive' } } },
          ],
        }),
    };
    return await prisma.appointment.count({ where });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}

export async function getDoctorScheduleForDate(doctorId: number, date: string, hospitalId: number) {
  if (!doctorId || !date) return null;
  const dayIndex = getDay(new Date(date));
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = weekDays[dayIndex];

  return await prisma.doctorSchedule.findUnique({
    where: {
      doctorId_hospitalId_dayOfWeek: {
        doctorId,
        hospitalId,
        dayOfWeek
      }
    },
    select: {
      workingHours: true,
      breakHours: true,
    }
  });
}
