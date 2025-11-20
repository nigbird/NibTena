
export const runtime = "nodejs";
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Enforce finite session lifetime so authenticated users are logged out after inactivity/expiry
  session: {
    strategy: 'jwt',
    // absolute session lifetime (e.g., 30 minutes)
    maxAge: 10 * 60,
  },
  jwt: {
    // align JWT expiry with session lifetime
    maxAge: 10 * 60,
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
          let isStaff = false; // Flag to identify if the logged-in user is a staff member

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
          } else if (role === 'hospital') {
            // A hospital-role login can be EITHER a Hospital record OR a User (staff) record.
            const hospitalAccount = await prisma.hospital.findUnique({ where: { contactEmail: email } });
            if (hospitalAccount) {
              user = hospitalAccount;
            } else {
              const staffUser = await prisma.user.findUnique({ where: { email } });
              if (staffUser) {
                user = staffUser;
                isStaff = true;
              }
            }
          } else if (role === 'doctor') {
            user = await prisma.doctor.findUnique({ where: { contact: email } });
          }

          if (!user || !user.password) {
            return null; // User not found
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
          if (passwordsMatch) {
              const userEmail = isStaff ? user.email : (role === 'hospital' ? (user as any).contactEmail : (role === 'doctor' ? (user as any).contact : user.email));
              const userName = user.name;
              const userImage = role === 'hospital' ? (user as any).imageUrl ?? null : (role === 'doctor' ? (user as any).imageUrl : null);
              const doctorHospitalIds = role === 'doctor'
                  ? (await prisma.doctorsOnHospitals.findMany({ where: { doctorId: user.id }, select: { hospitalId: true }})).map(h => h.hospitalId)
                  : null;

              // --- Authoritative Permission Fetching ---
              let roleName: string | null = null;
              let permissionKeys: string[] = [];
              let isAdmin = false;

              if (role === 'superadmin') {
                isAdmin = true;
                const all = await prisma.permission.findMany({ select: { key: true } });
                permissionKeys = all.map(p => p.key);
              } else if (role === 'hospital') {
                  if (isStaff) {
                    // This is a User record
                    if ((user as any).roleId) {
                      const staffRole = await prisma.role.findUnique({ where: { id: (user as any).roleId }, include: { permissions: { include: { permission: true } } } });
                      if (staffRole) {
                        roleName = staffRole.name;
                        isAdmin = !!staffRole.isAdmin; // Only true if role.isAdmin is explicitly true
                        if (isAdmin) {
                          const all = await prisma.permission.findMany({ select: { key: true } });
                          permissionKeys = all.map(a => a.key);
                        } else {
                          permissionKeys = staffRole.permissions?.map(rp => rp.permission.key) || [];
                        }
                      }
                    }
                  } else { 
                    // This is a Hospital record (owner/admin account)
                    isAdmin = true; // Treat main hospital account as admin by default
                    const all = await prisma.permission.findMany({ select: { key: true } });
                    permissionKeys = all.map(p => p.key);
                  }
              }
              // --- End Authoritative Permission Fetching ---

              return {
                id: user.id.toString(),
                name: userName,
                email: userEmail,
                role: role,
                hospitalId: role === 'hospital' ? (isStaff ? (user as any).hospitalId : user.id) : null,
                doctorHospitalIds,
                imageUrl: userImage,
                // Attach authoritative permissions to the user object for the session
                staffRoleName: roleName,
                permissionKeys,
                isAdmin,
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
        token.hospitalId = (user as any).hospitalId;
        token.doctorHospitalIds = (user as any).doctorHospitalIds;
        token.picture = (user as any).imageUrl;
        if ((user as any).staffRoleName) {
          token.staffRoleName = (user as any).staffRoleName;
        }
        if ((user as any).permissionKeys) {
          token.permissionKeys = (user as any).permissionKeys;
        }
        token.isAdmin = (user as any).isAdmin === true;
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
        (session.user as any).roleName = (token as any).staffRoleName as string | undefined;
        (session.user as any).permissionKeys = (token as any).permissionKeys as string[] | undefined;
        (session.user as any).isAdmin = (token as any).isAdmin === true;
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
        let loginUrl = '/user';
        if (isSuperAdminRoute) loginUrl = '/super-admin/login';
        if (isHospitalAdminRoute) loginUrl = '/hospital-admin/login';
        if (isDoctorPortalRoute) loginUrl = '/doctor-portal/login';
        
        if (isSuperAdminRoute || isHospitalAdminRoute || isDoctorPortalRoute) {
             return Response.redirect(new URL(loginUrl, nextUrl));
        }
        return true;
      }

      if (isAnyLogin) {
        if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
        if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));

        if (role === 'hospital') {
          const isAdmin = (auth?.user as any)?.isAdmin === true;
          if (isAdmin) return Response.redirect(new URL('/hospital-admin', nextUrl));

          const permKeys: string[] = (auth?.user as any)?.permissionKeys || [];
          const PERM_PATH_MAP: Record<string, string> = {
            'QUEUE_MANAGE': '/hospital-admin/queue',
            'APPOINTMENT_MANAGE': '/hospital-admin/appointments',
            'DOCTOR_MANAGE': '/hospital-admin/doctors',
            'SCHEDULE_MANAGE': '/hospital-admin/schedule',
            'USER_MANAGE': '/hospital-admin/roles',
            'REPORTS_VIEW': '/hospital-admin/reports',
            'SETTINGS_MANAGE': '/hospital-admin/settings',
          };
          const allowedPaths = permKeys.map(k => PERM_PATH_MAP[k]).filter(Boolean) as string[];
          const landing = allowedPaths[0] || '/hospital-admin/profile'; // Default to profile if no other page is allowed
          return Response.redirect(new URL(landing, nextUrl));
        }
        return true;
      }
      
      if (isSuperAdminRoute && role !== 'superadmin') {
        return Response.redirect(new URL('/super-admin/login', nextUrl));
      }
      if (isHospitalAdminRoute && role !== 'hospital') {
        return Response.redirect(new URL('/hospital-admin/login', nextUrl));
      }

      if (isHospitalAdminRoute && role === 'hospital') {
        if ((auth?.user as any)?.isAdmin === true) return true;

        // Allow access to dashboard and profile by default for all staff
        if (pathname === '/hospital-admin' || pathname === '/hospital-admin/' || pathname.startsWith('/hospital-admin/profile')) return true;

        const permKeys: string[] = (auth?.user as any)?.permissionKeys || [];
        const PERM_PATH_MAP: Record<string, string> = {
          'QUEUE_MANAGE': '/hospital-admin/queue',
          'APPOINTMENT_MANAGE': '/hospital-admin/appointments',
          'DOCTOR_MANAGE': '/hospital-admin/doctors',
          'SCHEDULE_MANAGE': '/hospital-admin/schedule',
          'USER_MANAGE': '/hospital-admin/roles',
          'REPORTS_VIEW': '/hospital-admin/reports',
          'SETTINGS_MANAGE': '/hospital-admin/settings',
        };

        const allowedPrefixes = new Set<string>(permKeys.map(k => PERM_PATH_MAP[k]).filter(Boolean) as string[]);

        if (allowedPrefixes.size === 0) {
           // If user has no specific page permissions, but is logged in, redirect them to their profile.
          if (pathname.startsWith('/hospital-admin/profile')) {
            return true;
          }
          return Response.redirect(new URL('/hospital-admin/profile', nextUrl));
        }

        const allowed = Array.from(allowedPrefixes).some(p => pathname.startsWith(p));
        if (!allowed) {
          const first = Array.from(allowedPrefixes)[0];
          return Response.redirect(new URL(first, nextUrl));
        }
      }
      if (isDoctorPortalRoute && role !== 'doctor') {
        return Response.redirect(new URL('/doctor-portal/login', nextUrl));
      }

      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
});
    

    