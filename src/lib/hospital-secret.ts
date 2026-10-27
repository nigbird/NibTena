import crypto from 'crypto';

/**
 * At-rest encryption for per-hospital secrets (currently the YagoutPay key).
 * Ported from payget's merchant-secret.ts: AES-256-GCM, random 12-byte IV per
 * value, stored as `enc:v1:<iv>:<ciphertext>:<tag>` (base64url parts).
 *
 * The master key is HOSPITAL_SECRET_KEY: base64 that decodes to 32 bytes.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const PREFIX = 'enc:v1';

function getMasterKey(): Buffer {
  const keyBase64 = process.env.HOSPITAL_SECRET_KEY;
  if (!keyBase64) {
    throw new Error('HOSPITAL_SECRET_KEY is not configured');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('HOSPITAL_SECRET_KEY must be 32 bytes (base64 encoded)');
  }
  return key;
}

export function isEncryptedHospitalSecret(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

export function encryptHospitalSecret(plaintext: string): string {
  if (!plaintext) throw new Error('Secret is required');
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64url')}:${ciphertext.toString('base64url')}:${tag.toString('base64url')}`;
}

// Unlike payget, a value without the prefix is rejected rather than treated as
// legacy plaintext: NibTena has never stored these unencrypted, so an
// unprefixed value can only be a mistake or tampering.
export function decryptHospitalSecret(storedValue: string): string {
  if (!isEncryptedHospitalSecret(storedValue)) {
    throw new Error('Hospital secret is not in the expected encrypted format');
  }
  const parts = storedValue.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted hospital secret format');
  }
  const [, version, ivB64, cipherB64, tagB64] = parts;
  if (version !== 'v1') throw new Error('Unsupported hospital secret version');

  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  if (iv.length !== 12) throw new Error('Invalid IV length: must be 12 bytes');
  if (tag.length !== 16) throw new Error('Invalid authentication tag length: must be 16 bytes');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64url')), decipher.final()]);
  const text = plain.toString('utf8');
  plain.fill(0);
  return text;
}
