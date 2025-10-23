import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Super App entry endpoint.
 * Receives the Authorization header, validates it using
 * /api/mini-app/validate-token, sets session, and redirects user.
 */
export async function GET(request: Request) {
  try {
    const headerList = await headers();
    const authHeader = headerList.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid Authorization header format' },
        { status: 401 }
      );
    }

    // 🔹 Forward validation to internal proxy route
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${new URL(request.url).protocol}//${new URL(request.url).host}`;

    const validateUrl = `${baseUrl}/api/mini-app/validate-token`;

    const validationResponse = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    const validationData = await validationResponse.json();

    if (!validationResponse.ok || validationData.status !== 'success') {
      console.error('❌ Token validation failed:', validationData);
      return NextResponse.json(
        {
          status: 'error',
          message:
            validationData.message ||
            'Token validation failed via /api/mini-app/validate-token',
        },
        { status: validationResponse.status }
      );
    }

    // ✅ Token is valid — create secure session
    const token = authHeader.substring('Bearer '.length);
    const sessionData = {
      isAuthenticated: true,
      phoneNumber: validationData.phone,
      authToken: token,
    };

    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('miniapp_session', encodedSession, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // 🔁 Redirect user to home page after successful validation
    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('💥 Error in /api/connect:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
