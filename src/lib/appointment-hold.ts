import { addDays, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';

/**
 * Slot holds for web (YagoutPay) bookings.
 *
 * A Yagout booking is created as `pending-payment` with `paymentExpiresAt`
 * set, and while that is in the future the slot is held for the payer so two
 * people cannot pay for the same slot. Mini-app bookings never set
 * `paymentExpiresAt`, so nothing here touches them.
 */

export function paymentHoldMinutes(): number {
  const raw = Number(process.env.YAGOUT_PAYMENT_HOLD_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 20;
}

/** Appointments that occupy their slot as of `now`. */
export function slotBlockingWhere(now: Date) {
  return {
    OR: [
      { status: { in: ['confirmed', 'rescheduled'] } },
      { status: 'pending-payment', paymentExpiresAt: { gt: now } },
    ],
  };
}

/**
 * Marks lapsed holds as `payment-expired`. Safe to run any number of times and
 * concurrently: it is one conditional updateMany. A success that arrives after
 * this still settles (see yagout-settlement.ts), so expiring early never loses
 * a payment, it only stops the hold blocking the slot.
 */
export async function expireStalePaymentHolds(scope?: { doctorId?: number; hospitalId?: number }): Promise<number> {
  const result = await prisma.appointment.updateMany({
    where: {
      status: 'pending-payment',
      paymentExpiresAt: { not: null, lte: new Date() },
      ...(scope?.doctorId ? { doctorId: scope.doctorId } : {}),
      ...(scope?.hospitalId ? { hospitalId: scope.hospitalId } : {}),
    },
    data: { status: 'payment-expired' },
  });
  return result.count;
}

function sameSlotWhere(appointment: SlotRef) {
  const day = startOfDay(appointment.appointmentDate);
  return {
    id: { not: appointment.id },
    doctorId: appointment.doctorId,
    hospitalId: appointment.hospitalId,
    appointmentSlot: appointment.appointmentSlot,
    appointmentDate: { gte: day, lt: addDays(day, 1) },
  };
}

type SlotRef = {
  id: string;
  doctorId: number;
  hospitalId: number;
  appointmentDate: Date;
  appointmentSlot: string;
};

/**
 * Whether someone else claimed this slot first. Availability is checked before
 * the hold is created, so two people submitting together can both pass the
 * check; afterwards exactly one of them is earliest, and the other backs off.
 */
export async function hasEarlierSlotHolder(appointment: SlotRef & { createdAt: Date }): Promise<boolean> {
  const earlier = await prisma.appointment.count({
    where: {
      ...sameSlotWhere(appointment),
      ...slotBlockingWhere(new Date()),
      AND: [
        {
          OR: [
            { createdAt: { lt: appointment.createdAt } },
            { createdAt: appointment.createdAt, id: { lt: appointment.id } },
          ],
        },
      ],
    },
  });
  return earlier > 0;
}

/**
 * Other appointments occupying the same slot. Used where getAvailableTimeWindows
 * cannot be (it filters out past times, so it would wrongly report a slot that
 * has started as taken when settling a late payment).
 */
export async function countOtherSlotHolders(appointment: SlotRef): Promise<number> {
  return prisma.appointment.count({
    where: {
      ...sameSlotWhere(appointment),
      ...slotBlockingWhere(new Date()),
    },
  });
}
