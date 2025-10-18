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
    connect-src 'self';
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

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set the CSP header on the response
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
