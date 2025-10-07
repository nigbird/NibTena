'use server';

import { z } from 'zod';
import { 
  addAppointment as addAppointmentData, 
  updateAppointment as updateAppointmentData,
  deleteAppointment as deleteAppointmentData,
} from '@/lib/data';
import { revalidatePath } from 'next/cache';
import type { Appointment } from '@/lib/definitions';
import { format } from 'date-fns';

const AppointmentFormSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name must be at least 2 characters.' }),
  patientPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  patientAge: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  patientGender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  doctorId: z.coerce.number({required_error: 'Please select a doctor.'}),
  appointmentDate: z.coerce.date({ required_error: 'Please select a date.' }),
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
  
  const dataToSave = {
      ...validatedFields.data,
      appointmentDate: format(validatedFields.data.appointmentDate, 'yyyy-MM-dd'),
      symptoms: validatedFields.data.symptoms || '',
  }

  try {
    if (appointmentId) {
      // Editing existing appointment
      await updateAppointmentData(appointmentId, dataToSave);
      revalidatePath('/hospital-admin/appointments');
      return {
        success: true,
        message: 'Appointment updated successfully.',
      };
    } else {
      // Adding new appointment
      await addAppointmentData(dataToSave);
      revalidatePath('/hospital-admin/appointments');
      return {
        success: true,
        message: 'Appointment added successfully.',
      };
    }
  } catch (error) {
    return {
      message: 'Database Error: Failed to save appointment.',
      success: false,
    };
  }
}

export async function updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') {
  try {
    await updateAppointmentData(appointmentId, { status });
    revalidatePath('/hospital-admin/appointments');
    return { success: true, message: `Appointment status updated to ${status}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update appointment status.' };
  }
}

export async function deleteAppointment(appointmentId: string) {
    try {
        await deleteAppointmentData(appointmentId);
        revalidatePath('/hospital-admin/appointments');
        return { success: true, message: 'Appointment deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Database Error: Failed to delete appointment.' };
    }
}
