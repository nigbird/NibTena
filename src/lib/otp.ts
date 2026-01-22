import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { prisma } from '@/lib/prisma';

const OTP_LENGTH = 6;
const DEFAULT_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

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

export async function createAndStoreOtp(phone: string, expiryMinutes = DEFAULT_EXPIRY_MINUTES) {
  const otp = generateNumericOtp();
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
