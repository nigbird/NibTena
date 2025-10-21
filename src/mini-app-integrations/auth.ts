
'use server';

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

type AuthResult = 
  | { status: 'success'; token: string }
  | { status: 'error'; message: string };

/**
 * Reads and validates the Authorization header from the super app.
 * @param headerList - The headers object from the incoming request.
 * @returns An object containing the status and either the token or an error message.
 */
export async function getSuperAppToken(
  headerList: ReadonlyHeaders
): Promise<AuthResult> {
  const authHeader = headerList.get('Authorization');

  if (!authHeader) {
    return {
      status: 'error',
      message: 'Authorization header is missing from the request.',
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      status: 'error',
      message:
        'Authorization header is malformed. It must start with "Bearer ".',
    };
  }

  const token = authHeader.substring(7);

  if (!token) {
    return {
      status: 'error',
      message: 'Bearer token is missing from the Authorization header.',
    };
  }

  return {
    status: 'success',
    token: token,
  };
}
