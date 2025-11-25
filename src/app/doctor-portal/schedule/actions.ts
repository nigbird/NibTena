
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
  // Editing schedules from the doctor portal is disabled.
  // This function now returns a safe, non-descriptive response to prevent any server-side updates
  // triggered from doctor-facing clients. The original update logic has been intentionally disabled.
  console.info('[saveDoctorSchedulesForHospital] Update attempted but is disabled in doctor portal', { doctorId, hospitalId });
  return { success: false, message: 'Editing schedules is disabled in this portal.' };
}
