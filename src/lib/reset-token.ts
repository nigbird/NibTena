import crypto from 'crypto';
import { prisma } from './prisma';

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store a hashed reset token for single-use verification
 */
export async function createResetTokenRecord(token: string, userId: number, userType: string, expiresInSeconds: number) {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  return await prisma.passwordResetToken.create({
    data: {
      userId,
      userType,
      tokenHash,
      expiresAt,
    },
  });
}

/**
 * Verify token exists, not used, not expired and mark it used (atomic-ish)
 */
export async function verifyAndConsumeResetToken(token: string, userId: number, userType: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const rec = await prisma.passwordResetToken.findFirst({
    where: {
      userId,
      userType,
      tokenHash,
      used: false,
      expiresAt: { gt: now },
    },
  });

  if (!rec) return false;

  await prisma.passwordResetToken.update({ where: { id: rec.id }, data: { used: true, usedAt: new Date() } });
  return true;
}

export async function invalidateAllResetTokensFor(userId: number, userType: string) {
  await prisma.passwordResetToken.updateMany({ where: { userId, userType, used: false }, data: { used: true, usedAt: new Date() } });
}

export default { hashToken, createResetTokenRecord, verifyAndConsumeResetToken, invalidateAllResetTokensFor };
