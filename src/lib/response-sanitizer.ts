// Reusable response sanitizer - removes sensitive keys from objects before sending to clients
const DEFAULT_SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'smtpPass',
  'imapPass',
  'token',
  'authToken',
  'accessToken',
  'refreshToken',
  'secret',
  'resetToken',
  'verificationToken',
]);

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Buffer);
}

export function sanitize(obj: any, extraKeys: string[] = []): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (obj instanceof Date) return obj;
  const sensitive = new Set([...DEFAULT_SENSITIVE_KEYS, ...extraKeys]);

  if (Array.isArray(obj)) {
    return obj.map(i => sanitize(i, extraKeys));
  }

  if (isPlainObject(obj)) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (sensitive.has(k)) continue;
      out[k] = sanitize(v, extraKeys);
    }
    return out;
  }

  // Fallback - return as-is for other types
  return obj;
}

export default sanitize;
