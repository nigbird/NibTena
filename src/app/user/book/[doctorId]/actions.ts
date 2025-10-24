
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format } from 'date-fns';
import crypto from 'crypto';

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
  otp?: string;
  paymentToken?: string;
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

  let otpCode;
  try {
     await findOrCreatePatient(validatedFields.data.phone, {
         name: validatedFields.data.fullName,
         age: validatedFields.data.age,
         gender: validatedFields.data.gender
     });

     otpCode = await generateAndSaveOtp(validatedFields.data.phone);

  } catch(error) {
      console.error("Error during patient creation or OTP generation:", error);
      return { success: false, message: "A server error occurred. Please try again."};
  }
  
  return {
    success: true,
    message: 'Booking validated successfully.',
    data: validatedFields.data,
    otp: otpCode,
  };
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
    revalidatePath('/user/appointments');
    // Redirect must be called outside of try/catch
    redirect(`/user/appointments?success=true&patientId=${patient.id}`);
  } else {
    return {
        success: false,
        message: 'Appointment creation failed.',
    };
  }
}

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
      message: 'Invalid appointment data.',
      success: false,
    };
  }
  
  const { fullName, phone, age, gender, symptoms } = validatedFields.data;

  try {
    const patient = await findOrCreatePatient(phone, { name: fullName, age, gender });
    
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }});
    if (!doctor) return { success: false, message: 'Doctor not found.'};
    
    // 1. Create the appointment first
    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms,
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: new Date(appointmentDate),
        status: 'pending-payment', // New status
      },
    });

    // 2. Prepare payment request (Step 3)
    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');
    const amount = doctor.consultationFee;

    const { 
        ACCOUNT_NO, 
        CALLBACK_URL, 
        COMPANY_NAME, 
        NIB_PAYMENT_KEY, 
        NIB_PAYMENT_URL 
    } = process.env;

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
        throw new Error("Missing payment environment variables.");
    }
    
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

    const payload = {
        accountNo: ACCOUNT_NO,
        amount: String(amount),
        callBackURL: CALLBACK_URL,
        companyName: COMPANY_NAME,
        token: superAppToken,
        transactionId: transactionId,
        transactionTime: transactionTime,
        signature: signature
    };
    console.log("Payment Payload:", {payload});
    
    // Update appointment with transaction ID
    await prisma.appointment.update({
        where: { id: newAppointment.id },
        data: { transactionId: transactionId },
    });
    console.log({superAppToken})
    const response = await fetch(NIB_PAYMENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${superAppToken}`
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Payment Gateway Error:", errorData);
        throw new Error(`Payment gateway returned an error: ${response.statusText}`);
    }

    const responseData = await response.json();
    const paymentToken = responseData.token;
    console.log("Payment Token Received:", {paymentToken});
    
    if (!paymentToken) {
        throw new Error("Payment token not received from gateway.");
    }
    
    // 3. Return paymentToken to the client
    return {
      success: true,
      message: 'Payment initiated.',
      data: validatedFields.data,
      paymentToken: paymentToken,
    };

  } catch (error) {
    console.error('Payment initiation failed:', error);
    return {
      success: false,
      message: 'An error occurred while initiating the payment process.',
    };
  }
}
