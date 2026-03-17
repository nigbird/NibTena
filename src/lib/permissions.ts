
import { auth } from '../../auth';
import { prisma } from '@/lib/prisma';
import { cache } from 'react';

// Define the shape of the verified user data
export type VerifiedUser = {
  id: number;
  isAdmin: boolean;
  permissions: string[];
  hospitalId: number | null;
  role: string; // The verified role (e.g. 'superadmin', 'hospital', 'doctor')
  superAdminRole?: string; // 'maker', 'checker', 'both'
  entityType?: 'hospital' | 'user' | 'doctor' | 'patient' | 'superadmin';
};

// Cache the verification to avoid multiple DB calls in one request
// This ensures we don't hit the DB repeatedly for multiple permission checks in the same render/action
export const getVerifiedUser = cache(async (): Promise<VerifiedUser | null> => {
  const session = await auth();
  if (!session?.user) return null;

  // We trust the ID and Email from the session as they are the identity.
  // We do NOT trust the 'role', 'isAdmin', or 'permissionKeys' claims for authorization.
  // We use 'role' only to determine WHICH table to check, and then we VERIFY that the user exists
  // in that table with the matching email.
  const { id: idStr, role, email, isStaff } = session.user as any;
  const id = Number(idStr);
  
  if (!id || isNaN(id) || !role || !email) return null;

  try {
    if (role === 'superadmin') {
      const admin = await prisma.superAdmin.findUnique({
        where: { id, email }, // Verify ID and Email match
      });
      if (!admin) return null;
      return { 
        id: admin.id,
        isAdmin: true, 
        permissions: [], 
        hospitalId: null, 
        role: 'superadmin',
        superAdminRole: admin.role,
        entityType: 'superadmin'
      };
    }
    
    if (role === 'hospital') {
      if (isStaff) {
         const user = await prisma.user.findUnique({
            where: { id, email },
            include: { role: { include: { permissions: { include: { permission: true } } } } }
         });
         
         if (!user) return null;
         
         // If user exists but has no role, they have no permissions
         if (!user.role) return { 
            id: user.id, 
            isAdmin: false, 
            permissions: [], 
            hospitalId: user.hospitalId, 
            role: 'hospital',
            entityType: 'user'
         };
         
         return { 
           id: user.id,
           isAdmin: user.role.isAdmin, 
           permissions: user.role.permissions.map(p => p.permission.key),
           hospitalId: user.hospitalId,
           role: 'hospital',
           entityType: 'user'
         };
      } else {
         // Main hospital account
         const hospital = await prisma.hospital.findUnique({
            where: { id, contactEmail: email } // verify email matches
         });
         if (!hospital) return null;
         
         return { 
            id: hospital.id, 
            isAdmin: true, 
            permissions: [], 
            hospitalId: hospital.id, 
            role: 'hospital',
            entityType: 'hospital'
         };
      }
    }
    
    if (role === 'doctor') {
       const doctor = await prisma.doctor.findUnique({
          where: { id, contact: email }
       });
       if (!doctor) return null;
       // Doctors have no specific permissions system yet, but they are valid users
       return { 
            id: doctor.id, 
            isAdmin: false, 
            permissions: [], 
            hospitalId: null, 
            role: 'doctor',
            entityType: 'doctor'
       };
    }

    if (role === 'patient') {
        // Patient portal restricted to miniapp only
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        if (!cookieStore.get('miniapp_session')) {
            console.log('[getVerifiedUser] Patient access restricted to Mini App only (no miniapp_session)');
            return null;
        }

        const patient = await prisma.patient.findUnique({
            where: { id }
        });
        if (!patient) return null;
        return { 
            id: patient.id, 
            isAdmin: false, 
            permissions: [], 
            hospitalId: null, 
            role: 'patient',
            entityType: 'patient'
        };
    }
    
  } catch (err) {
    console.error('[getVerifiedUser] DB Error:', err);
    return null;
  }
  
  return null;
});

export async function requirePermission(key: string): Promise<boolean> {
  try {
    const user = await getVerifiedUser();
    if (!user) return false;

    if (user.isAdmin) return true;
    
    return user.permissions.includes(key);
  } catch (error) {
    console.error(`[requirePermission] Error checking permission for key "${key}":`, error);
    return false;
  }
}

export async function requireAnyPermission(keys: string[]): Promise<boolean> {
  try {
    const user = await getVerifiedUser();
    if (!user) return false;

    if (user.isAdmin) return true;
    
    return keys.some(key => user.permissions.includes(key));
  } catch (error) {
    console.error(`[requireAnyPermission] Error checking permissions for keys "${keys.join(', ')}":`, error);
    return false;
  }
}

export async function isHospitalOwnerFor(hospitalId: number): Promise<boolean> {
    try {
        const user = await getVerifiedUser();
        if (!user) return false;

        // An "owner" is a user whose role is 'hospital' (verified),
        // matches the hospitalId, and has isAdmin flag.
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

export async function requireHospitalPermission(key: string, hospitalId: number): Promise<boolean> {
  try {
    const user = await getVerifiedUser();
    if (!user) return false;

    // Superadmins and global admins have access
    // Note: We check role === 'superadmin' explicitly to distinguish from hospital admins
    if (user.role === 'superadmin') return true;

    // Hospital-scoped users must belong to the hospital
    if (user.role === 'hospital') {
      // CRITICAL: Prevent IDOR by verifying the user belongs to the requested hospital
      if (user.hospitalId !== hospitalId) {
        return false;
      }

      // If they belong to the hospital, check if they are admin OR have the specific permission
      if (user.isAdmin) return true;
      return user.permissions.includes(key);
    }

    return false;
  } catch (error) {
    console.error(`[requireHospitalPermission] Error checking permission for key "${key}" and hospital ${hospitalId}:`, error);
    return false;
  }
}
