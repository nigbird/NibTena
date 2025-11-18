
'use server';

import { prisma } from '@/lib/prisma';
import type { TimeSlot } from '@/lib/definitions';
import { parse as parseTime, addMinutes, format as formatTime, isBefore, isEqual, isAfter, startOfHour, parseISO, startOfDay, addDays } from 'date-fns';

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

    const parsedDate = parseISO(date); // parse 'yyyy-MM-dd' as local date
    const dayIndex = parsedDate.getDay();
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = weekDays[dayIndex];

    const [schedule, appointments] = await Promise.all([
        prisma.doctorSchedule.findUnique({
            where: {
                doctorId_hospitalId_dayOfWeek: {
                    doctorId,
                    hospitalId,
                    dayOfWeek,
                },
            },
        }),
        prisma.appointment.findMany({
            where: {
                doctorId,
                hospitalId,
                appointmentDate: {
                    gte: startOfDay(parsedDate),
                    lt: addDays(startOfDay(parsedDate), 1),
                },
                status: { in: ['confirmed', 'rescheduled'] }
            },
            select: {
                appointmentSlot: true
            }
        })
    ]);
    
    if (!schedule || !schedule.workingHours || (schedule.workingHours as TimeSlot[]).length === 0) {
        return [];
    }

    const patientsPerHour = (schedule as any).patientsPerHour || 2;
    const slotDuration = 60 / patientsPerHour;
    
    const workingHours = schedule.workingHours as TimeSlot[];
    const breakHours = schedule.breakHours as TimeSlot[];
    const windows: string[] = [];

    const bookedCounts: Record<string, number> = {};
    appointments.forEach(appt => {
        const slotKey = appt.appointmentSlot; // The full "hh:mm a - hh:mm a" string
        bookedCounts[slotKey] = (bookedCounts[slotKey] || 0) + 1;
    });

    for (const workingSlot of workingHours) {
        let currentWindowStart = parseTimeDate(workingSlot.startTime);
        const workingSlotEnd = parseTimeDate(workingSlot.endTime);

        while (isBefore(currentWindowStart, workingSlotEnd)) {
            const currentWindowEnd = addMinutes(currentWindowStart, slotDuration);
            
            if (isAfter(currentWindowEnd, workingSlotEnd)) break;

            const window = { startTime: formatTime(currentWindowStart, 'HH:mm'), endTime: formatTime(currentWindowEnd, 'HH:mm') };
            
            // A window is valid if its start time is not in a break period.
            const isStartInBreak = isTimeInRanges(currentWindowStart, breakHours);
            
            if (!isStartInBreak) {
                 const formattedStart = formatTime(currentWindowStart, 'hh:mm a');
                 const formattedEnd = formatTime(currentWindowEnd, 'hh:mm a');
                 const slotKey = `${formattedStart} - ${formattedEnd}`;

                 // A slot is available if the number of appointments booked for it is less than the hourly capacity for that type of slot.
                 // This logic assumes `patientsPerHour` applies to the size of each slot.
                 // E.g., if 4 patients/hr, slots are 15 mins. Each 15-min slot can take 1 person.
                 // A more complex system might allow multiple bookings in a larger slot (e.g. hourly).
                 // For now, we assume 1 patient per calculated slot.
                 const maxPerSlot = 1; // Simplified for now.
                 if ((bookedCounts[slotKey] || 0) < maxPerSlot) {
                    windows.push(slotKey);
                 }
            }

            currentWindowStart = currentWindowEnd;
        }
    }

    return windows;
}
