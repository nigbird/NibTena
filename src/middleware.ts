
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

        const isAnyLogin = isSuperAdminLogin || isHospitalAdminLogin || isDoctorPortalLogin;

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

        // if logged in but role doesn't match required, return false so
        // the user is sent to the sign-in redirect where we can route them
        // to the appropriate login page.
        if (isSuperAdminRoute && token?.role !== 'superadmin') return false;
        if (isHospitalAdminRoute && token?.role !== 'hospital') return false;
        if (isDoctorPortalRoute && token?.role !== 'doctor') return false;

        // Permission-based route protection for hospital staff (server-side)
        // Tokens already include `permissionKeys` and `isAdmin` via our NextAuth JWT callback.
        if (isHospitalAdminRoute && token?.role === 'hospital' && token?.isAdmin !== true) {
          // Always allow the dashboard and profile change pages
          if (pathname === '/hospital-admin' || pathname === '/hospital-admin/' || pathname.startsWith('/hospital-admin/profile')) return true;

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
