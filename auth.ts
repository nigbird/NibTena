
export const runtime = "nodejs";
import NextAuth from 'next-auth';
import { getServerSession } from 'next-auth/next';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';

// Rate limit configuration
const MAX_ATTEMPTS = 5; // max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // rolling window for attempts (15 minutes)
const LOCKOUT_MS = 15 * 60 * 1000; // lockout duration after exceeding attempts (15 minutes)

// In-memory fallback for single-process deployments
type AttemptRecord = { attempts: number; firstAttemptAt: number; lockedUntil?: number };
const loginAttempts = new Map<string, AttemptRecord>();

// Optional Redis client (created if REDIS_URL is provided)
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
  } catch (err) {
    console.warn('Failed to initialize Redis client for rate limiting:', err);
    redisClient = null;
  }
}

function getKeyForIdentifier(role: string, email: string) {
  return `${role}:${email.toLowerCase()}`;
}

// Redis key helpers
function attemptsKey(k: string) {
  return `login:attempts:${k}`;
}
function lockKey(k: string) {
  return `login:lock:${k}`;
}

async function isLockedRedis(k: string): Promise<{ locked: boolean; until?: number }> {
  if (!redisClient) return { locked: false };
  const lk = lockKey(k);
  const ttl = await redisClient.pttl(lk);
  if (ttl > 0) return { locked: true, until: Date.now() + ttl };
  return { locked: false };
}

async function recordFailedAttemptRedis(k: string) {
  if (!redisClient) return;
  const aKey = attemptsKey(k);
  const lKey = lockKey(k);

  // Atomically increment attempts and set expiry if newly created
  const attempts = await redisClient.incr(aKey);
  if (attempts === 1) {
    await redisClient.pexpire(aKey, WINDOW_MS);
  }

  if (attempts >= MAX_ATTEMPTS) {
    // set the lock key and remove attempts key
    await redisClient.set(lKey, '1', 'PX', LOCKOUT_MS);
    await redisClient.del(aKey);
  }
}

async function resetAttemptsRedis(k: string) {
  if (!redisClient) return;
  await redisClient.del(attemptsKey(k));
  await redisClient.del(lockKey(k));
}

function isLockedInMemory(key: string): { locked: boolean; until?: number } {
  const rec = loginAttempts.get(key);
  if (!rec) return { locked: false };
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return { locked: true, until: rec.lockedUntil };
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return { locked: false };
  }
  return { locked: false };
}

function recordFailedAttemptInMemory(key: string) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec) {
    loginAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    return;
  }
  if (now - rec.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    return;
  }
  rec.attempts += 1;
  if (rec.attempts >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(key, rec);
}

function resetAttemptsInMemory(key: string) {
  loginAttempts.delete(key);
}

async function isLocked(key: string): Promise<{ locked: boolean; until?: number }> {
  if (redisClient) return await isLockedRedis(key);
  return isLockedInMemory(key);
}

async function recordFailedAttempt(key: string) {
  if (redisClient) return await recordFailedAttemptRedis(key);
  return recordFailedAttemptInMemory(key);
}

async function resetAttempts(key: string) {
  if (redisClient) return await resetAttemptsRedis(key);
  return resetAttemptsInMemory(key);
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
          const identKey = getKeyForIdentifier(role, email);
          const locked = await isLocked(identKey);
          if (locked.locked) {
            // Compute a user-friendly relative message (minutes) and do NOT expose exact timestamps to the client.
            let friendlyMsg = 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.';
            if (locked.until) {
              const remainingMs = locked.until - Date.now();
              if (remainingMs > 0) {
                const minutes = Math.ceil(remainingMs / 60000);
                if (minutes <= 1) {
                  friendlyMsg = 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.';
                } else {
                  friendlyMsg = `Your account has been temporarily locked due to multiple failed login attempts. Please try again later.`;
                }
              }
            }

            // Log the detailed lock info server-side for diagnostics (includes exact timestamp).
            // try {
            //   console.warn('[auth] Account locked', {
            //     identifier: identKey,
            //     lockedUntil: locked.until ? new Date(locked.until).toISOString() : null,
            //     now: new Date().toISOString(),
            //   });
            // } catch (e) {
            //   // ignore logging errors
            // }

            // Throw a generic, non-technical message for the client.
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
            await recordFailedAttempt(identKey);
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
          // If we reach here and passwords didn't match, record the failed attempt and throw a generic error
          await recordFailedAttempt(identKey);
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
