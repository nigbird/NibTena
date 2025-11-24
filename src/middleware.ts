
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

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
          if (pathname === '/' || pathname.startsWith('/user')) return true;
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

        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
