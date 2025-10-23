import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const token = authHeader.substring('Bearer '.length);
    const validationUrl = process.env.VALIDATE_TOKEN_URL;

    if (!validationUrl) {
      console.error('VALIDATE_TOKEN_URL not set.');
      return NextResponse.json(
        { status: 'error', message: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Validate token with NIB backend
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json(
        {
          status: 'error',
          message: `Token validation failed (${externalResponse.status})`,
          details: errorText,
        },
        { status: externalResponse.status }
      );
    }

    const validationResult = await externalResponse.json();
    const phoneNumber = validationResult.phone || null;

    // Create encoded session cookie
    const sessionData = {
      isAuthenticated: true,
      phoneNumber,
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

    // Redirect to home after session is ready
    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in token validation route:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
