
import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const headerList = await headers();
    console.log('Connect route - incoming headers:', Object.fromEntries(headerList.entries()));
    const authHeader = headerList.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authorization header is missing from the request.',
        },
        { status: 401 }
      );
    }

    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Authorization header is malformed. It must start with "Bearer ".',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(bearerPrefix.length);

    console.log('Connect route - extracted token length:', token ? token.length : 0);

    if (!token) {
        return NextResponse.json(
        {
          status: 'error',
          message: 'Bearer token is missing.',
        },
        { status: 401 }
      );
    }
    
    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
      console.error('VALIDATE_TOKEN_URL environment variable is not set.');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Server configuration error.',
        },
        { status: 500 }
      );
    }
    
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
                message: `Token validation failed: ${externalResponse.statusText}`,
                details: errorText,
            },
            { status: externalResponse.status }
        );
    }
    
    const validationText = await externalResponse.text();
    console.log('Connect route - token validation raw response:', validationText);
    let validationResult = null;
    try {
      validationResult = JSON.parse(validationText);
    } catch (e) {
      console.warn('Connect route - could not parse validation response as JSON', e);
    }
    const phoneNumber = validationResult?.phone || validationResult?.phoneNumber || validationResult?.phone_number || null;
    console.log('Connect route - derived phoneNumber from validation:', phoneNumber);

    // On successful validation, create an encoded session cookie and redirect.
    const sessionData = {
        isAuthenticated: true,
        phoneNumber: phoneNumber,
        authToken: token,
    };
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const cookieStore = await cookies();
    // Mask token for logs
    const maskToken = (t: string) => (t.length <= 8 ? '****' : `${t.slice(0,4)}...${t.slice(-4)}`);
    console.log('Connect route - setting miniapp_session cookie (base64 length):', encodedSession.length, 'httpOnly:', true, 'secure:', process.env.NODE_ENV === 'production');
    cookieStore.set('miniapp_session', encodedSession, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const url = new URL(request.url);
    const redirectUrl = `${url.protocol}//${url.host}/`;
    console.log('Connect route - redirecting to', redirectUrl);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error processing connect request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'An unexpected server error occurred.',
      },
      { status: 500 }
    );
  }
}
