
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format, parse, parseISO, startOfDay } from 'date-fns';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { requestOtp } from '@/lib/otp';
import { verifyCsrfToken } from '@/lib/csrf';
import { verifyPatientSessionCookie } from '@/lib/session';
import { AppointmentFormSchema, isBookableSlot, normalizePhoneNumber } from './booking-shared';

export type State = {
  errors?: z.infer<z.ZodError<typeof AppointmentFormSchema>>['formErrors']['fieldErrors'];
  message?: string | null;
  success?: boolean;
  data?: z.infer<typeof AppointmentFormSchema>;
  paymentToken?: string;
  transactionId?: string;
};

async function findOrCreatePatient(phone: string, defaults: { name: string, age: number, gender: 'male' | 'female' }) {
  const normalized = normalizePhoneNumber(phone);
  const patient = await prisma.patient.upsert({
    where: { phone: normalized },
    update: { name: defaults.name, age: defaults.age, gender: defaults.gender, phone: normalized },
    create: { phone: normalized, name: defaults.name, age: defaults.age, gender: defaults.gender },
  });
    return patient;
}

// Not exported: exports of a 'use server' file are client-callable, and the
// code must never reach the client (it is delivered via SMS only).
async function generateAndSaveOtp(phone: string): Promise<{ success: boolean; message: string }> {
  return requestOtp(normalizePhoneNumber(phone));
}


export async function startBookingProcess(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  // Debug: log incoming cookies to see if patient session is sent
  try {
    const cookieStore = await cookies();
  } catch (err) {
    console.error('Failed to read cookies in startBookingProcess:', err);
  }
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

  try {
     // Normalize phone and ensure patient record and OTP use canonical format
     const normalizedPhone = normalizePhoneNumber(validatedFields.data.phone);

     await findOrCreatePatient(normalizedPhone, {
         name: validatedFields.data.fullName,
         age: validatedFields.data.age,
         gender: validatedFields.data.gender
     });

     const otp = await generateAndSaveOtp(normalizedPhone);
     if (!otp.success) {
       return { success: false, message: otp.message };
     }

     // return normalized phone in data so downstream uses the canonical value
     const returnedData = { ...validatedFields.data, phone: normalizedPhone };

     return {
       data: returnedData,
       success: true,
     };
  } catch (error) {
    console.error('Error in booking process:', error);
    return {
      message: 'An error occurred during the booking process.',
      success: false,
    };
  }
}

// First implementation of initiateBookingAndPayment was removed to fix duplicate declaration

// Creates a confirmed appointment without payment (standalone/OTP flow). The
// patient comes only from the OTP-verified session cookie, never from the
// client. Disabled unless ALLOW_UNPAID_BOOKINGS=true, since the mini app
// requires payment and this would otherwise let anyone skip it.
export async function completeBooking(bookingData: any) {
  if (process.env.ALLOW_UNPAID_BOOKINGS !== 'true') {
    return { success: false, message: 'Booking without payment is not available.' };
  }

  let newAppointment;
  let patient;
  try {
    const cookieStore = await cookies();
    const patientSession = cookieStore.get('nib-tena-patient-session')?.value;
    const verified = patientSession ? verifyPatientSessionCookie(patientSession) : null;
    if (!verified?.patient?.id) {
      return { success: false, message: 'Please verify your phone number to book.' };
    }

    patient = await prisma.patient.findUnique({ where: { id: verified.patient.id } });
    if (!patient) {
        return { success: false, message: 'Patient record not found.'};
    }

    const doctorId = Number(bookingData?.doctorId);
    const hospitalId = Number(bookingData?.hospitalId);
    const appointmentDate = String(bookingData?.appointmentDate || '');
    const appointmentSlot = String(bookingData?.appointmentSlot || '');
    if (!doctorId || !hospitalId || !appointmentDate || !appointmentSlot) {
      return { success: false, message: 'Invalid booking details.' };
    }
    if (!(await isBookableSlot(doctorId, hospitalId, appointmentDate, appointmentSlot))) {
      return { success: false, message: 'The selected time slot is not available.' };
    }

    newAppointment = await prisma.appointment.create({
      data: {
        symptoms: typeof bookingData.symptoms === 'string' ? bookingData.symptoms : '',
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: startOfDay(parseISO(appointmentDate)),
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
    redirect(`/user/appointments?success=true`);
  } else {
    return {
        success: false,
        message: 'Appointment creation failed.',
    };
  }
}

 async function getAuthTokenFromCookie() {
  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll('miniapp_session');

  if (sessionCookies.length === 0) {
    return null;
  }

  // Collect all valid sessions
  const validSessions: any[] = [];
  
  // Iterate over all cookies to find valid ones
  for (const cookie of sessionCookies) {
    if (!cookie.value) continue;
    try {
      const { parseMiniAppSessionCookie } = await import('@/lib/session');
      const session = parseMiniAppSessionCookie(cookie.value);
      if (session && session.authToken) {
        validSessions.push(session);
      }
    } catch (err) {
      console.warn("Failed to parse one of the miniapp_session cookies:", err);
    }
  }

  if (validSessions.length === 0) {
    console.log('getAuthTokenFromCookie: no valid auth token found in any cookie');
    return null;
  }
  
  // Sort by iat descending (newest first)
  validSessions.sort((a, b) => (b.iat || 0) - (a.iat || 0));
  const latestSession = validSessions[0];

  const authToken = latestSession.authToken;
  const masked = authToken.length <= 8 ? '****' : `${authToken.slice(0,4)}...${authToken.slice(-4)}`;
  console.log('getAuthTokenFromCookie: returning valid masked authToken:', masked, 'from session iat:', latestSession.iat);
  return authToken;
}

export async function getPhoneNumberFromCookie() {
  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll('miniapp_session');

  if (sessionCookies.length === 0) {
    return null;
  }

  // Collect all valid sessions
  const validSessions: any[] = [];

  // Iterate over all cookies to find valid ones
  for (const cookie of sessionCookies) {
    if (!cookie.value) continue;
    try {
      const { parseMiniAppSessionCookie } = await import('@/lib/session');
      const session = parseMiniAppSessionCookie(cookie.value);
      if (session && session.phoneNumber) {
        validSessions.push(session);
      }
    } catch (err) {
      console.warn("Failed to parse one of the miniapp_session cookies:", err);
    }
  }

  if (validSessions.length === 0) {
    return null;
  }

  // Sort by iat descending (newest first)
  validSessions.sort((a, b) => (b.iat || 0) - (a.iat || 0));
  const latestSession = validSessions[0];

  console.log('getPhoneNumberFromCookie: derived phoneNumber:', latestSession.phoneNumber, 'from session iat:', latestSession.iat);
  return latestSession.phoneNumber;
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
  // Declare variables up-front to avoid temporal dead zone issues after bundling/minification
  let transactionId: string | undefined;
  let transactionTime: string | undefined;
  let amount: number | undefined;
  let hospitalAccount: string | undefined;
  let hospital: any;
  let newAppointment: any;

  // Debug: log incoming cookies to see if patient session is sent
  try {
    const cookieStore = await cookies();
  } catch (err) {
    console.error('Failed to read cookies in initiateBookingAndPayment:', err);
  }
  // Always get phone number from cookie for mini app sessions
  const phoneFromCookie = await getPhoneNumberFromCookie();
  const authToken = await getAuthTokenFromCookie();
    
  if (!authToken) {
    console.error('initiateBookingAndPayment: No valid auth token found (session expired or missing).');
    return {
      success: false,
      message: 'Your session has expired. Please restart the application from the main menu.',
    };
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
  
  // Use phone number from cookie if available (for mini app sessions)
  const finalPhone = normalizePhoneNumber(phoneFromCookie || phone);

  try {
    console.log('initiateBookingAndPayment: phoneFromCookie:', phoneFromCookie, 'authToken present:', !!authToken);
    const maskedAuth = authToken ? (authToken.length <= 8 ? '****' : `${authToken.slice(0,4)}...${authToken.slice(-4)}`) : null;
    console.log('initiateBookingAndPayment: using authToken (masked):', maskedAuth, 'finalPhone:', finalPhone);

    const patient = await findOrCreatePatient(finalPhone, { name: fullName, age, gender });
    
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true, name: true, consultationFee: true } });
    if (!doctor) return { success: false, message: 'Doctor not found.'};
    if (!(await isBookableSlot(doctorId, hospitalId, appointmentDate, appointmentSlot))) {
      return { success: false, message: 'The selected time slot is not available.' };
    }

    // 1. Create the appointment first
    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms: symptoms || '',
        patientId: patient.id,
        doctorId,
        hospitalId,
        appointmentSlot,
        appointmentDate: startOfDay(parseISO(appointmentDate)),
        status: 'pending-payment', // New status
        paymentMethod: 'NIB_SUPERAPP',
      },
    });

    // 2. Prepare payment request (Step 3)
    transactionId = crypto.randomUUID();
    transactionTime = format(new Date(), 'yyyyMMddHHmmss');
    amount = doctor.consultationFee;

  const {
    CALLBACK_URL,
    COMPANY_NAME,
    NIB_PAYMENT_KEY,
    NIB_PAYMENT_URL,
  } = process.env;

  // Find the hospital to use its account number for payments. Fall back to env var if missing.
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { id: true, accountNumber: true, name: true } });
  if (!hospital) {
    console.error('Hospital not found for id', hospitalId);
    return { success: false, message: 'Hospital not found.' };
  }

  hospitalAccount = hospital.accountNumber?.trim();

  // Require hospital account number (do not use env fallback)
  const accountNoToUse = hospitalAccount;

  // Enhanced configuration validation (require hospital account, callback, company name, key, and URL)
  const missingVars = [];
  if (!accountNoToUse) missingVars.push('hospital.accountNumber');
  if (!CALLBACK_URL) missingVars.push('CALLBACK_URL');
  if (!COMPANY_NAME) missingVars.push('COMPANY_NAME');
  if (!NIB_PAYMENT_KEY) missingVars.push('NIB_PAYMENT_KEY');
  if (!NIB_PAYMENT_URL) missingVars.push('NIB_PAYMENT_URL');

  if (missingVars.length > 0) {
    console.error('Missing payment configuration:', missingVars);
    throw new Error(`Missing payment configuration: ${missingVars.join(', ')}`);
  }

  // Use superAppToken consistently for both signature and payload
  const cleanCallbackURL = CALLBACK_URL?.trim();
  const signatureString = [
    `accountNo=${accountNoToUse}`,
    `amount=${amount}`,
    `callBackURL=${cleanCallbackURL}`,
    `companyName=${COMPANY_NAME}`,
    `Key=${NIB_PAYMENT_KEY}`,
    `token=${authToken}`,
    `transactionId=${transactionId}`,
    `transactionTime=${transactionTime}`
  ].join('&');

  const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

  const payload = {
    accountNo: accountNoToUse,
    amount: String(amount),
    callBackURL: CALLBACK_URL?.trim(), // Trim any extra spaces
    companyName: COMPANY_NAME,
    token: authToken,
    transactionId: transactionId,
    transactionTime: transactionTime,
    signature: signature
  };
    // Update appointment with transaction ID
    await prisma.appointment.update({
        where: { id: newAppointment.id },
        data: { transactionId: transactionId },
    });
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

    console.log('initiateBookingAndPayment: payment gateway response status:', response.status, 'body length:', responseText?.length ?? 0);
    if (!response.ok) {
      console.error("Payment Gateway Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData: responseData,
        url: NIB_PAYMENT_URL,
        // Mask sensitive payload fields for logs
        payload: {
          ...payload,
          token: payload.token ? (payload.token.length <= 8 ? '****' : `${payload.token.slice(0,4)}...${payload.token.slice(-4)}`) : null,
        },
      });
      throw new Error(`Payment gateway returned ${response.status} ${response.statusText}: ${JSON.stringify(responseData)}`);
    }

    const paymentToken = responseData?.token;

    console.log('initiateBookingAndPayment: payment response token (masked):', paymentToken ? (String(paymentToken).length <= 8 ? '****' : `${String(paymentToken).slice(0,4)}...${String(paymentToken).slice(-4)}`) : null);

    if (!paymentToken) {
      throw new Error("Payment token not received from gateway.");
    }

    
    // 3. Return paymentToken and transactionId to the client so it can poll status
    return {
      success: true,
      message: 'Payment initiated.',
      data: validatedFields.data,
      paymentToken: paymentToken,
      transactionId,
    };

  } catch (error) {
    console.error('Payment initiation failed:', error);
    return {
      success: false,
      message: 'An error occurred while initiating the payment process.',
    };
  }
}
