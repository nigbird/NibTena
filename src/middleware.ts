
import { withAuth } from 'next-auth/middleware';

export default withAuth({
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

      const isAnyLogin = isSuperAdminLogin || isHospitalAdminLogin || isDoctorPortalLogin;

      if (!isLoggedIn) {
        if (isAnyLogin) return true;
        // Allow public pages like `/user` or root
        if (pathname === '/' || pathname.startsWith('/user')) return true;
        return false; // triggers default redirect to sign-in
      }

      if (isAnyLogin) return true;

      if (isSuperAdminRoute && token?.role !== 'superadmin') return false;
      if (isHospitalAdminRoute && token?.role !== 'hospital') return false;
      if (isDoctorPortalRoute && token?.role !== 'doctor') return false;

      return true;
    },
  },
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

    