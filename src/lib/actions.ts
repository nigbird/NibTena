'use server';

import { z } from 'zod';
import { addAppointment } from './data';

const FormSchema = z.object({
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
  appointmentId?: string;
};

export async function bookAppointment(
  doctorId: number,
  appointmentSlot: string,
  appointmentDate: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = FormSchema.safeParse({
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

  const { fullName, phone, age, gender, symptoms } = validatedFields.data;
  
  try {
    const newAppointment = await addAppointment({
      patientName: fullName,
      patientPhone: phone,
      patientAge: age,
      patientGender: gender,
      symptoms,
      summary: symptoms, // Use symptoms as summary
      doctorId,
      appointmentSlot,
      appointmentDate,
    });

    if (newAppointment) {
      return {
        success: true,
        message: 'Appointment booked successfully.',
        appointmentId: newAppointment.id,
      };
    } else {
      return {
        success: false,
        message: 'Failed to create appointment.',
      };
    }
    
  } catch (error) {
    console.error('Data saving failed:', error);
    return {
      message: 'An error occurred while processing your appointment. Please try again.',
      success: false,
    };
  }
}
