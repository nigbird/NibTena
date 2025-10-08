
'use server';

import { z } from 'zod';
import { addAppointment as addAppointmentData } from '@/lib/data';
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

  const bookingDetails = {
    ...validatedFields.data,
    bookerPhone: validatedFields.data.phone,
    patientName: validatedFields.data.fullName,
    patientAge: validatedFields.data.age,
    patientGender: validatedFields.data.gender,
    doctorId,
    hospitalId,
    appointmentSlot,
    appointmentDate,
  };

  // ✅ Explicit success before redirect
  const params = new URLSearchParams({
    bookingData: JSON.stringify(bookingDetails),
  });

  return {
    success: true,
    message: 'Booking validated successfully.',
  } as State;

  // redirect(`/user/verify/phone?${params.toString()}`);
}

export async function completeBooking(bookingData: any) {
  try {
    const newAppointment = await addAppointmentData({
      patientName: bookingData.patientName,
      patientPhone: bookingData.bookerPhone,
      patientAge: bookingData.patientAge,
      patientGender: bookingData.patientGender,
      symptoms: bookingData.symptoms,
      doctorId: bookingData.doctorId,
      hospitalId: bookingData.hospitalId,
      appointmentSlot: bookingData.appointmentSlot,
      appointmentDate: bookingData.appointmentDate,
      bookedBy:
        bookingData.bookingFor === 'myself'
          ? bookingData.patientName
          : 'Someone Else',
      relationship: '', // Set to empty or remove if not needed in DB
    });

    if (newAppointment) {
      revalidatePath('/doctor-portal/appointments');
      revalidatePath('/hospital-admin/appointments');
    }
  } catch (error) {
    console.error('Data saving failed:', error);
    return {
      success: false,
      message: 'An error occurred while processing your appointment.',
    };
  }

  redirect(`/user/appointments?success=true`);
}
