"use server";

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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
  const raw = Object.fromEntries(formData.entries()) as any;
  const parsed = AddSpecialtySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as any, message: 'Invalid specialty name.', success: false };
  }

  try {
    // Ensure specialty belongs to hospital
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

export async function toggleSpecialtyActive(specialtyId: number) {
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
  try {
    await prisma.specialty.delete({ where: { id: specialtyId } });
    revalidatePath('/hospital-admin/settings');
    return { success: true, message: 'Specialty deleted.' };
  } catch (error) {
    console.error('[deleteSpecialty] error', error);
    return { success: false, message: 'Failed to delete specialty.' };
  }
}
