
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyCsrfToken } from '@/lib/csrf';

const AppointmentFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  symptoms: z.string().optional(),
});

export type State = {
  errors?: {
    fullName?: string[];
    phone?: string[];
    age?: string[];
    gender?: string[];
    symptoms?: string[];
  };
  message?: string | null;
  success?: boolean;
  appointmentId?: string;
};

export async function bookAppointment(
  doctorId: number,
  appointmentSlot: string,
  appointmentDate: string,
  prevState: State,
  formData: FormData
): Promise<State> {

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const validatedFields = AppointmentFormSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: String(formData.get('phone') || ''),
    age: formData.get('age'),
    gender: formData.get('gender'),
    symptoms: formData.get('symptoms'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to book appointment. Please check the fields.',
      success: false,
    };
  }

  const { fullName, phone, age, gender, symptoms } = validatedFields.data;

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true, hospitals: { select: { hospitalId: true } } }
    });

    if (!doctor || !doctor.hospitals[0]) {
        return {
            success: false,
            message: 'Could not find the associated hospital for the doctor.'
        }
    }
    const hospitalId = doctor.hospitals[0].hospitalId;

    const newAppointment = await prisma.appointment.create({
      data: {
        patientName: fullName,
        patientPhone: phone,
        patientAge: age,
        patientGender: gender,
        symptoms: symptoms || '',
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate,
        status: 'confirmed',
      },
    });

    if (newAppointment) {
      revalidatePath('/doctor-portal/appointments');
      revalidatePath('/hospital-admin/appointments');
      
      return {
        success: true,
        message: 'Appointment booked successfully.',
        appointmentId: newAppointment.id
      }
    }
    return {
        success: false,
        message: 'Failed to create an appointment.'
    }
  } catch (error) {
    console.error('Data saving failed:', error);
    return {
      success: false,
      message: 'An error occurred while processing your appointment.',
    };
  }
}
