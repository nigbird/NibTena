

import { auth } from '../../auth';
import { prisma } from '@/lib/prisma';

export async function requirePermission(key: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user) {
      return false;
    }

    const user: any = session.user;
    
    // Superadmin and any user flagged as admin in the session have all permissions
    if (user.isAdmin) {
      return true;
    }

    // Check against the permission keys attached to the session
    const permissionKeys = user.permissionKeys || [];
    if (permissionKeys.includes(key)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`[requirePermission] Error checking permission for key "${key}":`, error);
    return false;
  }
}

export async function requireAnyPermission(keys: string[]): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user) {
      return false;
    }

    const user: any = session.user;
    if (user.isAdmin) {
      return true;
    }
    
    const permissionKeys = user.permissionKeys || [];
    for (const key of keys) {
      if (permissionKeys.includes(key)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`[requireAnyPermission] Error checking permissions for keys "${keys.join(', ')}":`, error);
    return false;
  }
}


export async function isHospitalOwnerFor(hospitalId: number): Promise<boolean> {
    try {
        const session = await auth();
        if (!session?.user || !session.user.hospitalId) {
            return false;
        }

        const user: any = session.user;

        // An "owner" is a user whose role is 'hospital' and whose hospitalId in the session matches
        // the one we're checking against, AND they have the isAdmin flag.
        return (
            user.role === 'hospital' &&
            user.hospitalId === hospitalId &&
            user.isAdmin === true
        );
    } catch (error) {
        console.error(`[isHospitalOwnerFor] Error checking ownership for hospital ID ${hospitalId}:`, error);
        return false;
    }
}
