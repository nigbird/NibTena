
'use server';

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const ivLength = 16;
const saltLength = 64;
const keyLength = 32;

// Ensure you have a strong, unique secret in your environment variables
const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error('SESSION_SECRET environment variable is not set. Please provide a strong secret.');
}

const scryptAsync = promisify(scrypt);

async function getKey(salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(secret!, salt, keyLength)) as Buffer;
}

export async function encryptSessionPayload(payload: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const key = await getKey(salt);
  const iv = randomBytes(ivLength);
  
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine salt, iv, authTag, and encrypted data into a single string
  return `${salt.toString('hex')}.${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted.toString('hex')}`;
}

export async function decryptSessionPayload(encryptedPayload: string): Promise<string | null> {
  try {
    const parts = encryptedPayload.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted payload format');
    }
    
    const [salt, iv, authTag, encrypted] = parts.map(part => Buffer.from(part, 'hex'));
    
    const key = await getKey(salt);
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}
