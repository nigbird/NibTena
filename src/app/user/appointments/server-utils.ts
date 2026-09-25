'use server';

import { hasValidMiniAppSession } from '@/lib/session';

export async function getMiniAppCookie(): Promise<boolean> {
  // Verify the signed session rather than trusting mere cookie presence.
  return hasValidMiniAppSession();
}
