'use client';

import React from 'react';

function getCookie(name: string) {
  const v = `; ${document.cookie}`;
  const parts = v.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift();
  return undefined;
}

export default function CsrfField() {
  const token = typeof document !== 'undefined' ? getCookie('csrfToken') : undefined;
  return <input type="hidden" name="_csrf" value={token ?? ''} />;
}
