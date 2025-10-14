
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/session';

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

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  const userRole = session.role;

  // If user is trying to access a login page but is already logged in
  if (userRole && Object.values(loginRoutes).includes(pathname)) {
    const userDashboard = protectedRoutes[userRole as keyof typeof protectedRoutes];
    // If they are already on their correct dashboard path, do nothing
    if (pathname.startsWith(userDashboard)) {
        return NextResponse.next();
    }
    // Otherwise, redirect them to their dashboard
    return NextResponse.redirect(new URL(userDashboard, request.url));
  }
  
  // Check super admin routes
  if (pathname.startsWith(protectedRoutes.superadmin) && !pathname.startsWith(loginRoutes.superadmin)) {
    if (!userRole || userRole !== 'superadmin') {
      const url = request.nextUrl.clone();
      url.pathname = loginRoutes.superadmin;
      return NextResponse.redirect(url);
    }
  }

  // Check hospital admin routes
  if (pathname.startsWith(protectedRoutes.hospital) && !pathname.startsWith(loginRoutes.hospital)) {
    if (!userRole || userRole !== 'hospital') {
       const url = request.nextUrl.clone();
       url.pathname = loginRoutes.hospital;
       return NextResponse.redirect(url);
    }
  }

  // Check doctor routes
  if (pathname.startsWith(protectedRoutes.doctor) && !pathname.startsWith(loginRoutes.doctor)) {
     if (!userRole || userRole !== 'doctor') {
       const url = request.nextUrl.clone();
       url.pathname = loginRoutes.doctor;
       return NextResponse.redirect(url);
    }
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/hospital-admin/:path*',
    '/doctor-portal/:path*',
  ],
};
