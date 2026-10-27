import { z } from 'zod';
import { format, parse } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAvailableTimeWindows } from '@/app/user/doctors/[id]/actions';

// Shared by the Super App (actions.ts) and YagoutPay (yagout-actions.ts)
// booking paths. Deliberately not a 'use server' module: everything exported
// from one of those is callable from the browser.

// Normalize phone numbers to canonical 251XXXXXXXXX format (no leading '+')
export function normalizePhoneNumber(input?: string | null) {
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

export const PatientInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(9, { message: 'Please enter a valid phone number.' }),
  age: z.coerce.number().gt(0, { message: 'Please enter a valid age.' }),
  gender: z.enum(['male', 'female'], { required_error: 'Please select a gender.' }),
});

export const AppointmentFormSchema = PatientInfoSchema.extend({
  bookingFor: z.enum(['myself', 'someoneElse']),
  symptoms: z.string().optional(),
});

// Checks that the doctor is active and works at the hospital, and that the
// slot is one the schedule actually offers on that date.
export async function isBookableSlot(doctorId: number, hospitalId: number, appointmentDate: string, appointmentSlot: string) {
  const link = await prisma.doctorsOnHospitals.findFirst({
    where: { doctorId, hospitalId, doctor: { status: 'active' } },
    select: { doctorId: true },
  });
  if (!link) return false;

  const [startTimeStr] = String(appointmentSlot).split(' - ');
  const slotStart = parse(startTimeStr, 'hh:mm a', new Date());
  if (isNaN(slotStart.getTime())) return false;
  const formattedSlotStart = format(slotStart, 'hh:mm a');

  const availableWindows = await getAvailableTimeWindows(doctorId, appointmentDate, hospitalId);
  return availableWindows.some(window => window.startsWith(formattedSlotStart));
}
