
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMinutes, format } from 'date-fns';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// Normalize phone numbers to canonical 251XXXXXXXXX format (no leading '+')
function normalizePhoneNumber(input?: string | null) {
  if (!input) return '';
  let s = String(input).trim();
  // remove spaces
  s = s.replace(/\s+/g, '');
  // if already starts with 251, keep it; otherwise prepend
  if (!s.startsWith('251')) {
    s = '251' + s;
  }
  // Return canonical storage format without a leading '+' (e.g. 251908279572)
  return s;
}

const PatientInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
});

const AppointmentFormSchema = PatientInfoSchema.extend({
  bookingFor: z.enum(['myself', 'someoneElse']),
  symptoms: z.string().optional(),
});

export type State = {
  errors?: z.infer<z.ZodError<typeof AppointmentFormSchema>>['formErrors']['fieldErrors'];
  message?: string | null;
  success?: boolean;
  data?: z.infer<typeof AppointmentFormSchema>;
  otp?: string;
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

export async function generateAndSaveOtp(phone: string): Promise<string> {
  const normalized = normalizePhoneNumber(phone);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

  // Use upsert so we don't violate unique constraint if an OTP already exists for this phone
  await prisma.otp.upsert({
    where: { phone: normalized },
    update: { code, expiresAt },
    create: { phone: normalized, code, expiresAt },
  });

  console.log(`OTP for ${normalized} is: ${code}`); // For testing purposes
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

  let otpCode;
  try {
     // Normalize phone and ensure patient record and OTP use canonical format
     const normalizedPhone = normalizePhoneNumber(validatedFields.data.phone);

     await findOrCreatePatient(normalizedPhone, {
         name: validatedFields.data.fullName,
         age: validatedFields.data.age,
         gender: validatedFields.data.gender
     });

     otpCode = await generateAndSaveOtp(normalizedPhone);

     // return normalized phone in data so downstream uses the canonical value
     const returnedData = { ...validatedFields.data, phone: normalizedPhone };

     return {
       data: returnedData,
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

// First implementation of initiateBookingAndPayment was removed to fix duplicate declaration

export async function completeBooking(bookingData: any) {
  let newAppointment;
  let patient;
  try {
  const normalizedPhone = normalizePhoneNumber(bookingData.phone);
  patient = await prisma.patient.findUnique({
    where: { phone: normalizedPhone }
  });
    
    if (!patient) {
        return { success: false, message: 'Patient record not found.'};
    }

    newAppointment = await prisma.appointment.create({
      data: {
        symptoms: bookingData.symptoms || '',
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
  superAppToken: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  // Debug: log incoming cookies to see if patient session is sent
  try {
    const cookieStore = await cookies();
  } catch (err) {
    console.error('Failed to read cookies in initiateBookingAndPayment:', err);
  }
  // Always get phone number from cookie for mini app sessions
  const phoneFromCookie = await getPhoneNumberFromCookie();
  const authToken = await getAuthTokenFromCookie();
    
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
    const patient = await findOrCreatePatient(finalPhone, { name: fullName, age, gender });
    
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }});
    if (!doctor) return { success: false, message: 'Doctor not found.'};
    
    // 1. Create the appointment first
    const newAppointment = await prisma.appointment.create({
      data: {
        symptoms: symptoms || '',
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
    CALLBACK_URL,
    COMPANY_NAME,
    NIB_PAYMENT_KEY,
    NIB_PAYMENT_URL,
  } = process.env;

  // Find the hospital to use its account number for payments. Fall back to env var if missing.
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) {
    console.error('Hospital not found for id', hospitalId);
    return { success: false, message: 'Hospital not found.' };
  }

  const hospitalAccount = hospital.accountNumber?.trim();

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
