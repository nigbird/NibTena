
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { routePermissions } from './route-permissions';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (!token) return;

    const pathname = req.nextUrl.pathname;
    const mustChangePassword = token.mustChangePassword === true;
    const role = token.role as string | undefined;

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

    // If a hospital-scoped (non-admin) user visits the dashboard root but
    // doesn't have the Dashboard permission, redirect them to the first
    // sidebar page they do have access to. This avoids sending them back
    // to the auth redirect page when they are properly signed-in but lack
    // dashboard privileges.
    if (token && token.role === 'hospital' && token.isAdmin !== true) {
      if (pathname === '/hospital-admin' || pathname === '/hospital-admin/') {
        const permKeys: string[] = (token as any)?.permissionKeys || [];
        const allowedPrefixes = new Set<string>();
        for (const rp of routePermissions) {
          if (permKeys.includes(rp.permission)) allowedPrefixes.add(rp.prefix);
        }

        // Preferred sidebar order — the first matching prefix will be used
        // as the redirect target when the dashboard is not permitted.
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
        if (target) {
          const url = req.nextUrl.clone();
          url.pathname = target;
          return NextResponse.redirect(url);
        }

        // No allowed prefixes found — fall back to profile page so the
        // user remains inside the hospital-admin area and can see their
        // account info (avoids redirecting to sign-in).
        const fallback = req.nextUrl.clone();
        fallback.pathname = '/hospital-admin/profile';
        return NextResponse.redirect(fallback);
      }
    }
  },
  {
    // Use a single sign-in redirect page so we can route users to the
    // appropriate custom login page instead of NextAuth's default UI.
    pages: {
      signIn: '/auth/redirect',
    },
    callbacks: {
      // Return a boolean only. Actual redirect logic is handled by
      // the `/auth/redirect` page which NextAuth will send users to.
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

        const isAnyLogin = isSuperAdminLogin || isHospitalAdminLogin || isDoctorPortalLogin || isAuthRedirectPage;

        if (!isLoggedIn) {
          // allow access to public pages and to the login pages themselves
          if (isAnyLogin) return true;
          // allow homepage, user area, and password reset flows
          if (pathname === '/' || pathname.startsWith('/user')) return true;
          if (pathname === '/forgot-password' || pathname.startsWith('/reset-password')) return true;
          // return false -> NextAuth will redirect to `pages.signIn` (/auth/redirect)
          return false;
        }

        if (isAnyLogin) return true;

        // Always allow the hospital-admin change-password page so users
        // forced to change their temporary password don't get redirected
        // in a loop by the authorized() checks.
        if (pathname.startsWith('/hospital-admin/change-password')) return true;

        // if logged in but role doesn't match required, return false so
        // the user is sent to the sign-in redirect where we can route them
        // to the appropriate login page.
        if (isSuperAdminRoute && token?.role !== 'superadmin') return false;
        if (isHospitalAdminRoute && token?.role !== 'hospital') return false;
        if (isDoctorPortalRoute && token?.role !== 'doctor') return false;

        // Permission-based route protection for hospital staff (server-side)
        // Tokens already include `permissionKeys` and `isAdmin` via our NextAuth JWT callback.
        if (isHospitalAdminRoute && token?.role === 'hospital' && token?.isAdmin !== true) {
          // Always allow the hospital-admin profile change pages (so users forced to update don't get stuck)
          if (pathname.startsWith('/hospital-admin/profile')) return true;

          const permKeys: string[] = (token as any)?.permissionKeys || [];

          // Build allowed prefixes from the mapping file
          const allowedPrefixes = new Set<string>();
          for (const rp of routePermissions) {
            if (permKeys.includes(rp.permission)) allowedPrefixes.add(rp.prefix);
          }

          // If user has no allowed prefixes, deny access to other hospital-admin pages
          if (allowedPrefixes.size === 0) {
            // Deny: return false -> NextAuth will route to sign-in redirect
            return false;
          }

          const isPathAllowed = Array.from(allowedPrefixes).some(p => pathname.startsWith(p));
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
