'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Respect session refresh interval to keep tokens fresh within maxAge
  return <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>{children}</SessionProvider>;
}
