
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

const protectedRoutes = {
  superadmin: '/super-admin',
  hospital: '/hospital-admin',
  doctor: '/doctor-portal',
};

const loginRoutes = {
  superadmin: '/super-admin/login',
  hospital: '/hospital-admin/login',
  doctor: '/doctor-portal/login',
};

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Directly get the session in the middleware
  const session = await getSession();
  const isLoggedIn = session.isLoggedIn;
  const userRole = session.role;

  // If user is already logged in and tries to access a login page, redirect them.
  if (isLoggedIn && Object.values(loginRoutes).includes(pathname)) {
    const dashboardUrl = protectedRoutes[userRole as keyof typeof protectedRoutes] || '/';
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Protect super admin routes
  if (pathname.startsWith(protectedRoutes.superadmin) && !pathname.startsWith(loginRoutes.superadmin)) {
    if (!isLoggedIn || userRole !== 'superadmin') {
      return NextResponse.redirect(new URL(loginRoutes.superadmin, request.url));
    }
  }

  // Protect hospital admin routes
  if (pathname.startsWith(protectedRoutes.hospital) && !pathname.startsWith(loginRoutes.hospital)) {
    if (!isLoggedIn || userRole !== 'hospital') {
      return NextResponse.redirect(new URL(loginRoutes.hospital, request.url));
    }
  }

  // Protect doctor routes
  if (pathname.startsWith(protectedRoutes.doctor) && !pathname.startsWith(loginRoutes.doctor)) {
    if (!isLoggedIn || userRole !== 'doctor') {
      return NextResponse.redirect(new URL(loginRoutes.doctor, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: [
    '/super-admin/:path*',
    '/hospital-admin/:path*',
    '/doctor-portal/:path*',
  ],
};
