
'use server';

import { z } from 'zod';
import { addAppointment as addAppointmentData } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const AppointmentFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  symptoms: z.string().min(10, { message: 'Please describe symptoms in at least 10 characters.' }),
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
  slot: string,
  date: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = AppointmentFormSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
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

  try {
    const newAppointment = await addAppointmentData({
      patientName: validatedFields.data.fullName,
      patientPhone: validatedFields.data.phone,
      patientAge: validatedFields.data.age,
      patientGender: validatedFields.data.gender,
      symptoms: validatedFields.data.symptoms,
      doctorId: doctorId,
      hospitalId: 1, // MOCK: In a real app, this should be dynamic
      appointmentSlot: slot,
      appointmentDate: date,
    });

    if (newAppointment) {
        revalidatePath('/doctor-portal/appointments');
        revalidatePath('/hospital-admin/appointments');
        return {
            success: true,
            message: 'Appointment booked successfully!',
            appointmentId: newAppointment.id,
        };
    } else {
        return {
            success: false,
            message: 'An unknown error occurred while booking the appointment.'
        }
    }
  } catch (error) {
    console.error('Booking failed:', error);
    return {
      message: 'An error occurred while processing your appointment. Please try again.',
      success: false,
    };
  }
}
