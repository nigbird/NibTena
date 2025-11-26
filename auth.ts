
export const runtime = "nodejs";
import NextAuth from 'next-auth';
import { getServerSession } from 'next-auth/next';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Rate limit configuration
const MAX_ATTEMPTS = 5; // max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // rolling window for attempts (15 minutes)
const LOCKOUT_MS = 15 * 60 * 1000; // lockout duration after exceeding attempts (15 minutes)

// Database-backed rate limiting (Prisma RateLimit model)
// We enforce two separate limits:
// - Email-based: max 5 failed attempts in WINDOW_MS -> lock for LOCKOUT_MS
// - IP-based: max 20 failed attempts in WINDOW_MS -> lock for LOCKOUT_MS
const EMAIL_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS = 20;

function getKeyForIdentifier(role: string, email: string) {
  return `email:${role}:${email.toLowerCase()}`;
}

function getIpKey(ip: string) {
  return `ip:${ip}`;
}

async function isLocked(key: string): Promise<{ locked: boolean; until?: number }> {
  try {
    const rec = await prisma.rateLimit.findUnique({ where: { key } });
    if (!rec) return { locked: false };
    if (rec.lockedUntil && rec.lockedUntil.getTime() > Date.now()) return { locked: true, until: rec.lockedUntil.getTime() };
    return { locked: false };
  } catch (e) {
    console.error('[auth] isLocked check failed', e);
    return { locked: false };
  }
}

function formatUnlockMessage(base: string, until?: number) {
  try {
    if (!until) return base;
    const remainingMs = until - Date.now();
    if (!remainingMs || remainingMs <= 0) return base;
    const minutes = Math.ceil(remainingMs / 60000);
    return `${base} Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  } catch (e) {
    return base;
  }
}

async function recordFailedAttempt(key: string, type: 'email' | 'ip') {
  try {
    const now = new Date();
    const rec = await prisma.rateLimit.findUnique({ where: { key } });
    const maxAttempts = type === 'email' ? EMAIL_MAX_ATTEMPTS : IP_MAX_ATTEMPTS;

    if (!rec) {
      await prisma.rateLimit.create({ data: { key, type, attempts: 1, firstAttemptAt: now } });
      return;
    }

    // If window expired, reset
    if (rec.firstAttemptAt && now.getTime() - rec.firstAttemptAt.getTime() > WINDOW_MS) {
      await prisma.rateLimit.update({ where: { key }, data: { attempts: 1, firstAttemptAt: now, lockedUntil: null } });
      return;
    }

    const attempts = rec.attempts + 1;
    if (attempts >= maxAttempts) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
      await prisma.rateLimit.update({ where: { key }, data: { attempts: attempts, lockedUntil, firstAttemptAt: rec.firstAttemptAt ?? now } });
      return;
    }

    await prisma.rateLimit.update({ where: { key }, data: { attempts } });
  } catch (e) {
    console.error('[auth] recordFailedAttempt failed', e);
  }
}

async function resetAttempts(key: string) {
  try {
    await prisma.rateLimit.deleteMany({ where: { key } });
  } catch (e) {
    console.error('[auth] resetAttempts failed', e);
  }
}

type JwtCallbackArgs = { token: Record<string, any>; user?: Record<string, any> | null };
type SessionCallbackArgs = { session: Record<string, any>; token: Record<string, any> };
type AuthorizedCallbackArgs = { auth: Record<string, any> | null; request: { nextUrl: URL } };


const authOptions = {
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
      async authorize(credentials, req) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
            role: z.enum(['superadmin', 'hospital', 'doctor']),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password, role } = parsedCredentials.data;
          const identKey = getKeyForIdentifier(role, email);

          // Resolve IP for device-level rate limiting
          let ip = 'unknown';
          try {
            const hdr = (req && req.headers) ? req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded'] : undefined;
            if (hdr && typeof hdr === 'string') {
              ip = hdr.split(',')[0].trim();
            } else if (req && (req as any).socket && ((req as any).socket.remoteAddress)) {
              ip = String((req as any).socket.remoteAddress);
            }
          } catch (e) {
            // ignore
          }
          const ipKey = getIpKey(ip);

          // Check locks for both email and IP
          const lockedEmail = await isLocked(identKey);
          const lockedIp = await isLocked(ipKey);
          if (lockedEmail.locked || lockedIp.locked) {
            // Determine which lock to message (prefer device/IP lock message when applicable)
            const locked = lockedIp.locked ? lockedIp : lockedEmail;
            let friendlyMsg = lockedIp.locked
              ? 'Too many failed login attempts were detected from this device. Please try again later.'
              : 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.';
            friendlyMsg = formatUnlockMessage(friendlyMsg, locked.until);
            throw new Error(friendlyMsg);
          }
          
          let user: any = null;
          let isStaff = false; // Flag to identify if the logged-in user is a staff member

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
          } else if (role === 'hospital') {
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
            // record attempt for unknown user as well to avoid username enumeration abuse
            await recordFailedAttempt(identKey, 'email');
            await recordFailedAttempt(ipKey, 'ip');

            // If this failed attempt caused a lock, surface the friendly lock message immediately
            const nowLockedEmail = await isLocked(identKey);
            const nowLockedIp = await isLocked(ipKey);
            if (nowLockedIp.locked || nowLockedEmail.locked) {
              const locked = nowLockedIp.locked ? nowLockedIp : nowLockedEmail;
              const message = nowLockedIp.locked
                ? 'Too many failed login attempts were detected from this device. Please try again later.'
                : 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.';
              throw new Error(formatUnlockMessage(message, locked.until));
            }

            return null; // User not found
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
            if (passwordsMatch) {
              // Successful login: reset any recorded failed attempts
              await resetAttempts(identKey);
              const userEmail = isStaff ? user.email : (role === 'hospital' ? (user as any).contactEmail : (role === 'doctor' ? (user as any).contact : user.email));
              const userName = user.name;
              const userImage = role === 'hospital' ? (user as any).imageUrl ?? null : (role === 'doctor' ? (user as any).imageUrl : null);
              const mustChangePassword = user.mustChangePassword === true;
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
                    if ((user as any).roleId) {
                      const staffRole = await prisma.role.findUnique({ where: { id: (user as any).roleId }, include: { permissions: { include: { permission: true } } } });
                      if (staffRole) {
                        roleName = staffRole.name;
                        isAdmin = !!staffRole.isAdmin;
                        if (isAdmin) {
                          const all = await prisma.permission.findMany({ select: { key: true } });
                          permissionKeys = all.map(a => a.key);
                        } else {
                          permissionKeys = staffRole.permissions?.map(rp => rp.permission.key) || [];
                        }
                      }
                    }
                  } else { 
                    isAdmin = true; // Treat main hospital account as admin by default
                    const all = await prisma.permission.findMany({ select: { key: true } });
                    permissionKeys = all.map(p => p.key);
                  }
              }

              return {
                id: user.id.toString(),
                name: userName,
                email: userEmail,
                role: role,
                hospitalId: role === 'hospital' ? (isStaff ? (user as any).hospitalId : user.id) : null,
                doctorHospitalIds,
                imageUrl: userImage,
                staffRoleName: roleName,
                permissionKeys,
                isAdmin,
                mustChangePassword,
              };
          }
          // If we reach here and passwords didn't match, record the failed attempt for both email and IP
          await recordFailedAttempt(identKey, 'email');
          await recordFailedAttempt(ipKey, 'ip');

          // If this failed attempt caused a lock, throw the friendly lock message immediately
          const nowLockedEmail2 = await isLocked(identKey);
          const nowLockedIp2 = await isLocked(ipKey);
          if (nowLockedIp2.locked || nowLockedEmail2.locked) {
            const locked = nowLockedIp2.locked ? nowLockedIp2 : nowLockedEmail2;
            const message = nowLockedIp2.locked
              ? 'Too many failed login attempts were detected from this device. Please try again later.'
              : 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.';
            throw new Error(formatUnlockMessage(message, locked.until));
          }
        }
        
        return null; // Invalid credentials
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: JwtCallbackArgs) {
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
        token.mustChangePassword = (user as any).mustChangePassword === true;
      }
      return token;
    },
    session({ session, token }: SessionCallbackArgs) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.hospitalId = token.hospitalId as number | null;
        session.user.doctorHospitalIds = token.doctorHospitalIds as number[] | null;
        session.user.image = token.picture as string | null;
        (session.user as any).roleName = (token as any).staffRoleName as string | undefined;
        (session.user as any).permissionKeys = (token as any).permissionKeys as string[] | undefined;
        (session.user as any).isAdmin = (token as any).isAdmin === true;
        (session.user as any).mustChangePassword = (token as any).mustChangePassword === true;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }: AuthorizedCallbackArgs) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Allow access to password reset pages regardless of login state
      if (pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password')) {
        return true;
      }

      const isSuperAdminLogin = pathname === '/super-admin/login';
      const isHospitalAdminLogin = pathname === '/hospital-admin/login';
      const isDoctorPortalLogin = pathname === '/doctor-portal/login';
      const isAnyLogin = isSuperAdminLogin || isHospitalAdminLogin || isDoctorPortalLogin;

      if (!isLoggedIn) {
        if (isAnyLogin) {
          return true;
        }
        const isSuperAdminRoute = pathname.startsWith('/super-admin');
        const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
        const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');

        let loginUrl = '/user';
        if (isSuperAdminRoute) loginUrl = '/super-admin/login';
        if (isHospitalAdminRoute) loginUrl = '/hospital-admin/login';
        if (isDoctorPortalRoute) loginUrl = '/doctor-portal/login';
        
        if (isSuperAdminRoute || isHospitalAdminRoute || isDoctorPortalRoute) {
             return Response.redirect(new URL(loginUrl, nextUrl));
        }
        return true;
      }
      
      // If user is logged in, check for mandatory password change first.
      const user: any = auth?.user;
      const mustChangePassword = user?.mustChangePassword === true;
      const role = user?.role;

      if (mustChangePassword && role) {
        const forcedChangeTarget: Record<string, string> = {
          superadmin: '/super-admin/profile',
          hospital: '/hospital-admin/change-password',
          doctor: '/doctor-portal/change-password',
        };
        const targetUrl = forcedChangeTarget[role];

        if (targetUrl && !pathname.startsWith(targetUrl) && !pathname.startsWith('/api')) {
           return Response.redirect(new URL(targetUrl, nextUrl));
        }
      }

      // If user is on a login page but is already logged in, redirect them.
      if (isAnyLogin) {
        if (role === 'superadmin') return Response.redirect(new URL('/super-admin', nextUrl));
        if (role === 'doctor') return Response.redirect(new URL('/doctor-portal', nextUrl));

        if (role === 'hospital') {
          // If they are an admin, send to main dashboard
          if (user?.isAdmin === true) return Response.redirect(new URL('/hospital-admin', nextUrl));

          // If not admin, redirect to first allowed page based on permissions
          const permKeys: string[] = user?.permissionKeys || [];
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
        return true; // Should not happen, but as a fallback.
      }
      
      // Role-based route protection
      const isSuperAdminRoute = pathname.startsWith('/super-admin');
      const isHospitalAdminRoute = pathname.startsWith('/hospital-admin');
      const isDoctorPortalRoute = pathname.startsWith('/doctor-portal');
      
      if (isSuperAdminRoute && role !== 'superadmin') {
        return Response.redirect(new URL('/super-admin/login', nextUrl));
      }
      if (isHospitalAdminRoute && role !== 'hospital') {
        return Response.redirect(new URL('/hospital-admin/login', nextUrl));
      }
      if (isDoctorPortalRoute && role !== 'doctor') {
        return Response.redirect(new URL('/doctor-portal/login', nextUrl));
      }

      // Permission-based route protection for hospital staff
      if (isHospitalAdminRoute && role === 'hospital' && user?.isAdmin === false) {
        // Always allow access to the root dashboard and profile page for staff
        if (pathname === '/hospital-admin' || pathname === '/hospital-admin/' || pathname.startsWith('/hospital-admin/profile')) return true;

        const permKeys: string[] = user?.permissionKeys || [];
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

        // If user has no specific page permissions, lock them to their profile page.
        if (allowedPrefixes.size === 0) {
          if (pathname.startsWith('/hospital-admin/profile')) return true;
          return Response.redirect(new URL('/hospital-admin/profile', nextUrl));
        }

        const isPathAllowed = Array.from(allowedPrefixes).some(p => pathname.startsWith(p));
        
        // If the current path is not in their allowed list, redirect them to the first page they ARE allowed to see.
        if (!isPathAllowed) {
          const firstAllowedPath = Array.from(allowedPrefixes)[0];
          return Response.redirect(new URL(firstAllowedPath, nextUrl));
        }
      }
      
      // If no other rule matched, allow access.
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions as any);

export const handlers = { GET: handler, POST: handler };

async function auth(req?: any, res?: any) {
  // If called with `req` and `res` (e.g., route handlers), call the 3-arg signature.
  if (req && res) {
    return await getServerSession(req as any, res as any, authOptions as any);
  }

  // In server components / no-arg usage, call the auth-options form.
  return await getServerSession(authOptions as any);
}

// Make the function also carry the options shape so it can be passed to APIs expecting the options object
Object.assign(auth, authOptions as any);

export { auth };
