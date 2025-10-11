
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Appointment } from '@/lib/definitions';
import { format, parseISO } from 'date-fns';
import { prisma } from '@/lib/prisma';

const AppointmentFormSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name must be at least 2 characters.' }),
  patientPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  patientAge: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  patientGender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  doctorId: z.coerce.number({required_error: 'Please select a doctor.'}),
  appointmentDate: z.string({ required_error: 'Please select a date.' }).min(1, 'Date is required.'),
  appointmentSlot: z.string({ required_error: 'Please select a time slot.' }),
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
  appointmentId: string | null, // null for add, string for edit
  prevState: AppointmentFormState, 
  formData: FormData
): Promise<AppointmentFormState> {
  const validatedFields = AppointmentFormSchema.safeParse({
    patientName: formData.get('patientName'),
    patientPhone: formData.get('patientPhone'),
    patientAge: formData.get('patientAge'),
    patientGender: formData.get('patientGender'),
    doctorId: formData.get('doctorId'),
    appointmentDate: formData.get('appointmentDate'),
    appointmentSlot: formData.get('appointmentSlot'),
    symptoms: formData.get('symptoms'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save appointment. Please check the fields.',
      success: false,
    };
  }
  
  const { appointmentDate, ...rest } = validatedFields.data;
  const dataToSave = {
    ...rest,
    appointmentDate: new Date(appointmentDate),
    symptoms: validatedFields.data.symptoms || '',
  };

  try {
    if (appointmentId) {
      await prisma.appointment.update({ where: { id: appointmentId }, data: dataToSave });
    } else {
      const doctor = await prisma.doctor.findUnique({ where: { id: dataToSave.doctorId }, include: { hospitals: true } });
      if (!doctor || !doctor.hospitals[0]) {
        throw new Error('Doctor or hospital not found');
      }
      await prisma.appointment.create({ data: { ...dataToSave, hospitalId: doctor.hospitals[0].hospitalId } });
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

export async function updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') {
  try {
    await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
    revalidatePath('/hospital-admin/appointments');
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
