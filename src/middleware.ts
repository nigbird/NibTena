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

  const url = new URL(req.url);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const authHeader = req.headers.get('Authorization');
  if (authHeader) requestHeaders.set('Authorization', authHeader);

  const existing = req.cookies.get('superapp')?.value;
  const superAppQuery = url.searchParams.get('superApp');
  const xSuperApp = req.headers.get('x-super-app') || req.headers.get('x-superapp');

  // Allow clearing manually
  if (superAppQuery === '0') {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set('superapp', '0', { path: '/', maxAge: 0 });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Detect if running inside Super App
  const superAppSignal =
    !!authHeader ||
    !!xSuperApp ||
    superAppQuery === '1';

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);

  const isSecure = url.protocol === 'https:';

  // ✅ Always set the cookie — "1" for super app, "0" for browser
  response.cookies.set('superapp', superAppSignal ? '1' : '0', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: isSecure,
  });

  // ✅ Make it visible in this same request (for server components)
  requestHeaders.set('x-super-app', superAppSignal ? '1' : '0');

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
