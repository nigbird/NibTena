import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '../auth';

export default auth((req: NextRequest) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
    style-src-attr 'unsafe-inline';
    img-src 'self' data: blob: https://placehold.co https://images.unsplash.com https://picsum.photos https://hakimethio.org https://ethioistanbulgeneralhospital.com http://old.ethioistanbulgeneralhospital.com https://img.semafor.com https://media.istockphoto.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' http://nib-pre-production.nibbank.com.et:8086 ${process.env.NEXT_PUBLIC_VALIDATE_TOKEN_URL ?? ''};
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Pass the original Authorization header to the server components
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
      requestHeaders.set('Authorization', authHeader);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set the CSP header on the response
  response.headers.set('Content-Security-Policy', cspHeader);

  // Persist Super App detection in a cookie if any signal is present
  const url = new URL(req.url);
  const superAppSignal =
    !!authHeader ||
    !!req.headers.get('x-super-app') ||
    url.searchParams.get('superApp') === '1';

  if (superAppSignal) {
    // session cookie; mark secure if the request is https
    const isSecure = url.protocol === 'https:';
    response.cookies.set('superapp', '1', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: isSecure,
    });
  }

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
