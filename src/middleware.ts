
import { auth } from '../auth';

// The `auth` object contains all the NextAuth configuration, including the `authorized`
// callback for route protection. Exporting it directly here is the correct way
// to apply NextAuth middleware in the Next.js App Router.
export default auth;

export const config = {
  // The matcher is configured to run middleware on all routes except for
  // static assets and API routes, which is a standard configuration.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
