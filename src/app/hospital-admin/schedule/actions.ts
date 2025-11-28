
'use server';

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission } from '@/lib/permissions';
import { auth } from '@/../../auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TimeSlot } from '@/lib/definitions';
import { parse as parseTime, isBefore, isEqual, isAfter } from 'date-fns';
import { doSlotsOverlap } from '@/lib/time-utils';

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: {
            hospitals: {
                some: { hospitalId }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });
}

export async function getDoctorSchedules(doctorId: number, hospitalId: number) {
    return await prisma.doctorSchedule.findMany({
        where: {
            doctorId,
            hospitalId,
        }
    });
}

export async function getHospitalSettings(hospitalId: number) {
    return await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
            startTime: true,
            endTime: true,
        }
    });
}

const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
}).refine(data => {
    if(!data.startTime || !data.endTime) return true; // Let required validation handle this
    return isBefore(parseTime(data.startTime, 'HH:mm', new Date()), parseTime(data.endTime, 'HH:mm', new Date()))
}, {
    message: "End time must be after start time",
    path: ["endTime"],
});

const ScheduleDaySchema = z.object({
  dayOfWeek: z.string(),
  shift: z.string(),
  workingHours: z.array(TimeSlotSchema),
  breakHours: z.array(TimeSlotSchema),
  patientsPerHour: z.coerce.number().min(1, "Must be at least 1").optional(),
});

const ScheduleFormSchema = z.object({
  doctorId: z.coerce.number(),
  schedules: z.array(ScheduleDaySchema),
});

export type ScheduleSaveState = {
  errors?: {
    schedules?: { [key: number]: { [key: string]: string } },
    general?: string,
  },
  message?: string | null;
  success?: boolean;
};

export async function saveDoctorSchedule(
    hospitalId: number,
    prevState: ScheduleSaveState,
    formData: FormData
): Promise<ScheduleSaveState> {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Unauthorized' };

    const allowed = await requireHospitalPermission('Schedules:Update', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    const rawData = formData.get('scheduleData');

    if (!rawData || typeof rawData !== 'string') {
        return { success: false, message: "Invalid schedule data." };
    }

    let parsedData;
    try {
        parsedData = JSON.parse(rawData);
    } catch (e) {
        return { success: false, message: "Failed to parse schedule data." };
    }

    const validatedFields = ScheduleFormSchema.safeParse(parsedData);

    if (!validatedFields.success) {
        // This validation is a fallback; primary validation is done below.
        return {
            message: 'Invalid data format. Please check the fields.',
            success: false,
        };
    }

    const { doctorId, schedules } = validatedFields.data;

    try {
        const [hospitalSettings, otherSchedules] = await Promise.all([
            prisma.hospital.findUnique({ where: { id: hospitalId } }),
            prisma.doctorSchedule.findMany({ where: { doctorId, NOT: { hospitalId } } })
        ]);

        if (!hospitalSettings) return { success: false, message: 'Hospital not found.' };

        const hospitalOpen = parseTime(hospitalSettings.startTime, 'HH:mm', new Date());
        const hospitalClose = parseTime(hospitalSettings.endTime, 'HH:mm', new Date());
        const fieldErrors: { [key: number]: { [key: string]: string } } = {};

        for (const [index, daySchedule] of schedules.entries()) {
             if (daySchedule.shift === 'unavailable') continue;

            const { dayOfWeek, workingHours, breakHours } = daySchedule;
            
            if (workingHours.length === 0) {
                 fieldErrors[index] = { ...fieldErrors[index], workingHours: 'At least one working slot is required for an available day.' };
            }
            
            // 1. Validate against hospital operating hours
            for (const [slotIndex, slot] of workingHours.entries()) {
                const slotStart = parseTime(slot.startTime, 'HH:mm', new Date());
                const slotEnd = parseTime(slot.endTime, 'HH:mm', new Date());

                if (isBefore(slotStart, hospitalOpen) || isAfter(slotEnd, hospitalClose)) {
                    fieldErrors[index] = { ...fieldErrors[index], [`workingHours.${slotIndex}`]: `Outside hospital hours (${hospitalSettings.startTime}-${hospitalSettings.endTime})` };
                }
            }

            // 2. Validate break hours are within working hours
            for (const [slotIndex, breakSlot] of breakHours.entries()) {
                 const isWithinWorkingHours = workingHours.some(workSlot => 
                    !isBefore(parseTime(breakSlot.startTime, 'HH:mm', new Date()), parseTime(workSlot.startTime, 'HH:mm', new Date())) &&
                    !isAfter(parseTime(breakSlot.endTime, 'HH:mm', new Date()), parseTime(workSlot.endTime, 'HH:mm', new Date()))
                );
                if (!isWithinWorkingHours) {
                    fieldErrors[index] = { ...fieldErrors[index], [`breakHours.${slotIndex}`]: 'Break must be within a working slot.' };
                }
            }

            // 3. Overlaps within the same day
            const allWorkingSlots = [...workingHours];
            for (let i = 0; i < allWorkingSlots.length; i++) {
                for (let j = i + 1; j < allWorkingSlots.length; j++) {
                    if (doSlotsOverlap(allWorkingSlots[i], allWorkingSlots[j])) {
                        fieldErrors[index] = { ...fieldErrors[index], workingHours: 'Working slots cannot overlap.' };
                    }
                }
            }
        }
        
        if (Object.keys(fieldErrors).length > 0) {
            return {
                success: false,
                message: "Please correct the highlighted errors.",
                errors: { schedules: fieldErrors }
            };
        }


        // Save schedules if validation passes
        for (const daySchedule of schedules) {
            if (daySchedule.shift === 'unavailable') {
                await prisma.doctorSchedule.deleteMany({
                    where: { doctorId, hospitalId, dayOfWeek: daySchedule.dayOfWeek },
                });
            } else {
                 await prisma.doctorSchedule.upsert({
                    where: {
                        doctorId_hospitalId_dayOfWeek: {
                            doctorId,
                            hospitalId,
                            dayOfWeek: daySchedule.dayOfWeek,
                        },
                    },
                    update: {
                        workingHours: daySchedule.workingHours,
                        breakHours: daySchedule.breakHours,
                        patientsPerHour: daySchedule.patientsPerHour || 2,
                    },
                    create: {
                        doctorId,
                        hospitalId,
                        dayOfWeek: daySchedule.dayOfWeek,
                        workingHours: daySchedule.workingHours,
                        breakHours: daySchedule.breakHours,
                        patientsPerHour: daySchedule.patientsPerHour || 2,
                    },
                });
            }
        }

        revalidatePath('/hospital-admin/schedule');
        return { success: true, message: 'Schedule updated successfully.' };

    } catch (error) {
        console.error("Failed to save schedule:", error);
        return { success: false, message: 'A database error occurred.' };
    }
}
