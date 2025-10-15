import { auth } from '../auth';

export default auth;

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/hospital-admin/:path*',
    '/doctor-portal/:path*',
    '/user/:path*'
  ],
};
