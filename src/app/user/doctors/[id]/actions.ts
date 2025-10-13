
'use server';

import { prisma } from '@/lib/prisma';
import type { TimeSlot } from '@/lib/definitions';
import { parse as parseTime, addMinutes, format as formatTime, isBefore, isEqual, isAfter } from 'date-fns';

/**
 * Parses a time string (HH:mm) into a Date object for today.
 * @param timeStr - The time string in "HH:mm" format.
 * @returns A Date object.
 */
function parseTimeDate(timeStr: string): Date {
  return parseTime(timeStr, 'HH:mm', new Date());
}

/**
 * Checks if a given time falls within any of the provided time ranges.
 * The check is inclusive of the start time and exclusive of the end time.
 * @param timeToCheck - The Date object representing the time to check.
 * @param ranges - An array of time slot objects with startTime and endTime.
 * @returns True if the time is within any of the ranges, false otherwise.
 */
function isTimeInRanges(timeToCheck: Date, ranges: { startTime: string; endTime: string }[]): boolean {
  return ranges.some(range => {
    const start = parseTimeDate(range.startTime);
    const end = parseTimeDate(range.endTime);
    return (isEqual(timeToCheck, start) || isAfter(timeToCheck, start)) && isBefore(timeToCheck, end);
  });
}


export async function getAvailableTimeWindows(doctorId: number, date: string, hospitalId: number): Promise<string[]> {
    if (!doctorId || !date || !hospitalId) return [];

    const dayIndex = new Date(date).getDay();
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = weekDays[dayIndex];

    const schedule = await prisma.doctorSchedule.findUnique({
        where: {
            doctorId_hospitalId_dayOfWeek: {
                doctorId,
                hospitalId,
                dayOfWeek,
            },
        },
    });

    if (!schedule || !schedule.workingHours || (schedule.workingHours as TimeSlot[]).length === 0) {
        return [];
    }
    
    const TIME_WINDOW_MINUTES = 30;
    const workingHours = schedule.workingHours as TimeSlot[];
    const breakHours = schedule.breakHours as TimeSlot[];
    const windows: string[] = [];

    for (const workingSlot of workingHours) {
        let currentWindowStart = parseTimeDate(workingSlot.startTime);
        const workingSlotEnd = parseTimeDate(workingSlot.endTime);

        while (isBefore(currentWindowStart, workingSlotEnd)) {
            const currentWindowEnd = addMinutes(currentWindowStart, TIME_WINDOW_MINUTES);
            
            if (isAfter(currentWindowEnd, workingSlotEnd)) break;

            const window = { startTime: formatTime(currentWindowStart, 'HH:mm'), endTime: formatTime(currentWindowEnd, 'HH:mm') };
            
            // A window is valid if its start time is not in a break period.
            const isStartInBreak = isTimeInRanges(currentWindowStart, breakHours);
            
            if (!isStartInBreak) {
                 const formattedStart = formatTime(currentWindowStart, 'hh:mm a');
                 const formattedEnd = formatTime(currentWindowEnd, 'hh:mm a');
                 windows.push(`${formattedStart} - ${formattedEnd}`);
            }

            currentWindowStart = currentWindowEnd;
        }
    }

    return windows;
}
