
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function validateSuperAppToken(authHeader: string) {
  const VALIDATE_TOKEN_URL = process.env.VALIDATE_TOKEN_URL;
  if (!VALIDATE_TOKEN_URL) {
    throw new Error('VALIDATE_TOKEN_URL is not configured in the environment.');
  }

  try {
    const externalResponse = await fetch(VALIDATE_TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
      throw new Error(`Token validation failed with status: ${externalResponse.status}`);
    }

    const responseData = await externalResponse.json();
    const phoneNumber = responseData.phone;

    if (!phoneNumber) {
      throw new Error('Phone number not found in validation response.');
    }

    return phoneNumber;
  } catch (error) {
    console.error('Error validating Super App token:', error);
    if (error instanceof Error) {
        throw new Error(`Could not connect to validation service: ${error.message}`);
    }
    throw new Error('An unknown error occurred during token validation.');
  }
}

export default async function ConnectPage() {
  const headerList = headers();
  const authHeader = headerList.get('Authorization');
  let status: 'success' | 'error' = 'error';
  let message: string = '';
  let data: { token?: string; phoneNumber?: string } = {};

  if (!authHeader) {
    message = 'Authorization header is missing from the request.';
  } else if (!authHeader.startsWith('Bearer ')) {
    message = 'Authorization header is malformed. It must start with Bearer.';
  } else {
    const token = authHeader.substring(7);
    data.token = token;

    try {
      const phoneNumber = await validateSuperAppToken(authHeader);
      data.phoneNumber = phoneNumber;

      // Set phone number in a secure, http-only cookie
      cookies().set('super-app-user-phone', phoneNumber, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      status = 'success';
      message = 'Successfully authenticated via Super App and session cookie has been set.';
      
      // Redirect to the main user page after successful connection
      redirect('/user');

    } catch (error) {
      if (error instanceof Error) {
          message = error.message;
      } else {
          message = 'An unknown error occurred.';
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="max-w-md rounded-lg bg-background p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">
          Connecting to Super App...
        </h1>
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
