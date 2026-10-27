import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { expireStalePaymentHolds } from '@/lib/appointment-hold';

/**
 * Marks lapsed YagoutPay slot holds as payment-expired. Availability also does
 * this lazily, so this only keeps lists and reports tidy between bookings.
 *
 * Call with header `x-cron-secret: $CRON_SECRET`, e.g. every 5 minutes.
 */

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret');
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const expired = await expireStalePaymentHolds();
  if (expired > 0) console.log('[cron] expired payment holds:', expired);
  return NextResponse.json({ expired });
}

export const POST = handle;
export const GET = handle;
