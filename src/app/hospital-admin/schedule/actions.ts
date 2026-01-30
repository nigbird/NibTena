
'use server';

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifyCsrfToken } from '@/lib/csrf';
import type { TimeSlot } from '@/lib/definitions';
import { parse as parseTime, isBefore, isEqual, isAfter, format } from 'date-fns';
import { doSlotsOverlap } from '@/lib/time-utils';

function formatToAmPm(timeStr: string): string {
    if (!timeStr) return '';
    const date = parseTime(timeStr, 'HH:mm', new Date());
    return format(date, 'hh:mm a');
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: {
            hospitals: {
                some: { hospitalId }
            }
        },
        orderBy: {
            name: 'asc'
        },
        select: {
            id: true,
            name: true,
            specialty: true,
            imageUrl: true,
            status: true,
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
            bookingWindow: true
        }
    });
}

const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
}).refine(data => {
    if(!data.startTime || !data.endTime) return true;
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
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const allowed = await requireHospitalPermission('Schedules:Update', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    const _csrf = formData.get('_csrf') as string | null;
        if (!(await verifyCsrfToken(_csrf))) {
        return { success: false, message: 'Invalid or missing CSRF token.' };
    }

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
            
            for (const [slotIndex, slot] of workingHours.entries()) {
                const slotStart = parseTime(slot.startTime, 'HH:mm', new Date());
                const slotEnd = parseTime(slot.endTime, 'HH:mm', new Date());

                if (isBefore(slotStart, hospitalOpen) || isAfter(slotEnd, hospitalClose)) {
                    const formattedStartTime = formatToAmPm(hospitalSettings.startTime);
                    const formattedEndTime = formatToAmPm(hospitalSettings.endTime);
                    fieldErrors[index] = { ...fieldErrors[index], [`workingHours.${slotIndex}`]: `Outside hospital hours (${formattedStartTime}-${formattedEndTime})` };
                }
            }

            for (const [slotIndex, breakSlot] of breakHours.entries()) {
                 const isWithinWorkingHours = workingHours.some(workSlot => 
                    !isBefore(parseTime(breakSlot.startTime, 'HH:mm', new Date()), parseTime(workSlot.startTime, 'HH:mm', new Date())) &&
                    !isAfter(parseTime(breakSlot.endTime, 'HH:mm', new Date()), parseTime(workSlot.endTime, 'HH:mm', new Date()))
                );
                if (!isWithinWorkingHours) {
                    fieldErrors[index] = { ...fieldErrors[index], [`breakHours.${slotIndex}`]: 'Break must be within a working slot.' };
                }
            }

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

        await createAuditLog({
            actorId: user.id,
            actorType: 'User',
            action: 'UPDATE_DOCTOR_SCHEDULE',
            targetId: doctorId,
            targetType: 'Doctor',
            changes: { schedules }
        });

        revalidatePath('/hospital-admin/schedule');
        return { success: true, message: 'Schedule updated successfully.' };

    } catch (error) {
        console.error("Failed to save schedule:", error);
        return { success: false, message: 'A database error occurred.' };
    }
}


const HospitalSettingsSchema = z.object({
    bookingWindow: z.coerce.number().min(1, "Booking window must be at least 1 day."),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format."),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format."),
}).refine(data => isBefore(parseTime(data.startTime, 'HH:mm', new Date()), parseTime(data.endTime, 'HH:mm', new Date())), {
    message: "End time must be after start time.",
    path: ["endTime"],
});

type HospitalSettingsState = {
  errors?: z.infer<typeof HospitalSettingsSchema>['formErrors']['fieldErrors'];
  message?: string | null;
  success?: boolean;
  updatedSettings?: {
      bookingWindow: number,
      startTime: string,
      endTime: string
  }
};

export async function updateHospitalSettings(hospitalId: number, prevState: HospitalSettingsState, formData: FormData): Promise<HospitalSettingsState> {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'Unauthorized' };
    const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
    if (!allowed) return { success: false, message: 'Unauthorized' };

    const validatedFields = HospitalSettingsSchema.safeParse({
        bookingWindow: formData.get('bookingWindow'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
    });

    if (!validatedFields.success) {
        return { success: false, errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        const updated = await prisma.hospital.update({
            where: { id: hospitalId },
            data: validatedFields.data,
        });

        await createAuditLog({
            actorId: user.id,
            actorType: 'User',
            action: 'UPDATE_HOSPITAL_SCHEDULE_SETTINGS',
            targetId: hospitalId,
            targetType: 'Hospital',
            changes: validatedFields.data
        });

        revalidatePath('/hospital-admin/schedule');
        return { 
            success: true, 
            message: 'Hospital settings updated.',
            updatedSettings: {
                bookingWindow: updated.bookingWindow,
                startTime: updated.startTime,
                endTime: updated.endTime,
            }
        };

    } catch (error) {
        console.error("Failed to update hospital settings:", error);
        return { success: false, message: "A database error occurred." };
    }
}
