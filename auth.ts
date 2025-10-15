
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
          // This logic assumes passwords are NOT hashed for now, based on the seed file.
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

      const isSuperAdminPage = pathname.startsWith('/super-admin');
      const isHospitalAdminPage = pathname.startsWith('/hospital-admin');
      const isDoctorPortalPage = pathname.startsWith('/doctor-portal');

      if (isLoggedIn) {
        // If logged in, check role access
        if (isSuperAdminPage && role !== 'superadmin') return false;
        if (isHospitalAdminPage && role !== 'hospital') return false;
        if (isDoctorPortalPage && role !== 'doctor') return false;

        // If logged in and on a login page, redirect to the respective dashboard
        if ((pathname.endsWith('/login') && (isSuperAdminPage || isHospitalAdminPage || isDoctorPortalPage))) {
            if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
            if (role === 'hospital') return Response.redirect(new URL('/hospital-admin', nextUrl));
            if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));
        }

      } else {
        // If not logged in, redirect to the correct login page for protected routes
        if (isSuperAdminPage) {
            return Response.redirect(new URL(`/super-admin/login?callbackUrl=${nextUrl}`, nextUrl));
        }
        if (isHospitalAdminPage) {
            return Response.redirect(new URL(`/hospital-admin/login?callbackUrl=${nextUrl}`, nextUrl));
        }
        if (isDoctorPortalPage) {
            return Response.redirect(new URL(`/doctor-portal/login?callbackUrl=${nextUrl}`, nextUrl));
        }
      }

      // Allow access to public pages like /user/** or if already authorized
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
