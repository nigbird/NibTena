
"use server";

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { saveImage } from '@/lib/image-upload';
import { auth } from '@/../../auth';
import { requirePermission } from '@/lib/permissions';

const AddSpecialtySchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

export type SpecialtyActionState = {
  errors?: { name?: string[] };
  message?: string | null;
  success?: boolean;
};

export async function getHospitalSpecialties(hospitalId: number) {
  return await prisma.specialty.findMany({
    where: { hospitalId },
    orderBy: { name: 'asc' },
  });
}

export async function addSpecialty(hospitalId: number, prevState: SpecialtyActionState, formData: FormData) : Promise<SpecialtyActionState> {
  const allowed = await requirePermission('Settings:Manage');
  if (!allowed) return { success: false, message: 'Unauthorized' };

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
    await prisma.specialty.create({ data: { name: parsed.data.name, hospitalId } });
    revalidatePath('/hospital-admin/settings');
    return { message: 'Specialty added.', success: true };
  } catch (error) {
    console.error('[addSpecialty] error', error);
    return { message: 'Failed to add specialty.', success: false };
  }
}

export async function updateSpecialty(hospitalId: number, specialtyId: number, prevState: SpecialtyActionState, formData: FormData) : Promise<SpecialtyActionState> {
  const allowed = await requirePermission('Settings:Manage');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  const raw = Object.fromEntries(formData.entries()) as any;
  const parsed = AddSpecialtySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as any, message: 'Invalid specialty name.', success: false };
  }

  try {
    const spec = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!spec || spec.hospitalId !== hospitalId) return { message: 'Not found.', success: false };

    await prisma.specialty.update({ where: { id: specialtyId }, data: { name: parsed.data.name } });
    revalidatePath('/hospital-admin/settings');
    return { message: 'Specialty updated.', success: true };
  } catch (error) {
    console.error('[updateSpecialty] error', error);
    return { message: 'Failed to update specialty.', success: false };
  }
}

export async function getHospitalById(hospitalId: number) {
    return await prisma.hospital.findUnique({
        where: { id: hospitalId }
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
  const allowed = await requirePermission('Settings:Manage');
  if (!allowed) return { success: false, message: "Unauthorized." };

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
    console.error("Failed to update hospital settings:", error);
    return { success: false, message: 'A database error occurred.' };
  }
}

export async function toggleSpecialtyActive(specialtyId: number) {
  const allowed = await requirePermission('Settings:Manage');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    const spec = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!spec) return { success: false, message: 'Not found.' };
    await prisma.specialty.update({ where: { id: specialtyId }, data: { active: !spec.active } });
    revalidatePath('/hospital-admin/settings');
    return { success: true, message: 'Specialty toggled.' };
  } catch (error) {
    console.error('[toggleSpecialtyActive] error', error);
    return { success: false, message: 'Failed to toggle specialty.' };
  }
}

export async function deleteSpecialty(specialtyId: number) {
  const allowed = await requirePermission('Settings:Manage');
  if (!allowed) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.specialty.delete({ where: { id: specialtyId } });
    revalidatePath('/hospital-admin/settings');
    return { success: true, message: 'Specialty deleted.' };
  } catch (error) {
    console.error('[deleteSpecialty] error', error);
    return { success: false, message: 'Failed to delete specialty.' };
  }
}
