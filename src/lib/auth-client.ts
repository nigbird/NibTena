"use client";
import { signOut } from 'next-auth/react';

export async function revokeThenSignOut(options?: any) {
  try {
    await fetch('/api/auth/revoke', { method: 'POST', credentials: 'include' });
  } catch (e) {
    // ignore errors; proceed to sign out client-side
    console.error('[auth-client] revoke call failed', e);
  }

  return signOut(options);
}

export default revokeThenSignOut;
