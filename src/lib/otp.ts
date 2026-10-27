import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getSmsProvider } from '@/lib/sms';

const OTP_LENGTH = 6;
const DEFAULT_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Windowed limits on sending and verifying, independent of the per-phone
// failed-attempt lock below. Sending costs money and spams a real person, so
// it is limited per phone and per IP; verifying is limited per IP so one
// client cannot spread guesses across many phones.
const SEND_WINDOW_MINUTES = 15;
const SEND_MAX_PER_PHONE = 3;
const SEND_MAX_PER_IP = 10;
const VERIFY_WINDOW_MINUTES = 15;
const VERIFY_MAX_PER_IP = 30;

function getHmacKey() {
  return process.env.OTP_HMAC_KEY || process.env.OTP_SECRET || 'default_fallback_otp_key';
}

export function generateNumericOtp(length = OTP_LENGTH) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  // crypto.randomInt is cryptographically secure
  return String(crypto.randomInt(min, max));
}

export function hashOtp(otp: string) {
  const h = crypto.createHmac('sha256', getHmacKey());
  h.update(otp);
  return h.digest('hex');
}

/**
 * TEMPORARY: OTP_MOCK=true skips SMS and makes every phone's code
 * OTP_MOCK_CODE (default 123456). Anyone can then verify as any phone number,
 * so this must be turned off before real patients use the site.
 */
function mockOtpCode(): string | null {
  if (process.env.OTP_MOCK !== 'true') return null;
  const code = process.env.OTP_MOCK_CODE?.trim() || '123456';
  return /^\d{6}$/.test(code) ? code : '123456';
}

export async function createAndStoreOtp(phone: string, expiryMinutes = DEFAULT_EXPIRY_MINUTES) {
  const otp = mockOtpCode() ?? generateNumericOtp();
  const hashed = hashOtp(otp);
  const expiresAt = addMinutes(new Date(), expiryMinutes);

  await prisma.otp.upsert({
    where: { phone },
    update: { code: hashed, expiresAt },
    create: { phone, code: hashed, expiresAt },
  });

  return otp;
}

async function getRateLimit(key: string) {
  return prisma.rateLimit.findUnique({ where: { key } });
}

async function upsertRateLimit(key: string, attempts: number, firstAttemptAt: Date | null, lockedUntil: Date | null) {
  // Prisma upsert; fallback if needed
  try {
    return await prisma.rateLimit.upsert({
      where: { key },
      update: { attempts, firstAttemptAt, lockedUntil },
      create: { key, type: 'phone', attempts, firstAttemptAt, lockedUntil },
    });
  } catch (err) {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (existing) {
      return prisma.rateLimit.update({ where: { key }, data: { attempts, firstAttemptAt, lockedUntil } });
    }
    return prisma.rateLimit.create({ data: { key, type: 'phone', attempts, firstAttemptAt, lockedUntil } });
  }
}

export async function verifyAndConsumeOtp(phone: string, providedOtp: string) {
  const key = `otp:${phone}`;
  const now = new Date();

  const rl = await getRateLimit(key);
  if (rl && rl.lockedUntil && rl.lockedUntil > now) {
    return { success: false, message: 'Too many failed attempts. Try again later.' };
  }

  const otpRecord = await prisma.otp.findUnique({ where: { phone } });
  if (!otpRecord) {
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  if (otpRecord.expiresAt <= now) {
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  const providedHash = hashOtp(String(providedOtp));
  const storedHash = otpRecord.code;

  const providedBuf = Buffer.from(providedHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  let matched = false;
  try {
    if (providedBuf.length === storedBuf.length) {
      matched = crypto.timingSafeEqual(providedBuf, storedBuf);
    }
  } catch (err) {
    matched = false;
  }

  if (!matched) {
    const attempts = (rl?.attempts || 0) + 1;
    const firstAttemptAt = rl?.firstAttemptAt || now;
    let lockedUntil = rl?.lockedUntil || null;
    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = addMinutes(now, LOCK_MINUTES);
    }
    await upsertRateLimit(key, attempts, firstAttemptAt, lockedUntil);
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  // Success: consume OTP and clear rate limit
  try { await prisma.otp.delete({ where: { id: otpRecord.id } }); } catch (err) {}
  try { await prisma.rateLimit.delete({ where: { key } }); } catch (err) {}

  return { success: true };
}

/**
 * Counts one attempt against `key` and reports whether it is within `max`
 * attempts per `windowMinutes`. The window starts at the first attempt and
 * resets once it has passed.
 */
async function consumeRateLimit(key: string, type: string, max: number, windowMinutes: number): Promise<boolean> {
  const now = new Date();
  const rl = await prisma.rateLimit.findUnique({ where: { key } });

  if (rl?.lockedUntil && rl.lockedUntil > now) return false;

  const windowExpired = !rl?.firstAttemptAt || addMinutes(rl.firstAttemptAt, windowMinutes) <= now;
  const attempts = windowExpired ? 1 : rl!.attempts + 1;
  const firstAttemptAt = windowExpired ? now : rl!.firstAttemptAt;
  const lockedUntil = attempts > max ? addMinutes(firstAttemptAt!, windowMinutes) : null;

  await prisma.rateLimit.upsert({
    where: { key },
    update: { attempts, firstAttemptAt, lockedUntil },
    create: { key, type, attempts, firstAttemptAt, lockedUntil },
  });

  return attempts <= max;
}

async function getRequestIp(): Promise<string> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    return (forwarded ? forwarded.split(',')[0] : h.get('x-real-ip') || 'unknown').trim();
  } catch {
    return 'unknown';
  }
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const minutes = DEFAULT_EXPIRY_MINUTES;
  await getSmsProvider().send(phone, `Your NibAppointment verification code is ${code}. It expires in ${minutes} minutes.`);
}

/**
 * Rate-limits, creates, stores and sends an OTP. The code never leaves this
 * function except through the SMS provider; callers only learn whether it was sent.
 */
export async function requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
  const ip = await getRequestIp();
  const phoneOk = await consumeRateLimit(`otp-send:phone:${phone}`, 'phone', SEND_MAX_PER_PHONE, SEND_WINDOW_MINUTES);
  const ipOk = await consumeRateLimit(`otp-send:ip:${ip}`, 'ip', SEND_MAX_PER_IP, SEND_WINDOW_MINUTES);
  if (!phoneOk || !ipOk) {
    return { success: false, message: 'Too many verification codes requested. Please try again later.' };
  }

  const code = await createAndStoreOtp(phone);
  if (mockOtpCode()) {
    console.warn(`[otp] OTP_MOCK is ON: no SMS sent to ${phone}; the fixed mock code is accepted. Turn OTP_MOCK off before going live.`);
    return { success: true, message: 'An OTP has been sent.' };
  }
  try {
    await sendOtpSms(phone, code);
  } catch (error) {
    console.error('OTP SMS delivery failed:', (error as Error).message);
    return { success: false, message: 'Could not send the verification code. Please try again.' };
  }
  return { success: true, message: 'An OTP has been sent.' };
}

/** Per-IP limit on verification attempts, checked before verifyAndConsumeOtp. */
export async function allowOtpVerifyAttempt(): Promise<boolean> {
  const ip = await getRequestIp();
  return consumeRateLimit(`otp-verify:ip:${ip}`, 'ip', VERIFY_MAX_PER_IP, VERIFY_WINDOW_MINUTES);
}
