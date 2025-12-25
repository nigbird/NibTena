import { getToken } from 'next-auth/jwt';
import ensureTokenVersionValid from './auth-token-version';

export async function tokenVersionIsValidForRequest(req?: any) {
  try {
    const token: any = await (getToken as any)({ req, secret: process.env.AUTH_SECRET });
    if (!token) return false;
    return await ensureTokenVersionValid(token);
  } catch (e) {
    console.error('[validate-token-version] error', e);
    return false;
  }
}

export default tokenVersionIsValidForRequest;
