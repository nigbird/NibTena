import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

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

          const passwordsMatch = await bcrypt.compare(password, user.password);
          
          if (passwordsMatch) {
            // Return a user object that will be encoded in the JWT
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
        token.role = user.role;
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

      if (pathname.startsWith('/super-admin')) {
        return isLoggedIn && role === 'superadmin';
      }
      if (pathname.startsWith('/hospital-admin')) {
        return isLoggedIn && role === 'hospital';
      }
      if (pathname.startsWith('/doctor-portal')) {
        return isLoggedIn && role === 'doctor';
      }
      // For /user routes, for now, we can allow access if logged in, or not.
      // This can be tightened later. For now, it seems public.
      if (pathname.startsWith('/user')) {
        return true;
      }

      return true; // Allow access to public pages like login
    },
  },
  pages: {
    signIn: '/login', // A generic login page, will redirect based on role attempts
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
});
