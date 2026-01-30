import crypto from 'crypto';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from './csrf-common';

export function createCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export async function getCookieToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value;
  } catch (err) {
    return undefined;
  }
}

export async function verifyCsrfToken(formToken?: string | null) {
  const cookieToken = await getCookieToken();
  if (!cookieToken || !formToken) return false;
  const a = Buffer.from(String(cookieToken));
  const b = Buffer.from(String(formToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Validates the Origin and/or Referer headers to protect against CSRF.
 * This is a defense-in-depth measure for API routes.
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // If no Host header, we can't verify (should not happen in valid HTTP/1.1+)
  if (!host) return false;

  // Check Origin if present (Browsers send this for POST/PUT/DELETE/PATCH)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch (e) {
      return false;
    }
  }

  // Fallback to Referer if Origin is missing (some older browsers or same-site navigation)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch (e) {
      return false;
    }
  }

  // If neither is present, it might be a direct tool call or non-browser.
  // For strict security on browser-facing APIs, we should reject.
  // However, blocking might break server-to-server calls if they don't set headers.
  // Given this is for mitigating CSRF (browser-based), absence of both usually means
  // it's not a standard browser form submission (which sends at least one).
  // But strictly, we should require at least one for state-changing methods.
  return false;
}

export { COOKIE_NAME };
