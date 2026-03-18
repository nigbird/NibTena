
export const runtime = "nodejs";
import NextAuth, { getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import ensureTokenVersionValid from '@/lib/auth-token-version';
import { setActiveSessionIdForRole } from '@/lib/auth-token-version';
import { validateTokenStructure } from '@/lib/token-validation';

// Rate limit configuration
const MAX_ATTEMPTS = 5; // max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // rolling window for attempts (15 minutes)
const LOCKOUT_MS = 15 * 60 * 1000; // lockout duration after exceeding attempts (30 minutes)

// Database-backed rate limiting (Prisma RateLimit model)
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
    // rotate the session cookie periodically while active
    updateAge: 60,
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
            // Prefer IP lock message when both are locked; compute remaining minutes instead
            const lockedUntil = (lockedIp.locked ? lockedIp.until : lockedEmail.until) || Date.now();
            const msLeft = lockedUntil - Date.now();
            const minutesLeft = Math.ceil(msLeft / 60000);
            const timeText = minutesLeft <= 0 ? 'less than a minute' : `${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`;

            let msg: string;
            if (lockedIp.locked) {
              msg = `Too many failed login attempts from your IP. Try again in ${timeText}.`;
              console.warn(`[auth] ip lockout for ip ${ip}: ${timeText}`);
            } else {
              msg = `Too many failed login attempts for this account. Try again in ${timeText}.`;
              console.warn(`[auth] account lockout for ${email}: ${timeText}`);
            }

            throw new Error(msg);
          }
          
          let user: any = null;
          let isStaff = false; // Flag to identify if the logged-in user is a staff member
          let superAdminRole: string | undefined;

          if (role === 'superadmin') {
            user = await prisma.superAdmin.findUnique({ where: { email } });
            superAdminRole = user?.role;
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
            await recordFailedAttempt(identKey, 'email');
            await recordFailedAttempt(ipKey, 'ip');
            throw new Error("Invalid credentials");
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
            if (passwordsMatch) {
              // Successful login: reset any recorded failed attempts
              await resetAttempts(identKey);

              // Strict session concurrency: new login becomes the only active session.
              // This invalidates any previously issued JWTs for this account.
              const sessionId = globalThis.crypto?.randomUUID
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
              try {
                await setActiveSessionIdForRole(role, Number(user.id), sessionId, isStaff);
              } catch (e) {
                console.error('[auth] failed to set activeSessionId', e);
                throw new Error('Login failed. Please try again.');
              }

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
                  // It's a staff member. Find their role and permissions.
                  const staffUserWithRole = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: {
                      role: {
                        include: {
                          permissions: {
                            include: {
                              permission: true,
                            },
                          },
                        },
                      },
                    },
                  });

                  if (staffUserWithRole?.role) {
                    const staffRole = staffUserWithRole.role;
                    roleName = staffRole.name;
                    isAdmin = staffRole.isAdmin;
                    permissionKeys = isAdmin
                      ? (await prisma.permission.findMany({ select: { key: true } })).map(p => p.key)
                      : staffRole.permissions.map(rp => rp.permission.key);
                  } else {
                    // Staff exists but has no role. Assign empty permissions.
                    roleName = null;
                    isAdmin = false;
                    permissionKeys = [];
                  }
                } else {
                  // This is the main hospital account, not a staff member. Grant admin access by default.
                  isAdmin = true;
                  const all = await prisma.permission.findMany({ select: { key: true } });
                  permissionKeys = all.map(p => p.key);
                }
              }

              return {
                id: user.id.toString(),
                name: userName,
                email: userEmail,
                role: role,
                superAdminRole,
                hospitalId: role === 'hospital' ? (isStaff ? (user as any).hospitalId : user.id) : null,
                doctorHospitalIds,
                imageUrl: userImage,
                staffRoleName: roleName,
                isStaff: isStaff, // Explicitly pass isStaff flag
                tokenVersion: (user as any).tokenVersion ?? 0,
                sessionId,
                permissionKeys,
                isAdmin,
                mustChangePassword,
              };
          }
          await recordFailedAttempt(identKey, 'email');
          await recordFailedAttempt(ipKey, 'ip');
        }
        
        throw new Error("Invalid credentials");
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: JwtCallbackArgs) {
      try {
        // Ensure token is an object (jose encoder requires an object payload)
        if (!token || typeof token !== 'object') {
          token = {} as any;
        }

        if (user && typeof user === 'object') {
          // Initial login: merge user fields into the token
          token.id = (user as any).id ?? token.id;
          token.email = (user as any).email ?? token.email;
          token.role = (user as any).role ?? token.role;
          if ((user as any).superAdminRole) {
            (token as any).superAdminRole = (user as any).superAdminRole;
          }
          token.hospitalId = (user as any).hospitalId ?? token.hospitalId;
          token.doctorHospitalIds = (user as any).doctorHospitalIds ?? token.doctorHospitalIds;
          token.picture = (user as any).imageUrl ?? token.picture;
          if ((user as any).staffRoleName) {
            token.staffRoleName = (user as any).staffRoleName;
          }
          if ((user as any).isStaff !== undefined) {
            token.isStaff = (user as any).isStaff;
          }
          if ((user as any).permissionKeys) {
            token.permissionKeys = (user as any).permissionKeys;
          }
          token.isAdmin = (user as any).isAdmin === true || token.isAdmin === true;
          token.mustChangePassword = (user as any).mustChangePassword === true || token.mustChangePassword === true;
          token.tokenVersion = (user as any).tokenVersion ?? token.tokenVersion ?? 0;
          token.sessionId = (user as any).sessionId ?? token.sessionId ?? null;
        }
      } catch (e) {
        console.error('[auth] jwt callback error', e);
      }

      // Strict Token Structure Validation
      const validToken = validateTokenStructure(token);
      if (!validToken) {
         if (token && Object.keys(token).length > 0) {
             console.warn('[auth] JWT structure validation failed, invalidating token');
         }
         return {} as any;
      }
      return token;
    },
    async session({ session, token }: SessionCallbackArgs) {
      if (!token) {
        return null as any;
      }

      // Strict Token Structure Validation
      const validToken = validateTokenStructure(token);
      if (!validToken) {
        console.warn('[auth] Session token structure validation failed');
        return null as any;
      }

      // Validate token version before returning session
      // This ensures tokens are invalidated immediately after logout
      try {
        const isValid = await ensureTokenVersionValid(token);
        if (!isValid) {
          // Token has been revoked - return null to invalidate the session
          console.log('[auth] Token version mismatch - session invalidated', {
            tokenId: token.id,
            tokenRole: token.role,
            tokenVersion: token.tokenVersion
          });
          return null as any;
        }
      } catch (error) {
        // On validation error, fail securely by returning null session
        console.error('[auth] token version validation error:', error, {
          tokenId: token.id,
          tokenRole: token.role,
          tokenVersion: token.tokenVersion
        });
        return null as any;
      }

      // Ensure session.user exists
      if (!session.user) {
        session.user = {
          id: '',
          name: '',
          email: '',
          role: '',
        } as any;
      }

      // Populate session from token
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.role = token.role as string;
      (session.user as any).superAdminRole = (token as any).superAdminRole;
      session.user.hospitalId = token.hospitalId as number | null;
      session.user.doctorHospitalIds = token.doctorHospitalIds as number[] | null;
      session.user.image = token.picture as string | null;
      if (token.staffRoleName) {
        (session.user as any).roleName = token.staffRoleName as string | undefined;
      }
      (session.user as any).permissionKeys = (token as any).permissionKeys as string[] | undefined;
      (session.user as any).isAdmin = (token as any).isAdmin === true;
      (session.user as any).mustChangePassword = (token as any).mustChangePassword === true;
      (session.user as any).isStaff = (token as any).isStaff === true;

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions as any);

// Export the NextAuth handler correctly for the App Router
export { handler as GET, handler as POST };

// Provide legacy `handlers` object for any modules that import it (app route expects `handlers`)
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

    
