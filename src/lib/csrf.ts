import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'csrfToken';

export function createCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function getCookieToken(): string | undefined {
  try {
    return cookies().get(COOKIE_NAME)?.value;
  } catch (err) {
    return undefined;
  }
}

export function verifyCsrfToken(formToken?: string | null) {
  const cookieToken = getCookieToken();
  if (!cookieToken || !formToken) return false;
  const a = Buffer.from(String(cookieToken));
  const b = Buffer.from(String(formToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { COOKIE_NAME };
