
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

async function getPhoneNumberFromCookie() {
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
  const authToken = await getAuthTokenFromCookie();
  const phoneFromCookie = await getPhoneNumberFromCookie();
  console.log("Auth Token from Cookie:", {authToken});
  console.log("Phone from Cookie:", {phoneFromCookie});

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid appointment data.',
      success: false,
    };
  }
  
  const { fullName, phone, age, gender, symptoms } = validatedFields.data;
  
  // Use phone number from cookie if available (for mini app sessions)
  const finalPhone = phoneFromCookie || phone;

  try {
    const patient = await findOrCreatePatient(finalPhone, { name: fullName, age, gender });
    
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

    // Enhanced environment variable validation
    const missingVars = [];
    if (!ACCOUNT_NO) missingVars.push('ACCOUNT_NO');
    if (!CALLBACK_URL) missingVars.push('CALLBACK_URL');
    if (!COMPANY_NAME) missingVars.push('COMPANY_NAME');
    if (!NIB_PAYMENT_KEY) missingVars.push('NIB_PAYMENT_KEY');
    if (!NIB_PAYMENT_URL) missingVars.push('NIB_PAYMENT_URL');

    if (missingVars.length > 0) {
        console.error("Missing payment environment variables:", missingVars);
        throw new Error(`Missing payment environment variables: ${missingVars.join(', ')}`);
    }

    console.log("Payment Environment Variables:", {
        ACCOUNT_NO: ACCOUNT_NO,
        CALLBACK_URL: CALLBACK_URL,
        COMPANY_NAME: COMPANY_NAME,
        NIB_PAYMENT_URL: NIB_PAYMENT_URL,
        NIB_PAYMENT_KEY: NIB_PAYMENT_KEY ? '[REDACTED]' : 'MISSING'
    });
    
    // Use superAppToken consistently for both signature and payload
    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${amount}`,
      `callBackURL=${CALLBACK_URL}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${authToken}`,
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`
    ].join('&');

    console.log("Signature String:", signatureString);
    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');
    console.log("Generated Signature:", signature);

    const payload = {
        accountNo: ACCOUNT_NO,
        amount: String(amount),
        callBackURL: CALLBACK_URL,
        companyName: COMPANY_NAME,
        token: authToken,
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
    console.log({authToken}, {NIB_PAYMENT_URL});
    const response = await fetch(NIB_PAYMENT_URL ?? "", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
    });

    // Read body only once
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
        url: NIB_PAYMENT_URL,
        payload,
      });
      throw new Error(`Payment gateway returned ${response.status} ${response.statusText}: ${JSON.stringify(responseData)}`);
    }

    const paymentToken = responseData?.token;
    console.log("Payment Token Received:", { paymentToken });

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
