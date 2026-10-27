/**
 * Which YagoutPay hosts the browser may be sent to.
 *
 * Kept free of Node APIs because the middleware (Edge runtime) imports it to
 * build the CSP form-action list, and the settings action uses the same rules
 * to validate a hospital's Post URL override. The two must agree: a host the
 * settings accept but the CSP omits would save fine and then silently block
 * every hand-off form for that hospital.
 */

export const DEFAULT_YAGOUT_POST_URL =
  'https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage';

export function defaultYagoutPostUrl(): string {
  return process.env.YAGOUTPAY_POST_URL?.trim() || DEFAULT_YAGOUT_POST_URL;
}

/** Hostnames (lower-case) a post URL may target: the default's host plus YAGOUTPAY_ALLOWED_HOSTS. */
export function yagoutAllowedHosts(): string[] {
  const hosts = new Set<string>();
  try {
    hosts.add(new URL(defaultYagoutPostUrl()).hostname.toLowerCase());
  } catch {
    // A malformed YAGOUTPAY_POST_URL contributes nothing; resolve-time checks reject it.
  }
  for (const raw of (process.env.YAGOUTPAY_ALLOWED_HOSTS || '').split(',')) {
    const host = raw.trim().toLowerCase();
    if (host) hosts.add(host);
  }
  return Array.from(hosts);
}

export function isAllowedYagoutPostUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  return yagoutAllowedHosts().includes(url.hostname.toLowerCase());
}

/** Explicit https origins for the CSP form-action directive. Never a wildcard. */
export function yagoutFormActionOrigins(): string[] {
  return yagoutAllowedHosts()
    .filter(host => /^[a-z0-9.-]+$/.test(host))
    .map(host => `https://${host}`);
}
