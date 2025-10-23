// src/app/portal/connect/page.tsx
import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Calls the Super App’s validation endpoint to verify the token
 * and return the user's phone number.
 */
async function validateSuperAppToken(authHeader: string) {
  const VALIDATE_TOKEN_URL = process.env.VALIDATE_TOKEN_URL;

  if (!VALIDATE_TOKEN_URL) {
    throw new Error('VALIDATE_TOKEN_URL is not configured in the environment.');
  }

  console.log('🟡 [validateSuperAppToken] Starting validation...');
  console.log('🔹 Validation URL:', VALIDATE_TOKEN_URL);
  console.log('🔹 Authorization Header being sent:', authHeader);

  try {
    const externalResponse = await fetch(VALIDATE_TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    console.log('🟢 [validateSuperAppToken] Response status:', externalResponse.status);

    const raw = await externalResponse.text();
    console.log('🟢 [validateSuperAppToken] Raw response body:', raw);

    if (!externalResponse.ok) {
      throw new Error(
        `Token validation failed: ${externalResponse.status} - ${raw}`,
      );
    }

    // Parse JSON safely
    const responseData = JSON.parse(raw);
    const phoneNumber = responseData.phone;

    if (!phoneNumber) {
      throw new Error('Phone number not found in validation response.');
    }

    console.log('✅ [validateSuperAppToken] Validation successful for phone:', phoneNumber);
    return phoneNumber;

  } catch (error) {
    console.error('❌ [validateSuperAppToken] Error:', error);
    if (error instanceof Error) {
      throw new Error(`Could not connect to validation service: ${error.message}`);
    }
    throw new Error('An unknown error occurred during token validation.');
  }
}

/**
 * This page runs during the first initialization of the Mini App.
 * It reads the Authorization header, validates it, and stores the
 * user's phone number securely in a cookie.
 */
export default async function ConnectPage() {
  console.log('🚀 [ConnectPage] Mini App initialization started...');

  const headerList = headers();
  // Try both uppercase and lowercase forms for robustness
  const authHeader =
    headerList.get('Authorization') || headerList.get('authorization');

  console.log('🔍 [ConnectPage] Incoming request headers:');
  for (const [key, value] of headerList.entries()) {
    console.log(`   ${key}: ${value}`);
  }

  let status: 'success' | 'error' = 'error';
  let message = '';
  let data: { token?: string; phoneNumber?: string } = {};

  if (!authHeader) {
    message = 'Authorization header is missing from the request.';
    console.error('❌ [ConnectPage] No Authorization header found!');
  } else if (!authHeader.startsWith('Bearer ')) {
    message = 'Authorization header is malformed. It must start with Bearer.';
    console.error('❌ [ConnectPage] Malformed Authorization header:', authHeader);
  } else {
    const token = authHeader.substring(7);
    data.token = token;
    console.log('🟡 [ConnectPage] Extracted Bearer token:', token);

    try {
      const phoneNumber = await validateSuperAppToken(authHeader);
      data.phoneNumber = phoneNumber;

      const cookieStore = cookies();
      cookieStore.set('super-app-user-phone', phoneNumber, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      status = 'success';
      message = 'Successfully authenticated via Super App.';
      console.log('✅ [ConnectPage] Cookie set successfully. Redirecting...');
      redirect('/user');
    } catch (error) {
      if (error instanceof Error) {
        message = error.message;
        console.error('❌ [ConnectPage] Error:', error.message);
      } else {
        message = 'An unknown error occurred.';
        console.error('❌ [ConnectPage] Unknown error:', error);
      }
    }
  }

  console.log('🧾 [ConnectPage] Final status:', status, '| message:', message);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="max-w-md rounded-lg bg-background p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Connecting to Super App...</h1>
        {status === 'success' ? (
          <div className="text-green-600">
            <p className="font-semibold">Connection Successful!</p>
            <p>{message}</p>
            <p className="mt-2 text-sm">Phone: {data.phoneNumber}</p>
          </div>
        ) : (
          <div className="text-destructive">
            <p className="font-semibold">Connection Failed</p>
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
