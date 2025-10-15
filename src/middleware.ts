
import { auth } from '../auth';

export default auth;

// The matcher should cover all routes you want to protect or handle.
// Note: It does not apply to /api/auth/** routes by default.
export const config = {
  matcher: [
    '/super-admin/:path*',
    '/hospital-admin/:path*',
    '/doctor-portal/:path*',
    '/user/:path*', // Even if public, running middleware allows session access
    '/login' // To handle redirects for already logged-in users
  ],
};
