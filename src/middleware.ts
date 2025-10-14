
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  // Lightweight middleware session check: avoid importing server-only or
  // edge-only session helpers here so the middleware build doesn't fail if
  // the package doesn't expose an edge entry. Instead, check for the
  // existence of the session cookie. This is intentionally minimal — it
  // only verifies a session exists and does not parse role information.
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('mediverse-session')?.value;
  const isLoggedIn = !!sessionCookie;

  // Attempt to fetch the server-side session endpoint to obtain the user's
  // role. We pass along the incoming request's cookie header so the server can
  // validate the session using iron-session on the server side.
  let userRole: string | null = null;
  try {
    const sessionUrl = new URL('/api/session', request.url);
    const resp = await fetch(sessionUrl.toString(), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const body = await resp.json();
    userRole = body?.role ?? null;
  } catch (e) {
    // ignore and fall back to cookie presence only
    userRole = null;
  }

  // If user is trying to access a login page but is already logged in
  // If user is trying to access a login page but is already logged in,
  // redirect them to the relevant dashboard root inferred from the login
  // path (we can't safely read `role` here without a server-side session
  // helper, so use the route context to choose the dashboard).
  if (isLoggedIn && Object.values(loginRoutes).includes(pathname)) {
    // If we have a role from the server, redirect to the appropriate
    // dashboard. Otherwise fall back to the login's dashboard mapping.
    const userDashboard = userRole ? protectedRoutes[userRole as keyof typeof protectedRoutes] : (
      pathname.startsWith(loginRoutes.superadmin) ? protectedRoutes.superadmin :
      pathname.startsWith(loginRoutes.hospital) ? protectedRoutes.hospital :
      pathname.startsWith(loginRoutes.doctor) ? protectedRoutes.doctor : '/'
    );
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
