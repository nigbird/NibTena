// Client-safe helpers for showing appointment payment state. No server imports.

// No paid appointment exists in these states (and paid-slot-conflict is money
// that must be refunded or rebooked), so none of them count as a booking or as
// revenue.
const NON_REVENUE_STATUSES = ['pending-payment', 'payment-failed', 'payment-expired', 'paid-slot-conflict'];

export function countsAsRevenue(status: string): boolean {
  return !NON_REVENUE_STATUSES.includes(status);
}

type PaymentFields = { status: string; paidAmount?: number | null };

/**
 * Money has moved but there is no confirmed appointment for it: paid after the
 * hold lapsed and the slot was taken, or paid an amount that did not match.
 * Hospital staff must refund or rebook these.
 */
export function needsPaymentAction(appointment: PaymentFields): boolean {
  return (
    appointment.status === 'paid-slot-conflict' ||
    (appointment.status === 'payment-failed' && appointment.paidAmount != null)
  );
}

export function paymentMethodLabel(method?: string | null): string {
  if (method === 'YAGOUT') return 'YagoutPay';
  if (method === 'NIB_SUPERAPP') return 'Super App';
  return '—';
}
