
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function verifyOtpAndGetPatient(phone: string, code: string) {
    try {
        const otpRecord = await prisma.otp.findFirst({
            where: {
                phone,
                code,
                expiresAt: { gt: new Date() },
            },
        });

        if (!otpRecord) {
            return null; // Invalid or expired OTP
        }

        // OTP is valid, delete it so it can't be reused
        await prisma.otp.delete({ where: { id: otpRecord.id } });
        
        // Find or create patient
        const patient = await prisma.patient.upsert({
            where: { phone },
            update: {},
            create: { 
                phone,
                name: `Patient ${phone.substring(0,4)}`, // Default name
             },
        });
        
        return patient;

    } catch (error) {
        console.error("OTP verification failed:", error);
        return null;
    }
}


export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.NEXTAUTH_TRUST_HOST === 'true',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  jwt: {
    maxAge: 30 * 60,
  },
  providers: [
    Credentials({
      id: 'patient-otp',
      name: 'Patient OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ phone: z.string(), otp: z.string() })
          .safeParse(credentials);
        
        if (parsedCredentials.success) {
          const { phone, otp } = parsedCredentials.data;
          const patient = await verifyOtpAndGetPatient(phone, otp);

          if (patient) {
            return {
              id: patient.id.toString(),
              name: patient.name,
              email: patient.phone, // Use phone as email for patient session
              role: 'patient',
            };
          }
        }
        return null; // Invalid OTP
      },
    }),
    Credentials({
      id: 'credentials', // Keep the existing admin/doctor/hospital login
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

          if (!user || !user.password) {
            return null; // User not found
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
          if (passwordsMatch) {
            const userEmail = role === 'hospital' ? user.contactEmail : (role === 'doctor' ? user.contact : user.email);
            const userName = user.name;
            const userImage = user.imageUrl || null;
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
        }
        
        return null; // Invalid credentials
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        if (user.role === 'patient') {
            token.name = user.name;
        } else {
            token.hospitalId = (user as any).hospitalId;
            token.doctorHospitalIds = (user as any).doctorHospitalIds;
            token.picture = (user as any).imageUrl;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.role === 'patient') {
            session.user.name = token.name as string;
        } else {
            session.user.hospitalId = token.hospitalId as number | null;
            session.user.doctorHospitalIds = token.doctorHospitalIds as number[] | null;
            session.user.image = token.picture as string | null;
        }
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
        if (isAnyLogin) {
          return true;
        }
        if (isSuperAdminRoute || isHospitalAdminRoute || isDoctorPortalRoute) {
             let loginUrl = '/';
             if (isSuperAdminRoute) loginUrl = '/super-admin/login';
             if (isHospitalAdminRoute) loginUrl = '/hospital-admin/login';
             if (isDoctorPortalRoute) loginUrl = '/doctor-portal/login';
             return Response.redirect(new URL(loginUrl, nextUrl));
        }
        return true;
      }
      
      if (isAnyLogin) {
        if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
        if (role === 'hospital') return Response.redirect(new URL('/hospital-admin', nextUrl));
        if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));
        return true;
      }
      
      if (isSuperAdminRoute && role !== 'superadmin') {
        return Response.redirect(new URL('/super-admin/login', nextUrl));
      }
      if (isHospitalAdminRoute && role !== 'hospital') {
        return Response.redirect(new URL('/hospital-admin/login', nextUrl));
      }
      if (isDoctorPortalRoute && role !== 'doctor') {
        return Response.redirect(new URL('/doctor-portal/login', nextUrl));
      }

      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/user/appointments', // Redirect point for patient login
  }
});
