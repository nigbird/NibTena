'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format } from 'date-fns';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// -----------------------------
// ZOD VALIDATION SCHEMAS
// -----------------------------
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

// -----------------------------
// TYPE DEFINITIONS
// -----------------------------
export type State = {
  errors?: z.inferFlattenedErrors<typeof AppointmentFormSchema>['fieldErrors'];
  message?: string | null;
  success?: boolean;
  data?: z.infer<typeof AppointmentFormSchema>;
  otp?: string;
  paymentToken?: string;
};

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------
async function findOrCreatePatient(phone: string, defaults: { name: string; age: number; gender: 'male' | 'female' }) {
  return prisma.patient.upsert({
    where: { phone },
    update: { name: defaults.name, age: defaults.age, gender: defaults.gender },
    create: { phone, name: defaults.name, age: defaults.age, gender: defaults.gender },
  });
}

export async function generateAndSaveOtp(phone: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

  await prisma.otp.create({ data: { phone, code, expiresAt } });
  console.log(`OTP for ${phone} is: ${code}`); // Dev only
  return code;
}

// -----------------------------
// STAGE 1: BOOKING VALIDATION
// -----------------------------
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

  const validated = AppointmentFormSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Failed to book appointment. Please check the fields.',
      success: false,
    };
  }

  try {
    await findOrCreatePatient(validated.data.phone, {
      name: validated.data.fullName,
      age: validated.data.age,
      gender: validated.data.gender,
    });

    const otpCode = await generateAndSaveOtp(validated.data.phone);

    return {
      success: true,
      message: 'Booking validated successfully.',
      data: validated.data,
      otp: otpCode,
    };
  } catch (error) {
    console.error('Error during patient creation or OTP generation:', error);
    return { success: false, message: 'A server error occurred. Please try again.' };
  }
}

// -----------------------------
// STAGE 2: FINALIZE BOOKING
// -----------------------------
export async function completeBooking(bookingData: any) {
  try {
    const patient = await prisma.patient.findUnique({ where: { phone: bookingData.phone } });
    if (!patient) return { success: false, message: 'Patient record not found.' };

    const newAppointment = await prisma.appointment.create({
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

    revalidatePath('/doctor-portal/appointments');
    revalidatePath('/hospital-admin/appointments');
    revalidatePath('/user/appointments');

    redirect(`/user/appointments?success=true&patientId=${patient.id}`);
  } catch (error) {
    console.error('Data saving failed:', error);
    return { success: false, message: 'An error occurred while processing your appointment.' };
  }
}

// -----------------------------
// COOKIE AUTH TOKEN EXTRACTION
// -----------------------------
async function getAuthTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('miniapp_session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);
    return session.authToken || null;
  } catch (err) {
    console.error('Failed to parse miniapp_session cookie:', err);
    return null;
  }
}

// -----------------------------
// STAGE 3: INITIATE PAYMENT
// -----------------------------
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

  const validated = AppointmentFormSchema.safeParse(rawData);
  const authToken = await getAuthTokenFromCookie();
  console.log('Auth Token from Cookie:', authToken);

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Invalid appointment data.',
      success: false,
    };
  }

  const { fullName, phone, age, gender, symptoms } = validated.data;

  try {
    const patient = await findOrCreatePatient(phone, { name: fullName, age, gender });
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return { success: false, message: 'Doctor not found.' };

    // Create appointment in pending-payment state
    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms,
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: new Date(appointmentDate),
        status: 'pending-payment',
      },
    });

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');
    const amount = doctor.consultationFee;

    const { ACCOUNT_NO, CALLBACK_URL, COMPANY_NAME, NIB_PAYMENT_KEY, NIB_PAYMENT_URL } = process.env;

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
      throw new Error('Missing payment environment variables.');
    }

    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${amount}`,
      `callBackURL=${CALLBACK_URL}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${authToken}`,
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`,
    ].join('&');

    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    const payload = {
      accountNo: ACCOUNT_NO,
      amount: String(amount),
      callBackURL: CALLBACK_URL,
      companyName: COMPANY_NAME,
      token: superAppToken,
      transactionId,
      transactionTime,
      signature,
    };

    console.log('Payment Payload:', payload);

    await prisma.appointment.update({
      where: { id: newAppointment.id },
      data: { transactionId },
    });

    const response = await fetch(NIB_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Payment Gateway Error:', errorData);
      throw new Error(`Payment gateway returned an error: ${response.statusText}`);
    }

    const responseData = await response.json();
    const paymentToken = responseData.token;
    console.log('Payment Token Received:', paymentToken);

    if (!paymentToken) throw new Error('Payment token not received from gateway.');

    return {
      success: true,
      message: 'Payment initiated successfully.',
      data: validated.data,
      paymentToken,
    };
  } catch (error) {
    console.error('Payment initiation failed:', error);
    return { success: false, message: 'An error occurred while initiating the payment process.' };
  }
}
