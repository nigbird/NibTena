
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
            role: z.enum(['superadmin', 'hospital', 'doctor']),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password, role } = parsedCredentials.data;

          let user: any = null;

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
          } else if (role === 'hospital') {
            user = await prisma.hospital.findUnique({ where: { contactEmail: email } });
          } else if (role === 'doctor') {
            user = await prisma.doctor.findUnique({ where: { contact: email } });
          }

          if (!user) return null;
          
          // In a real app, passwords should be hashed. The seed script uses plaintext for demo purposes.
          // For production, you'd use: const passwordsMatch = await bcrypt.compare(password, user.password);
          const passwordsMatch = password === user.password;

          if (passwordsMatch) {
            return {
              id: user.id.toString(),
              name: user.name,
              email: role === 'hospital' ? user.contactEmail : user.contact || user.email,
              role: role,
              hospitalId: role === 'hospital' ? user.id : null,
              doctorHospitalIds: role === 'doctor' ? user.hospitals?.map((h: any) => h.hospitalId) : null,
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        token.hospitalId = (user as any).hospitalId;
        token.doctorHospitalIds = (user as any).doctorHospitalIds;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.hospitalId = token.hospitalId as number | null;
        session.user.doctorHospitalIds = token.doctorHospitalIds as number[] | null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;
      
      const isLoginPage = pathname.endsWith('/login');

      const isSuperAdminRoute = pathname.startsWith('/super-admin');
      const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
      const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');

      // Define which routes are protected
      const isProtected = isSuperAdminRoute || isHospitalAdminRoute || isDoctorPortalRoute;
      
      // If user is logged in
      if (isLoggedIn) {
        // If they are on a login page, redirect them to their dashboard
        if (isLoginPage) {
          if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
          if (role === 'hospital') return Response.redirect(new URL('/hospital-admin', nextUrl));
          if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));
          return Response.redirect(new URL('/', nextUrl)); // Fallback
        }

        // If they are on a protected route, check their role
        if (isSuperAdminRoute && role !== 'superadmin') return Response.redirect(new URL('/', nextUrl));
        if (isHospitalAdminRoute && role !== 'hospital') return Response.redirect(new URL('/', nextUrl));
        if (isDoctorPortalRoute && role !== 'doctor') return Response.redirect(new URL('/', nextUrl));
        
        // If all checks pass, allow access
        return true;
      }

      // If user is not logged in and trying to access a protected route (that isn't a login page)
      if (!isLoggedIn && isProtected && !isLoginPage) {
        let loginUrl;
        if (isSuperAdminRoute) loginUrl = '/super-admin/login';
        else if (isHospitalAdminRoute) loginUrl = '/hospital-admin/login';
        else if (isDoctorPortalRoute) loginUrl = '/doctor-portal/login';

        if (loginUrl) {
          const redirectUrl = new URL(loginUrl, nextUrl);
          redirectUrl.searchParams.set('callbackUrl', nextUrl.pathname);
          return Response.redirect(redirectUrl);
        }
      }
      
      // Allow access to all other pages by default (including login pages for unauthenticated users)
      return true;
    },
  },
  pages: {
    // This is intentionally left blank to handle redirects in the `authorized` callback
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
});
