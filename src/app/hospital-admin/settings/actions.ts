
"use server";

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { saveImage, ImageValidationError } from '@/lib/image-upload';
import { getVerifiedUser, requireHospitalPermission, PAYMENT_SETTINGS_PERMISSION, type VerifiedUser } from '@/lib/permissions';
import { verifyCsrfToken } from '@/lib/csrf';
import { createAuditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { encryptHospitalSecret } from '@/lib/hospital-secret';
import { encryptYagout, decryptYagout, isValidYagoutKey, yagoutHash } from '@/lib/yagout-crypto';
import {
  buildHostedMerchantRequest,
  YAGOUT_CHANNEL_WEB,
  YAGOUT_COUNTRY,
  YAGOUT_CURRENCY,
  YAGOUT_TXN_TYPE,
} from '@/lib/yagout-request';
import { resolveYagoutConfigForHospital, yagoutReturnUrls, YagoutConfigError } from '@/lib/yagout-client';
import { defaultYagoutPostUrl, isAllowedYagoutPostUrl, yagoutAllowedHosts } from '@/lib/yagout-hosts';

const AddSpecialtySchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

export type SpecialtyActionState = {
  errors?: { name?: string[] };
  message?: string | null;
  success?: boolean;
};

export async function getHospitalSpecialties(hospitalId: number) {
  const user = await getVerifiedUser();
  if (!user) return [];
  const allowed = await requireHospitalPermission('Settings:View', hospitalId);
  if (!allowed) return [];

  return await prisma.specialty.findMany({
    where: { hospitalId },
    orderBy: { name: 'asc' },
  });
}

export async function addSpecialty(hospitalId: number, prevState: SpecialtyActionState, formData: FormData) : Promise<SpecialtyActionState> {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const raw = Object.fromEntries(formData.entries()) as any;
  const parsed = AddSpecialtySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as any, message: 'Invalid specialty name.', success: false };
  }

  try {
    const existing = await prisma.specialty.findUnique({ where: { hospitalId_name: { hospitalId, name: parsed.data.name } } });
    if (existing) {
      return { message: 'Specialty already exists for this hospital.', success: false };
    }
    const newSpec = await prisma.specialty.create({ data: { name: parsed.data.name, hospitalId } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'CREATE_SPECIALTY',
      targetId: newSpec.id,
      targetType: 'Specialty',
      changes: { name: parsed.data.name, hospitalId }
    });
    revalidatePath('/hospital-admin/settings');
    return { message: 'Specialty added.', success: true };
  } catch (error) {
    console.error('[addSpecialty] error', error);
    return { message: 'Failed to add specialty.', success: false };
  }
}

export async function updateSpecialty(hospitalId: number, specialtyId: number, prevState: SpecialtyActionState, formData: FormData) : Promise<SpecialtyActionState> {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const raw = Object.fromEntries(formData.entries()) as any;
  const parsed = AddSpecialtySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as any, message: 'Invalid specialty name.', success: false };
  }

  try {
    const spec = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!spec || spec.hospitalId !== hospitalId) return { message: 'Not found.', success: false };

    await prisma.specialty.update({ where: { id: specialtyId }, data: { name: parsed.data.name } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_SPECIALTY',
      targetId: specialtyId,
      targetType: 'Specialty',
      changes: { oldName: spec.name, newName: parsed.data.name }
    });
    revalidatePath('/hospital-admin/settings');
    return { message: 'Specialty updated.', success: true };
  } catch (error) {
    console.error('[updateSpecialty] error', error);
    return { message: 'Failed to update specialty.', success: false };
  }
}

export async function getHospitalById(hospitalId: number) {
  const user = await getVerifiedUser();
  if (!user) return null;
  const allowed = await requireHospitalPermission('Settings:View', hospitalId);
  if (!allowed) return null;

  return await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      description: true,
      imageUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly excluding password
    }
  });
}

const GeneralSettingsSchema = z.object({
  name: z.string().min(2, "Hospital name must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  image: z.instanceof(File).optional(),
});

export type GeneralSettingsState = {
  errors?: {
    name?: string[];
    description?: string[];
    image?: string[];
  };
  message?: string | null;
  success?: boolean;
  updatedHospital?: {
    name: string;
    imageUrl?: string | null;
    city: string;
  }
};

export async function updateHospitalGeneralSettings(
  hospitalId: number,
  prevState: GeneralSettingsState,
  formData: FormData
): Promise<GeneralSettingsState> {
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: "Unauthorized." };
  const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
  if (!allowed) return { success: false, message: "Unauthorized." };
  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const rawData = {
    name: formData.get('name'),
    city: formData.get('city'),
    description: formData.get('description'),
    image: formData.get('image'),
  };

  const imageFile = formData.get('image') as File | null;
  if (!imageFile || imageFile.size === 0) {
    delete rawData.image;
  }

  const validatedFields = GeneralSettingsSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update settings. Please check the fields.',
      success: false,
    };
  }

  const { name, description, image } = validatedFields.data;

  try {
    const dataToUpdate: any = {
      name,
      description,
      city: String(rawData.city),
    };

    if (image) {
      dataToUpdate.imageUrl = await saveImage(image);
    }
    
    const updatedHospital = await prisma.hospital.update({
      where: { id: hospitalId },
      data: dataToUpdate,
    });
    
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_HOSPITAL_GENERAL_SETTINGS',
      targetId: hospitalId,
      targetType: 'Hospital',
      changes: { ...dataToUpdate, imageUrl: dataToUpdate.imageUrl ? 'Updated' : undefined }
    });

    revalidatePath('/hospital-admin/settings');
    revalidatePath(`/user/hospitals/${hospitalId}`);

    return {
      success: true,
      message: 'General settings updated successfully.',
      updatedHospital: {
        name: updatedHospital.name,
        imageUrl: updatedHospital.imageUrl,
        city: updatedHospital.city,
      }
    };
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return { errors: { image: [error.message] }, message: error.message, success: false };
    }
    console.error("Failed to update hospital settings:", error);
    return { success: false, message: 'A database error occurred.' };
  }
}

export async function toggleSpecialtyActive(specialtyId: number) {
  // Resolve hospitalId then check permission
  const spec = await prisma.specialty.findUnique({ where: { id: specialtyId }, select: { hospitalId: true } });
  if (!spec) return { success: false, message: 'Not found.' };
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const allowed = await requireHospitalPermission('Settings:Update', spec.hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    const spec = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!spec) return { success: false, message: 'Not found.' };
    await prisma.specialty.update({ where: { id: specialtyId }, data: { active: !spec.active } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'UPDATE_SPECIALTY_STATUS',
      targetId: specialtyId,
      targetType: 'Specialty',
      changes: { active: !spec.active }
    });
    revalidatePath('/hospital-admin/settings');
    return { success: true, message: 'Specialty toggled.' };
  } catch (error) {
    console.error('[toggleSpecialtyActive] error', error);
    return { success: false, message: 'Failed to toggle specialty.' };
  }
}

export async function deleteSpecialty(specialtyId: number) {
  const spec = await prisma.specialty.findUnique({ where: { id: specialtyId }, select: { hospitalId: true } });
  if (!spec) return { success: false, message: 'Not found.' };
  const user = await getVerifiedUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const allowed = await requireHospitalPermission('Settings:Update', spec.hospitalId);
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.specialty.delete({ where: { id: specialtyId } });
    await createAuditLog({
      actorId: user.id,
      actorType: 'User',
      action: 'DELETE_SPECIALTY',
      targetId: specialtyId,
      targetType: 'Specialty',
    });
    revalidatePath('/hospital-admin/settings');
    return { success: true, message: 'Specialty deleted.' };
  } catch (error) {
    console.error('[deleteSpecialty] error', error);
    return { success: false, message: 'Failed to delete specialty.' };
  }
}

// ---------------------------------------------------------------------------
// YagoutPay (per-hospital merchant credentials)
//
// Every hospital is its own Yagout merchant. The hospital is always the one in
// the caller's session, never a form or argument value, so an admin can only
// ever configure their own hospital. Super admins are deliberately excluded
// (requireHospitalPermission would let them through): they see configured /
// not configured in the hospital list and nothing more.
//
// The encryption key is write-only. It is encrypted at rest and no action here
// returns it, or anything derived from it, to the browser.
// ---------------------------------------------------------------------------

async function getYagoutSettingsActor(): Promise<(VerifiedUser & { hospitalId: number }) | null> {
  const user = await getVerifiedUser();
  if (!user || user.role !== 'hospital' || !user.hospitalId) return null;
  if (!user.isAdmin && !user.permissions.includes(PAYMENT_SETTINGS_PERMISSION)) return null;
  return user as VerifiedUser & { hospitalId: number };
}

export type YagoutSettingsView = {
  meId: string | null;
  hasKey: boolean;
  postUrl: string | null;
  updatedAt: string | null;
  defaultPostUrl: string;
  allowedHosts: string[];
};

export async function getYagoutSettings(): Promise<YagoutSettingsView | null> {
  const user = await getYagoutSettingsActor();
  if (!user) return null;

  const hospital = await prisma.hospital.findUnique({
    where: { id: user.hospitalId },
    select: { yagoutMeId: true, yagoutEncryptionKey: true, yagoutPostUrl: true, yagoutUpdatedAt: true },
  });
  if (!hospital) return null;

  return {
    meId: hospital.yagoutMeId,
    hasKey: !!hospital.yagoutEncryptionKey,
    postUrl: hospital.yagoutPostUrl,
    updatedAt: hospital.yagoutUpdatedAt?.toISOString() ?? null,
    defaultPostUrl: defaultYagoutPostUrl(),
    allowedHosts: yagoutAllowedHosts(),
  };
}

const YagoutSettingsSchema = z.object({
  // Yagout issues numeric merchant ids, but they are identifiers: kept as a
  // string so a leading zero is never lost. Letters/digits only, which also
  // keeps the "|" and "~" framing characters out of the request.
  yagoutMeId: z
    .string()
    .trim()
    .min(1, 'Merchant ID is required.')
    .max(30, 'Merchant ID is too long.')
    .regex(/^[A-Za-z0-9]+$/, 'Merchant ID may contain only letters and digits.'),
  // Blank on update keeps the stored key.
  yagoutEncryptionKey: z
    .string()
    .trim()
    .max(200)
    .refine(v => v === '' || isValidYagoutKey(v), {
      message: 'Encryption key must be base64 that decodes to exactly 32 bytes (AES-256).',
    }),
  yagoutPostUrl: z
    .string()
    .trim()
    .max(500)
    .refine(v => v === '' || isAllowedYagoutPostUrl(v), {
      message: 'Post URL must be https and on an allowed Yagout host.',
    }),
});

export type YagoutSettingsState = {
  errors?: { yagoutMeId?: string[]; yagoutEncryptionKey?: string[]; yagoutPostUrl?: string[] };
  message?: string | null;
  success?: boolean;
};

export async function saveYagoutSettings(prevState: YagoutSettingsState, formData: FormData): Promise<YagoutSettingsState> {
  const user = await getYagoutSettingsActor();
  if (!user) return { success: false, message: 'Unauthorized.' };

  const _csrf = formData.get('_csrf') as string | null;
  if (!(await verifyCsrfToken(_csrf))) {
    return { success: false, message: 'Invalid or missing CSRF token.' };
  }

  const parsed = YagoutSettingsSchema.safeParse({
    yagoutMeId: String(formData.get('yagoutMeId') ?? ''),
    yagoutEncryptionKey: String(formData.get('yagoutEncryptionKey') ?? ''),
    yagoutPostUrl: String(formData.get('yagoutPostUrl') ?? ''),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: 'Please correct the highlighted fields.' };
  }
  const { yagoutMeId, yagoutEncryptionKey, yagoutPostUrl } = parsed.data;
  const hospitalId = user.hospitalId;

  const existing = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { yagoutMeId: true, yagoutEncryptionKey: true, yagoutPostUrl: true },
  });
  if (!existing) return { success: false, message: 'Hospital not found.' };

  if (!yagoutEncryptionKey && !existing.yagoutEncryptionKey) {
    return {
      success: false,
      errors: { yagoutEncryptionKey: ['The encryption key is required the first time.'] },
      message: 'Please correct the highlighted fields.',
    };
  }

  let encryptedKey: string | undefined;
  if (yagoutEncryptionKey) {
    try {
      encryptedKey = encryptHospitalSecret(yagoutEncryptionKey);
    } catch (error) {
      console.error('[saveYagoutSettings] could not encrypt key:', (error as Error).message);
      return { success: false, message: 'Payment settings cannot be saved: the server encryption key is not configured.' };
    }
  }

  try {
    await prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        yagoutMeId,
        ...(encryptedKey ? { yagoutEncryptionKey: encryptedKey } : {}),
        yagoutPostUrl: yagoutPostUrl || null,
        yagoutUpdatedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        success: false,
        errors: { yagoutMeId: ['This Yagout merchant ID is already used by another hospital.'] },
        message: 'This Yagout merchant ID is already used by another hospital.',
      };
    }
    console.error('[saveYagoutSettings] update failed:', (error as Error).message);
    return { success: false, message: 'Failed to save payment settings.' };
  }

  await createAuditLog({
    actorId: user.id,
    actorType: user.entityType === 'hospital' ? 'HospitalAdmin' : 'User',
    action: 'YAGOUT_CONFIG_UPDATED',
    targetId: hospitalId,
    targetType: 'Hospital',
    // Never the key: only whether it changed.
    changes: {
      yagoutMeId,
      previousYagoutMeId: existing.yagoutMeId,
      keyRotated: !!encryptedKey,
      postUrlOverride: yagoutPostUrl || null,
    },
  });

  revalidatePath('/hospital-admin/settings');
  revalidatePath('/super-admin/hospitals');
  return { success: true, message: 'YagoutPay settings saved.' };
}

export type YagoutCheck = { label: string; status: 'pass' | 'warn' | 'fail'; detail: string };

/**
 * Builds, encrypts and hashes a sample request with the saved credentials,
 * exactly as a real payment would, then decrypts it back. Nothing is sent to
 * Yagout (the hosted flow only accepts a browser form post), so a pass proves
 * the stored credentials are well-formed and usable, not that Yagout has
 * activated them: the first real payment confirms that.
 */
export async function testYagoutConfiguration(): Promise<{ success: boolean; checks: YagoutCheck[]; message?: string }> {
  const user = await getYagoutSettingsActor();
  if (!user) return { success: false, checks: [], message: 'Unauthorized.' };

  const checks: YagoutCheck[] = [];

  let config;
  try {
    config = await resolveYagoutConfigForHospital(user.hospitalId);
    checks.push({ label: 'Saved credentials', status: 'pass', detail: `Merchant ID ${config.meId} and an encryption key are saved and the key decrypts.` });
  } catch (error) {
    const detail = error instanceof YagoutConfigError
      ? 'Save a merchant ID and encryption key first (and check the Post URL is on an allowed host).'
      : 'The saved key could not be decrypted on this server (check HOSPITAL_SECRET_KEY).';
    checks.push({ label: 'Saved credentials', status: 'fail', detail });
    return { success: false, checks };
  }

  if (!/^[0-9]+$/.test(config.meId)) {
    checks.push({ label: 'Merchant ID', status: 'warn', detail: `"${config.meId}" is not numeric; Yagout normally issues numeric merchant IDs.` });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!baseUrl) {
    checks.push({ label: 'Return URLs', status: 'fail', detail: 'NEXT_PUBLIC_BASE_URL is not set on the server, so Yagout would have nowhere to return patients.' });
    return { success: false, checks };
  }
  const { successUrl, failureUrl } = yagoutReturnUrls(baseUrl);
  const returnPathOk = [successUrl, failureUrl].every(u => /^[A-Za-z0-9/_]+$/.test(new URL(u).pathname));
  const isHttps = baseUrl.startsWith('https://');
  checks.push({
    label: 'Return URLs',
    status: returnPathOk ? (isHttps ? 'pass' : 'warn') : 'fail',
    detail: `${successUrl} and ${failureUrl}${isHttps ? '' : ' (not https; Yagout production requires https)'}. Register these with Yagout.`,
  });

  checks.push({ label: 'Post URL', status: 'pass', detail: config.postUrl });

  try {
    const orderNo = `test${Date.now().toString(36)}`;
    const amount = '1.00';
    const plaintext = buildHostedMerchantRequest({
      txn: {
        agId: config.aggregatorId,
        meId: config.meId,
        orderNo,
        amount,
        country: YAGOUT_COUNTRY,
        currency: YAGOUT_CURRENCY,
        txnType: YAGOUT_TXN_TYPE,
        successUrl,
        failureUrl,
        channel: YAGOUT_CHANNEL_WEB,
      },
      cust: { custName: 'Test Patient', emailId: 'test@example.com', mobileNo: '251900000000', isLoggedIn: 'Y' },
    });
    const merchantRequest = encryptYagout(plaintext, config.encryptionKey);
    yagoutHash({ meId: config.meId, orderNo, amount, country: YAGOUT_COUNTRY, currency: YAGOUT_CURRENCY }, config.encryptionKey);
    if (decryptYagout(merchantRequest, config.encryptionKey) !== plaintext) {
      throw new Error('round-trip mismatch');
    }
    checks.push({ label: 'Sample request', status: 'pass', detail: 'A sample payment request was built, encrypted, hashed and decrypted back successfully.' });
  } catch (error) {
    checks.push({ label: 'Sample request', status: 'fail', detail: `Could not build a sample request: ${(error as Error).message}` });
  }

  return { success: checks.every(c => c.status !== 'fail'), checks };
}
