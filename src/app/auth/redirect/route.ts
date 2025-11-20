import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const callback = url.searchParams.get('callbackUrl') || url.searchParams.get('callbackUrl') || '/';
  try {
    const cbUrl = new URL(callback, url.origin);
    const pathname = cbUrl.pathname;

    // Determine which login page to redirect to based on the original path
    if (pathname.startsWith('/super-admin')) {
      return NextResponse.redirect(new URL('/super-admin/login', url));
    }
    if (pathname.startsWith('/hospital-admin')) {
      return NextResponse.redirect(new URL('/hospital-admin/login', url));
    }
    if (pathname.startsWith('/doctor-portal')) {
      return NextResponse.redirect(new URL('/doctor-portal/login', url));
    }

    // default to user login/home
    return NextResponse.redirect(new URL('/user', url));
  } catch (e) {
    return NextResponse.redirect(new URL('/user', url));
  }
}
