
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

      const isSuperAdminRoute = pathname.startsWith('/super-admin');
      const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
      const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');

      const isSuperAdminLogin = pathname === '/super-admin/login';
      const isHospitalAdminLogin = pathname === '/hospital-admin/login';
      const isDoctorPortalLogin = pathname === '/doctor-portal/login';

      const isAnyLogin = isSuperAdminLogin || isHospitalAdminLogin || isDoctorPortalLogin;

      if (!isLoggedIn) {
        // If not logged in and trying to access a login page, allow it.
        if (isAnyLogin) {
          return true;
        }
        // If not logged in and trying to access any other protected route, redirect to the correct login page.
        let loginUrl = '/user'; // Default redirect, though middleware shouldn't hit this for /user
        if (isSuperAdminRoute) loginUrl = '/super-admin/login';
        if (isHospitalAdminRoute) loginUrl = '/hospital-admin/login';
        if (isDoctorPortalRoute) loginUrl = '/doctor-portal/login';
        
        // For non-login protected routes, perform the redirect
        if (isSuperAdminRoute || isHospitalAdminRoute || isDoctorPortalRoute) {
             return Response.redirect(new URL(loginUrl, nextUrl));
        }
        return true;
      }

      // --- At this point, user is logged in ---
      
      // If logged in, trying to access a login page
      if (isAnyLogin) {
        if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
        if (role === 'hospital') return Response.redirect(new URL('/hospital-admin', nextUrl));
        if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));
        // Fallback if role is somehow mismatched, just allow to prevent loops
        return true;
      }
      
      // If logged in, verify role access for protected routes
      if (isSuperAdminRoute && role !== 'superadmin') {
        return Response.redirect(new URL('/super-admin/login', nextUrl));
      }
      if (isHospitalAdminRoute && role !== 'hospital') {
        return Response.redirect(new URL('/hospital-admin/login', nextUrl));
      }
      if (isDoctorPortalRoute && role !== 'doctor') {
        return Response.redirect(new URL('/doctor-portal/login', nextUrl));
      }

      // If all checks pass, user is authorized.
      return true;
      console.log('AUTHORIZED DEBUG:', {
        pathname: nextUrl.pathname,
        isLoggedIn,
        role,
      });
      
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
