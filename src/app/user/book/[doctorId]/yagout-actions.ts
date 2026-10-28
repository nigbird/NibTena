'use server';

import crypto from 'crypto';
import { addMinutes, format, startOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyCsrfToken } from '@/lib/csrf';
import { getWebPatientFromCookie } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { encryptYagout, yagoutHash } from '@/lib/yagout-crypto';
import {
  buildHostedMerchantRequest,
  YAGOUT_CHANNEL_WEB,
  YAGOUT_COUNTRY,
  YAGOUT_CURRENCY,
  YAGOUT_TXN_TYPE,
} from '@/lib/yagout-request';
import {
  isYagoutConfiguredForHospital,
  resolveYagoutConfigForHospital,
  yagoutReturnUrls,
  type YagoutConfig,
} from '@/lib/yagout-client';
import { hasEarlierSlotHolder, paymentHoldMinutes } from '@/lib/appointment-hold';
import { AppointmentFormSchema, isBookableSlot, normalizePhoneNumber } from './booking-shared';

/**
 * Web (non mini-app) booking paid through the hospital's own YagoutPay
 * merchant account. The Super App path in actions.ts is untouched.
 *
 * The patient comes only from the OTP-verified session cookie, the amount only
 * from the database, and the merchant only from the booked hospital.
 */

const NOT_AVAILABLE = 'Online payment not yet available for this hospital';

export type YagoutBookingState = {
  success?: boolean;
  message?: string | null;
  errors?: Record<string, string[] | undefined>;
  redirectTo?: string;
};

/** Lets the book page show "not available" before the patient fills the form. */
export async function getYagoutAvailability(hospitalId: number): Promise<{ available: boolean }> {
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) return { available: false };
  return { available: await isYagoutConfiguredForHospital(hospitalId) };
}

// "|" and "~" frame Yagout's request; a name containing one would shift every
// later field. Strip them (and control characters) rather than reject a
// patient for punctuation in their name.
function framingSafe(value: string, max = 100): string {
  return value.replace(/[|~\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Yagout takes the local 9-digit mobile number (9XXXXXXXX / 7XXXXXXXX), not
 * the 251-prefixed form we store. Returns null if it is not a valid one.
 */
function toYagoutMobile(input: string): string | null {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('251')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^[79]\d{8}$/.test(digits) ? digits : null;
}

function baseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

/**
 * Creates the held appointment and stores the signed hand-off form for it.
 * Never reuses an order number: a retry is a new appointment with a new one,
 * so a late return for an old order still finds the appointment it paid for.
 */
async function raiseYagoutPayment(input: {
  patient: { id: number; name: string; phone: string; email?: string | null };
  doctorId: number;
  hospitalId: number;
  appointmentSlot: string;
  appointmentDate: Date;
  symptoms: string;
  config: YagoutConfig;
  /** 9-digit number the payer uses on Yagout; may differ from the patient's. */
  paymentMobile: string;
  retryOf?: string;
}): Promise<YagoutBookingState> {
  const root = baseUrl();
  if (!root) {
    console.error('[YAGOUT] NEXT_PUBLIC_BASE_URL is not set; cannot build return URLs');
    return { success: false, message: NOT_AVAILABLE };
  }

  const email = input.patient.email?.trim() || process.env.YAGOUT_FALLBACK_EMAIL?.trim();
  if (!email) {
    console.error('[YAGOUT] Patient has no email and YAGOUT_FALLBACK_EMAIL is not set');
    return { success: false, message: NOT_AVAILABLE };
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId }, select: { consultationFee: true } });
  const fee = Number(doctor?.consultationFee);
  if (!doctor || !Number.isFinite(fee) || fee <= 0) {
    return { success: false, message: 'This doctor has no consultation fee set. Please contact the hospital.' };
  }

  // Formatted once and reused: the same string must go into txn_details and
  // the hash, or the gateway rejects the request with no useful error.
  const amount = fee.toFixed(2);
  // Alphanumeric only. randomUUID()'s hyphens are not allowed in order_no.
  const orderNo = crypto.randomBytes(12).toString('hex');
  const paymentExpiresAt = addMinutes(new Date(), paymentHoldMinutes());

  const appointment = await prisma.appointment.create({
    data: {
      symptoms: input.symptoms,
      patientId: input.patient.id,
      doctorId: input.doctorId,
      hospitalId: input.hospitalId,
      appointmentSlot: input.appointmentSlot,
      appointmentDate: input.appointmentDate,
      status: 'pending-payment',
      paymentMethod: 'YAGOUT',
      orderNo,
      paymentExpiresAt,
    },
    select: { id: true, doctorId: true, hospitalId: true, appointmentDate: true, appointmentSlot: true, createdAt: true },
  });

  if (await hasEarlierSlotHolder(appointment)) {
    await prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'pending-payment' },
      data: { status: 'payment-expired', paymentExpiresAt: new Date() },
    });
    return { success: false, message: 'Someone else just booked this time slot. Please choose another.' };
  }

  const { successUrl, failureUrl } = yagoutReturnUrls(root);
  let merchantRequest: string;
  let hash: string;
  try {
    const plaintext = buildHostedMerchantRequest({
      txn: {
        agId: input.config.aggregatorId,
        meId: input.config.meId,
        orderNo,
        amount,
        country: YAGOUT_COUNTRY,
        currency: YAGOUT_CURRENCY,
        txnType: YAGOUT_TXN_TYPE,
        successUrl,
        failureUrl,
        channel: YAGOUT_CHANNEL_WEB,
      },
      cust: {
        custName: framingSafe(input.patient.name),
        emailId: framingSafe(email, 100),
        mobileNo: input.paymentMobile,
        isLoggedIn: 'Y',
      },
      other: {
        udf1: appointment.id,
        udf2: String(input.hospitalId),
      },
    });
    merchantRequest = encryptYagout(plaintext, input.config.encryptionKey);
    hash = yagoutHash(
      { meId: input.config.meId, orderNo, amount, country: YAGOUT_COUNTRY, currency: YAGOUT_CURRENCY },
      input.config.encryptionKey,
    );
  } catch (error) {
    // Never log the request itself: it carries the patient's details.
    console.error('[YAGOUT] Could not build merchant request:', (error as Error).message, { appointmentId: appointment.id });
    await prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'pending-payment' },
      data: { status: 'payment-failed', paymentExpiresAt: new Date() },
    });
    return { success: false, message: 'We could not start the payment. Please try again.' };
  }

  // Stored exactly as it will be posted. The hand-off page renders these
  // verbatim and never rebuilds them: only this pair matches this order.
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentRequest: {
        meId: input.config.meId,
        postUrl: input.config.postUrl,
        merchantRequest,
        hash,
        amount,
        currency: YAGOUT_CURRENCY,
      },
    },
  });

  await createAuditLog({
    actorId: input.patient.id,
    actorType: 'Patient',
    action: 'YAGOUT_PAYMENT_INITIATED',
    targetId: appointment.id,
    targetType: 'Appointment',
    changes: {
      hospitalId: input.hospitalId,
      meId: input.config.meId,
      orderNo,
      amount,
      currency: YAGOUT_CURRENCY,
      paymentExpiresAt: paymentExpiresAt.toISOString(),
      ...(input.retryOf ? { retryOf: input.retryOf } : {}),
    },
  });

  console.log('[YAGOUT] Payment raised', { appointmentId: appointment.id, hospitalId: input.hospitalId, orderNo });

  revalidatePath('/hospital-admin/appointments');
  revalidatePath('/user/appointments');
  return { success: true, redirectTo: `/user/pay/${appointment.id}` };
}

async function resolveConfigOrNull(hospitalId: number): Promise<YagoutConfig | null> {
  try {
    return await resolveYagoutConfigForHospital(hospitalId);
  } catch (error) {
    console.warn('[YAGOUT] Not configured for hospital', hospitalId, (error as Error).message);
    return null;
  }
}

export async function initiateYagoutBooking(
  doctorId: number,
  hospitalId: number,
  appointmentSlot: string,
  appointmentDate: string,
  prevState: YagoutBookingState,
  formData: FormData,
): Promise<YagoutBookingState> {
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const patient = await getWebPatientFromCookie();
  if (!patient) {
    return { success: false, message: 'Please verify your phone number to book.' };
  }

  const validated = AppointmentFormSchema.safeParse({
    bookingFor: formData.get('bookingFor'),
    fullName: formData.get('fullName'),
    phone: String(formData.get('phone') || ''),
    age: formData.get('age'),
    gender: formData.get('gender'),
    symptoms: formData.get('symptoms') ?? undefined,
  });
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors, message: 'Invalid appointment data.' };
  }

  // The appointment is for whoever verified by OTP. The form's phone must be
  // that number, so a session for one phone cannot book under another.
  if (normalizePhoneNumber(validated.data.phone) !== patient.phone) {
    return { success: false, message: 'Please verify the phone number you are booking with.' };
  }

  if (!Number.isInteger(doctorId) || !Number.isInteger(hospitalId) || !appointmentSlot || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    return { success: false, message: 'Invalid booking details.' };
  }

  // The payer may pay from a different number than the patient's; blank
  // means the patient's own verified number.
  const rawPaymentPhone = String(formData.get('paymentPhone') || '').trim();
  const paymentMobile = toYagoutMobile(rawPaymentPhone || patient.phone);
  if (!paymentMobile) {
    const message = 'Please enter a valid phone number for payment (e.g. 912345678).';
    return { success: false, message, errors: { paymentPhone: [message] } };
  }

  const config = await resolveConfigOrNull(hospitalId);
  if (!config) {
    return { success: false, message: NOT_AVAILABLE };
  }

  try {
    if (!(await isBookableSlot(doctorId, hospitalId, appointmentDate, appointmentSlot))) {
      return { success: false, message: 'The selected time slot is not available.' };
    }

    // The patient is verified now, so their details from the form are theirs to set.
    const { fullName, age, gender, symptoms } = validated.data;
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: { name: fullName, age, gender },
      select: { id: true, name: true, phone: true, email: true },
    });

    return await raiseYagoutPayment({
      patient: updated,
      doctorId,
      hospitalId,
      appointmentSlot,
      // 'yyyy-MM-dd' read as a local date, as parseISO does in the Super App path.
      appointmentDate: startOfDay(new Date(`${appointmentDate}T00:00:00`)),
      symptoms: symptoms || '',
      config,
      paymentMobile,
    });
  } catch (error) {
    console.error('[YAGOUT] initiateYagoutBooking failed:', (error as Error).message);
    return { success: false, message: 'An error occurred while initiating the payment process.' };
  }
}

/**
 * "Try payment again" for a failed or expired Yagout booking. Creates a new
 * appointment with a new order number and a new hold; the old one stays as it
 * was so its order number still resolves if a late return ever arrives.
 */
export async function retryYagoutPayment(appointmentId: string, formData: FormData): Promise<YagoutBookingState> {
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const patient = await getWebPatientFromCookie();
  if (!patient) {
    return { success: false, message: 'Please verify your phone number to continue.' };
  }

  const previous = await prisma.appointment.findFirst({
    where: { id: String(appointmentId), patientId: patient.id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      doctorId: true,
      hospitalId: true,
      appointmentSlot: true,
      appointmentDate: true,
      symptoms: true,
    },
  });
  if (!previous || previous.paymentMethod !== 'YAGOUT' || !['payment-failed', 'payment-expired'].includes(previous.status)) {
    return { success: false, message: 'This appointment cannot be paid again.' };
  }

  const paymentMobile = toYagoutMobile(String(formData.get('paymentPhone') || '').trim() || patient.phone);
  if (!paymentMobile) {
    return { success: false, message: 'Please enter a valid phone number for payment (e.g. 912345678).' };
  }

  const config = await resolveConfigOrNull(previous.hospitalId);
  if (!config) {
    return { success: false, message: NOT_AVAILABLE };
  }

  try {
    const dateString = format(previous.appointmentDate, 'yyyy-MM-dd');
    if (!(await isBookableSlot(previous.doctorId, previous.hospitalId, dateString, previous.appointmentSlot))) {
      return { success: false, message: 'This time slot is no longer available. Please book another time.' };
    }

    return await raiseYagoutPayment({
      patient: { id: patient.id, name: patient.name, phone: patient.phone, email: patient.email },
      doctorId: previous.doctorId,
      hospitalId: previous.hospitalId,
      appointmentSlot: previous.appointmentSlot,
      appointmentDate: previous.appointmentDate,
      symptoms: previous.symptoms,
      config,
      paymentMobile,
      retryOf: previous.id,
    });
  } catch (error) {
    console.error('[YAGOUT] retryYagoutPayment failed:', (error as Error).message);
    return { success: false, message: 'An error occurred while initiating the payment process.' };
  }
}
