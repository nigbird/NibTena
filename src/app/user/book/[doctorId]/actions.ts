
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const AppointmentFormSchema = z.object({
  bookingFor: z.enum(['myself', 'someoneElse']),
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
    bookingFor?: string[];
  };
  message?: string | null;
  success?: boolean;
  data?: z.infer<typeof AppointmentFormSchema>;
};

export async function startBookingProcess(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const rawData = {
    bookingFor: formData.get('bookingFor'),
    fullName: formData.get('fullName'),
    phone: String(formData.get('phone') || ''),
    age: formData.get('age'),
    gender: formData.get('gender'),
    symptoms: formData.get('symptoms'),
  };

  const validatedFields = AppointmentFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to book appointment. Please check the fields.',
      success: false,
    };
  }
  
  return {
    success: true,
    message: 'Booking validated successfully.',
    data: validatedFields.data,
  } as State;
}

export async function completeBooking(bookingData: any) {
  try {
    const newAppointment = await prisma.appointment.create({
        data: {
          patientName: bookingData.fullName,
          patientPhone: bookingData.phone,
          patientAge: bookingData.age,
          patientGender: bookingData.gender,
          symptoms: bookingData.symptoms,
          doctorId: bookingData.doctorId,
          hospitalId: bookingData.hospitalId,
          appointmentSlot: bookingData.appointmentSlot,
          appointmentDate: new Date(bookingData.appointmentDate),
          status: 'confirmed',
        }
    });

    if (newAppointment) {
      revalidatePath('/doctor-portal/appointments');
      revalidatePath('/hospital-admin/appointments');
      revalidatePath('/user/appointments');
      redirect(`/user/appointments?success=true`);
    } else {
        throw new Error('Appointment creation failed.');
    }
  } catch (error) {
    console.error('Data saving failed:', error);
    // In a real app, you might redirect to an error page
    // For now, we redirect to home with an error flag, though this is not handled
    redirect(`/user?error=booking_failed`);
  }
}
