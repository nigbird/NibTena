
'use server';

import { z } from 'zod';
import { addAppointment as addAppointmentData } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const AppointmentFormSchema = z.object({
  bookingFor: z.enum(['myself', 'someoneElse']),
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.'}),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
  relationship: z.string().optional(),
  symptoms: z.string().min(10, { message: 'Please describe symptoms in at least 10 characters.' }),
});

export type State = {
  errors?: {
    fullName?: string[];
    phone?: string[];
    age?: string[];
    gender?: string[];
    relationship?: string[];
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

  const validatedFields = AppointmentFormSchema.safeParse({
    bookingFor: formData.get('bookingFor'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    age: formData.get('age'),
    gender: formData.get('gender'),
    relationship: formData.get('relationship'),
    symptoms: formData.get('symptoms'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to book appointment. Please check the fields.',
      success: false,
    };
  }

  // Add relationship field check for "someone else"
  if (validatedFields.data.bookingFor === 'someoneElse' && !validatedFields.data.relationship) {
      return {
          errors: {
              relationship: ['Relationship is required when booking for someone else.']
          },
          message: 'Please specify your relationship to the patient.',
          success: false,
      }
  }


  const bookingDetails = {
    ...validatedFields.data,
    bookerPhone: validatedFields.data.phone, // The phone belongs to the person booking
    patientName: validatedFields.data.fullName,
    patientAge: validatedFields.data.age,
    patientGender: validatedFields.data.gender,
    doctorId,
    hospitalId,
    appointmentSlot,
    appointmentDate,
  };
  
  const params = new URLSearchParams({
      bookingData: JSON.stringify(bookingDetails)
  });

  redirect(`/user/verify/phone?${params.toString()}`);
}


export async function completeBooking(bookingData: any) {
  try {
    const newAppointment = await addAppointmentData({
      patientName: bookingData.patientName,
      // In a real app you might want to store both booker and patient phone
      patientPhone: bookingData.bookerPhone, 
      patientAge: bookingData.patientAge,
      patientGender: bookingData.patientGender,
      symptoms: bookingData.symptoms,
      doctorId: bookingData.doctorId,
      hospitalId: bookingData.hospitalId,
      appointmentSlot: bookingData.appointmentSlot,
      appointmentDate: bookingData.appointmentDate,
      // Add booking metadata
      bookedBy: bookingData.bookingFor === 'myself' ? bookingData.patientName : 'Someone Else',
      relationship: bookingData.relationship,
    });

    if (newAppointment) {
      revalidatePath('/doctor-portal/appointments');
      revalidatePath('/hospital-admin/appointments');
    }
  } catch (error) {
    console.error('Data saving failed:', error);
    return { success: false, message: 'An error occurred while processing your appointment.' };
  }
  
  redirect(`/user/appointments?success=true`);
}
