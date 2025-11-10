export const runtime = "nodejs";
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

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
          } else if (role === 'hospital') {
            // hospital role can be either the Hospital account (contactEmail) or a staff User
            user = await prisma.hospital.findUnique({ where: { contactEmail: email } });
            // If not a Hospital record, try staff User (created by hospital-admin UI)
            if (!user) {
              user = await prisma.user.findUnique({ where: { email } });
              // mark that this is a staff user so we can set hospitalId from user.hospitalId below
              if (user) (user as any).__isStaff = true;
            }
          } else if (role === 'doctor') {
            user = await prisma.doctor.findUnique({ where: { contact: email } });
          }

          if (!user || !user.password) {
            return null; // User not found
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
          if (passwordsMatch) {
              const isStaff = (user as any).__isStaff === true;
              const userEmail = role === 'hospital' ? (isStaff ? user.email : (user as any).contactEmail) : (role === 'doctor' ? (user as any).contact : user.email);
              const userName = user.name;
              const userImage = role === 'hospital' ? (user as any).imageUrl ?? null : (role === 'doctor' ? (user as any).imageUrl : null);
              const doctorHospitalIds = role === 'doctor'
                  ? (await prisma.doctorsOnHospitals.findMany({ where: { doctorId: user.id }, select: { hospitalId: true }})).map(h => h.hospitalId)
                  : null;

              // If a staff user, attempt to load their Role and permission keys
              let roleName: string | null = null;
              let permissionKeys: string[] = [];
              let isRoleAdmin = false;
              if (isStaff && (user as any).roleId) {
                const staffRole = await prisma.role.findUnique({ where: { id: (user as any).roleId }, include: { permissions: { include: { permission: true } } } });
                if (staffRole) {
                  roleName = staffRole.name;
                  isRoleAdmin = !!(staffRole as any).isAdmin;
                  if (isRoleAdmin) {
                    const all = await prisma.permission.findMany({ select: { key: true } });
                    permissionKeys = all.map(a => a.key);
                  } else {
                    permissionKeys = staffRole.permissions?.map(rp => rp.permission.key) || [];
                  }
                }
              }

              // If login matched a Hospital record (not a staff user), treat it as the hospital owner/admin and grant all permissions
              let hospitalIsAdmin = false;
              if (!isStaff && role === 'hospital') {
                hospitalIsAdmin = true;
                const all = await prisma.permission.findMany({ select: { key: true } });
                permissionKeys = all.map(a => a.key);
              }

              return {
                id: user.id.toString(),
                name: userName,
                email: userEmail,
                role: role,
                // if this is a staff user keep their hospitalId, otherwise if it's a Hospital account use hospital.id
                hospitalId: role === 'hospital' ? (isStaff ? (user as any).hospitalId : user.id) : null,
                doctorHospitalIds,
                imageUrl: userImage,
                staffRoleName: roleName,
                staffPermissionKeys: permissionKeys,
                isAdmin: hospitalIsAdmin || isRoleAdmin,
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
        // attach staff role name and permission keys when present
        if ((user as any).staffRoleName) {
          token.staffRoleName = (user as any).staffRoleName;
        }
        if ((user as any).staffPermissionKeys) {
          token.staffPermissionKeys = (user as any).staffPermissionKeys;
        }
        if ((user as any).isAdmin) {
          token.isAdmin = true;
        }
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
  // surface staff role and permissions in the session (use any to avoid TS model mismatch)
  (session.user as any).roleName = (token as any).staffRoleName as string | undefined;
  (session.user as any).permissionKeys = (token as any).staffPermissionKeys as string[] | undefined;
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
        if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));

        // For hospital staff we want to redirect to a role-specific landing page based on their permissions
        if (role === 'hospital') {
          // If the hospital account is marked admin, allow full access / redirect to hospital index
          const isAdmin = (auth?.user as any)?.isAdmin === true;
          if (isAdmin) return Response.redirect(new URL('/hospital-admin', nextUrl));

          const permKeys: string[] = (auth?.user as any)?.permissionKeys || [];
          // map permission keys to preferred landing paths
          const PERM_PATH_MAP: Record<string, string> = {
            'QUEUE_MANAGE': '/hospital-admin/queue',
            'APPOINTMENT_MANAGE': '/hospital-admin/appointments',
            'DOCTOR_MANAGE': '/hospital-admin/doctors',
            'SCHEDULE_MANAGE': '/hospital-admin/schedule',
            'USER_MANAGE': '/hospital-admin/roles',
            'REPORTS_VIEW': '/hospital-admin/reports',
          };
          const allowedPaths = permKeys.map(k => PERM_PATH_MAP[k]).filter(Boolean) as string[];
          const landing = allowedPaths[0] || '/hospital-admin';
          return Response.redirect(new URL(landing, nextUrl));
        }

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

      // --- additional enforcement for hospital staff: restrict access to pages according to permission keys ---
      if (isHospitalAdminRoute && role === 'hospital') {
        // allow hospital accounts marked as admin to access any hospital-admin page
        if ((auth?.user as any)?.isAdmin === true) return true;
        const permKeys: string[] = (auth?.user as any)?.permissionKeys || [];
        const PERM_PATH_MAP: Record<string, string> = {
          'QUEUE_MANAGE': '/hospital-admin/queue',
          'APPOINTMENT_MANAGE': '/hospital-admin/appointments',
          'DOCTOR_MANAGE': '/hospital-admin/doctors',
          'SCHEDULE_MANAGE': '/hospital-admin/schedule',
          'USER_MANAGE': '/hospital-admin/roles',
          'REPORTS_VIEW': '/hospital-admin/reports',
        };

        // allow access to general hospital-admin index
        if (pathname === '/hospital-admin' || pathname === '/hospital-admin/') return true;

        // Build a set of allowed prefixes from permissions
        const allowedPrefixes = new Set<string>(permKeys.map(k => PERM_PATH_MAP[k]).filter(Boolean) as string[]);

        // If user has no permissions, deny access to subpages and redirect to index
        if (allowedPrefixes.size === 0) {
          return Response.redirect(new URL('/hospital-admin', nextUrl));
        }

        // If the requested path starts with any allowed prefix, allow; otherwise redirect to first allowed prefix
        const allowed = Array.from(allowedPrefixes).some(p => pathname.startsWith(p));
        if (!allowed) {
          const first = Array.from(allowedPrefixes)[0];
          return Response.redirect(new URL(first, nextUrl));
        }
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
