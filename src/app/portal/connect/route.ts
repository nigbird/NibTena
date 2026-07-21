
import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Mask a sensitive token/string for logs, keeping only a few chars at each end.
const maskSecret = (t: string) => (!t || t.length <= 8 ? '****' : `${t.slice(0, 4)}...${t.slice(-4)}`);

export async function GET(request: Request) {
  try {
    const headerList = await headers();
    const safeHeaders = Object.fromEntries(
      Array.from(headerList.entries()).map(([key, value]) => {
        const lower = key.toLowerCase();
        if (lower === 'authorization' || lower === 'cookie') {
          return [key, maskSecret(value)];
        }
        return [key, value];
      })
    );
    console.log('Connect route - incoming headers:', safeHeaders);
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

    console.log('Connect route - extracted token:', token ? maskSecret(token) : 'none', 'length:', token ? token.length : 0);

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
    let validationResult = null;
    try {
      validationResult = JSON.parse(validationText);
    } catch (e) {
      console.warn('Connect route - could not parse validation response as JSON', e);
    }
    const phoneNumber = validationResult?.phone || validationResult?.phoneNumber || validationResult?.phone_number || null;
    console.log('Connect route - validation succeeded, phoneNumber present:', !!phoneNumber);

    // On successful validation, create an encoded session cookie and redirect.
    const sessionData = {
        isAuthenticated: true,
        phoneNumber: phoneNumber,
        authToken: token,
    };
    
    // Use JWT signing instead of base64 encoding to prevent tampering
    // const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    let encodedSession = '';
    try {
        const { createMiniAppSessionCookieValue } = await import('@/lib/session');
        encodedSession = createMiniAppSessionCookieValue(sessionData);
    } catch (e) {
        console.error('Connect route - failed to sign session cookie:', e);
         return NextResponse.json(
            {
                status: 'error',
                message: 'Internal server error during session creation.',
            },
            { status: 500 }
        );
    }

    const cookieStore = await cookies();
    // Use SameSite=None for embedded/cross-site contexts (Super App WebView).
    // Note: cookies with SameSite=None must also be Secure in browsers.
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions: any = {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
    console.log('Connect route - setting miniapp_session cookie (base64 length):', encodedSession.length, 'options:', { httpOnly: true, secure: cookieOptions.secure, sameSite: cookieOptions.sameSite, maxAge: cookieOptions.maxAge });
    cookieStore.set('miniapp_session', encodedSession, cookieOptions);

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
