

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Appointment } from '@/lib/definitions';
import { format, parseISO, getDay, parse as parseTime, isToday, isPast } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';
import { isTimeInRanges, isBefore, isEqual, isAfter } from '@/lib/time-utils';

const AppointmentFormSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name must be at least 2 characters.' }),
  patientPhone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
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

async function findOrCreatePatient(phone: string, defaults: { name: string, age: number, gender: 'male' | 'female' }) {
    return await prisma.patient.upsert({
        where: { phone },
        update: { name: defaults.name, age: defaults.age, gender: defaults.gender },
        create: { phone, name: defaults.name, age: defaults.age, gender: defaults.gender },
    });
}

export async function saveAppointment(
  hospitalId: number,
  appointmentId: string | null, // null for add, string for edit
  prevState: AppointmentFormState, 
  formData: FormData
): Promise<AppointmentFormState> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  // require granular permissions: create vs update
  const isUpdate = !!appointmentId;
  const requiredPerm = isUpdate ? 'Appointments:Update' : 'Appointments:Create';
  const allowed = await requireHospitalPermission(requiredPerm, hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };
  const validatedFields = AppointmentFormSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save appointment. Please check the fields.',
      success: false,
    };
  }
  
  const { appointmentDate, doctorId, appointmentSlot, patientName, patientPhone, patientAge, patientGender, ...rest } = validatedFields.data;
  
  // Parse the date string as a local date to avoid timezone shifts caused by `new Date('YYYY-MM-DD')`
  const appointmentDateObj = parseTime(appointmentDate, 'yyyy-MM-dd', new Date());

  if (isToday(appointmentDateObj)) {
    const appointmentTime = parseTime(appointmentSlot, 'HH:mm', new Date());
    if (isPast(appointmentTime)) {
      return {
        success: false,
        message: 'Cannot book an appointment in the past. Please select a future time.',
        errors: {
          appointmentSlot: ['This time has already passed.'],
        },
      };
    }
  }

  const appointmentDay = getDay(appointmentDateObj); // Sunday - 0, Monday - 1, etc.
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

    let formattedSlot = appointmentSlot;

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
      
      const patientsPerHour = (doctorSchedule as any).patientsPerHour || 2;
      const slotDuration = 60 / patientsPerHour;
      
      const slotStart = parseTime(appointmentSlot, 'HH:mm', new Date());
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
      
      formattedSlot = `${format(slotStart, 'hh:mm a')} - ${format(slotEnd, 'hh:mm a')}`;

    } else {
        // If no specific schedule, you might fall back to hospital hours or deny
        return { success: false, message: "This doctor does not have a schedule for the selected day." };
    }

    const patient = await findOrCreatePatient(patientPhone, { name: patientName, age: patientAge, gender: patientGender });

    const dataToSave = {
      ...rest,
      doctorId,
      appointmentSlot: formattedSlot,
      hospitalId,
      patientId: patient.id,
      // store appointmentDate as a parsed local date (start of day)
      appointmentDate: appointmentDateObj,
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

export async function updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'checked-in' | 'in-progress') {
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { hospitalId: true } });
    if (!appt) return { success: false, message: 'Not found.' };
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Unauthorized' };
    const allowed = await requireHospitalPermission('Appointments:Update', appt.hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    const updatedAppointment = await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
    revalidatePath('/hospital-admin/appointments');
    revalidatePath(`/doctor-portal/appointments`);
    // Ensure queue views refresh when appointment status changes
    revalidatePath('/hospital-admin/queue');
    revalidatePath('/hospital-admin/queue/projection');
    return { success: true, message: `Appointment status updated to ${status}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update appointment status.' };
  }
}

export async function deleteAppointment(appointmentId: string) {
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { hospitalId: true } });
    if (!appt) return { success: false, message: 'Not found.' };
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Unauthorized' };
    const allowed = await requireHospitalPermission('Appointments:Delete', appt.hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    await prisma.appointment.delete({ where: { id: appointmentId } });
    revalidatePath('/hospital-admin/appointments');
    return { success: true, message: 'Appointment deleted successfully.' };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to delete appointment.' };
  }
}

export async function getAppointments(hospitalId: number, page: number, limit: number, query: string) {
    const session = await auth();
    if (!session?.user) return [];
    const allowed = await requireHospitalPermission('Appointments:View', hospitalId);
    if (!allowed) return [];

    const where = {
        hospitalId,
        ...(query && {
          OR: [
            { patient: { name: { contains: query, mode: 'insensitive' } } },
            { doctor: { name: { contains: query, mode: 'insensitive' } } },
          ],
        }),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      include: { doctor: { select: { id: true, name: true, contact: true, specialty: true, imageUrl: true, status: true } }, patient: true },
      orderBy: { appointmentDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return appointments.map(a => ({...a, appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd')}));
}

export async function getAppointmentsCount(hospitalId: number, query: string) {
    const session = await auth();
    if (!session?.user) return 0;
    const allowed = await requireHospitalPermission('Appointments:View', hospitalId);
    if (!allowed) return 0;

    const where = {
        hospitalId,
        ...(query && {
          OR: [
            { patient: { name: { contains: query, mode: 'insensitive' } } },
            { doctor: { name: { contains: query, mode: 'insensitive' } } },
          ],
        }),
    };
    return await prisma.appointment.count({ where });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({ where: { hospitals: { some: { hospitalId } } }, select: { id: true, name: true, specialty: true, imageUrl: true, status: true } });
}

export async function getDoctorScheduleForDate(doctorId: number, date: string, hospitalId: number) {
  if (!doctorId || !date) return null;
  // Parse the date string as local date to avoid shifting to previous/next day due to UTC parsing
  const parsedDate = parseTime(date, 'yyyy-MM-dd', new Date());
  const dayIndex = getDay(parsedDate);
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

    