import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { routePermissions } from './route-permissions';
import crypto from 'crypto';
import { COOKIE_NAME } from './lib/csrf';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Ensure a double-submit CSRF cookie is present for forms.
    // We create a non-HttpOnly cookie so client-side form components can read it and include
    // it in form submissions. This is a defense-in-depth double-submit token.
    let responseToReturn;
    try {
      const existing = req.cookies.get(COOKIE_NAME);
      if (!existing) {
        const t = crypto.randomBytes(24).toString('hex');
        const res = NextResponse.next();
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

    if (!token && !responseToReturn) return;
    if (!token && responseToReturn) return responseToReturn;

    const pathname = req.nextUrl.pathname;
    const mustChangePassword = token.mustChangePassword === true;
    const role = token.role as string | undefined;

    /* ===============================
       FORCE PASSWORD CHANGE
    =============================== */
    if (mustChangePassword && role) {
      const forcedRoutes: Record<string, string> = {
        hospital: '/hospital-admin/change-password',
        doctor: '/doctor-portal/change-password',
      };

      const targetPath = forcedRoutes[role];
        if (targetPath && !pathname.startsWith(targetPath)) {
          const url = req.nextUrl.clone();
          url.pathname = targetPath;
          url.searchParams.set('from', pathname);
          return NextResponse.redirect(url);
        }
    }

    /* ===============================
       HOSPITAL STAFF LANDING
    =============================== */
    if (token.role === 'hospital' && token.isAdmin !== true) {
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
          return NextResponse.redirect(url);
        }
      }
    }
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
