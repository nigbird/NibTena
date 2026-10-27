import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { countOtherSlotHolders } from '@/lib/appointment-hold';
import { isSuccessfulTxnResponse, type YagoutTxnResponse } from '@/lib/yagout-request';

/**
 * Applies a YagoutPay return POST to the appointment it paid for. Ported from
 * payget's yagout-settlement.ts.
 *
 * Yagout documents no status-enquiry API, so this return is the only outcome
 * signal we get. That makes these properties load-bearing:
 *
 *  - Tenant isolation. The post is trusted only because it decrypted with a
 *    hospital's key; that hospital must be the one the appointment belongs to,
 *    and the payload's me_id must be that hospital's merchant. Otherwise a
 *    genuine post for hospital A could be replayed against hospital B.
 *  - Idempotency. The patient's browser performs the POST, so it can arrive
 *    twice (refresh, back button). A second application changes nothing.
 *  - Never downgrading. Once confirmed, a later failure post is ignored and
 *    logged: money that moved stays recorded as moved.
 */

export type YagoutSettlementAction =
  | 'settled'
  | 'already_settled'
  | 'ignored_after_success'
  | 'not_found'
  | 'mismatch'
  | 'cross_tenant';

export type YagoutSettlementResult = {
  action: YagoutSettlementAction;
  appointmentId?: string;
  status?: string;
  reason?: string;
};

type SettleInput = {
  response: YagoutTxnResponse;
  /** The hospital whose key decrypted this post. */
  decryptedByHospitalId: number;
  /** Decrypted sections, recorded verbatim for audit and reconciliation. */
  raw: Record<string, string>;
  /** Which return path Yagout posted to; a hint only, never the outcome. */
  outcomeHint: 'success' | 'failure';
};

// Statuses meaning the patient holds a paid appointment (or did, before a
// later change by staff). A failure post never moves one of these.
const PAID_STATUSES = ['confirmed', 'rescheduled', 'completed', 'checked-in', 'in-progress', 'paid', 'paid-slot-conflict'];

function amountsAgree(expected: number, reported: string): boolean {
  const parsed = Number(reported);
  if (!Number.isFinite(parsed) || !Number.isFinite(expected)) return false;
  return Math.abs(parsed - expected) < 0.005;
}

function revalidateAppointmentViews() {
  try {
    revalidatePath('/doctor-portal/appointments');
    revalidatePath('/hospital-admin/appointments');
    revalidatePath('/user/appointments');
  } catch (error) {
    console.warn('[YAGOUT] revalidatePath failed:', (error as Error).message);
  }
}

export async function settleYagoutFromReturn(input: SettleInput): Promise<YagoutSettlementResult> {
  const { response, decryptedByHospitalId } = input;
  const orderNo = response.orderNo?.trim();
  if (!orderNo) return { action: 'not_found', reason: 'NO_ORDER_NUMBER' };

  const appointment = await prisma.appointment.findUnique({
    where: { orderNo },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      hospitalId: true,
      doctorId: true,
      appointmentDate: true,
      appointmentSlot: true,
      paymentExpiresAt: true,
      paymentRequest: true,
      doctor: { select: { consultationFee: true } },
      hospital: { select: { yagoutMeId: true } },
    },
  });
  if (!appointment) return { action: 'not_found', reason: 'APPOINTMENT_NOT_FOUND' };

  const base = { appointmentId: appointment.id, status: appointment.status };

  if (appointment.paymentMethod !== 'YAGOUT') {
    return { ...base, action: 'mismatch', reason: 'NOT_A_YAGOUT_APPOINTMENT' };
  }

  const hospitalMeId = appointment.hospital?.yagoutMeId?.trim() || null;
  if (decryptedByHospitalId !== appointment.hospitalId || !hospitalMeId || response.meId.trim() !== hospitalMeId) {
    console.error('[YAGOUT] CROSS-TENANT REPLAY REJECTED', {
      orderNo,
      appointmentId: appointment.id,
      appointmentHospitalId: appointment.hospitalId,
      decryptedByHospitalId,
      payloadMeId: response.meId,
      hospitalMeId,
    });
    await createAuditLog({
      actorId: 'yagout',
      actorType: 'System',
      action: 'YAGOUT_RETURN_REJECTED',
      targetId: appointment.id,
      targetType: 'Appointment',
      changes: { reason: 'CROSS_TENANT', orderNo, decryptedByHospitalId, appointmentHospitalId: appointment.hospitalId, payloadMeId: response.meId },
    });
    return { ...base, action: 'cross_tenant', reason: 'CROSS_TENANT' };
  }

  const succeeded = isSuccessfulTxnResponse(response);
  const stored = (appointment.paymentRequest ?? {}) as { amount?: string };
  // The amount we raised is the consultation fee at the time of booking; the
  // fee may have been edited since, so the stored figure is the one to match.
  const expectedAmount = stored.amount != null ? Number(stored.amount) : Number(appointment.doctor?.consultationFee);
  const amountMatches = amountsAgree(expectedAmount, response.amount);
  const paidAmount = Number.isFinite(Number(response.amount)) ? Number(response.amount) : null;
  const settledAt = new Date();

  const paymentRaw = {
    ...input.raw,
    outcomeHint: input.outcomeHint,
    gatewayStatus: response.status,
    resCode: response.resCode,
    resMessage: response.resMessage,
    pgRef: response.pgRef,
    agRef: response.agRef,
    amountMismatch: !amountMatches,
    settledAt: settledAt.toISOString(),
  };

  const audit = (action: string, changes: Record<string, unknown>) =>
    createAuditLog({
      actorId: 'yagout',
      actorType: 'System',
      action,
      targetId: appointment.id,
      targetType: 'Appointment',
      changes: {
        orderNo,
        hospitalId: appointment.hospitalId,
        meId: response.meId,
        previousStatus: appointment.status,
        gatewayStatus: response.status,
        resCode: response.resCode,
        resMessage: response.resMessage,
        pgRef: response.pgRef,
        gatewayAmount: response.amount,
        expectedAmount,
        ...changes,
      },
    });

  // ---- Failure (or anything not clearly a success) ------------------------
  if (!succeeded) {
    if (PAID_STATUSES.includes(appointment.status)) {
      console.warn('[YAGOUT] Failure post after success ignored', { orderNo, appointmentId: appointment.id, status: appointment.status });
      await audit('YAGOUT_RETURN_IGNORED', { reason: 'FAILURE_POST_AFTER_SUCCESS' });
      return { ...base, action: 'ignored_after_success', reason: 'FAILURE_POST_AFTER_SUCCESS' };
    }

    const updated = await prisma.appointment.updateMany({
      where: { id: appointment.id, status: { in: ['pending-payment', 'payment-expired'] } },
      data: { status: 'payment-failed', paymentRaw, paymentExpiresAt: settledAt },
    });
    if (updated.count === 0) {
      return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
    }
    await audit('YAGOUT_PAYMENT_FAILED', { status: 'payment-failed' });
    revalidateAppointmentViews();
    return { ...base, action: 'settled', status: 'payment-failed' };
  }

  // ---- Success --------------------------------------------------------------
  if (PAID_STATUSES.includes(appointment.status)) {
    return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
  }

  if (!amountMatches) {
    // The gateway says money moved, but not the amount we raised. Do not
    // confirm; record what was paid so staff can refund or reconcile. The
    // admin list flags any unconfirmed appointment with a paidAmount.
    console.error('[YAGOUT] AMOUNT MISMATCH — payment taken but not confirmed', {
      orderNo,
      appointmentId: appointment.id,
      expectedAmount,
      gatewayAmount: response.amount,
    });
    const updated = await prisma.appointment.updateMany({
      where: { id: appointment.id, status: { in: ['pending-payment', 'payment-expired', 'payment-failed'] } },
      data: { status: 'payment-failed', paymentRef: response.pgRef || null, paidAmount, paidAt: settledAt, paymentRaw, paymentExpiresAt: settledAt },
    });
    if (updated.count === 0) return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
    await audit('YAGOUT_AMOUNT_MISMATCH', { status: 'payment-failed' });
    revalidateAppointmentViews();
    return { ...base, action: 'settled', status: 'payment-failed', reason: 'AMOUNT_MISMATCH' };
  }

  const paidData = { paymentRef: response.pgRef || null, paidAmount, paidAt: settledAt, paymentRaw };

  const holdActive =
    appointment.status === 'pending-payment' &&
    (!appointment.paymentExpiresAt || appointment.paymentExpiresAt > settledAt);

  if (holdActive) {
    const updated = await prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'pending-payment' },
      data: { status: 'confirmed', ...paidData },
    });
    if (updated.count > 0) {
      await audit('YAGOUT_PAYMENT_CONFIRMED', { status: 'confirmed' });
      console.log('[YAGOUT] Appointment confirmed', { orderNo, appointmentId: appointment.id, pgRef: response.pgRef });
      revalidateAppointmentViews();
      return { ...base, action: 'settled', status: 'confirmed' };
    }
    // Lost a race (another post, or expiry ran in between): re-read and fall
    // through to the late-success rules with the current status.
    const current = await prisma.appointment.findUnique({ where: { id: appointment.id }, select: { status: true } });
    if (!current || PAID_STATUSES.includes(current.status)) {
      return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
    }
    appointment.status = current.status;
  }

  // The hold lapsed (or a failure was recorded first) but the money has moved.
  // Confirm if the slot is still free; otherwise the patient has paid for a
  // slot someone else now holds, which needs a refund or a rebooking.
  const others = await countOtherSlotHolders(appointment);
  const finalStatus = others === 0 ? 'confirmed' : 'paid-slot-conflict';
  const updated = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: { in: ['pending-payment', 'payment-expired', 'payment-failed'] } },
    data: { status: finalStatus, ...paidData },
  });
  if (updated.count === 0) {
    const current = await prisma.appointment.findUnique({ where: { id: appointment.id }, select: { status: true } });
    if (current && PAID_STATUSES.includes(current.status)) {
      return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
    }
    // e.g. staff cancelled the booking while the patient was paying. The money
    // still moved, so make it impossible to miss.
    console.error('[YAGOUT] Successful payment NOT applied: appointment no longer payable', {
      orderNo,
      appointmentId: appointment.id,
      status: appointment.status,
      pgRef: response.pgRef,
    });
    await audit('YAGOUT_SUCCESS_NOT_APPLIED', { reason: 'APPOINTMENT_NOT_PAYABLE' });
    return { ...base, action: 'already_settled', reason: 'RETURN_ALREADY_APPLIED' };
  }

  if (finalStatus === 'paid-slot-conflict') {
    console.error('[YAGOUT] PAID SLOT CONFLICT — payment received after hold lapsed and slot was taken; refund or rebook', {
      orderNo,
      appointmentId: appointment.id,
      hospitalId: appointment.hospitalId,
      pgRef: response.pgRef,
      amount: response.amount,
    });
    await audit('YAGOUT_PAID_SLOT_CONFLICT', { status: finalStatus });
  } else {
    await audit('YAGOUT_PAYMENT_CONFIRMED', { status: finalStatus, late: true });
    console.log('[YAGOUT] Late payment confirmed', { orderNo, appointmentId: appointment.id, pgRef: response.pgRef });
  }

  revalidateAppointmentViews();
  return { ...base, action: 'settled', status: finalStatus };
}
