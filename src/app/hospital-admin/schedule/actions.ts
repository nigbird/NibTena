
'use server';

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission } from '@/lib/permissions';
import { auth } from '@/../../auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TimeSlot } from '@/lib/definitions';
import { parse, isBefore, isEqual, isAfter } from 'date-fns';

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
});

const ScheduleDaySchema = z.object({
  dayOfWeek: z.string(),
  workingHours: z.array(TimeSlotSchema),
  breakHours: z.array(TimeSlotSchema),
  patientsPerHour: z.number().min(1),
});

const ScheduleFormSchema = z.object({
  doctorId: z.coerce.number(),
  schedules: z.array(ScheduleDaySchema),
});

export type ScheduleSaveState = {
  errors?: Zod.ZodError<z.infer<typeof ScheduleFormSchema>>['formErrors']['fieldErrors'];
  message?: string | null;
  success?: boolean;
};

function parseTime(timeStr: string) {
    return parse(timeStr, 'HH:mm', new Date(Date.UTC(2000, 0, 1)));
}

function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot) {
    const start1 = parseTime(slot1.startTime);
    const end1 = parseTime(slot1.endTime);
    const start2 = parseTime(slot2.startTime);
    const end2 = parseTime(slot2.endTime);

    return isBefore(start1, end2) && isAfter(end1, start2);
}

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
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid data. Please check the fields.',
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

        const hospitalOpen = parseTime(hospitalSettings.startTime);
        const hospitalClose = parseTime(hospitalSettings.endTime);

        for (const daySchedule of schedules) {
            const { dayOfWeek, workingHours, breakHours } = daySchedule;

            // Validate against hospital operating hours
            for (const slot of [...workingHours, ...breakHours]) {
                const slotStart = parseTime(slot.startTime);
                const slotEnd = parseTime(slot.endTime);

                if (isBefore(slotStart, hospitalOpen) || isAfter(slotEnd, hospitalClose)) {
                    return { 
                        success: false, 
                        message: `On ${dayOfWeek}, time slot ${slot.startTime}-${slot.endTime} is outside hospital operating hours (${hospitalSettings.startTime}-${hospitalSettings.endTime}).` 
                    };
                }
            }

            // Overlaps within same day
            const allSlots = [...workingHours, ...breakHours];
            for (let i = 0; i < allSlots.length; i++) {
                for (let j = i + 1; j < allSlots.length; j++) {
                    if (doSlotsOverlap(allSlots[i], allSlots[j])) {
                        return { 
                            success: false, 
                            message: `On ${dayOfWeek}, time slots ${allSlots[i].startTime}-${allSlots[i].endTime} and ${allSlots[j].startTime}-${allSlots[j].endTime} overlap.` 
                        };
                    }
                }
            }

            // Overlaps with other hospitals' schedules
            const otherDaySchedules = otherSchedules.filter(s => s.dayOfWeek === dayOfWeek);

            for (const other of otherDaySchedules) {
                const otherSlots = [...(other.workingHours as TimeSlot[]), ...(other.breakHours as TimeSlot[])];

                for (const currentSlot of allSlots) {
                    for (const otherSlot of otherSlots) {
                        if (doSlotsOverlap(currentSlot, otherSlot)) {
                            const otherHospital = await prisma.hospital.findUnique({ where: { id: other.hospitalId } });
                            return { 
                                success: false, 
                                message: `On ${dayOfWeek}, slot ${currentSlot.startTime}-${currentSlot.endTime} overlaps with a schedule at ${otherHospital?.name}.` 
                            };
                        }
                    }
                }
            }
        }

        // Save schedules
        for (const daySchedule of schedules) {
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
                    patientsPerHour: daySchedule.patientsPerHour,
                },
                create: {
                    doctorId,
                    hospitalId,
                    dayOfWeek: daySchedule.dayOfWeek,
                    workingHours: daySchedule.workingHours,
                    breakHours: daySchedule.breakHours,
                    patientsPerHour: daySchedule.patientsPerHour,
                },
            });
        }

        revalidatePath('/hospital-admin/schedule');
        return { success: true, message: 'Schedule updated successfully.' };

    } catch (error) {
        console.error("Failed to save schedule:", error);
        return { success: false, message: 'A database error occurred.' };
    }
}
