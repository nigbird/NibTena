
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.NEXTAUTH_TRUST_HOST === 'true',
  // Enforce finite session lifetime so authenticated users are logged out after inactivity/expiry
  session: {
    strategy: 'jwt',
    // absolute session lifetime (e.g., 30 minutes)
    maxAge: 30 * 60,
  },
  jwt: {
    // align JWT expiry with session lifetime
    maxAge: 30 * 60,
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        console.log('[Auth] Authorize function triggered');
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
            role: z.enum(['superadmin', 'hospital', 'doctor']),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password, role } = parsedCredentials.data;
          console.log(`[Auth] Attempting login for role: ${role} with email: ${email}`);

          let user: any = null;

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
            if (!user) console.log('[Auth] Super admin not found');
          } else if (role === 'hospital') {
            user = await prisma.hospital.findUnique({ where: { contactEmail: email } });
             if (!user) console.log('[Auth] Hospital not found');
          } else if (role === 'doctor') {
            user = await prisma.doctor.findUnique({ where: { contact: email } });
             if (!user) console.log('[Auth] Doctor not found');
          }

          if (!user || !user.password) {
            console.error('[Auth] User not found or user has no password.');
            return null;
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (!passwordsMatch) {
            console.error('[Auth] Password mismatch for user:', email);
            return null;
          }

          console.log('[Auth] Passwords match for user:', email);
          
          if (passwordsMatch) {
            const userEmail = role === 'hospital' ? user.contactEmail : (role === 'doctor' ? user.contact : user.email);
            const userName = role === 'hospital' ? user.name : user.name;
            const userImage = role === 'hospital' ? user.imageUrl : (role === 'doctor' ? user.imageUrl : null);
            const doctorHospitalIds = role === 'doctor' 
                ? (await prisma.doctorsOnHospitals.findMany({ where: { doctorId: user.id }, select: { hospitalId: true }})).map(h => h.hospitalId)
                : null;
            
            return {
              id: user.id.toString(),
              name: userName,
              email: userEmail,
              role: role,
              hospitalId: role === 'hospital' ? user.id : null,
              doctorHospitalIds,
              imageUrl: userImage,
            };
          }
        } else {
            console.error('[Auth] Parsed credentials failed:', parsedCredentials.error);
        }
        
        console.log('[Auth] Returning null from authorize');
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
        token.picture = (user as any).imageUrl;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.hospitalId = token.hospitalId as number | null;
        session.user.doctorHospitalIds = token.doctorHospitalIds as number[] | null;
        session.user.image = token.picture as string | null;
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
    },
  },
  secret: process.env.AUTH_SECRET,
});
