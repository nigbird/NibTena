import { NextResponse } from 'next/server';
import { auth } from '../auth';

export default auth((req) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://placehold.co https://images.unsplash.com https://picsum.photos https://hakimethio.org https://ethioistanbulgeneralhospital.com http://old.ethioistanbulgeneralhospital.com https://img.semafor.com https://media.istockphoto.com;
    connect-src 'self';
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
});


// The matcher should cover all routes you want to protect or handle.
// Note: It does not apply to /api/auth/** routes by default.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
