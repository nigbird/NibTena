'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format } from 'date-fns';
import crypto from 'crypto';
import type { Patient } from '@/lib/definitions';


const PatientInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
});

const AppointmentFormSchema = PatientInfoSchema.extend({
  bookingFor: z.enum(['myself', 'someoneElse']),
  symptoms: z.string().min(10, { message: 'Please describe symptoms in at least 10 characters.' }),
});

export type State = {
  errors?: z.infer<z.ZodError<typeof AppointmentFormSchema>>['formErrors']['fieldErrors'];
  message?: string | null;
  success?: boolean;
  data?: z.infer<typeof AppointmentFormSchema>;
  patient?: Patient;
  otp?: string;
  paymentToken?: string;
  appointmentId?: string;
};

async function findOrCreatePatient(phone: string, defaults: { name: string, age: number, gender: 'male' | 'female' }) {
    const patient = await prisma.patient.upsert({
        where: { phone },
        update: { name: defaults.name, age: defaults.age, gender: defaults.gender },
        create: { phone, name: defaults.name, age: defaults.age, gender: defaults.gender },
    });
    return patient;
}

export async function generateAndSaveOtp(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

    await prisma.otp.create({
        data: { phone, code, expiresAt },
    });

    console.log(`OTP for ${phone} is: ${code}`); // For testing purposes
    return code;
}

// Standalone Web App Flow
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

  try {
     await findOrCreatePatient(validatedFields.data.phone, {
         name: validatedFields.data.fullName,
         age: validatedFields.data.age,
         gender: validatedFields.data.gender
     });

     const otpCode = await generateAndSaveOtp(validatedFields.data.phone);
     
      return {
        success: true,
        message: 'OTP generated successfully.',
        data: validatedFields.data,
        otp: otpCode,
      };

  } catch(error) {
      console.error("Error during patient creation or OTP generation:", error);
      return { success: false, message: "A server error occurred. Please try again."};
  }
}

// Super App Flow
export async function initiateBookingAndPayment(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
  superAppToken: string,
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
      message: 'Failed to book. Please check the fields.',
      success: false,
    };
  }
  
  const { fullName, phone, age, gender, symptoms } = validatedFields.data;

  try {
    const patient = await findOrCreatePatient(phone, { name: fullName, age, gender });

    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms,
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: new Date(appointmentDate),
        status: 'confirmed', 
      },
       include: { doctor: true, hospital: true },
    });

    // Step 3: Initiate Payment
    const ACCOUNT_NO = newAppointment.hospital.accountNumber;
    const CALLBACK_URL = process.env.CALLBACK_URL;
    const COMPANY_NAME = process.env.COMPANY_NAME;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;
    const amount = newAppointment.doctor.consultationFee;

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
        return { success: false, message: "Server is missing required payment configuration." };
    }

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    const signatureString = [
        `accountNo=${ACCOUNT_NO}`,
        `amount=${amount}`,
        `callBackURL=${CALLBACK_URL}`,
        `companyName=${COMPANY_NAME}`,
        `Key=${NIB_PAYMENT_KEY}`,
        `token=${superAppToken}`,
        `transactionId=${transactionId}`,
        `transactionTime=${transactionTime}`
    ].join('&');
    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');
           
    const payload = { accountNo: ACCOUNT_NO, amount: String(amount), callBackURL: CALLBACK_URL, companyName: COMPANY_NAME, token: superAppToken, transactionId, transactionTime, signature };
           
    const response = await fetch(NIB_PAYMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superAppToken}` },
        body: JSON.stringify(payload),
    }); 

    const responseData = await response.json();
    if (!response.ok) {
        return { success: false, message: responseData.message || 'Payment Gateway returned an error.' };
    }
    const paymentToken = responseData.token;
    if (!paymentToken) {
         return { success: false, message: 'Payment token not received from the gateway.' };
    }

    return { success: true, message: 'Payment initiated.', paymentToken, patient, data: validatedFields.data, appointmentId: newAppointment.id };

  } catch (error) {
     console.error('SuperApp booking/payment failed:', error);
     return { success: false, message: 'An error occurred during booking.' };
  }
}


export async function completeBooking(bookingData: any) {
  let newAppointment;
  let patient;
  try {
    patient = await prisma.patient.findUnique({
        where: { phone: bookingData.phone }
    });
    
    if (!patient) {
        return { success: false, message: 'Patient record not found.'};
    }

    newAppointment = await prisma.appointment.create({
      data: {
        symptoms: bookingData.symptoms,
        patientId: patient.id,
        doctorId: bookingData.doctorId,
        hospitalId: bookingData.hospitalId,
        appointmentSlot: bookingData.appointmentSlot,
        appointmentDate: new Date(bookingData.appointmentDate),
        status: 'confirmed',
      },
    });
  } catch (error) {
    console.error('Data saving failed:', error);
    return {
      success: false,
      message: 'An error occurred while processing your appointment.',
    };
  }

  if (newAppointment && patient) {
    revalidatePath('/doctor-portal/appointments');
    revalidatePath('/hospital-admin/appointments');
    // Redirect must be called outside of try/catch
    redirect(`/user/confirmation/${newAppointment.id}?success=true&patientId=${patient.id}`);
  } else {
    return {
        success: false,
        message: 'Appointment creation failed.',
    };
  }
}
