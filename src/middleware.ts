import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { routePermissions } from './route-permissions';
import { COOKIE_NAME } from './lib/csrf-common';
import { validateTokenStructure } from '@/lib/token-validation';

function buildCsp(nonce: string) {
  
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; img-src 'self' data: blob: https://placehold.co https://images.unsplash.com https://picsum.photos https://hakimethio.org https://ethioistanbulgeneralhospital.com http://old.ethioistanbulgeneralhospital.com https://img.semafor.com https://media.istockphoto.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://nominatim.openstreetmap.org; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`;
}

export default withAuth(
  function middleware(req) {
    let token = req.nextauth.token;
    
    // Validate token structure - Fail-safe: treat invalid tokens as unauthenticated
    if (token && !validateTokenStructure(token)) {
      console.warn('[middleware] Invalid token structure, treating as unauthenticated');
      token = null;
    }

    // Generate a per-request CSP nonce and attach it to the request headers
    // so server components (e.g. layout) can consume it and render nonce'd inline
    // scripts/styles. We also apply the CSP on the response below.
    const webCrypto: any = (globalThis as any).crypto;
    function randomBase64(bytesLen: number) {
      const arr = webCrypto.getRandomValues(new Uint8Array(bytesLen));
      let binary = '';
      for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
      // btoa should be available in the Edge runtime; fallback to Buffer when available
      if (typeof btoa === 'function') return btoa(binary);
      // @ts-ignore - Buffer may not be available in Edge, but Node runtime will use this
      return Buffer.from(arr).toString('base64');
    }

    function randomHex(bytesLen: number) {
      const arr = webCrypto.getRandomValues(new Uint8Array(bytesLen));
      return Array.from(arr).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    }

    const nonce = randomBase64(16);
    const forwarded = new Headers(req.headers);
    forwarded.set('x-nonce', nonce);

    // Ensure a double-submit CSRF cookie is present for forms.
    // We create a non-HttpOnly cookie so client-side form components can read it and include
    // it in form submissions. This is a defense-in-depth double-submit token.
    let responseToReturn;
    try {
      const existing = req.cookies.get(COOKIE_NAME);
      if (!existing) {
        const t = randomHex(24);
        const res = NextResponse.next({ request: { headers: forwarded } });
        // set the double-submit CSRF cookie (non-HttpOnly so client can read it)
        res.cookies.set(COOKIE_NAME, t, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        });
        responseToReturn = res;
      }
    } catch (e) {
      // If cookie APIs are unavailable, continue without failing the request.
    }

    // If we have no auth token and no special response to return, continue but
    // ensure the request forwarded header contains the nonce so the downstream
    // render can use it. If we already built a response, return it (we'll add
    // CSP headers before returning).
    if (!token && !responseToReturn) {
      // continue with forwarded headers
    }
    if (!token && responseToReturn) {
      // attach CSP header and x-nonce header on the response and return
        const csp = buildCsp(nonce);
      responseToReturn.headers.set('Content-Security-Policy', csp);
      responseToReturn.headers.set('x-nonce', nonce);
      responseToReturn.headers.set('Referrer-Policy', 'same-origin');
      return responseToReturn;
    }

    // Use forwarded headers for downstream rendering
    // Note: when returning NextResponse.next below, we pass `request: { headers: forwarded }`.
    const pathname = req.nextUrl.pathname;

    /* ===============================
       MINI-APP ONLY ACCESS FOR USER PORTAL
    =============================== */
    if (pathname.startsWith('/user') || pathname.startsWith('/confirmation')) {
      const miniappSession = req.cookies.get('miniapp_session');
      if (!miniappSession) {
        // Redirect non-miniapp users from outside pages to /user to show the restriction message
        if (pathname.startsWith('/confirmation') && req.method === 'GET') {
          const url = req.nextUrl.clone();
          url.pathname = '/user';
          return NextResponse.redirect(url);
        }

        // If it's a direct page access, we let it through so the layout can show the beautiful message.
        // BUT if it's a POST request (Server Action), we block it.
        if (req.method === 'POST') {
          return new NextResponse(
            JSON.stringify({ error: 'This portal is only accessible via the Mini App.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const mustChangePassword = token?.mustChangePassword === true;
    const role = token?.role as string | undefined;

    /* ===============================
       CROSS-PORTAL PROTECTION
    =============================== */
    if (role) {
      const portalRedirects: Record<string, string> = {
        superadmin: '/super-admin',
        hospital: '/hospital-admin',
        doctor: '/doctor-portal',
      };

      const isSuperAdminRoute = pathname.startsWith('/super-admin');
      const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
      const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');

      // If user has a role, but is trying to access another portal, redirect to their own dashboard
      if (
        (isSuperAdminRoute && role !== 'superadmin') ||
        (isHospitalAdminRoute && role !== 'hospital') ||
        (isDoctorPortalRoute && role !== 'doctor')
      ) {
        // Exclude login routes so users can still log out and switch accounts if they want
        const isLoginRoute = pathname.endsWith('/login');
        if (!isLoginRoute && !pathname.startsWith('/api/')) {
            const url = req.nextUrl.clone();
            url.pathname = portalRedirects[role] || '/user';
            const redirectRes = NextResponse.redirect(url);
            // attach CSP and nonce to redirects
            const cspLocal = buildCsp(nonce);
            redirectRes.headers.set('Content-Security-Policy', cspLocal);
            redirectRes.headers.set('x-nonce', nonce);
            redirectRes.headers.set('Referrer-Policy', 'same-origin');
            return redirectRes;
        }
      }
    }

    /* ===============================
       FORCE PASSWORD CHANGE
    =============================== */
    if (mustChangePassword) {
      const forcedRoutes: Record<string, string> = {
        hospital: '/hospital-admin/change-password',
        doctor: '/doctor-portal/change-password',
        superadmin: '/super-admin/change-password',
      };

      // If role is missing or not recognized, fall back to a generic change-password page.
      // This ensures forced password change cannot be bypassed by a missing/ malformed role.
      const targetPath = (role && forcedRoutes[role]) ? forcedRoutes[role] : '/change-password';
      if (!pathname.startsWith(targetPath) && !pathname.startsWith('/api/')) {
        const url = req.nextUrl.clone();
        url.pathname = targetPath;
        url.searchParams.set('from', pathname);
        const redirectRes = NextResponse.redirect(url);
        // attach CSP and nonce to redirects too
          const csp = buildCsp(nonce);
        redirectRes.headers.set('Content-Security-Policy', csp);
        redirectRes.headers.set('x-nonce', nonce);
        redirectRes.headers.set('Referrer-Policy', 'same-origin');
        return redirectRes;
      }
    }

    /* ===============================
       HOSPITAL STAFF LANDING
    =============================== */
    // Super Admin maker/checker route gating
    if (token?.role === 'superadmin') {
      const saRole = (token as any)?.superAdminRole as 'maker' | 'checker' | 'both' | undefined;
      const bothOnlyPrefixes = ['/super-admin/create-super-admin', '/super-admin/email', '/super-admin/reports'];
      const checkerOnlyPrefixes = ['/super-admin/hospital-approvals'];

      if (saRole !== 'both' && bothOnlyPrefixes.some(p => pathname.startsWith(p))) {
        const url = req.nextUrl.clone();
        url.pathname = '/super-admin';
        const redirectRes = NextResponse.redirect(url);
        const cspLocal = buildCsp(nonce);
        redirectRes.headers.set('Content-Security-Policy', cspLocal);
        redirectRes.headers.set('x-nonce', nonce);
        redirectRes.headers.set('Referrer-Policy', 'same-origin');
        return redirectRes;
      }
      if (!(saRole === 'checker' || saRole === 'both') && checkerOnlyPrefixes.some(p => pathname.startsWith(p))) {
        const url = req.nextUrl.clone();
        url.pathname = '/super-admin';
        const redirectRes = NextResponse.redirect(url);
        const cspLocal = buildCsp(nonce);
        redirectRes.headers.set('Content-Security-Policy', cspLocal);
        redirectRes.headers.set('x-nonce', nonce);
        redirectRes.headers.set('Referrer-Policy', 'same-origin');
        return redirectRes;
      }
    }

    if (token?.role === 'hospital' && token?.isAdmin !== true) {
      if (pathname === '/hospital-admin' || pathname === '/hospital-admin/') {
        const permKeys: string[] = (token as any)?.permissionKeys || [];
        const allowedPrefixes = new Set<string>();

        for (const rp of routePermissions) {
          if (permKeys.includes(rp.permission)) {
            allowedPrefixes.add(rp.prefix);
          }
        }

        // ❌ REMOVED '/hospital-admin' FROM HERE
        const preferredOrder = [
          '/hospital-admin',
          '/hospital-admin/doctors',
          '/hospital-admin/appointments',
          '/hospital-admin/schedule',
          '/hospital-admin/queue',
          '/hospital-admin/reports',
          '/hospital-admin/roles',
          '/hospital-admin/settings',
        ];

        const target = preferredOrder.find(p => allowedPrefixes.has(p));

        const finalTarget = target ?? '/hospital-admin/profile';

        // ✅ SAFETY: do not redirect to the same path
        if (finalTarget !== pathname) {
          const url = req.nextUrl.clone();
          url.pathname = finalTarget;
          const redirectRes = NextResponse.redirect(url);
          const cspLocal = buildCsp(nonce);
          redirectRes.headers.set('Content-Security-Policy', cspLocal);
          redirectRes.headers.set('x-nonce', nonce);
          redirectRes.headers.set('Referrer-Policy', 'same-origin');
          return redirectRes;
        }
      }
    }
    // If we reach here and haven't returned a prepared response, ensure we
    // continue to the next handler with the forwarded headers (which include
    // the `x-nonce` value). We build a NextResponse.next with the forwarded
    // headers and attach the CSP header on that response so that all proxied
    // responses include the CSP.
      const csp = buildCsp(nonce);
    const nextRes = NextResponse.next({ request: { headers: forwarded } });
    nextRes.headers.set('Content-Security-Policy', csp);
    nextRes.headers.set('x-nonce', nonce);
    nextRes.headers.set('Referrer-Policy', 'same-origin');
    return nextRes;
  },
  {
    pages: {
      signIn: '/auth/redirect',
    },
    callbacks: {
      authorized({ token, req }) {
        const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;

        const isLoggedIn = !!token;

        const isSuperAdminRoute = pathname.startsWith('/super-admin');
        const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
        const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');

        const isSuperAdminLogin = pathname === '/super-admin/login';
        const isHospitalAdminLogin = pathname === '/hospital-admin/login';
        const isDoctorPortalLogin = pathname === '/doctor-portal/login';
        const isAuthRedirectPage = pathname === '/auth/redirect';

        // Allow Super App connect callback to be accessed without a session
        const isPortalConnect = pathname === '/portal/connect';

        const isAnyLogin =
          isSuperAdminLogin ||
          isHospitalAdminLogin ||
          isDoctorPortalLogin ||
          isAuthRedirectPage;

        if (!isLoggedIn) {
          if (isAnyLogin) return true;
          if (pathname === '/' || pathname.startsWith('/user')) return true;
          if (pathname === '/forgot-password' || pathname.startsWith('/reset-password')) return true;
          if (isPortalConnect) return true;
          return false;
        }

        if (isAnyLogin) return true;

        if (pathname.startsWith('/hospital-admin/change-password')) return true;

        if (isSuperAdminRoute && token?.role !== 'superadmin') return false;
        if (isHospitalAdminRoute && token?.role !== 'hospital') return false;
        if (isDoctorPortalRoute && token?.role !== 'doctor') return false;

        if (
          (pathname === '/hospital-admin' || pathname === '/hospital-admin/') &&
          token?.role === 'hospital'
        ) {
          return true;
        }

        if (isHospitalAdminRoute && token?.role === 'hospital' && token?.isAdmin !== true) {
          if (pathname.startsWith('/hospital-admin/profile')) return true;

          const permKeys: string[] = (token as any)?.permissionKeys || [];
          const allowedPrefixes = new Set<string>();

          for (const rp of routePermissions) {
            if (permKeys.includes(rp.permission)) {
              allowedPrefixes.add(rp.prefix);
            }
          }

          if (allowedPrefixes.size === 0) return false;

          const isPathAllowed = Array.from(allowedPrefixes).some(p =>
            pathname.startsWith(p)
          );

          if (!isPathAllowed) return false;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
