export type PasswordCheckResult = { valid: boolean; errors: string[] };

// Small list of common weak passwords. Extend as needed or load from a file/DB.
const commonPasswords = new Set([
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'abc123', '111111', '123123', 'password1',
  '1234', 'iloveyou', 'admin', 'welcome', 'monkey', 'letmein', 'dragon', 'baseball', 'football', 'master'
]);

export function validatePassword(pw: string): PasswordCheckResult {
  const errors: string[] = [];
  if (!pw || typeof pw !== 'string') {
    errors.push('Password must be a string.');
    return { valid: false, errors };
  }

  // Policy: minimum 8 characters
  if (pw.length < 8) errors.push('Password must be at least 8 characters long.');
  // At least one lowercase
  if (!/[a-z]/.test(pw)) errors.push('Password must include a lowercase letter.');
  // At least one uppercase
  if (!/[A-Z]/.test(pw)) errors.push('Password must include an uppercase letter.');
  // At least one digit
  if (!/[0-9]/.test(pw)) errors.push('Password must include a number.');
  // At least one special character
  if (!/[!@#$%^&*()\[\]{}\-_=+<>?/~`|\\,.;:]/.test(pw)) errors.push('Password must include a special character.');
  // Common password check (case-insensitive)
  if (commonPasswords.has(pw.toLowerCase())) errors.push('Password is too common. Choose a less predictable password.');

  return { valid: errors.length === 0, errors };
}

export function ensurePassword(pw: string) {
  const res = validatePassword(pw);
  if (!res.valid) {
    throw new Error(res.errors.join(' '));
  }
}

// --- Pwned password check using HaveIBeenPwned k-anonymity API ---
import crypto from 'crypto';

async function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').toUpperCase();
}

async function getPwnedCount(password: string): Promise<number> {
  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { cache: 'no-store' });
    if (!res.ok) return 0;
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [hs, countStr] = line.split(':');
      if (!hs) continue;
      if (hs.trim() === suffix) {
        const cnt = Number(countStr || '0');
        return isNaN(cnt) ? 0 : cnt;
      }
    }
    return 0;
  } catch (e) {
    console.error('[password-policy] pwned check failed', e);
    return 0;
  }
}

export async function validatePasswordAsync(pw: string): Promise<PasswordCheckResult> {
  const base = validatePassword(pw);
  if (!base.valid) return base;

  // Check if password appears in known breaches
  const count = await getPwnedCount(pw);
  if (count > 0) {
    base.errors.push( `For your security, this password isn’t safe to use. Please choose a different one.`);
  }
  return { valid: base.errors.length === 0, errors: base.errors };
}
