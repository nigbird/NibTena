
'use server';

import { z } from 'zod';
import { addAppointment as addAppointmentData } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const AppointmentFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string(),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  symptoms: z.string().min(10, { message: 'Please describe your symptoms in at least 10 characters.' }),
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
};

export async function startBookingProcess(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
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

  const bookingDetails = {
    ...validatedFields.data,
    doctorId,
    hospitalId,
    appointmentSlot,
    appointmentDate,
  };
  
  const params = new URLSearchParams({
      bookingData: JSON.stringify(bookingDetails)
  });

  // In a real app, you would check if the user's phone is already verified.
  // For now, we will always redirect to the verification flow.
  redirect(`/user/verify/phone?${params.toString()}`);
}


export async function completeBooking(bookingData: any) {
  // In a real app, you'd re-validate the data.
  // For this mock, we assume the data is valid.
  
  try {
    const newAppointment = await addAppointmentData({
      patientName: bookingData.fullName,
      patientPhone: bookingData.phone,
      patientAge: bookingData.age,
      patientGender: bookingData.gender,
      symptoms: bookingData.symptoms,
      doctorId: bookingData.doctorId,
      hospitalId: bookingData.hospitalId,
      appointmentSlot: bookingData.appointmentSlot,
      appointmentDate: bookingData.appointmentDate,
    });

    if (newAppointment) {
      revalidatePath('/doctor-portal/appointments');
      revalidatePath('/hospital-admin/appointments');
    }
  } catch (error) {
    console.error('Data saving failed:', error);
    // In a real app, handle this error more gracefully
    return { success: false, message: 'An error occurred while processing your appointment.' };
  }
  
  // Instead of returning state, we redirect on success.
  redirect(`/user/appointments?success=true`);
}
