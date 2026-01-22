
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validatePasswordAsync } from '@/lib/password-policy';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendSetPasswordEmail } from '@/lib/email-actions';
import { Prisma } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';
import { getVerifiedUser } from '@/lib/permissions';

const HospitalFormSchema = z.object({
  name: z.string().min(2, { message: 'Hospital name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  city: z.string().min(2, 'City is required.'),
  address: z.string().optional(),
  latitude: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  longitude: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  mapDisplayAddress: z.string().optional(),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  contactPhone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  bankDistrict: z.string().optional(),
  bankBranch: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  accountNumber: z.string().regex(/^[0-9]{6,20}$/, { message: 'Account number must be 6-20 digits.' }),
  imageUrl: z.string().optional(),
});

export type HospitalFormState = {
  errors?: {
    name?: string[];
    description?: string[];
    city?: string[];
    address?: string[];
    latitude?: string[];
    longitude?: string[];
    mapDisplayAddress?: string[];
    contactEmail?: string[];
    contactPhone?: string[];
    ownerName?: string[];
    ownerPhone?: string[];
    bankDistrict?: string[];
    bankBranch?: string[];
    password?: string[];
    accountNumber?: string[];
    image?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function saveHospital(
  hospitalId: number | null,
  prevState: HospitalFormState,
  formData: FormData
): Promise<HospitalFormState> {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return {
      message: 'Unauthorized: only super admins can manage hospitals.',
      success: false,
    };
  }
  const superAdminRole = user.superAdminRole || 'maker';
  const canMake = superAdminRole === 'maker' || superAdminRole === 'both';
  if (!canMake) {
    return {
      message: 'Only maker super admins can create or edit hospitals.',
      success: false,
    };
  }
  const actingSuperAdminId = user.id;

  const rawData = Object.fromEntries(formData.entries());

  if (hospitalId && !rawData.password) {
    delete rawData.password;
  }
  const imageUrl = (formData.get('imageUrl') as string) || undefined;
  if (!imageUrl) delete rawData.imageUrl;

  const validatedFields = HospitalFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to save hospital. Please check the fields.',
      success: false,
    };
  }

  const { password, imageUrl: validatedImageUrl, ...hospitalData } = validatedFields.data;

  const dataToSave: any = {
    ...hospitalData,
    status: formData.get('status') === 'on' ? 'active' : 'inactive',
    approvalStatus: hospitalId ? undefined : 'pending',
    createdBySuperAdminId: hospitalId ? undefined : actingSuperAdminId,
    // Handle location fields - only include if they exist
    ...(hospitalData.latitude !== undefined && hospitalData.longitude !== undefined && {
      latitude: hospitalData.latitude,
      longitude: hospitalData.longitude,
      mapDisplayAddress: hospitalData.mapDisplayAddress || null,
    }),
  };

  try {
    if (validatedImageUrl) {
      dataToSave.imageUrl = validatedImageUrl as string;
    }

    if (hospitalId) {
      // For edits, create a pending request instead of updating directly
      const existingHospital = await prisma.hospital.findUnique({ 
        where: { id: hospitalId },
        select: {
          id: true,
          name: true,
          description: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          mapDisplayAddress: true,
          contactEmail: true,
          contactPhone: true,
          ownerName: true,
          ownerPhone: true,
          bankDistrict: true,
          bankBranch: true,
          accountNumber: true,
          imageUrl: true,
          status: true,
        } as any,
      });

      if (!existingHospital) {
        return {
          message: 'Hospital not found.',
          success: false,
        };
      }

      // Check if there's already a pending edit request for this hospital
      const existingPendingRequest = await prisma.hospitalRequest.findFirst({
        where: {
          hospitalId: hospitalId,
          actionType: 'edit',
          status: 'pending',
        } as any,
      });

      if (existingPendingRequest) {
        return {
          message: 'A pending edit request already exists for this hospital. Please wait for it to be reviewed.',
          success: false,
        };
      }

      // Prepare proposed changes (exclude password from being stored as JSON unless provided)
      const proposedChanges: any = { ...dataToSave };
      // Remove password from proposedChanges if not provided (to avoid storing empty/undefined)
      if (password) {
        // Validate & hash password before storing in request
        const pwCheck = await validatePasswordAsync(password);
        if (!pwCheck.valid) {
          return { errors: { password: [pwCheck.errors.join(' ')] }, message: pwCheck.errors.join(' '), success: false };
        }
        proposedChanges.password = await bcrypt.hash(password, 10);
        proposedChanges.mustChangePassword = true;
      } else {
        // Don't include password fields if not changing password
        delete proposedChanges.password;
        delete proposedChanges.mustChangePassword;
      }
      
      // Create pending edit request
      await prisma.hospitalRequest.create({
        data: {
          actionType: 'edit',
          hospitalId: hospitalId,
          proposedChanges: proposedChanges as any,
          makerId: actingSuperAdminId,
          status: 'pending',
        } as any,
      });

      await createAuditLog({
        actorId: actingSuperAdminId,
        actorType: 'SuperAdmin',
        action: 'CREATE_HOSPITAL_EDIT_REQUEST',
        targetId: hospitalId,
        targetType: 'Hospital',
        changes: proposedChanges
      });

      revalidatePath('/super-admin/hospitals');
      revalidatePath('/super-admin/hospital-approvals');
      return {
        success: true,
        message: 'Hospital edit request submitted and is pending approval.',
      };
    } else {
       // If admin provided a password, hash it and force change on first login.
      if (password) {
        const pwCheck = await validatePasswordAsync(password);
        if (!pwCheck.valid) {
          return { errors: { password: [pwCheck.errors.join(' ')] }, message: pwCheck.errors.join(' '), success: false };
        }
        dataToSave.password = await bcrypt.hash(password, 10);
        dataToSave.mustChangePassword = true;
        dataToSave.status = 'inactive'; // keep inactive until approved
        
        const created = await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30 } });
        const emailResult = await sendWelcomeEmail('hospital', { name: created.name, email: created.contactEmail });

        if (!emailResult.success) {
          // Do NOT delete the created hospital when a password was provided.
          // Email is best-effort in this flow; log the failure and continue.
          console.error('[saveHospital] Welcome email failed but hospital retained:', emailResult.error);
          await createAuditLog({
            actorId: actingSuperAdminId,
            actorType: 'SuperAdmin',
            action: 'CREATE_HOSPITAL',
            targetId: created.id,
            targetType: 'Hospital',
            changes: { ...dataToSave, password: '***' }
          });
          revalidatePath('/super-admin/hospitals');
          revalidatePath('/super-admin/hospital-approvals');
          return { success: true, message: `Hospital created but welcome email failed: ${emailResult.error}` };
        }

        await createAuditLog({
          actorId: actingSuperAdminId,
          actorType: 'SuperAdmin',
          action: 'CREATE_HOSPITAL',
          targetId: created.id,
          targetType: 'Hospital',
          changes: { ...dataToSave, password: '***' }
        });

      } else {
        // If no password was provided, create with a temp hash and send a "set password" link.
        const tempPassword = crypto.randomBytes(16).toString('hex');
        dataToSave.password = await bcrypt.hash(tempPassword, 10);
        dataToSave.mustChangePassword = true;
        dataToSave.status = 'inactive'; // keep inactive until approved

        const created = await prisma.hospital.create({ data: { ...dataToSave, startTime: '08:00', endTime: '18:00', bookingWindow: 30 } });
        
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error('AUTH_SECRET is not set.');
        const token = jwt.sign({ userId: created.id, userType: 'hospital', email: created.contactEmail }, secret, { expiresIn: '1h' });
        const emailResult = await sendSetPasswordEmail(created.contactEmail, token);
        
        if (!emailResult.success) {
            // Rollback
            await prisma.hospital.delete({ where: { id: created.id } });
            console.error('[saveHospital] Email failed, hospital deleted:', emailResult.error);
            return { message: `Hospital creation failed: Could not send activation email. ${emailResult.error}`, success: false };
        }

        await createAuditLog({
          actorId: actingSuperAdminId,
          actorType: 'SuperAdmin',
          action: 'CREATE_HOSPITAL',
          targetId: created.id,
          targetType: 'Hospital',
          changes: { ...dataToSave, password: '***' }
        });
      }
      
      // Create the Owner role for the new hospital regardless of password flow
      const hospitalRecord = await prisma.hospital.findFirst({ where: { contactEmail: dataToSave.contactEmail }});
      if (hospitalRecord) {
        try {
            const ownerRole = await prisma.role.create({ data: { name: 'Owner', hospitalId: hospitalRecord.id, isAdmin: true } });
            const allPerms = await prisma.permission.findMany({ select: { id: true } });
            if (allPerms.length > 0) {
            const rp = allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id, allowed: true }));
            await prisma.rolePermission.createMany({ data: rp });
            }
        } catch (err) {
            console.error('[create hospital owner role] error', err);
        }
      }
    }

    revalidatePath('/super-admin/hospitals');
    revalidatePath('/super-admin/hospital-approvals');
    return {
      success: true,
      message: `Hospital ${hospitalId ? 'updated' : 'added'} successfully.`,
    };
  } catch (error: any) {
    console.error('[saveHospital] caught error', error);
    if (error?.code === 'P2002') {
      return {
        message: `A hospital with the same unique information already exists.`,
        success: false,
      };
    }
    return {
      message: `Database Error: Failed to save hospital.`,
      success: false,
    };
  }
}

export async function updateHospitalStatus(hospitalId: number, status: 'active' | 'inactive') {
  try {
    const user = await getVerifiedUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, message: 'Unauthorized: only super admins can update hospital status.' };
    }
    const superAdminRole = user.superAdminRole || 'maker';
    const canMake = superAdminRole === 'maker' || superAdminRole === 'both';
    if (!canMake) {
      return { success: false, message: 'Only maker super admins can update hospital status.' };
    }

    await prisma.hospital.update({ where: { id: hospitalId }, data: { status } });
    
    await createAuditLog({
      actorId: user.id,
      actorType: 'SuperAdmin',
      action: 'UPDATE_HOSPITAL_STATUS',
      targetId: hospitalId,
      targetType: 'Hospital',
      changes: { status }
    });

    revalidatePath('/super-admin/hospitals');
    revalidatePath('/super-admin/hospital-approvals');
    return { success: true, message: `Hospital has been ${status === 'active' ? 'activated' : 'deactivated'}.` };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to update hospital status.' };
  }
}

export async function deleteHospital(hospitalId: number): Promise<{ success: boolean; message: string }> {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized: only super admins can delete hospitals.' };
  }
  const superAdminRole = user.superAdminRole || 'maker';
  const canMake = superAdminRole === 'maker' || superAdminRole === 'both';
  if (!canMake) {
    return { success: false, message: 'Only maker super admins can delete hospitals.' };
  }
  const actingSuperAdminId = user.id;

  try {
    // Verify hospital exists
    const hospital = await prisma.hospital.findUnique({ 
      where: { id: hospitalId },
      select: { id: true, name: true } as any,
    });
    
    if (!hospital) {
      return { success: false, message: 'Hospital not found.' };
    }

    // Check if there's already a pending delete request for this hospital
    const existingPendingRequest = await prisma.hospitalRequest.findFirst({
      where: {
        hospitalId: hospitalId,
        actionType: 'delete',
        status: 'pending',
      } as any,
    });

    if (existingPendingRequest) {
      return { 
        success: false, 
        message: 'A pending delete request already exists for this hospital. Please wait for it to be reviewed.' 
      };
    }

    // Create pending delete request instead of deleting immediately
    await prisma.hospitalRequest.create({
      data: {
        actionType: 'delete',
        hospitalId: hospitalId,
        makerId: actingSuperAdminId,
        status: 'pending',
      } as any,
    });

    await createAuditLog({
      actorId: actingSuperAdminId,
      actorType: 'SuperAdmin',
      action: 'CREATE_HOSPITAL_DELETE_REQUEST',
      targetId: hospitalId,
      targetType: 'Hospital'
    });

    revalidatePath('/super-admin/hospitals');
    revalidatePath('/super-admin/hospital-approvals');
    return { success: true, message: 'Hospital delete request submitted and is pending approval.' };
  } catch (error: any) {
    console.error("Failed to create delete request:", error);
    if (error?.code === 'P2002') {
      return { success: false, message: 'A pending delete request for this hospital already exists.' };
    }
    return { success: false, message: 'Database Error: Failed to create delete request.' };
  }
}

export async function getHospitals(page: number, limit: number, query: string) {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return []; // Or throw error, but empty array is safer for UI
  }

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { city: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }
    : {};
  const results = await prisma.hospital.findMany({
    where: where as any,
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      mapDisplayAddress: true,
      ownerName: true,
      ownerPhone: true,
      bankDistrict: true,
      bankBranch: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      approvalStatus: true as any,
      createdBySuperAdminId: true as any,
      approvedBySuperAdminId: true as any,
      approvedAt: true as any,
      imageUrl: true,
      accountNumber: true,
      mustChangePassword: true,
    } as any,
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return results;
}

export async function getHospitalsCount(query: string) {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return 0;
  }
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { city: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }
    : {};
  return await prisma.hospital.count({ where: where as any });
}

export async function getPendingHospitals() {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return [];
  }
  return prisma.hospital.findMany({
    where: { approvalStatus: 'pending' } as any,
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      address: true,
      contactEmail: true,
      contactPhone: true,
      imageUrl: true,
      status: true,
      approvalStatus: true as any,
      createdAt: true,
      createdBySuperAdmin: { select: { id: true, name: true, email: true } } as any,
    } as any,
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewHospital(hospitalId: number, decision: 'approved' | 'rejected') {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized: only super admins can review hospitals.' };
  }

  const actingSuperAdminId = user.id;
  const superAdminRole = user.superAdminRole || 'maker';

  const canCheck = superAdminRole === 'checker' || superAdminRole === 'both';
  if (!canCheck) {
    return { success: false, message: 'Only checker super admins can approve or reject hospitals.' };
  }

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { createdBySuperAdminId: true as any, approvalStatus: true as any } as any }) as any;
  if (!hospital) return { success: false, message: 'Hospital not found.' };
  if (hospital.approvalStatus !== 'pending') {
    return { success: false, message: 'Hospital has already been reviewed.' };
  }
  if (hospital.createdBySuperAdminId && hospital.createdBySuperAdminId === actingSuperAdminId) {
    return { success: false, message: 'Makers cannot approve their own hospital creations.' };
  }

  await prisma.hospital.update({
    where: { id: hospitalId },
    data: {
      approvalStatus: decision as any,
      approvedBySuperAdminId: actingSuperAdminId as any,
      approvedAt: new Date() as any,
      status: decision === 'approved' ? 'active' : 'inactive',
    } as any,
  });

  await createAuditLog({
    actorId: actingSuperAdminId,
    actorType: 'SuperAdmin',
    action: 'REVIEW_HOSPITAL_CREATION',
    targetId: hospitalId,
    targetType: 'Hospital',
    changes: { decision }
  });

  revalidatePath('/super-admin/hospitals');
  revalidatePath('/super-admin/hospital-approvals');
  return { success: true, message: `Hospital ${decision}.` };
}

export async function getPendingHospitalRequests() {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return [];
  }
  const requests = await prisma.hospitalRequest.findMany({
    where: { status: 'pending' },
    include: {
      hospital: {
        select: {
          id: true,
          name: true,
          description: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          mapDisplayAddress: true,
          contactEmail: true,
          contactPhone: true,
          accountNumber: true,
          ownerName: true,
          ownerPhone: true,
          bankDistrict: true,
          bankBranch: true,
          imageUrl: true,
          status: true,
        },
      },
      maker: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter out password from proposedChanges in the response
  return requests.map((req) => {
    const proposedChanges = req.proposedChanges as any;
    if (proposedChanges && typeof proposedChanges === 'object') {
      const { password, ...safeChanges } = proposedChanges;
      return { ...req, proposedChanges: safeChanges };
    }
    return req;
  });
}

export async function reviewHospitalRequest(
  requestId: number,
  decision: 'approved' | 'rejected',
  comments?: string
): Promise<{ success: boolean; message: string }> {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, message: 'Unauthorized: only super admins can review requests.' };
  }

  const actingSuperAdminId = user.id;
  const superAdminRole = user.superAdminRole || 'maker';

  const canCheck = superAdminRole === 'checker' || superAdminRole === 'both';
  if (!canCheck) {
    return { success: false, message: 'Only checker super admins can approve or reject requests.' };
  }

  try {
    const request = await prisma.hospitalRequest.findUnique({
      where: { id: requestId },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            contactEmail: true,
            contactPhone: true,
            imageUrl: true,
            status: true,
          }
        }
      } as any,
    }) as any;

    if (!request) {
      return { success: false, message: 'Request not found.' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: 'Request has already been reviewed.' };
    }

    if (request.makerId === actingSuperAdminId) {
      return { success: false, message: 'Makers cannot approve their own requests.' };
    }

    // Update request status
    await prisma.hospitalRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        checkerId: actingSuperAdminId,
        reviewedAt: new Date(),
        comments: comments || null,
      } as any,
    });

    await createAuditLog({
      actorId: actingSuperAdminId,
      actorType: 'SuperAdmin',
      action: 'REVIEW_HOSPITAL_REQUEST',
      targetId: request.hospitalId,
      targetType: 'Hospital',
      changes: { requestId, decision, actionType: request.actionType }
    });

    // If approved, apply the changes
    if (decision === 'approved') {
      if (request.actionType === 'edit') {
        const proposedChanges = request.proposedChanges as any;
        // Remove password from update if it wasn't changed (to avoid unnecessary updates)
        const updateData: any = { ...proposedChanges };
        if (!proposedChanges.password) {
          delete updateData.password;
          delete updateData.mustChangePassword;
        }

        await prisma.hospital.update({
          where: { id: request.hospitalId },
          data: updateData as any,
        });
      } else if (request.actionType === 'delete') {
        // Perform soft delete (set status to inactive) or hard delete as per policy
        // Using soft delete by setting status to 'inactive' and adding a deleted flag
        // You can change this to hard delete if preferred
        await prisma.$transaction(async (tx) => {
          const doctorsInHospital = await tx.doctor.findMany({
            where: { hospitals: { some: { hospitalId: request.hospitalId } } },
            select: { id: true, _count: { select: { hospitals: true } } },
          });

          const doctorsToDelete = doctorsInHospital
            .filter((d: any) => d._count.hospitals === 1)
            .map((d: any) => d.id);

          await tx.appointment.deleteMany({ where: { hospitalId: request.hospitalId } });
          await tx.doctorSchedule.deleteMany({ where: { hospitalId: request.hospitalId } });
          await tx.rolePermission.deleteMany({ where: { role: { hospitalId: request.hospitalId } } });
          await tx.role.deleteMany({ where: { hospitalId: request.hospitalId } });
          await tx.user.deleteMany({ where: { hospitalId: request.hospitalId } });
          await tx.specialty.deleteMany({ where: { hospitalId: request.hospitalId } });
          await tx.emailSettings.deleteMany({ where: { hospitalId: request.hospitalId } });
          
          await tx.doctorsOnHospitals.deleteMany({ where: { hospitalId: request.hospitalId } });

          if (doctorsToDelete.length > 0) {
            await tx.doctor.deleteMany({ where: { id: { in: doctorsToDelete } } });
          }

          await tx.hospital.delete({ where: { id: request.hospitalId } });
        });
      }
    }

    revalidatePath('/super-admin/hospitals');
    revalidatePath('/super-admin/hospital-approvals');
    return { 
      success: true, 
      message: `Hospital ${request.actionType} request ${decision}${comments ? `: ${comments}` : '.'}` 
    };
  } catch (error: any) {
    console.error('[reviewHospitalRequest] error', error);
    return { success: false, message: `Database Error: Failed to review request.` };
  }
}
