
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isBefore, parse } from 'date-fns';
import { getHospitalSettings } from '@/app/hospital-admin/schedule/actions';

export type TimeSlot = {
  startTime: string;
  endTime: string;
};

export type DaySchedule = {
  dayOfWeek: string;
  workingHours: TimeSlot[];
  breakHours: TimeSlot[];
  active: boolean;
};

const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
}).refine(data => isBefore(parse(data.startTime, 'HH:mm', new Date()), parse(data.endTime, 'HH:mm', new Date())), {
  message: "End time must be after start time",
  path: ['endTime'],
});

const DayScheduleSchema = z.object({
  dayOfWeek: z.string(),
  workingHours: z.array(TimeSlotSchema),
  breakHours: z.array(TimeSlotSchema),
  active: z.boolean(),
});

export async function getDoctorSchedulesForHospital(doctorId: number, hospitalId: number) {
    return await prisma.doctorSchedule.findMany({
        where: { doctorId, hospitalId },
        select: {
            dayOfWeek: true,
            workingHours: true,
            breakHours: true,
        }
    });
}

function parseTime(timeStr: string) {
    return parse(timeStr, 'HH:mm', new Date());
}

function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot) {
    const start1 = parseTime(slot1.startTime);
    const end1 = parseTime(slot1.endTime);
    const start2 = parseTime(slot2.startTime);
    const end2 = parseTime(slot2.endTime);
    return isBefore(start1, end2) && isBefore(start2, end1);
}

export async function saveDoctorSchedulesForHospital(
  doctorId: number,
  hospitalId: number,
  schedules: DaySchedule[]
): Promise<{ success: boolean; message: string; }> {
        // permission guard: allow if caller has schedule management/create/edit/delete or is hospital owner
        try {
            const { requireAnyPermission, isHospitalOwnerFor } = await import('@/lib/permissions');
            const allowed = await requireAnyPermission(['SCHEDULE_MANAGE', 'SCHEDULE_CREATE', 'SCHEDULE_EDIT', 'SCHEDULE_DELETE']);
            if (!allowed) {
                const ownerOk = await isHospitalOwnerFor(hospitalId);
                if (!ownerOk) return { success: false, message: 'Unauthorized' };
            }
        } catch (e) {
            console.error('[saveDoctorSchedulesForHospital] permission check error', e);
            return { success: false, message: 'Unauthorized' };
        }
    const activeSchedules = schedules.filter(s => s.active);

    try {
        const hospitalSettings = await getHospitalSettings(hospitalId);
        if (!hospitalSettings) {
            return { success: false, message: 'Hospital settings not found.' };
        }
        const hospitalOpen = parseTime(hospitalSettings.startTime);
        const hospitalClose = parseTime(hospitalSettings.endTime);

        for (const daySchedule of activeSchedules) {
            const validation = DayScheduleSchema.safeParse(daySchedule);
            if (!validation.success) {
                return { success: false, message: `Invalid format for ${daySchedule.dayOfWeek}: ${validation.error.flatten().fieldErrors}` };
            }
            
            const allSlots = [...daySchedule.workingHours, ...daySchedule.breakHours];

            // 1. Validate against hospital hours
            for (const slot of allSlots) {
                if (isBefore(parseTime(slot.startTime), hospitalOpen) || isBefore(hospitalClose, parseTime(slot.endTime))) {
                    return { success: false, message: `On ${daySchedule.dayOfWeek}, a time slot is outside hospital operating hours (${hospitalSettings.startTime}-${hospitalSettings.endTime}).` };
                }
            }

            // 2. Check for internal overlaps
            for (let i = 0; i < allSlots.length; i++) {
                for (let j = i + 1; j < allSlots.length; j++) {
                    if (doSlotsOverlap(allSlots[i], allSlots[j])) {
                        return { success: false, message: `On ${daySchedule.dayOfWeek}, time slots overlap.` };
                    }
                }
            }
        }

        // --- Save to Database ---
        await prisma.$transaction(async (tx) => {
            // First, delete all existing schedules for this doctor at this hospital
            await tx.doctorSchedule.deleteMany({
                where: { doctorId, hospitalId },
            });

            // Then, create the new active schedules
            if (activeSchedules.length > 0) {
                 await tx.doctorSchedule.createMany({
                    data: activeSchedules.map(s => ({
                        doctorId,
                        hospitalId,
                        dayOfWeek: s.dayOfWeek,
                        workingHours: s.workingHours,
                        breakHours: s.breakHours,
                    })),
                });
            }
        });

        revalidatePath('/doctor-portal/schedule');
        revalidatePath('/hospital-admin/schedule');
        return { success: true, message: 'Your schedule has been updated successfully.' };

    } catch (error) {
        console.error("Failed to save doctor schedule:", error);
        return { success: false, message: 'A database error occurred while saving.' };
    }
}
