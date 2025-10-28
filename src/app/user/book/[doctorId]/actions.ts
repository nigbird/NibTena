
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format } from 'date-fns';
import crypto from 'crypto';
import { cookies } from 'next/headers';

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
  transactionId?: string; // Added to track payment status
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
  // Get phone number from cookie if booking for self
  const bookingFor = formData.get('bookingFor') as string;
  const isBookingForSelf = bookingFor === 'myself';
  let phoneFromCookie = null;
  
  if (isBookingForSelf) {
    phoneFromCookie = await getPhoneNumberFromCookie();
  }
  
  const rawData = {
    bookingFor: formData.get('bookingFor'),
    fullName: formData.get('fullName'),
    phone: isBookingForSelf && phoneFromCookie ? phoneFromCookie : String(formData.get('phone') || ''),
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

     return {
       data: validatedFields.data,
       success: true,
       otp: otpCode,
     };
  } catch (error) {
    console.error('Error in booking process:', error);
    return {
      message: 'An error occurred during the booking process.',
      success: false,
    };
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

 async function getAuthTokenFromCookie() {
  const cookieStore = await  cookies();
  const sessionCookie = cookieStore.get('miniapp_session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    // Decode base64 if it was encoded before storing
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);

    return session.authToken || null;
  } catch (err) {
    console.error("Failed to parse miniapp_session cookie:", err);
    return null;
  }
}

export async function getPhoneNumberFromCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('miniapp_session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    // Decode base64 if it was encoded before storing
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);

    return session.phoneNumber || null;
  } catch (err) {
    console.error("Failed to parse miniapp_session cookie:", err);
    return null;
  }
}

export async function initiateBookingAndPayment(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
  superAppToken: string, // This is the base64 encoded cookie value
  prevState: State,
  formData: FormData
): Promise<State> {
  const phoneFromCookie = await getPhoneNumberFromCookie();
  const authToken = await getAuthTokenFromCookie();

  if (!authToken) {
    return { success: false, message: "Mini App session token not found. Please re-authenticate." };
  }
  
  const rawData = {
    bookingFor: formData.get('bookingFor'),
    fullName: formData.get('fullName'),
    phone: phoneFromCookie || String(formData.get('phone') || ''),
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
  
  const finalPhone = phoneFromCookie || phone;

  try {
    const patient = await findOrCreatePatient(finalPhone, { name: fullName, age, gender });
    
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }});
    if (!doctor) return { success: false, message: 'Doctor not found.'};
    
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }});
    if (!hospital) return { success: false, message: 'Hospital not found.' };

    const transactionId = crypto.randomUUID();

    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms,
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: new Date(appointmentDate),
        status: 'pending-payment',
        transactionId: transactionId,
      },
    });

    const { 
        CALLBACK_URL, 
        COMPANY_NAME, 
        NIB_PAYMENT_KEY, 
        NIB_PAYMENT_URL 
    } = process.env;

    const ACCOUNT_NO = hospital.accountNumber;
    const amount = doctor.consultationFee;
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    const requiredVars = { ACCOUNT_NO, CALLBACK_URL, COMPANY_NAME, NIB_PAYMENT_KEY, NIB_PAYMENT_URL };
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        console.error(`Missing payment environment variable: ${key}`);
        throw new Error(`Server configuration error: Missing payment variable ${key}.`);
      }
    }
    
    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${amount}`,
      `callBackURL=${CALLBACK_URL!.trim()}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${authToken}`,
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`
    ].join('&');

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const payload = {
        accountNo: ACCOUNT_NO,
        amount: String(amount),
        callBackURL: CALLBACK_URL!.trim(),
        companyName: COMPANY_NAME,
        token: authToken,
        transactionId: transactionId,
        transactionTime: transactionTime,
        signature: signature
    };
    
    const response = await fetch(NIB_PAYMENT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      console.error("Payment Gateway Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData: responseData,
      });
      await prisma.appointment.update({
        where: { id: newAppointment.id },
        data: { status: 'cancelled' },
      });
      throw new Error(`Payment gateway returned ${response.status}: ${JSON.stringify(responseData)}`);
    }

    const paymentToken = responseData?.token;

    if (!paymentToken) {
      await prisma.appointment.update({
        where: { id: newAppointment.id },
        data: { status: 'cancelled' },
      });
      throw new Error("Payment token not received from gateway.");
    }
    
    return {
      success: true,
      message: 'Payment initiated.',
      data: validatedFields.data,
      paymentToken: paymentToken,
      transactionId: transactionId,
    };

  } catch (error) {
    console.error('Payment initiation failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while initiating the payment process.',
    };
  }
}
