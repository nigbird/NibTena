import { prisma } from './prisma';
import { headers } from 'next/headers';

export interface AuditLogParams {
  actorId: string | number;
  actorType: 'SuperAdmin' | 'HospitalAdmin' | 'Doctor' | 'User';
  action: string;
  targetId?: string | number;
  targetType?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates a centralized audit log entry.
 * Should be called after any sensitive administrative action.
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    // Safely handle potential undefined prisma if generation failed or context is weird, 
    // though in this codebase prisma is imported from './prisma'
    if (!prisma || !prisma.auditLog) {
      console.warn('AuditLog model not found on prisma client. Ensure prisma generate has been run.');
      return;
    }

    // Automatically capture IP and User Agent if not provided
    let ipAddress = params.ipAddress;
    let userAgent = params.userAgent;

    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers();
        if (!ipAddress) {
          const forwarded = headersList.get('x-forwarded-for');
          ipAddress = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
        }
        if (!userAgent) {
          userAgent = headersList.get('user-agent') || 'unknown';
        }
      } catch (err) {
        // Fallback if headers() is not available (e.g. background job)
        if (!ipAddress) ipAddress = 'system';
        if (!userAgent) userAgent = 'system';
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: String(params.actorId),
        actorType: params.actorType,
        action: params.action,
        targetId: params.targetId ? String(params.targetId) : null,
        targetType: params.targetType,
        changes: params.changes ? params.changes : undefined,
        ipAddress: ipAddress,
        userAgent: userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // We log the error but don't throw, to avoid breaking the main business flow 
    // if logging fails (unless strict compliance requires it).
  }
}
