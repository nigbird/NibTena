'use server';

import { z } from 'zod';
import { addAppointment, addDoctor as addDoctorData, getSpecialties as getSpecialtiesData } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Doctor } from './definitions';

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
  appointmentId?: string;
};

export async function bookAppointment(
  doctorId: number,
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

  const { fullName, phone, age, gender, symptoms } = validatedFields.data;
  
  try {
    const newAppointment = await addAppointment({
      patientName: fullName,
      patientPhone: phone,
      patientAge: age,
      patientGender: gender,
      symptoms,
      summary: symptoms,
      doctorId,
      appointmentSlot,
      appointmentDate,
    });

    if (newAppointment) {
      revalidatePath('/doctor-dashboard');
      revalidatePath('/hospital-admin');
      redirect(`/confirmation/success?appointmentId=${newAppointment.id}`);
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


const DoctorFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  specialty: z.string().min(2, { message: 'Specialty is required.' }),
  experience: z.coerce.number().min(0, { message: 'Experience cannot be negative.' }),
  consultationFee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
});

export type DoctorFormState = {
  errors?: {
    name?: string[];
    specialty?: string[];
    experience?: string[];
    consultationFee?: string[];
    bio?: string[];
  };
  message?: string | null;
  success?: boolean;
  newDoctor?: Doctor;
};

export async function addDoctor(hospitalId: number, prevState: DoctorFormState, formData: FormData) {
  const validatedFields = DoctorFormSchema.safeParse({
    name: formData.get('name'),
    specialty: formData.get('specialty'),
    experience: formData.get('experience'),
    consultationFee: formData.get('consultationFee'),
    bio: formData.get('bio'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to add doctor. Please check the fields.',
      success: false,
    };
  }

  try {
    const newDoctor = await addDoctorData({ ...validatedFields.data, hospitalId });
    revalidatePath('/hospital-admin/doctors');
    return {
      success: true,
      message: 'Doctor added successfully.',
      newDoctor,
    };
  } catch (error) {
    return {
      message: 'Database Error: Failed to add doctor.',
      success: false,
    };
  }
}

export async function getSpecialties() {
    return await getSpecialtiesData();
}
