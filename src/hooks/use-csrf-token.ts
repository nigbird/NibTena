'use client';

import { useEffect, useState } from 'react';
import { COOKIE_NAME } from '@/lib/csrf-common';

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return undefined;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    setCsrfToken(getCookie(COOKIE_NAME) || '');
  }, []);

  return csrfToken;
}
