import { prisma } from '@/lib/prisma';
import { decryptHospitalSecret } from '@/lib/hospital-secret';
import { YAGOUT_AGGREGATOR_ID, parseTxnResponse } from '@/lib/yagout-request';
import { decryptYagout } from '@/lib/yagout-crypto';
import { defaultYagoutPostUrl, isAllowedYagoutPostUrl } from '@/lib/yagout-hosts';

/**
 * Resolves which YagoutPay account a payment is raised against.
 *
 * Adapted from payget's yagout-client.ts. Every hospital is its own Yagout
 * merchant, so there is deliberately no platform-wide fallback here: a
 * hospital without its own me_id and key cannot take web payments at all,
 * rather than having its patients' money settle to somebody else's account.
 *
 * There is no client that calls out to the gateway: Yagout accepts the hosted
 * flow only as a browser form POST, so "the client" is credentials plus the
 * URL the form targets.
 */

export type YagoutConfig = {
  aggregatorId: string;
  meId: string;
  /** Base64 AES-256 key, decrypted and ready to use. */
  encryptionKey: string;
  postUrl: string;
};

export class YagoutConfigError extends Error {
  readonly code = 'YAGOUT_NOT_CONFIGURED';
  constructor(detail: string) {
    super(`YAGOUT_NOT_CONFIGURED: ${detail}`);
    this.name = 'YagoutConfigError';
  }
}

export function yagoutAggregatorId(): string {
  return process.env.YAGOUTPAY_AGGREGATOR_ID?.trim() || YAGOUT_AGGREGATOR_ID;
}

/**
 * The post URL is re-checked against the allowlist on every use, not only when
 * saved: if the allowlist is tightened later, a stored override pointing
 * elsewhere must stop being used rather than keep receiving patients.
 */
export function resolvePostUrl(override?: string | null): string {
  const postUrl = override?.trim() || defaultYagoutPostUrl();
  if (!isAllowedYagoutPostUrl(postUrl)) {
    throw new YagoutConfigError('post URL is not an allowed https Yagout host');
  }
  return postUrl;
}

export async function resolveYagoutConfigForHospital(hospitalId: number): Promise<YagoutConfig> {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { yagoutMeId: true, yagoutEncryptionKey: true, yagoutPostUrl: true },
  });

  const meId = hospital?.yagoutMeId?.trim();
  if (!hospital || !meId || !hospital.yagoutEncryptionKey) {
    throw new YagoutConfigError(`hospital ${hospitalId} has no Yagout merchant configured`);
  }

  return {
    aggregatorId: yagoutAggregatorId(),
    meId,
    encryptionKey: decryptHospitalSecret(hospital.yagoutEncryptionKey),
    postUrl: resolvePostUrl(hospital.yagoutPostUrl),
  };
}

/** Whether a hospital can take web payments, without decrypting anything. */
export async function isYagoutConfiguredForHospital(hospitalId: number): Promise<boolean> {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { yagoutMeId: true, yagoutEncryptionKey: true },
  });
  return !!hospital?.yagoutMeId?.trim() && !!hospital.yagoutEncryptionKey;
}

/**
 * Finds the key that decrypts a return post, given the me_id it arrived with —
 * the one field Yagout sends in plain text.
 */
export async function resolveYagoutKeyForMeId(
  meId: string,
): Promise<{ hospitalId: number; encryptionKey: string } | null> {
  const trimmed = meId.trim();
  if (!trimmed) return null;

  const hospital = await prisma.hospital.findUnique({
    where: { yagoutMeId: trimmed },
    select: { id: true, yagoutEncryptionKey: true },
  });
  if (!hospital?.yagoutEncryptionKey) return null;

  return { hospitalId: hospital.id, encryptionKey: decryptHospitalSecret(hospital.yagoutEncryptionKey) };
}

/**
 * Yagout's return post does not always carry me_id in plain text (observed in
 * practice, despite the document), so the key has to be found by trial: try
 * each configured key and accept one only when the decrypted payload names the
 * me_id that key belongs to. A wrong key can occasionally survive CBC padding
 * by chance, so a successful decrypt on its own proves nothing.
 */
export async function resolveYagoutKeyByTrialDecrypt(
  encryptedTxnResponse: string,
): Promise<{ hospitalId: number; meId: string; encryptionKey: string; txnPlain: string } | null> {
  const hospitals = await prisma.hospital.findMany({
    where: { yagoutMeId: { not: null }, yagoutEncryptionKey: { not: null } },
    select: { id: true, yagoutMeId: true, yagoutEncryptionKey: true },
  });

  for (const hospital of hospitals) {
    const meId = hospital.yagoutMeId?.trim();
    if (!meId || !hospital.yagoutEncryptionKey) continue;
    let encryptionKey: string;
    let txnPlain: string;
    try {
      encryptionKey = decryptHospitalSecret(hospital.yagoutEncryptionKey);
      txnPlain = decryptYagout(encryptedTxnResponse, encryptionKey);
    } catch {
      continue;
    }
    if (parseTxnResponse(txnPlain).meId.trim() === meId) {
      return { hospitalId: hospital.id, meId, encryptionKey, txnPlain };
    }
  }

  return null;
}

/**
 * Yagout restricts return URLs to letters, digits, "/" and "_", so they cannot
 * carry a query string. Both outcomes post to fixed paths and are correlated by
 * the order_no inside the response instead.
 */
export function yagoutReturnUrls(baseUrl: string): { successUrl: string; failureUrl: string } {
  const root = baseUrl.replace(/\/$/, '');
  return {
    successUrl: `${root}/api/payments/yagout/return/success`,
    failureUrl: `${root}/api/payments/yagout/return/failure`,
  };
}
